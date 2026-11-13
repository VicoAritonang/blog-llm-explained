import { useRef, useState } from "react";
import {
  CHINCHILLA_RATIO,
  PAPER_PF_DAYS,
  PAPER_TOTAL_FLOPS,
  TRAINING_TOKENS,
  batchWhereCacheExceedsWeights,
  computeOptimal,
  datasetMix,
  demonstrationsThatFit,
  epochsFromWeight,
  fewShotResults,
  forwardFlops,
  gpt3,
  gpt3Models,
  kvCacheBytes,
  parameterBreakdown,
  pfDays,
  trainingFlops,
  weightBytes,
} from "../../simulation/gpt3.mjs";
import type { LabProps } from "./index";

const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function sci(value: number, digits = 2) {
  const [mantissa, exponent] = value.toExponential(digits).split("e");
  const power = [...String(Number(exponent))]
    .map((d) => superscripts[Number(d)] ?? d)
    .join("");
  return `${mantissa.replace(".", ",")}×10${power}`;
}
const local = (value: number, digits = 1) =>
  value.toLocaleString("id", { maximumFractionDigits: digits });
function count(value: number) {
  if (value >= 1e12) return `${local(value / 1e12, 2)} T`;
  if (value >= 1e9) return `${local(value / 1e9, 2)} M`;
  if (value >= 1e6) return `${local(value / 1e6, 1)} jt`;
  return local(value, 0);
}
function bytes(value: number) {
  if (value >= 1e12) return `${local(value / 1e12, 2)} TB`;
  if (value >= 1e9) return `${local(value / 1e9, 2)} GB`;
  return `${local(value / 1e6, 2)} MB`;
}
const share = (value: number) => `${local(value * 100, 2)}%`;

function Choice<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="lab-segments">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={`story-radio ${value === option.value ? "checked" : ""}`}
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
function Bar({ value, max }: { value: number; max: number }) {
  return (
    <i className="lab-bar">
      <b style={{ width: `${Math.max((value / max) * 100, 0.5)}%` }} />
    </i>
  );
}

export function ParamsLab({ complete }: LabProps) {
  const [id, setId] = useState("xl");
  const [printedWidth, setPrintedWidth] = useState(false);
  const base = gpt3Models.find((m) => m.id === id)!;
  const shown =
    base.tableWidth && printedWidth
      ? { ...base, width: base.tableWidth }
      : base;
  const parts = parameterBreakdown(shown);
  const rows = [
    ["Embedding token", "V·d", parts.tokenEmbedding],
    ["Embedding posisi", "n_ctx·d", parts.positionEmbedding],
    ["Attention", "L·(4d² + 4d)", parts.attention],
    ["MLP", "L·(8d² + 5d)", parts.mlp],
    ["LayerNorm", "L·4d + 2d", parts.norm],
  ] as const;
  const gap = parts.total / 1e6 / base.appendix - 1;
  function select(next: string) {
    setId(next);
    setPrintedWidth(false);
    if (next === "175b") complete("param-175");
    if (next === "small") complete("param-small");
  }
  return (
    <div className="lab">
      <Choice
        legend="Model"
        name="gpt3-model"
        value={id}
        options={gpt3Models.map((m) => ({ value: m.id, label: m.name }))}
        onChange={select}
      />
      <div className="lab-panel">
        <p className="lab-dims">
          L = {base.layers} · d = {shown.width.toLocaleString("id")} · head ={" "}
          {base.heads} × {base.headWidth} · V = 50.257 · n_ctx = 2.048
        </p>
        {base.tableWidth && (
          <label className="story-radio">
            <input
              type="checkbox"
              checked={printedWidth}
              onChange={(e) => {
                setPrintedWidth(e.target.checked);
                if (e.target.checked) complete("param-13b");
              }}
            />
            Pakai d = {base.tableWidth.toLocaleString("id")} seperti tercetak di
            Table 2.1
          </label>
        )}
        <table className="lab-params" data-testid="param-table">
          <thead>
            <tr>
              <th scope="col">Komponen</th>
              <th scope="col">Rumus</th>
              <th scope="col">Parameter</th>
              <th scope="col">Porsi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, formula, value]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>
                  <code>{formula}</code>
                </td>
                <td>{count(value)}</td>
                <td className="lab-bar-cell">
                  <Bar value={value} max={parts.total} />
                  {share(value / parts.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td>{count(parts.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        <p className="story-result" role="status">
          Appendix D: {count(base.appendix * 1e6)} · selisih{" "}
          {share(Math.abs(gap))}
          {printedWidth
            ? `. Padahal ${base.heads} × ${base.headWidth} = ${(base.heads * base.headWidth).toLocaleString("id")}.`
            : "."}
        </p>
      </div>
      <p className="lab-limit">
        M = miliar, T = triliun. Embedding keluaran dianggap berbagi bobot
        dengan embedding token, seperti pada GPT-2.
      </p>
    </div>
  );
}

const gpt3Flops = trainingFlops(gpt3.appendix * 1e6, TRAINING_TOKENS);
export function ComputeLab({ complete }: LabProps) {
  const [recomputed, setRecomputed] = useState(false);
  const [exponent, setExponent] = useState(Math.log10(gpt3.appendix * 1e6));
  const [derived, setDerived] = useState(false);
  const parameters = 10 ** exponent,
    tokens = PAPER_TOTAL_FLOPS / (6 * parameters),
    ratio = tokens / parameters,
    optimal = computeOptimal(PAPER_TOTAL_FLOPS);
  return (
    <div className="lab">
      <div className="lab-panel">
        <h3>Total compute 175B</h3>
        {recomputed ? (
          <p className="story-result" role="status" data-testid="flops-result">
            6 × {count(gpt3.appendix * 1e6)} × {count(TRAINING_TOKENS)} ={" "}
            {sci(gpt3Flops)} FLOPs = {local(pfDays(gpt3Flops), 0)} PF-days.
            Table D.1: {sci(PAPER_TOTAL_FLOPS)} FLOPs, {local(PAPER_PF_DAYS, 0)}{" "}
            PF-days.
          </p>
        ) : (
          <button
            onClick={() => {
              setRecomputed(true);
              complete("compute-rumus");
            }}
          >
            Hitung ulang dari 6ND
          </button>
        )}
      </div>
      <div className="lab-panel">
        <h3>Alokasi pada C tetap</h3>
        <small>
          C = {sci(PAPER_TOTAL_FLOPS)} FLOPs. N dipilih, D mengikuti.
        </small>
        <label className="lab-slider">
          Parameter N
          <input
            type="range"
            min={10}
            max={11.7}
            step={0.01}
            value={exponent}
            aria-valuetext={count(parameters)}
            onChange={(e) => {
              const next = Number(e.target.value);
              setExponent(next);
              const r = PAPER_TOTAL_FLOPS / (6 * 10 ** next) / 10 ** next;
              if (r >= 15 && r <= 25) complete("compute-isoflop");
            }}
          />
          <b>{count(parameters)}</b>
        </label>
        <dl className="lab-facts" data-testid="isoflop">
          <div>
            <dt>Token D</dt>
            <dd>{count(tokens)}</dd>
          </div>
          <div>
            <dt>Token per parameter</dt>
            <dd>{local(ratio, 1)}</dd>
          </div>
          <div>
            <dt>Saran rasio {CHINCHILLA_RATIO}:1</dt>
            <dd>
              {count(optimal.parameters)} · {count(optimal.tokens)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="lab-panel">
        <h3>Campuran data (Table 2.2)</h3>
        <table data-testid="dataset-table">
          <thead>
            <tr>
              <th scope="col">Dataset</th>
              <th scope="col">Token</th>
              <th scope="col">Bobot</th>
              <th scope="col">Epoch paper</th>
              {derived && <th scope="col">Dari bobot</th>}
            </tr>
          </thead>
          <tbody>
            {datasetMix.map((d) => (
              <tr key={d.name}>
                <th scope="row">{d.name}</th>
                <td>{count(d.tokens)}</td>
                <td>{local(d.weight * 100, 0)}%</td>
                <td>{local(d.epochs, 2)}</td>
                {derived && <td>{local(epochsFromWeight(d), 2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!derived && (
          <button
            onClick={() => {
              setDerived(true);
              complete("compute-data");
            }}
          >
            Hitung epoch dari bobot
          </button>
        )}
      </div>
    </div>
  );
}

function MaskGrid({ window }: { window: number | null }) {
  const size = 20,
    cell = 12;
  const cells = [];
  for (let row = 0; row < size; row++)
    for (let column = 0; column <= row; column++)
      if (window === null || row - column < window)
        cells.push(
          <rect
            key={`${row}-${column}`}
            x={column * cell}
            y={row * cell}
            width={cell - 2}
            height={cell - 2}
            rx={2}
          />,
        );
  return (
    <svg
      className="lab-mask"
      viewBox={`0 0 ${size * cell} ${size * cell}`}
      role="img"
      aria-label={
        window === null
          ? "Mask dense: setiap posisi membaca semua posisi sebelumnya."
          : `Mask banded: setiap posisi hanya membaca ${window} posisi terakhir.`
      }
    >
      {cells}
    </svg>
  );
}
export function SparseLab({ complete }: LabProps) {
  const [kind, setKind] = useState<"dense" | "banded">("dense");
  const [visualBand, setVisualBand] = useState(6);
  const [context, setContext] = useState(512);
  const [band, setBand] = useState(256);
  const dense = forwardFlops(gpt3, context),
    mixed = forwardFlops(gpt3, context, band);
  return (
    <div className="lab">
      <Choice
        legend="Jenis layer"
        name="mask-kind"
        value={kind}
        options={[
          { value: "dense", label: "Dense" },
          { value: "banded", label: "Locally banded" },
        ]}
        onChange={(next) => {
          setKind(next);
          if (next === "banded") complete("att-band");
        }}
      />
      <div className="lab-panel lab-split">
        <MaskGrid window={kind === "banded" ? visualBand : null} />
        <div>
          <p>
            Baris adalah query, kolom adalah key. Sel terisi berarti pasangan
            dihitung. Ini ilustrasi 20 posisi.
          </p>
          {kind === "banded" && (
            <label className="lab-slider">
              Lebar band
              <input
                type="range"
                min={2}
                max={16}
                value={visualBand}
                onChange={(e) => setVisualBand(Number(e.target.value))}
              />
              <b>{visualBand}</b>
            </label>
          )}
        </div>
      </div>
      <Choice
        legend="Konteks"
        name="context"
        value={context}
        options={[512, 2048, 8192, 32768].map((value) => ({
          value,
          label: value.toLocaleString("id"),
        }))}
        onChange={(next) => {
          setContext(next);
          if (next === 2048) complete("att-share");
          if (next === 32768) complete("att-panjang");
        }}
      />
      <Choice
        legend="Lebar band (asumsi, tidak ada di paper)"
        name="band"
        value={band}
        options={[128, 256, 512, 1024].map((value) => ({
          value,
          label: value.toLocaleString("id"),
        }))}
        onChange={setBand}
      />
      <div className="lab-panel">
        <table data-testid="attention-share">
          <caption>FLOPs forward per token, GPT-3 175B</caption>
          <thead>
            <tr>
              <th scope="col">Pola</th>
              <th scope="col">Matmul</th>
              <th scope="col">Attention</th>
              <th scope="col">Porsi attention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Dense di semua layer</th>
              <td>{sci(dense.matmul)}</td>
              <td>{sci(dense.attention)}</td>
              <td>{share(dense.share)}</td>
            </tr>
            <tr>
              <th scope="row">Dense dan banded bergantian</th>
              <td>{sci(mixed.matmul)}</td>
              <td>{sci(mixed.attention)}</td>
              <td>{share(mixed.share)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lab-limit">
        GPT-3 berhenti di konteks 2.048. Nilai di atasnya hipotetis. Angka ini
        menghitung QKᵀ dan A·V saja, tanpa memperhitungkan efisiensi kernel.
      </p>
    </div>
  );
}

export function KvLab({ complete }: LabProps) {
  const [context, setContext] = useState(2048);
  const [batch, setBatch] = useState(1);
  const [kvHeads, setKvHeads] = useState(96);
  const [precision, setPrecision] = useState(2);
  const shape = { layers: gpt3.layers, headWidth: gpt3.headWidth, kvHeads };
  const perToken = kvCacheBytes({ ...shape, context: 1, bytes: precision }),
    total = kvCacheBytes({ ...shape, context, batch, bytes: precision }),
    weights = weightBytes(parameterBreakdown(gpt3).total, precision),
    limit = batchWhereCacheExceedsWeights(gpt3, {
      kvHeads,
      context,
      bytes: precision,
    });
  function changeBatch(next: number) {
    setBatch(next);
    const cache = kvCacheBytes({
      ...shape,
      context,
      batch: next,
      bytes: precision,
    });
    if (kvHeads === 96 && cache >= weights) complete("kv-batch");
  }
  return (
    <div className="lab">
      <div className="lab-panel">
        <label className="lab-slider">
          Konteks
          <input
            type="range"
            min={128}
            max={2048}
            step={128}
            value={context}
            onChange={(e) => setContext(Number(e.target.value))}
          />
          <b>{context.toLocaleString("id")}</b>
        </label>
        <label className="lab-slider">
          Batch
          <input
            type="range"
            min={1}
            max={64}
            value={batch}
            onChange={(e) => changeBatch(Number(e.target.value))}
          />
          <b>{batch}</b>
        </label>
      </div>
      <Choice
        legend="KV head"
        name="kv-heads"
        value={kvHeads}
        options={[
          { value: 96, label: "96 (MHA, GPT-3)" },
          { value: 8, label: "8 (GQA)" },
          { value: 1, label: "1 (MQA)" },
        ]}
        onChange={(next) => {
          setKvHeads(next);
          if (next === 8) complete("kv-gqa");
        }}
      />
      <Choice
        legend="Presisi"
        name="precision"
        value={precision}
        options={[
          { value: 2, label: "fp16" },
          { value: 1, label: "int8" },
        ]}
        onChange={setPrecision}
      />
      <div className="lab-panel" data-testid="kv-result">
        <div className="lab-compare">
          <span>Bobot</span>
          <Bar value={weights} max={Math.max(weights, total)} />
          <b>{bytes(weights)}</b>
          <span>KV cache</span>
          <Bar value={total} max={Math.max(weights, total)} />
          <b>{bytes(total)}</b>
        </div>
        <p className="story-result" role="status">
          {bytes(perToken)} per token. Pada konteks ini, cache melampaui bobot
          mulai batch {limit.toLocaleString("id")}.
        </p>
      </div>
      <p className="lab-limit">
        Rumus: 2 · L · KV head · d_head · konteks · batch · byte. GQA dan MQA di
        sini skenario hipotetis. GPT-3 memakai multi-head penuh.
      </p>
    </div>
  );
}

export function IclLab({ complete }: LabProps) {
  const [task, setTask] = useState(fewShotResults[3].task);
  const [exampleTokens, setExampleTokens] = useState(60);
  const seen = useRef(new Set([task]));
  const row = fewShotResults.find((r) => r.task === task)!;
  const fit = demonstrationsThatFit(exampleTokens);
  return (
    <div className="lab">
      <Choice
        legend="Tugas"
        name="icl-task"
        value={task}
        options={fewShotResults.map((r) => ({ value: r.task, label: r.task }))}
        onChange={(next) => {
          setTask(next);
          seen.current.add(next);
          if (seen.current.size >= 3) complete("icl-tugas");
          const picked = fewShotResults.find((r) => r.task === next)!;
          if (picked.one < picked.zero) complete("icl-lambada");
        }}
      />
      <div className="lab-panel" data-testid="icl-result">
        <h3>{row.task}: akurasi GPT-3 175B</h3>
        <div className="lab-compare">
          {(
            [
              ["Zero-shot", row.zero],
              ["One-shot", row.one],
              ["Few-shot", row.few],
            ] as const
          ).map(([name, value]) => (
            <div className="lab-compare-row" key={name}>
              <span>{name}</span>
              <Bar value={value} max={100} />
              <b>{local(value, 1)}%</b>
            </div>
          ))}
        </div>
        <p className="story-result" role="status">
          {row.one < row.zero
            ? `One-shot turun ${local(row.zero - row.one, 1)} poin dari zero-shot, lalu few-shot naik.`
            : `Few-shot menambah ${local(row.few - row.zero, 1)} poin dari zero-shot.`}
        </p>
      </div>
      <div className="lab-panel">
        <h3>Berapa contoh yang muat?</h3>
        <label className="lab-slider">
          Token per contoh
          <input
            type="range"
            min={20}
            max={400}
            step={10}
            value={exampleTokens}
            onChange={(e) => setExampleTokens(Number(e.target.value))}
          />
          <b>{exampleTokens}</b>
        </label>
        <p className="story-result">
          K ≤ {fit} contoh pada n_ctx 2.048, dengan 100 token untuk soalnya.
          Paper menyebut umumnya 10 sampai 100.
        </p>
      </div>
    </div>
  );
}

const lineage = [
  ["Learned absolute position", "RoPE", "Posisi relatif dan perluasan konteks"],
  ["LayerNorm", "RMSNorm", "Biaya normalisasi"],
  ["MLP GELU", "SwiGLU", "Kualitas MLP pada parameter setara"],
  ["Multi-head penuh", "GQA / MQA", "Ukuran KV cache saat decode"],
  [
    "Semua parameter aktif",
    "Mixture of Experts",
    "Parameter total terpisah dari compute per token",
  ],
  ["Attention standar", "FlashAttention", "Lalu lintas memori attention"],
  [
    "±1,7 token per parameter",
    "Lebih banyak token per parameter",
    "Alokasi compute training",
  ],
  ["Base model", "SFT dan RLHF", "Mengikuti instruksi dan preferensi"],
] as const;
const targets = lineage
  .map((row) => row[2])
  .sort((a, b) => a.localeCompare(b, "id"));
export function LineageLab({ complete, isDone }: LabProps) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const wrong = lineage.filter(
    ([, change, target]) => picked[change] !== target,
  );
  const solved = isDone("lineage-cocok") || (checked && !wrong.length);
  return (
    <div className="lab">
      <div className="lab-panel">
        <table data-testid="lineage-table">
          <thead>
            <tr>
              <th scope="col">GPT-3</th>
              <th scope="col">Perubahan</th>
              <th scope="col">Hambatan yang diatasi</th>
            </tr>
          </thead>
          <tbody>
            {lineage.map(([before, change, target]) => (
              <tr key={change}>
                <td>{before}</td>
                <th scope="row">{change}</th>
                <td>
                  {solved ? (
                    target
                  ) : (
                    <select
                      aria-label={`Hambatan untuk ${change}`}
                      value={picked[change] ?? ""}
                      onChange={(e) => {
                        setChecked(false);
                        setPicked({ ...picked, [change]: e.target.value });
                      }}
                    >
                      <option value="">Pilih…</option>
                      {targets.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!solved && (
          <button
            className="story-primary"
            onClick={() => {
              setChecked(true);
              if (!wrong.length) complete("lineage-cocok");
            }}
          >
            Periksa pemetaan
          </button>
        )}
        {checked && !solved && (
          <p role="status" className="story-feedback">
            {wrong.length} pemetaan belum tepat.
          </p>
        )}
      </div>
      <p className="lab-limit">
        Tidak semua model modern memakai semua ini. Pilihannya bergantung pada
        anggaran, target serving, dan keluarga modelnya.
      </p>
    </div>
  );
}
