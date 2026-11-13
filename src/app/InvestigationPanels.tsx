import { useState } from "react";
import {
  model,
  evaluation,
  cases,
  fmt,
  percent,
  visible,
  getRun,
  type CaseId,
} from "./investigation-data";
import {
  forward,
  maxDifference,
  distribution,
  attentionExample,
  biasTraining,
  decode,
} from "../simulation/story/engine.mjs";
import { retrieve } from "../simulation/story/cases.mjs";
import type { StoryTrace } from "../scene/InvestigationScene";

export function Vector({ name, values }: { name: string; values: number[] }) {
  return (
    <div className="story-vector">
      <b>{name}</b>
      <div>
        {values.map((n, i) => (
          <span
            key={i}
            title={`fitur ${i}`}
            className={n < 0 ? "negative" : ""}
          >
            <small>{i}</small>
            {fmt(n)}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Candidates({
  logits,
  probabilities,
  title,
}: {
  logits: number[];
  probabilities: number[];
  title?: string;
}) {
  const ranked = probabilities
      .map((p, id) => ({ p, id }))
      .sort((a, b) => b.p - a.p),
    top = ranked.slice(0, 5);
  const rest = ranked.slice(5).reduce((s, r) => s + r.p, 0);
  return (
    <div className="story-candidates">
      {title && <h3>{title}</h3>}
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Logit</th>
            <th>Probabilitas</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => (
            <tr key={r.id}>
              <th>{visible(model.vocab[r.id])}</th>
              <td>{fmt(logits[r.id])}</td>
              <td>
                <span
                  className="story-bar"
                  style={{
                    background: `linear-gradient(90deg, #28594f ${r.p * 100}%, transparent ${r.p * 100}%)`,
                  }}
                >
                  {percent(r.p)}
                </span>
              </td>
            </tr>
          ))}
          <tr>
            <th>Token lain ({ranked.length - 5})</th>
            <td>—</td>
            <td>{percent(rest)}</td>
          </tr>
        </tbody>
      </table>
      <small>
        Total vocabulary: {percent(probabilities.reduce((a, b) => a + b, 0))}.
        Bukan probabilitas kebenaran klaim.
      </small>
    </div>
  );
}
export function LookupPanel({
  trace,
  position,
  lesson,
}: {
  trace: StoryTrace;
  position: number;
  lesson: number;
}) {
  const [destination, setDestination] = useState(13);
  const id = trace.ids[position],
    other = trace.ids.findIndex(
      (n: number, i: number) => n === id && i !== position,
    );
  const target = lesson === 3 ? destination : other >= 0 ? other : position;
  const a = model.weights.E[id],
    p = model.weights.P[target];
  return (
    <div className="story-instrument">
      <h3>
        {lesson === 2 ? "Satu ID, satu baris tabel" : "Identitas + tempat"}
      </h3>
      <p>
        Dipilih:{" "}
        <b>
          pos {position} · id {id} · {visible(model.vocab[id])}
        </b>
        .{" "}
        {other >= 0
          ? `ID yang sama juga muncul pada posisi ${other}.`
          : "Pilih token “ kunci” untuk membandingkan dua kemunculan."}
      </p>
      {lesson === 3 && (
        <label>
          Letakkan lookup ID {id} pada posisi{" "}
          <input
            aria-label="Posisi pembanding"
            type="number"
            min="0"
            max={trace.ids.length - 1}
            value={destination}
            onChange={(e) =>
              setDestination(
                Math.max(
                  0,
                  Math.min(trace.ids.length - 1, Number(e.target.value)),
                ),
              )
            }
          />
        </label>
      )}
      <p className="story-source">
        {lesson === 3
          ? "Intervensi lookup E + P; tidak mengklaim seluruh kalimat telah dipindahkan."
          : "Hasil model mini · tabel parameter tetap"}
      </p>
      <div
        className="story-scroll"
        tabIndex={0}
        role="region"
        aria-label="Lookup embedding dan posisi"
      >
        <table>
          <thead>
            <tr>
              <th>Fitur</th>
              <th>E[id {id}]</th>
              <th>P[{position}]</th>
              <th>X[{position}]</th>
              <th>P[{target}]</th>
              <th>E + P[{target}]</th>
            </tr>
          </thead>
          <tbody>
            {a.map((v, i) => (
              <tr key={i}>
                <th>{i}</th>
                <td>{fmt(v)}</td>
                <td>{fmt(trace.positions[position][i])}</td>
                <td>{fmt(trace.X0[position][i])}</td>
                <td>{fmt(p[i])}</td>
                <td>{fmt(v + p[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Δ embedding = <b>0</b> · Δ setelah posisi ={" "}
        <b>
          {fmt(
            maxDifference(
              trace.X0[position],
              a.map((v, i) => v + p[i]),
            ),
          )}
        </b>
      </p>
    </div>
  );
}
export function AttentionPanel({
  trace,
  position,
  layer,
  head,
  lesson,
}: {
  trace: StoryTrace;
  position: number;
  layer: number;
  head: number;
  lesson: number;
}) {
  const [component, setComponent] = useState(0),
    [keyPosition, setKeyPosition] = useState(7);
  const b = trace.blocks[layer],
    h = b.heads[head],
    k = Math.min(keyPosition, trace.ids.length - 1),
    c = component;
  const projectionColumn = head * model.profile.headWidth + c;
  const w = model.weights as unknown as Record<string, number[][] | number[]>;
  const wq = w[`${layer}.q.w`] as number[][];
  const bias = (w[`${layer}.q.b`] as number[])[projectionColumn];
  return (
    <div className="story-instrument">
      <h3>
        Blok {layer + 1} / head {head + 1} / query pos {position}
      </h3>
      <div className="story-controls">
        <label>
          Fitur head{" "}
          <select
            value={component}
            onChange={(e) => setComponent(Number(e.target.value))}
          >
            {Array.from({ length: 16 }, (_, i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <label>
          Key posisi{" "}
          <select
            value={k}
            onChange={(e) => setKeyPosition(Number(e.target.value))}
          >
            {trace.ids.map((id: number, i: number) => (
              <option key={i} value={i}>
                {i} · {visible(model.vocab[id])}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lesson === 4 && (
        <details open>
          <summary>
            Asal Q[{position},{projectionColumn}] ={" "}
            {fmt(b.Q[position][projectionColumn])}
          </summary>
          <p>
            LayerNorm hanya pada 32 fitur posisi {position}. Bobot WQ dan bias
            berasal dari checkpoint aktif.
          </p>
          <div
            className="story-scroll"
            tabIndex={0}
            role="region"
            aria-label="Derivasi proyeksi Query"
          >
            <table>
              <thead>
                <tr>
                  <th>Fitur input</th>
                  <th>LN(X)</th>
                  <th>WQ kolom {projectionColumn}</th>
                  <th>Perkalian</th>
                </tr>
              </thead>
              <tbody>
                {b.normalizedInput[position].map((v: number, i: number) => (
                  <tr key={i}>
                    <td>{i}</td>
                    <td>{fmt(v)}</td>
                    <td>{fmt(wq[i][projectionColumn])}</td>
                    <td>{fmt(v * wq[i][projectionColumn])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Jumlah perkalian + bias {fmt(bias)} ={" "}
            <b>{fmt(b.Q[position][projectionColumn])}</b>
          </p>
        </details>
      )}
      <p>
        Skor pasangan terpilih: Q[{position}] · K[{k}] / √16 ={" "}
        <b>{fmt(h.scores[position][k])}</b> →{" "}
        {trace.config.causal && k > position ? "−∞ (dikunci)" : "diizinkan"} →
        bobot <b>{percent(h.A[position][k])}</b>.
      </p>
      <div
        className="story-scroll"
        tabIndex={0}
        role="region"
        aria-label="Bobot attention dan kontribusi Value"
      >
        <table>
          <caption>
            Satu baris attention; semua posisi dan kontribusi fitur {c}
          </caption>
          <thead>
            <tr>
              <th>Key</th>
              <th>Skor</th>
              <th>Setelah mask</th>
              <th>Bobot A</th>
              <th>V[{c}]</th>
              <th>A × V</th>
            </tr>
          </thead>
          <tbody>
            {trace.ids.map((id: number, j: number) => (
              <tr
                key={j}
                className={
                  trace.config.causal && j > position ? "story-masked" : ""
                }
              >
                <th>
                  {j} · {visible(model.vocab[id])}
                </th>
                <td>{fmt(h.scores[position][j])}</td>
                <td>
                  {fmt(h.masked[position][j])}
                  {trace.config.causal && j > position ? " 🔒" : ""}
                </td>
                <td>{percent(h.A[position][j])}</td>
                <td>{fmt(h.v[j][c])}</td>
                <td>{fmt(h.A[position][j] * h.v[j][c])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Σ bobot ={" "}
        <b>{fmt(h.A[position].reduce((a: number, b: number) => a + b, 0))}</b> ·
        Σ A × V = <b>{fmt(h.Z[position][c])}</b> = Z[{position},{c}]
      </p>
      <details>
        <summary>Vektor Query, Key, dan hasil head</summary>
        <Vector name="Q" values={h.q[position]} />
        <Vector name="K" values={h.k[k]} />
        <Vector name="Z" values={h.Z[position]} />
        <p>
          Head 1 (16 fitur) + head 2 (16 fitur) → concat 32 fitur → proyeksi Wo.
          Tanda + di kalimat ini berarti penggabungan urutan, bukan penjumlahan
          komponen.
        </p>
      </details>
    </div>
  );
}
export function OperatorExample() {
  const [zero, setZero] = useState(false),
    x = attentionExample(zero);
  return (
    <details className="story-instrument">
      <summary>Contoh hitung terpisah: bobot sama, Value berbeda</summary>
      <p className="story-source">
        Kasus kunci dijeda untuk contoh operator. Angka ini bukan aktivasi
        checkpoint.
      </p>
      <p>
        q = [√2, 0]; k = [[ln(2), 0], [0, 1], [0, −1], [10, 0]]. Skor = [ln(2),
        0, 0, 10]. Posisi keempat dikunci.
      </p>
      <button onClick={() => setZero(!zero)}>
        {zero ? "Pulihkan V₁ = [2,0]" : "Ubah hanya V₁ menjadi [0,0]"}
      </button>
      <Vector name="Bobot" values={x.weights} />
      <Vector name="Hasil Z" values={x.output} />
      <p>
        V₂ = [0,4], V₃ = [2,2], V₄ = [99,99]. Q/K tidak diubah, jadi bobot
        tetap. Value masa depan berkontribusi nol.
      </p>
      <p>Kembali ke angka kasus kunci dengan menutup panel ini.</p>
    </details>
  );
}
export function BlockPanel({
  trace,
  position,
  layer,
  altered,
  ablation,
  onAblation,
}: {
  trace: StoryTrace;
  position: number;
  layer: number;
  altered: StoryTrace;
  ablation: string;
  onAblation: (value: string) => void;
}) {
  const b = altered.blocks[layer];
  return (
    <div className="story-instrument">
      <h3>Seluruh blok, dua jalur penjumlahan</h3>
      <div className="story-block-flow">
        <span>X</span> → <span>LN → QKV → mask → softmax × V → Wo</span> →{" "}
        <b>{altered.config.residual ? "+ X" : "residual diputus"}</b> →{" "}
        <span>LN → MLP 32 → 64 → 32 (GELU)</span> →{" "}
        <b>{altered.config.residual ? "+ R" : "residual diputus"}</b>
      </div>
      <div
        className="story-scroll"
        tabIndex={0}
        role="region"
        aria-label="Dua residual dan cabang MLP"
      >
        <table>
          <thead>
            <tr>
              <th>Fitur</th>
              <th>X</th>
              <th>Attention</th>
              <th>{altered.config.residual ? "R = X + Att" : "R = Att"}</th>
              <th>MLP</th>
              <th>
                {altered.config.residual
                  ? "X berikut = R + MLP"
                  : "X berikut = MLP"}
              </th>
            </tr>
          </thead>
          <tbody>
            {b.input[position].slice(0, 8).map((n: number, c: number) => (
              <tr key={c}>
                <th>{c}</th>
                <td>{fmt(n)}</td>
                <td>{fmt(b.attention[position][c])}</td>
                <td>{fmt(b.R[position][c])}</td>
                <td>{fmt(b.mlp[position][c])}</td>
                <td>{fmt(b.output[position][c])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small>
        Delapan fitur pertama; seluruh tensor tersedia melalui unduhan trace.
      </small>
      <label>
        Salinan diagnostik{" "}
        <select
          aria-label="Salinan diagnostik"
          value={ablation}
          onChange={(e) => onAblation(e.target.value)}
        >
          <option value="none">Arsitektur normal</option>
          <option value="attention">Nolkan cabang attention</option>
          <option value="mlp">Nolkan cabang MLP</option>
          <option value="residual">Putus kedua residual</option>
        </select>
      </label>
      {ablation !== "none" && (
        <p className="story-result">
          Arsitektur diubah untuk diagnosis di kedua blok. Δ logits maks ={" "}
          {fmt(maxDifference(trace.lastLogits, altered.lastLogits))}. Argmax
          normal:{" "}
          {
            model.vocab[
              distribution(trace.lastLogits, { greedy: true }).selected!
            ]
          }
          , diagnostik:{" "}
          {
            model.vocab[
              distribution(altered.lastLogits, { greedy: true }).selected!
            ]
          }
          . Token boleh tetap sama walau angka berubah.
        </p>
      )}
    </div>
  );
}
export function CachePanel({
  prefixIds,
  nextToken,
}: {
  prefixIds: number[];
  nextToken: number;
}) {
  const ids = prefixIds,
    prefill = forward(ids, model),
    token = nextToken;
  const next = [...ids, token],
    full = forward(next, model),
    cached = forward(next, model, { cache: prefill.cache });
  const changed = [...next];
  changed[Math.min(7, changed.length - 1)] = changed[7] === 14 ? 7 : 14;
  const edit = forward(changed, model, { cache: cached.cache });
  return (
    <div className="story-instrument">
      <h3>Cache dibandingkan sebelum sampling</h3>
      <p>
        Prefix {ids.length} posisi + token {visible(model.vocab[nextToken])}{" "}
        pada posisi {ids.length}. Keduanya menggunakan urutan dan checkpoint
        yang sama.
      </p>
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Posisi × layer dihitung</th>
            <th>Dipakai ulang</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Hitung ulang</th>
            <td>{full.computedPositions}</td>
            <td>0</td>
          </tr>
          <tr>
            <th>Cache aktif</th>
            <td>{cached.computedPositions}</td>
            <td>{cached.reusedPositions}</td>
          </tr>
          <tr>
            <th>Edit posisi 7</th>
            <td>{edit.computedPositions}</td>
            <td>{edit.reusedPositions}</td>
          </tr>
        </tbody>
      </table>
      <p>
        Δ logits cache/full ={" "}
        <b>{fmt(maxDifference(full.lastLogits, cached.lastLogits))}</b>,
        toleransi 1e−10. Ini hitungan pekerjaan, bukan klaim kelipatan
        kecepatan.
      </p>
      <p>
        Setelah edit, posisi 0–{edit.start - 1} digunakan ulang; mulai posisi{" "}
        {edit.start} dihitung kembali. Cache terikat checkpoint, konfigurasi,
        token, dan posisi.
      </p>
      <p>
        Ukuran konseptual K/V: 2 × 2 layer × {next.length} posisi × 2 head × 16
        fitur × 8 byte = <b>{2 * 2 * next.length * 2 * 16 * 8} byte</b> nilai
        numerik. Tidak termasuk overhead array JavaScript.
      </p>
    </div>
  );
}
export function TrainingPanel({
  updates,
  onUpdates,
}: {
  updates: number;
  onUpdates: (value: number) => void;
}) {
  let demo = biasTraining();
  for (let i = 0; i < updates; i++) demo = biasTraining(demo.updated);
  const history = model.training.history;
  const x = (s: number) => 40 + (s / 1800) * 560,
    y = (loss: number) =>
      170 - ((Math.log10(Math.max(1e-5, loss)) + 5) / 6) * 145;
  return (
    <div className="story-instrument">
      <h3>Dari target ke pembaruan parameter</h3>
      <p>
        Input posisi t → target token t+1. Pada model lab, loss dihitung pada
        posisi jawaban; semua parameter menerima backpropagation. Ini latihan
        tugas sintetis terawasi, bukan pretraining bahasa umum.
      </p>
      <div className="story-example">
        <b>Contoh hitung terpisah · tiga bias output</b>
        <p>Target A · learning rate 0.5 · loss = −ln(p target)</p>
        <Vector name="Bias sebelum" values={demo.logits} />
        <Vector name="Gradien p − target" values={demo.gradient} />
        <button
          onClick={() => onUpdates(Math.min(1000, updates + 1))}
          disabled={updates >= 1000}
        >
          Terapkan satu langkah gradient descent
        </button>
        <button onClick={() => onUpdates(0)}>Reset contoh</button>
        <Vector name="Bias setelah langkah berikut" values={demo.updated} />
        <p>
          Loss sebelum {fmt(demo.lossBefore)} → sesudah {fmt(demo.lossAfter)}.{" "}
          {updates} langkah diterapkan; tabel memperlihatkan calon langkah
          berikutnya.
        </p>
        <small>
          Bukan seluruh backpropagation Transformer. Checkpoint kasus kunci
          tidak berubah.
        </small>
      </div>
      <h3>Rekaman training model yang sedang digunakan</h3>
      <svg
        viewBox="0 0 640 205"
        role="img"
        aria-label="Training loss dan held-out loss per seratus langkah, sumbu loss logaritmik"
        className="story-loss"
      >
        <path d="M40 20V175H610" fill="none" stroke="#76929b" />
        {[1, 0.01, 0.0001].map((n) => (
          <g key={n}>
            <text x="2" y={y(n) + 4} fill="#b8d2d8" fontSize="10">
              {n}
            </text>
            <path d={`M40 ${y(n)}H610`} stroke="#233e48" />
          </g>
        ))}
        {(["trainLoss", "heldOutLoss"] as const).map((key, i) => (
          <polyline
            key={key}
            points={history.map((r) => `${x(r.step)},${y(r[key])}`).join(" ")}
            fill="none"
            stroke={i ? "#f4b779" : "#6fe6d4"}
            strokeWidth="2"
          />
        ))}
        <text x="40" y="197" fill="#b8d2d8" fontSize="11">
          0 langkah
        </text>
        <text x="510" y="197" fill="#b8d2d8" fontSize="11">
          1.800 langkah
        </text>
      </svg>
      <p>
        Garis hijau: latihan · amber: uji ditahan · sumbu loss logaritmik.
        Terakhir: {model.training.history.at(-1)!.trainLoss.toExponential(3)} /{" "}
        {model.training.history.at(-1)!.heldOutLoss.toExponential(3)}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Split</th>
            <th>Jawaban lengkap cocok</th>
          </tr>
        </thead>
        <tbody>
          {["train", "held-out"].map((split) => {
            const rows = evaluation.filter((e) => e.split === split);
            return (
              <tr key={split}>
                <th>{split}</th>
                <td>
                  {rows.filter((e) => e.correct).length} / {rows.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Kombinasi benda–lokasi ditahan bersama semua warna. Distraktor dalam
        dataset memakai pola lokasi/warna terkait; hasil ini tidak mengukur
        generalisasi bahasa umum. Coba “Dua benda” untuk melihat kegagalan di
        luar pola tersebut.
      </p>
      <details>
        <summary>Lihat contoh uji dan hasil asli</summary>
        {evaluation
          .filter((e) => e.split === "held-out")
          .slice(0, 6)
          .map((e, i) => (
            <p key={i}>
              <code>{decode(e.promptIds, model)}</code>
              <br />
              Target: {decode(e.expected, model)} · hasil:{" "}
              {decode(e.predicted, model)}
            </p>
          ))}
      </details>
    </div>
  );
}
export function SortingPanel({
  onValid,
}: {
  onValid: (valid: boolean) => void;
}) {
  const tasks = [
    ["Tambahkan “jawab singkat”", "Konteks"],
    ["Latih pada contoh instruksi–respons", "Parameter"],
    ["Naikkan temperature", "Decoding"],
    ["Simpan ringkasan, lalu kirim pada prompt berikut", "Aplikasi → konteks"],
  ];
  const [values, setValues] = useState<string[]>(Array(4).fill(""));
  return (
    <div className="story-instrument">
      <h3>Kelompokkan perubahan</h3>
      <p className="story-source">
        Skema konseptual · tidak ada perbandingan checkpoint instruction/base
      </p>
      {tasks.map(([task], i) => (
        <label key={task}>
          {task}
          <select
            value={values[i]}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              setValues(next);
              onValid(tasks.every((r, j) => r[1] === next[j]));
            }}
          >
            <option value="">Pilih kategori</option>
            {["Konteks", "Parameter", "Decoding", "Aplikasi → konteks"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
      ))}
      <p>
        Supervised fine-tuning memakai contoh respons; pembelajaran preferensi
        memakai sinyal perbandingan respons. Keduanya pendekatan training,
        sedangkan perakitan pesan dilakukan aplikasi saat inference.
      </p>
      <p>
        <a
          href="https://arxiv.org/abs/2203.02155"
          target="_blank"
          rel="noreferrer"
        >
          Rujukan: Ouyang dkk., instruction tuning dan human feedback
        </a>
      </p>
    </div>
  );
}
export function GroundingPanel({
  caseId,
  onCase,
}: {
  caseId: CaseId;
  onCase: (id: CaseId) => void;
}) {
  const [found, setFound] = useState(false),
    [inserted, setInserted] = useState(false);
  const [claim, setClaim] = useState("");
  const docs = found ? retrieve("Di mana kunci cadangan?") : [];
  const output = decode(
    getRun(caseId).output.filter((id: number) => id !== 19),
    model,
  );
  const support = cases[caseId].support;
  const expected =
    support === null
      ? "belum didukung"
      : support === output
        ? "didukung"
        : "bertentangan";
  return (
    <div className="story-instrument">
      <h3>Periksa klaim terhadap sumber</h3>
      <div className="story-controls">
        <button
          onClick={() => {
            onCase("missing");
            setInserted(false);
            setClaim("");
          }}
        >
          Hapus lokasi dari catatan
        </button>
        <button
          onClick={() => {
            onCase("conflict");
            setInserted(false);
            setClaim("");
          }}
        >
          Buka catatan bertentangan
        </button>
        <button
          onClick={() => {
            onCase("two");
            setInserted(false);
            setClaim("");
          }}
        >
          Uji dua benda
        </button>
      </div>
      <p>
        Hasil asli model: <b>{output}</b>
      </p>
      <p>{cases[caseId].provenance}</p>
      <label>
        Klaim terhadap catatan{" "}
        <select value={claim} onChange={(e) => setClaim(e.target.value)}>
          <option value="">Pilih penilaian</option>
          {["didukung", "bertentangan", "belum didukung"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {claim && (
        <p role="status">
          {claim === expected
            ? "Penilaian sesuai bukti yang tersedia."
            : `Periksa lagi isi sumber: penilaian untuk kasus ini adalah “${expected}”.`}{" "}
          Sesuai catatan belum membuktikan lokasi di dunia nyata.
        </p>
      )}
      <button className="story-primary" onClick={() => setFound(true)}>
        1. Cari dokumen lokal
      </button>
      {found && (
        <div className="story-retrieval">
          <p>Pencarian kata pada arsip lokal; belum mengubah input model.</p>
          {docs.map((doc) => (
            <blockquote key={doc.id}>
              <b>
                {doc.id} · {doc.title}
              </b>
              <p>{doc.note}.</p>
            </blockquote>
          ))}
          <button
            onClick={() => {
              onCase("green");
              setInserted(true);
              setClaim("");
            }}
          >
            2. Masukkan cuplikan arsip-01 ke konteks
          </button>
          {inserted && (
            <p role="status">
              Cuplikan sudah menjadi input. Pipeline token → blok → generation
              dijalankan kembali dengan checkpoint yang sama. Hasil: {output}
            </p>
          )}
        </div>
      )}
      <div className="story-four">
        <span>
          <b>Bobot</b>Parameter hasil training
        </span>
        <span>
          <b>Konteks</b>Token input aktif
        </span>
        <span>
          <b>KV cache</b>Hasil antara per layer
        </span>
        <span>
          <b>Arsip aplikasi</b>Dokumen di luar model
        </span>
      </div>
      <p>
        <a
          href="https://arxiv.org/abs/2005.11401"
          target="_blank"
          rel="noreferrer"
        >
          Rujukan RAG: Lewis dkk.
        </a>{" "}
        Retrieval dan generation bisa sama-sama gagal; periksa sumbernya.
      </p>
    </div>
  );
}
export function TransferPanel({
  onValid,
}: {
  onValid: (valid: boolean) => void;
}) {
  const tasks = [
    {
      q: "Warna kartu berubah. Apa yang harus dilatih ulang?",
      a: [
        "Tidak perlu; konteks mengubah aktivasi",
        "Semua bobot",
        "KV cache sebagai bobot",
      ],
      correct: 0,
    },
    {
      q: "Dua layer dilewati dalam satu putaran. Berapa pilihan token?",
      a: ["Dua token", "Satu token", "Satu kalimat lengkap"],
      correct: 1,
    },
    {
      q: "Temperature berubah dengan logits tetap. Apa yang berubah?",
      a: [
        "Fakta di dalam model",
        "Ranking logits selalu terbalik",
        "Distribusi pemilihan",
      ],
      correct: 2,
    },
    {
      q: "Catatan lokasi tidak dikirim. Jawaban tetap lancar. Artinya?",
      a: [
        "Kebenarannya belum didukung sumber",
        "Model pasti mengakses arsip",
        "Cache menyimpan semua fakta",
      ],
      correct: 0,
    },
    {
      q: "Prefix diedit pada posisi 7. Cache mana yang dihitung ulang?",
      a: [
        "Tidak ada",
        "Mulai posisi 7 dan sesudahnya",
        "Hanya token keluaran terakhir",
      ],
      correct: 1,
    },
  ];
  const [answers, setAnswers] = useState<number[]>(
    Array(tasks.length).fill(-1),
  );
  const [checked, setChecked] = useState(false);
  return (
    <div className="story-instrument">
      <h3>Transfer: kartu akses di tas merah</h3>
      {tasks.map((task, i) => (
        <fieldset key={task.q}>
          <legend>
            {i + 1}. {task.q}
          </legend>
          {task.a.map((answer, j) => (
            <label className="story-radio" key={answer}>
              <input
                type="radio"
                name={`transfer-${i}`}
                checked={answers[i] === j}
                onChange={() => {
                  const next = [...answers];
                  next[i] = j;
                  setAnswers(next);
                  setChecked(false);
                  onValid(false);
                }}
              />
              {answer}
            </label>
          ))}
        </fieldset>
      ))}
      <button
        onClick={() => {
          setChecked(true);
          onValid(tasks.every((r, i) => r.correct === answers[i]));
        }}
      >
        Periksa penjelasan transfer
      </button>
      {checked && (
        <p role="status">
          {tasks.filter((r, i) => r.correct === answers[i]).length} /{" "}
          {tasks.length} hubungan sesuai.{" "}
          {tasks.every((r, i) => r.correct === answers[i])
            ? "Gunakan bukti untuk menulis penjelasan akhir."
            : `Tinjau lagi pertanyaan ${tasks
                .map((r, i) => (r.correct !== answers[i] ? i + 1 : null))
                .filter(Boolean)
                .join(", ")}. Kamu boleh merevisi tanpa penalti.`}
        </p>
      )}
    </div>
  );
}
