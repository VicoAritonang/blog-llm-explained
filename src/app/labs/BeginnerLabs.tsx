import { useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUp, Check, Play, X } from "lucide-react";
import {
  cases,
  evaluation,
  getRun,
  model,
  percentId,
} from "../investigation-data";
import {
  biasTraining,
  decode,
  distribution,
  forward,
  generate,
  tokenize,
} from "../../simulation/story/engine.mjs";
import {
  colors,
  expectedAnswer,
  isHeldOut,
  notePrompt,
  noteText,
  objects,
  places,
  totalNotes,
} from "../../simulation/story/notes.mjs";
import type { LabProps } from "./index";

const EOS = model.vocab.indexOf("<eos>");
const idsOf = (prompt: string) =>
  tokenize(prompt, model).map((token: { id: number }) => token.id);
type Run = ReturnType<typeof generate>;
const runs = new Map<string, Run>();
function runNote(o: number, p: number, c: number) {
  const key = `${o}-${p}-${c}`;
  if (!runs.has(key))
    runs.set(key, generate(idsOf(notePrompt(o, p, c)), model));
  return runs.get(key)!;
}
const spoken = (run: Run) =>
  decode(
    run.output.filter((id: number) => id !== EOS),
    model,
  ).trim();
const pieceLabel = (id: number) =>
  id === EOS ? "berhenti" : model.vocab[id].trim();
const whole = (p: number) => `${Math.round(p * 1000) / 10}%`.replace(".", ",");

function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: string[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="lab-pick">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((option, i) => (
          <option key={option} value={i}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="lab-meter">
      <span>{label}</span>
      <i>
        <b style={{ width: `${Math.max(value * 100, 0.6)}%` }} />
      </i>
      <span>{percentId(value)}</span>
    </div>
  );
}

export function RulesLab({ complete }: LabProps) {
  const [[o, p, c], setNote] = useState([0, 0, 0]);
  const [rules, setRules] = useState(
    () => new Set(["0-0-0", "1-1-2", "2-2-3"]),
  );
  const [ran, setRan] = useState<string | null>(null);
  const key = `${o}-${p}-${c}`,
    shown = ran === key,
    known = rules.has(key);
  function run() {
    setRan(key);
    complete(known ? "aturan-kenal" : "aturan-buntu");
    if (isHeldOut(o, p)) complete("aturan-lemari");
  }
  function writeRule() {
    setRules((old) => new Set(old).add(key));
    complete("aturan-tulis");
  }
  const ruleText = (id: string) => {
    const [ro, rp, rc] = id.split("-").map(Number);
    return `Kalau catatannya “${noteText(ro, rp, rc)}”, jawab “di ${places[rp]} ${colors[rc]}.”`;
  };
  return (
    <div className="lab">
      <div className="lab-builder">
        <Pick
          label="Benda"
          value={o}
          options={objects}
          onChange={(v) => setNote([v, p, c])}
        />
        <Pick
          label="Tempat"
          value={p}
          options={places}
          onChange={(v) => setNote([o, v, c])}
        />
        <Pick
          label="Warna"
          value={c}
          options={colors}
          onChange={(v) => setNote([o, p, v])}
        />
        <button className="story-primary" onClick={run}>
          <Play size={15} />
          Jalankan kedua mesin
        </button>
      </div>
      <p className="lab-note">
        Catatan: {noteText(o, p, c)}. <span>Di mana {objects[o]}?</span>
      </p>
      <div className="lab-duel">
        <section>
          <h3>Program biasa</h3>
          <small>Mengikuti aturan yang ditulis orang</small>
          <p className="lab-answer" data-testid="program-answer">
            {!shown
              ? "Menunggu…"
              : known
                ? `di ${places[p]} ${colors[c]}.`
                : "Tidak ada aturan untuk catatan ini."}
          </p>
          {shown && !known && (
            <button onClick={writeRule}>Tulis aturan untuk catatan ini</button>
          )}
          <details>
            <summary>
              {rules.size} dari {totalNotes} catatan punya aturan
            </summary>
            <ul>
              {[...rules].map((rule) => (
                <li key={rule}>{ruleText(rule)}</li>
              ))}
            </ul>
          </details>
        </section>
        <section>
          <h3>Model mini</h3>
          <small>20.256 angka hasil belajar, tanpa aturan tertulis</small>
          <p className="lab-answer" data-testid="model-answer">
            {shown ? spoken(runNote(o, p, c)) : "Menunggu…"}
          </p>
          {shown && (
            <p className="lab-flag">
              {isHeldOut(o, p)
                ? `Pasangan ${objects[o]} + ${places[p]} tidak pernah dilihat model saat belajar.`
                : `Pasangan ${objects[o]} + ${places[p]} ada di contoh latihannya.`}
            </p>
          )}
        </section>
      </div>
      <p className="lab-limit">
        Model mini hanya bisa tugas ini. Kosakatanya 32 potongan teks.
      </p>
    </div>
  );
}

const decoys = [
  [" ada", " tas"],
  [" tas", " kotak"],
  [],
  ["?", ";"],
  [".", " di"],
];
export function NextWordLab({ complete }: LabProps) {
  const [color, setColor] = useState(0);
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const finishedColors = useRef(new Set<number>());
  const run = runNote(0, 0, color);
  const current = run.steps[step],
    done = step >= run.steps.length;
  const choices = useMemo(() => {
    if (done) return [];
    const others =
      step === 2
        ? colors
            .map((name: string) => ` ${name}`)
            .filter((name: string) => name !== model.vocab[current.token])
            .slice(0, 2)
        : decoys[step];
    const ids = [
      current.token,
      ...others.map((piece: string) => model.vocab.indexOf(piece)),
    ];
    return ids.map((_, i) => ids[(i + step) % ids.length]);
  }, [done, step, current]);
  const probabilities = useMemo(
    () => (done ? [] : distribution(current.logits).probabilities),
    [done, current],
  );
  function restart(next: number) {
    setColor(next);
    setStep(0);
    setGuess(null);
  }
  function advance() {
    const next = step + 1;
    setStep(next);
    setGuess(null);
    if (next >= run.steps.length) {
      complete("kata-selesai");
      if (finishedColors.current.size && !finishedColors.current.has(color))
        complete("kata-ulang");
      finishedColors.current.add(color);
    }
  }
  const built = decode(
    run.output.slice(0, step).filter((id: number) => id !== EOS),
    model,
  );
  return (
    <div className="lab">
      <div className="lab-builder">
        <Pick
          label="Warna di catatan"
          value={color}
          options={colors}
          onChange={restart}
        />
      </div>
      <p className="lab-note">
        Catatan: {noteText(0, 0, color)}. <span>Di mana {objects[0]}?</span>
      </p>
      <p className="lab-build" data-testid="built-answer">
        Jawaban:<strong>{built}</strong>
        {!done && <span className="story-cursor">▌</span>}
      </p>
      {done ? (
        <div className="lab-panel">
          <p role="status">
            Mesin memilih berhenti setelah {run.steps.length} langkah. Tidak ada
            kalimat yang disiapkan sebelumnya.
          </p>
          <button onClick={() => restart(color)}>Susun lagi</button>
        </div>
      ) : (
        <div className="lab-panel">
          <h3>Langkah {step + 1}: potongan mana yang berikutnya?</h3>
          <div className="lab-choices">
            {choices.map((id) => (
              <button
                key={id}
                aria-pressed={guess === id}
                disabled={guess !== null}
                onClick={() => {
                  setGuess(id);
                  complete("kata-tebak");
                }}
              >
                {pieceLabel(id)}
              </button>
            ))}
          </div>
          {guess !== null && (
            <>
              <p role="status">
                {guess === current.token
                  ? "Tebakanmu sama dengan pilihan mesin."
                  : "Mesin memilih yang lain."}{" "}
                Mesin menghitung peluang berikut:
              </p>
              {choices.map((id) => (
                <Meter
                  key={id}
                  label={pieceLabel(id)}
                  value={probabilities[id]}
                />
              ))}
              <button className="story-primary" onClick={advance}>
                Tambahkan “{pieceLabel(current.token)}” dan lanjutkan
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const history = model.training.history as {
  step: number;
  trainLoss: number;
  heldOutLoss: number;
}[];
// exp(-mean cross-entropy): the geometric mean probability given to the target.
const confidence = (loss: number) => Math.exp(-loss);
const chart = {
  width: 640,
  height: 220,
  left: 44,
  right: 12,
  top: 14,
  bottom: 30,
};
const chartX = (step: number) =>
  chart.left +
  (step / history.at(-1)!.step) * (chart.width - chart.left - chart.right);
const chartY = (value: number) =>
  chart.height -
  chart.bottom -
  value * (chart.height - chart.top - chart.bottom);

function LearningChart({
  index,
  onIndex,
}: {
  index: number;
  onIndex: (index: number) => void;
}) {
  const point = history[index];
  const path = history
    .map(
      (h, i) =>
        `${i ? "L" : "M"}${chartX(h.step).toFixed(1)} ${chartY(confidence(h.heldOutLoss)).toFixed(1)}`,
    )
    .join(" ");
  function scrub(e: PointerEvent<SVGSVGElement>) {
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const box = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - box.left) / box.width) * chart.width,
      share = (x - chart.left) / (chart.width - chart.left - chart.right);
    onIndex(
      Math.max(
        0,
        Math.min(history.length - 1, Math.round(share * (history.length - 1))),
      ),
    );
  }
  return (
    <svg
      className="lab-chart"
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      role="img"
      aria-label={`Keyakinan pada jawaban benar naik dari ${whole(confidence(history[0].heldOutLoss))} ke ${whole(confidence(history.at(-1)!.heldOutLoss))} selama latihan.`}
      onPointerDown={scrub}
      onPointerMove={scrub}
    >
      {[0, 0.5, 1].map((tick) => (
        <g key={tick}>
          <line
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={chartY(tick)}
            y2={chartY(tick)}
          />
          <text x={chart.left - 8} y={chartY(tick) + 4} textAnchor="end">
            {tick * 100}%
          </text>
        </g>
      ))}
      {[0, 900, 1800].map((tick) => (
        <text
          key={tick}
          x={chartX(tick)}
          y={chart.height - 8}
          textAnchor={tick === 1800 ? "end" : tick ? "middle" : "start"}
        >
          {tick.toLocaleString("id")}
        </text>
      ))}
      <path d={path} />
      <circle
        cx={chartX(point.step)}
        cy={chartY(confidence(point.heldOutLoss))}
        r="5"
      />
    </svg>
  );
}

const knobLabels = ["biru", "hijau", "merah"],
  knobTarget = 1;
export function TrainingLab({ complete }: LabProps) {
  const [index, setIndex] = useState(0);
  const [logits, setLogits] = useState([2, 1, 0]);
  const [corrections, setCorrections] = useState(0);
  const [tested, setTested] = useState(false);
  const point = history[index];
  const knob = biasTraining(logits, knobTarget);
  const heldOut = useMemo(() => {
    const rows = evaluation.filter(
      (row: { split: string }) => row.split === "held-out",
    );
    return {
      total: rows.length,
      correct: rows.filter((row: { correct: boolean }) => row.correct).length,
    };
  }, []);
  function move(next: number) {
    setIndex(next);
    if (next === history.length - 1) complete("belajar-putar");
  }
  function correct() {
    setLogits(knob.updated);
    setCorrections(corrections + 1);
    if (corrections + 1 >= 3) complete("belajar-koreksi");
  }
  return (
    <div className="lab">
      <div className="lab-panel">
        <h3>Keyakinan rata-rata pada jawaban benar</h3>
        <small>
          Diukur pada contoh yang disembunyikan, sepanjang{" "}
          {history.at(-1)!.step.toLocaleString("id")} langkah latihan
        </small>
        <LearningChart index={index} onIndex={move} />
        <label className="lab-slider">
          Langkah latihan
          <input
            type="range"
            min={0}
            max={history.length - 1}
            value={index}
            aria-valuetext={`Langkah ${point.step}`}
            onChange={(e) => move(Number(e.target.value))}
          />
          <b>{point.step.toLocaleString("id")}</b>
        </label>
        <p role="status" className="story-result">
          Pada langkah {point.step.toLocaleString("id")}, keyakinannya{" "}
          {percentId(confidence(point.heldOutLoss))}. Lonjakannya cepat karena
          tugasnya sempit.
        </p>
        <details>
          <summary>Lihat angkanya</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Langkah</th>
                <th scope="col">Keyakinan</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.step}>
                  <th scope="row">{h.step.toLocaleString("id")}</th>
                  <td>{percentId(confidence(h.heldOutLoss))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
      <div className="lab-panel">
        <h3>Koreksi mesin contoh</h3>
        <small>
          Mesin tiga pilihan, terpisah dari model mini. Jawaban benar pada
          contoh ini: <b>{knobLabels[knobTarget]}</b>.
        </small>
        {knob.before.map((value: number, i: number) => (
          <Meter key={knobLabels[i]} label={knobLabels[i]} value={value} />
        ))}
        <div className="story-actions">
          <button className="story-primary" onClick={correct}>
            Koreksi sekali
          </button>
          <button
            onClick={() => {
              setLogits([2, 1, 0]);
              setCorrections(0);
            }}
          >
            Mulai ulang
          </button>
          <span>{corrections} koreksi</span>
        </div>
      </div>
      <div className="lab-panel">
        <h3>Ujian</h3>
        {tested ? (
          <p
            role="status"
            className="story-result"
            data-testid="held-out-result"
          >
            {heldOut.correct} dari {heldOut.total} contoh tersembunyi dijawab
            benar. Soalnya berpola sama dengan latihan, jadi ini tidak mengukur
            kemampuan bahasa secara umum.
          </p>
        ) : (
          <button
            onClick={() => {
              setTested(true);
              complete("belajar-uji");
            }}
          >
            Uji pada contoh tersembunyi
          </button>
        )}
      </div>
    </div>
  );
}

const fingerprint = model.checkpoint.slice(0, 8);
export function FocusLab({ complete }: LabProps) {
  const [place, setPlace] = useState(0);
  const [color, setColor] = useState(0);
  const [spotlight, setSpotlight] = useState(false);
  const [cleared, setCleared] = useState(false);
  const run = cleared ? getRun("missing") : runNote(0, place, color);
  const context: number[] = run.steps[2].ids;
  const focus: number[] = useMemo(
    () => forward(context, model).blocks[1].heads[1].A.at(-1),
    [context],
  );
  const top = focus.indexOf(Math.max(...focus));
  const answer = spoken(run);
  const change = (update: () => void) => {
    update();
    setCleared(false);
    complete("baca-ganti");
  };
  return (
    <div className="lab">
      <div className="lab-builder">
        <Pick
          label="Tempat"
          value={place}
          options={places}
          onChange={(v) => change(() => setPlace(v))}
        />
        <Pick
          label="Warna"
          value={color}
          options={colors}
          onChange={(v) => change(() => setColor(v))}
        />
        <button
          aria-pressed={spotlight}
          onClick={() => {
            setSpotlight(!spotlight);
            complete("baca-sorot");
          }}
        >
          {spotlight ? "Matikan sorotan" : "Nyalakan sorotan"}
        </button>
        <button
          onClick={() => {
            setCleared(true);
            complete("baca-hapus");
          }}
        >
          Hapus catatan
        </button>
      </div>
      <p className="lab-reading" data-testid="focus-text">
        {context.map((id, i) => (
          <span
            key={i}
            className={spotlight && i === top ? "top" : ""}
            style={
              spotlight && i !== top
                ? { background: `rgba(247, 199, 130, ${focus[i] * 0.85})` }
                : undefined
            }
          >
            {model.vocab[id]}
          </span>
        ))}
        <span className="story-cursor">▌</span>
      </p>
      {spotlight && (
        <p className="lab-flag" role="status">
          Saat memilih warna, salah satu bagian mesin menaruh{" "}
          {whole(focus[top])} perhatiannya pada “
          {model.vocab[context[top]].trim()}”. Ini satu bagian, bukan seluruh
          proses.
        </p>
      )}
      <div className="lab-duel">
        <section>
          <h3>Jawaban mesin</h3>
          <p className="lab-answer" data-testid="focus-answer">
            {answer}
          </p>
          {cleared && (
            <p className="lab-flag" role="status">
              {answer === expectedAnswer(place, color).trim()
                ? "Jawaban ini kebetulan sama dengan catatanmu. Pilih catatan lain dan hapus lagi: jawabannya tetap ini."
                : `Catatanmu tadi menyebut ${places[place]} ${colors[color]}. Mesin tidak mengingatnya.`}
            </p>
          )}
        </section>
        <section>
          <h3>Sidik jari mesin</h3>
          <p className="lab-answer">{fingerprint}</p>
          <p className="lab-flag">
            20.256 angka di dalam mesin tidak berubah oleh catatanmu.
          </p>
        </section>
      </div>
    </div>
  );
}

const diceIds = idsOf(cases.blue.prompt);
const correctAnswer = cases.blue.support!.trim();
export function DiceLab({ complete }: LabProps) {
  const [temperature, setTemperature] = useState(1);
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  function ask() {
    const next = Array.from({ length: 6 }, (_, i) =>
      spoken(
        generate(diceIds, model, {
          greedy: false,
          temperature,
          seed: round * 100 + i * 17 + 1,
        }),
      ).replaceAll("\n", " ⏎ "),
    );
    setAnswers(next);
    setRound(round + 1);
    if (temperature <= 1) complete("acak-normal");
    if (temperature >= 3) complete("acak-panas");
    if (next.some((answer) => answer !== correctAnswer))
      complete("acak-ngawur");
  }
  return (
    <div className="lab">
      <p className="lab-note">
        Catatan: {noteText(0, 0, 0)}. <span>Di mana {objects[0]}?</span>
      </p>
      <div className="lab-panel">
        <label className="lab-slider">
          Keberanian
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
          <b>{temperature.toFixed(1).replace(".", ",")}</b>
        </label>
        <button className="story-primary" onClick={ask}>
          Tanya 6 kali
        </button>
        {answers.length > 0 && (
          <ol className="lab-samples" data-testid="dice-samples">
            {answers.map((answer, i) => (
              <li key={i} className={answer === correctAnswer ? "" : "off"}>
                {answer === correctAnswer ? (
                  <Check size={14} />
                ) : (
                  <X size={14} />
                )}
                <span>{answer || "(kosong)"}</span>
                <small>
                  {answer === correctAnswer ? "sesuai catatan" : "melenceng"}
                </small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const verdicts = [
  "Didukung catatan",
  "Tidak ada di catatan",
  "Salah membaca catatan",
  "Catatan bertentangan",
];
const checks = [
  {
    id: "missing" as const,
    task: "lancar-kosong",
    verdict: 1,
    why: "Tepat. Catatan hanya menyebut “kunci cadangan” tanpa lokasi, jadi “laci kuning” tidak punya dasar.",
  },
  {
    id: "two" as const,
    task: "lancar-keliru",
    verdict: 2,
    why: "Tepat. Catatan menyebut laci biru untuk kunci. Warna kuning tidak ada di catatan sama sekali.",
  },
  {
    id: "conflict" as const,
    task: "lancar-konflik",
    verdict: 3,
    why: "Tepat. Jawabannya mengutip salah satu catatan, tetapi tidak ada cara mengetahui mana yang benar. Jawaban jujur menyebut pertentangannya.",
  },
];
export function VerifyLab({ complete }: LabProps) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  return (
    <div className="lab">
      {checks.map((check, n) => {
        const run = getRun(check.id),
          colorStep = run.steps[2],
          sure = distribution(colorStep.logits).probabilities[colorStep.token],
          choice = picked[check.id],
          right = choice === check.verdict;
        return (
          <fieldset className="lab-panel" key={check.id}>
            <legend>Kasus {n + 1}</legend>
            <p className="lab-note">
              {cases[check.id].prompt.split("\n")[0]}{" "}
              <span>Di mana kunci cadangan?</span>
            </p>
            <p className="lab-answer">{spoken(run)}</p>
            <Meter label="Keyakinan mesin pada warnanya" value={sure} />
            <div className="lab-choices">
              {verdicts.map((verdict, i) => (
                <label
                  className={`story-radio ${choice === i ? "checked" : ""}`}
                  key={verdict}
                >
                  <input
                    type="radio"
                    name={`verdict-${check.id}`}
                    checked={choice === i}
                    onChange={() => {
                      setPicked({ ...picked, [check.id]: i });
                      if (i === check.verdict) complete(check.task);
                    }}
                  />
                  {verdict}
                </label>
              ))}
            </div>
            {choice !== undefined && (
              <p role="status" className="story-feedback">
                {right
                  ? check.why
                  : "Belum tepat. Bandingkan jawabannya kata per kata dengan catatan."}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

const chain = [
  "Saat belajar, ribuan angka di dalam mesin diatur dari banyak contoh.",
  "Saat kamu bertanya, pesanmu dipotong kecil lalu diubah menjadi angka.",
  "Mesin menghitung peluang potongan berikutnya memakai isi pesanmu.",
  "Satu potongan dipilih, ditambahkan ke jawaban, lalu hitungan diulang.",
  "Kamu memeriksa jawaban ke sumbernya, karena lancar belum tentu benar.",
];
const claims: [string, boolean][] = [
  ["Mesin memilih potongan teks berdasarkan peluang.", true],
  ["Mesin menyimpan daftar semua jawaban yang mungkin.", false],
  ["Ceritamu langsung mengubah isi mesin untuk selamanya.", false],
  ["Jawaban yang yakin dan lancar pasti benar.", false],
  ["Isi pesanmu ikut menentukan jawabannya.", true],
  ["Mesin bisa menyebut lokasi yang tidak pernah diberikan.", true],
];
export function FinalLab({ complete, isDone, card, onCard }: LabProps) {
  const [order, setOrder] = useState([2, 0, 4, 1, 3]);
  const [checked, setChecked] = useState(false);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState(card);
  const sorted = order.every((n, i) => n === i) || isDone("pulang-urut");
  const allMarked = claims.every((_, i) => marks[i] !== undefined);
  const allRight = claims.every(([, truth], i) => marks[i] === truth);
  function move(from: number, to: number) {
    setChecked(false);
    setOrder((old) => {
      const next = [...old];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }
  return (
    <div className="lab">
      <div className="lab-panel">
        <h3>Perjalanan sebuah jawaban</h3>
        <ol className="lab-order">
          {order.map((n, i) => (
            <li key={n}>
              <span>{chain[n]}</span>
              <button
                disabled={i === 0}
                aria-label={`Naikkan: ${chain[n]}`}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                disabled={i === order.length - 1}
                aria-label={`Turunkan: ${chain[n]}`}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown size={15} />
              </button>
            </li>
          ))}
        </ol>
        <button
          className="story-primary"
          onClick={() => {
            setChecked(true);
            if (order.every((n, i) => n === i)) complete("pulang-urut");
          }}
        >
          Periksa urutan
        </button>
        {checked && (
          <p role="status" className="story-feedback">
            {order.every((n, i) => n === i)
              ? "Urutannya tepat."
              : "Belum tepat. Ingat, semuanya dimulai jauh sebelum kamu bertanya."}
          </p>
        )}
      </div>
      {sorted && (
        <div className="lab-panel">
          <h3>Fakta atau mitos?</h3>
          <ul className="lab-claims">
            {claims.map(([claim, truth], i) => (
              <li key={claim}>
                <span>{claim}</span>
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    aria-pressed={marks[i] === value}
                    aria-label={`${value ? "Fakta" : "Mitos"}: ${claim}`}
                    onClick={() => {
                      const next = { ...marks, [i]: value };
                      setMarks(next);
                      if (claims.every(([, t], n) => next[n] === t))
                        complete("pulang-mitos");
                    }}
                  >
                    {value ? "Fakta" : "Mitos"}
                  </button>
                ))}
                {marks[i] !== undefined && marks[i] !== truth && (
                  <small>Coba ingat lagi misimu.</small>
                )}
              </li>
            ))}
          </ul>
          {allMarked && !allRight && (
            <p role="status" className="story-feedback">
              Masih ada yang belum tepat.
            </p>
          )}
        </div>
      )}
      {(allRight || isDone("pulang-mitos")) && (
        <div className="lab-panel">
          <h3>Kartu ringkasanmu</h3>
          <label className="story-reflection">
            Kalau teman bertanya “LLM itu apa?”, jawabanmu:
            <textarea
              rows={3}
              maxLength={400}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="LLM itu…"
            />
          </label>
          <button
            className="story-primary"
            disabled={draft.trim().length < 20}
            onClick={() => {
              onCard(draft.trim());
              complete("pulang-kartu");
            }}
          >
            Simpan kartu
          </button>
          {isDone("pulang-kartu") && card && (
            <blockquote className="lab-card" role="status">
              {card}
            </blockquote>
          )}
        </div>
      )}
    </div>
  );
}
