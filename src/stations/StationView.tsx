import { useState } from "react";
import {
  ArrowRight,
  RefreshCw,
  Shuffle,
  LockKeyhole,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useExperience, tokenLabel } from "../store/experience";
import {
  VOCAB,
  TOKENIZER_PRESETS,
  tokenizePreset,
  bpeTrace,
  distribution,
  LOCAL_LOGITS,
  sample,
  analogyResult,
  ANALOGY,
  decode,
  forward,
} from "../simulation/engine.mjs";
import { fmt, weights, type Snapshot } from "../simulation/snapshot";
import { Formula } from "../inspector/Inspector";

export function TokenStrip({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  if (snapshot.local)
    return (
      <div className="token-strip">
        {snapshot.attention.A.map((_: number[], i: number) => (
          <button
            key={i}
            className={Math.min(s.token, 2) === i ? "active" : ""}
            onClick={() => s.patch({ token: i, column: 0 })}
          >
            <span>Posisi {i}</span>
            <small>VIGNETTE · Q/K/V</small>
          </button>
        ))}
      </div>
    );
  return (
    <div className="token-strip" aria-label="Urutan token">
      {snapshot.ids.map((id: number, i: number) => (
        <button
          key={i}
          className={s.token === i ? "active" : ""}
          onClick={() => s.patch({ token: i, column: 0 })}
          aria-pressed={s.token === i}
        >
          <span>{tokenLabel(id)}</span>
          <small>
            POS {i} · toy:{id}
          </small>
        </button>
      ))}
      {s.selected !== null && (
        <span className="new-token">+ {tokenLabel(s.selected)}</span>
      )}
    </div>
  );
}
function Vector({ values, label }: { values: number[]; label: string }) {
  return (
    <div className="vector-row">
      <span>{label}</span>
      <div>
        {values.map((v, i) => (
          <span
            key={i}
            className={v < 0 ? "negative" : "positive"}
            title={v.toPrecision(15)}
          >
            {fmt(v, 2)}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Sampler({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  const [display, setDisplay] = useState<"probability" | "logits">(
    "probability",
  );
  const logits = s.experiment === "F" ? LOCAL_LOGITS : snapshot.result.logits;
  const probabilities = distribution(
    logits,
    s.sampler === "greedy" ? 0 : s.temperature,
    s.topK,
    s.topP,
  );
  const ranked = probabilities
    .map((p: number, id: number) => ({ p, id }))
    .sort((a: { p: number }, b: { p: number }) => b.p - a.p);
  const top = ranked.slice(0, 5),
    others = ranked
      .slice(5)
      .reduce((a: number, v: { p: number }) => a + v.p, 0);
  const choose = () => {
    const id =
      s.sampler === "greedy" || s.temperature === 0
        ? logits.indexOf(Math.max(...logits))
        : sample(probabilities, s.seed);
    s.patch({ selected: id });
  };
  return (
    <div className="sampler">
      <div className="panel-heading">
        <span>
          {s.experiment === "F"
            ? "CONTOH LOGITS LOKAL · TERKURASI"
            : "PIPELINE · VOCABULARY MAINAN 16"}
        </span>
        <div className="segmented">
          <button
            className={display === "probability" ? "active" : ""}
            onClick={() => setDisplay("probability")}
          >
            Probabilitas
          </button>
          <button
            className={display === "logits" ? "active" : ""}
            onClick={() => setDisplay("logits")}
          >
            Logits
          </button>
        </div>
      </div>
      <div className="probability-bars">
        {top.map(({ p, id }: { p: number; id: number }) => (
          <button
            key={id}
            className={`probability-row ${s.selected === id ? "picked" : ""}`}
            onClick={() =>
              s.patch({ column: id, token: 0, tab: "numbers", traced: true })
            }
          >
            <span>{tokenLabel(id)}</span>
            <div>
              <i
                style={{
                  width: `${display === "probability" ? p * 100 : (Math.abs(logits[id]) / Math.max(...logits.map(Math.abs))) * 100}%`,
                }}
              />
            </div>
            <b>
              {display === "probability"
                ? `${(p * 100).toFixed(2)}%`
                : fmt(logits[id], 3)}
            </b>
          </button>
        ))}
        {display === "probability" && (
          <div className="probability-row others">
            <span>Lainnya (11)</span>
            <div>
              <i style={{ width: `${others * 100}%` }} />
            </div>
            <b>{(others * 100).toFixed(2)}%</b>
          </div>
        )}
      </div>
      <div className="sampler-controls">
        <label>
          Temperature <b>{s.temperature.toFixed(2)}</b>
          <input
            aria-label="Temperature"
            type="range"
            min="0"
            max="2"
            step=".05"
            value={s.temperature}
            onChange={(e) =>
              s.patch({ temperature: +e.target.value, selected: null })
            }
          />
        </label>
        <label>
          Mode
          <select
            value={s.sampler}
            onChange={(e) =>
              s.patch({
                sampler: e.target.value as "sample" | "greedy",
                selected: null,
              })
            }
          >
            <option value="sample">Sampling</option>
            <option value="greedy">Greedy · argmax</option>
          </select>
        </label>
        <label>
          Seed
          <input
            type="number"
            min="0"
            max="4294967295"
            aria-label="Seed sampling"
            value={s.seed}
            onChange={(e) =>
              s.patch({
                seed: Math.min(
                  4294967295,
                  Math.max(0, Math.trunc(+e.target.value)),
                ),
                selected: null,
              })
            }
          />
        </label>
        <label>
          Top-k
          <select
            aria-label="Top-k"
            value={s.topK}
            onChange={(e) => s.patch({ topK: +e.target.value, selected: null })}
          >
            <option value="0">Semua</option>
            {[1, 3, 5, 10].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Top-p <b>{s.topP.toFixed(2)}</b>
          <input
            type="range"
            min=".05"
            max="1"
            step=".05"
            aria-label="Top-p"
            value={s.topP}
            onChange={(e) => s.patch({ topP: +e.target.value, selected: null })}
          />
        </label>
      </div>
      <div className="sampler-action">
        <button className="button primary" onClick={choose}>
          <Shuffle size={15} />
          {s.sampler === "greedy" || s.temperature === 0
            ? "Pilih argmax"
            : "Ambil satu sampel"}
        </button>
        <button
          className="button"
          onClick={() => s.patch({ seed: (s.seed + 1) >>> 0, selected: null })}
        >
          Seed +1
        </button>
        {s.selected !== null && (
          <>
            <span className="sample-result">
              Terpilih: <strong>{tokenLabel(s.selected)}</strong>
            </span>
            <button
              className="button"
              disabled={s.ids.length >= 12}
              onClick={s.append}
            >
              Masukkan ke urutan <Plus size={14} />
            </button>
          </>
        )}
      </div>
      <p className="fine-print">
        Lima kandidat + lainnya = 100%. Filter top-k/top-p dihitung ulang dan
        dinormalisasi. Distribusi lebih datar memberi variasi; probabilitas
        bukan jaminan kebenaran.
        {s.sampler === "greedy" || s.temperature === 0
          ? " Pada greedy/T=0, bar one-hot menandai argmax, bukan softmax pada temperature positif."
          : ""}
      </p>
    </div>
  );
}
function Tokenizer() {
  const s = useExperience(),
    preset = TOKENIZER_PRESETS[s.preset],
    tokens: {
      text: string;
      id: string;
      position: number;
      start: number;
      end: number;
    }[] = tokenizePreset(preset);
  const [merge, setMerge] = useState(0);
  const index = Math.min(s.token, tokens.length - 1),
    selected = tokens[index];
  return (
    <>
      <div className="panel-heading">
        <span>TOKENIZER MAINAN · PRESET OFFLINE</span>
        <select
          aria-label="Preset tokenizer"
          value={s.preset}
          onChange={(e) => {
            const preset = +e.target.value;
            if (preset !== 0 && s.experiment !== "B") s.experimentTo("B");
            s.patch({
              preset,
              token: 0,
              column: 0,
              step: 0,
              selected: null,
              playing: false,
            });
            setMerge(0);
          }}
        >
          {TOKENIZER_PRESETS.map((p, i) => (
            <option key={p.id} value={i}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="prompt-card">
        <span>INPUT</span>
        <p>{preset.text}</p>
      </div>
      <div className="flow-arrow">
        <ArrowRight size={22} />
        <span>{s.step ? "potongan + lookup" : "siap dipisahkan"}</span>
      </div>
      <div className="token-capsules">
        {tokens.map((t, i) => (
          <button
            key={i}
            className={index === i ? "active" : ""}
            onClick={() => s.patch({ token: i, column: i })}
          >
            {t.text.replaceAll(" ", "·")}
            <small>{t.id}</small>
          </button>
        ))}
      </div>
      <div className="token-details">
        <span>
          POSISI <b>{selected.position}</b>
        </span>
        <span>
          OFFSET{" "}
          <b>
            [{selected.start}, {selected.end})
          </b>
        </span>
        <span>
          WHITESPACE{" "}
          <b>
            {selected.text.startsWith(" ") ? "spasi awal" : "tanpa spasi awal"}
          </b>
        </span>
      </div>
      <details className="bpe-demo">
        <summary>Zoom merge BPE mainan</summary>
        <p>
          Aturan yang sudah dipelajari: (c,a) → ca, lalu (ca,t) → cat. Ini
          contoh merge; bukan vocabulary byte-level GPT-2.
        </p>
        <div className="bpe-pieces">
          {bpeTrace()[merge].map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </div>
        <button className="button" onClick={() => setMerge((merge + 1) % 3)}>
          {merge < 2 ? "Merge berikutnya" : "Ulangi merge"}
        </button>
      </details>
      <p className="fine-print">
        · menandai spasi asli. Menggabungkan semua potongan merekonstruksi input
        persis; ID tidak diklaim sebagai ID GPT-2.
      </p>
    </>
  );
}
function Embedding({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience(),
    i = Math.min(s.token, snapshot.ids.length - 1);
  return (
    <>
      <div className="panel-heading">
        <span>LOOKUP → ADD · N × 8</span>
        <button
          className="button"
          onClick={() => s.patch({ swapped: !s.swapped, selected: null })}
        >
          <Shuffle size={14} />
          {s.swapped ? "Pulihkan posisi" : "Tukar posisi 0 ↔ 1"}
        </button>
      </div>
      <TokenStrip snapshot={snapshot} />
      <div className="vector-equation">
        <Vector
          values={snapshot.result.embeddings[i]}
          label={`E[toy:${snapshot.ids[i]}]`}
        />
        <div className="vector-sign">+</div>
        <Vector values={snapshot.result.positions[i]} label={`P[${i}]`} />
        <div className="vector-sign">=</div>
        <Vector values={snapshot.result.X0[i]} label={`X[${i}]`} />
      </div>
      <p className="fine-print">
        Embedding token tetap saat token dipindah. Position embedding mengikuti
        posisi baru. Koordinat demo bukan sumbu makna universal.
      </p>
    </>
  );
}
function Attention({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience(),
    h = snapshot.attention;
  const n = h.A.length,
    query = Math.min(s.token, n - 1),
    key = Math.min(s.column, n - 1);
  const matrix =
    s.step < 2
      ? h.raw
      : s.step === 2
        ? h.scaled
        : s.step === 3
          ? h.scaled
          : h.A;
  const masked = s.step >= 3;
  return (
    <>
      <div className="panel-heading">
        <span>
          {snapshot.local
            ? "CONTOH LOKAL · q = [2,0,0,0]"
            : `PIPELINE · HEAD ${s.head + 1} · BLOK ${s.layer + 1}`}
        </span>
        {s.experiment === "C" && (
          <button
            className="button"
            onClick={() => s.patch({ local: !s.local, token: 2, column: 0 })}
          >
            {s.local ? "Gunakan pipeline" : "Contoh [2,1,0]"}
          </button>
        )}
      </div>
      {s.experiment === "D" && (
        <div className="causal-controls">
          <span>animal · it · was ·</span>
          <button
            className={s.suffix === "tired" ? "active" : ""}
            onClick={() => s.patch({ suffix: "tired" })}
          >
            tired
          </button>
          <button
            className={s.suffix === "wide" ? "active" : ""}
            onClick={() => s.patch({ suffix: "wide" })}
          >
            wide
          </button>
          <p>
            Urutan mainan pendek; bukan token BPE GPT-2. Klik{" "}
            <button
              className="text-button"
              onClick={() => s.patch({ token: 1 })}
            >
              it (posisi 1)
            </button>{" "}
            atau{" "}
            <button
              className="text-button"
              onClick={() => s.patch({ token: 3 })}
            >
              kata akhir (posisi 3)
            </button>
            . Prefix hingga it identik, sehingga barisnya tetap.
          </p>
        </div>
      )}
      <div className="attention-layout">
        <div className="heatmap">
          <span className="axis-label">KEY →</span>
          <div className="heatmap-rows">
            <span className="axis-query">QUERY ↓</span>
            <div
              className="heatmap-grid"
              style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
            >
              {matrix.map((row: number[], i: number) =>
                row.map((value: number, j: number) => (
                  <button
                    key={`${i}-${j}`}
                    className={`${masked && j > i ? "masked" : ""} ${query === i && key === j ? "selected" : ""}`}
                    style={{
                      backgroundColor:
                        masked && j > i
                          ? undefined
                          : `rgba(66,215,236,${0.14 + (s.step >= 4 ? value : Math.min(Math.abs(value) / 3, 1)) * 0.65})`,
                    }}
                    onClick={() =>
                      s.patch({
                        token: i,
                        column: j,
                        step: s.step >= 5 ? 4 : s.step,
                        tab: "numbers",
                        traced: true,
                      })
                    }
                    aria-label={`Attention query ${i}, key ${j}: ${j > i && masked ? "masa depan belum tersedia" : value}`}
                  >
                    <span>
                      {masked && j > i ? (
                        <LockKeyhole size={12} />
                      ) : (
                        fmt(value, 2)
                      )}
                    </span>
                    <small>
                      {i},{j}
                    </small>
                  </button>
                )),
              )}
            </div>
          </div>
          <div className="heatmap-legend">
            <i />
            <span>Skor / bobot</span>
            <i className="mask-swatch" />
            <span>Belum tersedia</span>
          </div>
        </div>
        <div className="attention-summary">
          <span>
            QUERY {query} → KEY {key}
          </span>
          <Vector label="Q" values={h.Q[query]} />
          <Vector label="K" values={h.K[key]} />
          <p className="attention-score">
            q · k = <b>{fmt(h.raw[query][key], 6)}</b>
          </p>
          <p>
            ÷ √4 = <b>{fmt(h.scaled[query][key], 6)}</b>
          </p>
          <p>
            Bobot setelah mask = <b>{fmt(h.A[query][key], 6)}</b>
          </p>
          <div className="row-sum">
            Σ bobot baris{" "}
            <b>
              {fmt(
                h.A[query].reduce((a: number, v: number) => a + v, 0),
                6,
              )}
            </b>
          </div>
          <Vector label="Z = AV" values={h.Z[query]} />
          <button
            className="text-button"
            onClick={() =>
              s.patch({ step: 5, column: 0, tab: "numbers", traced: true })
            }
          >
            Telusuri weighted sum <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <p className="fine-print">
        Query di baris, Key di kolom. Skor bukan probabilitas. Memilih sel
        membuka derivasi dan kontribusi Value.
      </p>
    </>
  );
}
function Blocks({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience(),
    i = Math.min(s.token, snapshot.ids.length - 1),
    b = snapshot.b;
  return (
    <>
      <div className="panel-heading">
        <span>12 BLOK REFERENSI · 2 BLOK DEMO NUMERIK</span>
      </div>
      <div className="block-rack">
        {Array.from({ length: 12 }, (_, index) => (
          <button
            key={index}
            disabled={index >= 2}
            className={s.layer === index ? "active" : ""}
            onClick={() => s.patch({ layer: index, column: 0 })}
            title={
              index >= 2
                ? "Blok referensi; tidak ada angka fixture"
                : "Buka blok numerik"
            }
          >
            {String(index + 1).padStart(2, "0")}
            {index < 2 && <small>DEMO</small>}
          </button>
        ))}
      </div>
      <div className="block-path">
        <span>LN</span>
        <ArrowRight size={13} />
        <span>Attention</span>
        <span className="residual">+ X</span>
        <ArrowRight size={13} />
        <span>LN</span>
        <ArrowRight size={13} />
        <span>MLP</span>
        <span className="residual">+ R</span>
      </div>
      <Vector label="X awal" values={b.input[i]} />
      <Vector label="Attention" values={b.out[i]} />
      <Vector label="R = X + attn" values={b.R[i]} />
      <Vector label="MLP" values={b.M[i]} />
      <Vector label="X berikutnya" values={b.X[i]} />
      <div className="gelu-chart">
        <svg
          viewBox="0 0 340 100"
          role="img"
          aria-label="Kurva GELU: halus, nilai negatif tidak seluruhnya nol"
        >
          <path d="M20 70H320M170 15V90" stroke="#53666c" fill="none" />
          <path
            d={Array.from({ length: 81 }, (_, i) => {
              const x = -3 + (i * 6) / 80;
              const y =
                0.5 *
                x *
                (1 +
                  Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
              return `${i ? "L" : "M"}${20 + i * 3.75},${70 - y * 17}`;
            }).join(" ")}
            stroke="#eac37b"
            strokeWidth="2.5"
            fill="none"
          />
          <text x="20" y="95">
            −3
          </text>
          <text x="175" y="95">
            0
          </text>
          <text x="303" y="95">
            3
          </text>
          <text x="24" y="24">
            GELU(x)
          </text>
        </svg>
        <p>
          Expansion 8 → 32 → 8. Aktivasi kontinu; satu neuron tidak mewakili
          satu fakta.
        </p>
      </div>
    </>
  );
}
function Cache({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  const [last, setLast] = useState<{
    delta: number;
    label: string;
    rows: number;
  } | null>(null);
  const n = snapshot.ids.length,
    chosen =
      s.selected ??
      snapshot.result.logits.indexOf(Math.max(...snapshot.result.logits));
  const compare = () => {
    if (n >= 12) return;
    const cached = decode(chosen, snapshot.result, weights),
      full = forward([...snapshot.ids, chosen], weights);
    const delta = Math.max(
      ...cached.logits.map((x: number, i: number) =>
        Math.abs(x - full.logits[i]),
      ),
    );
    setLast({ delta, label: tokenLabel(chosen), rows: n });
    s.patch({ selected: chosen });
    s.append();
  };
  return (
    <>
      <div className="panel-heading">
        <span>AKTIVASI PER URUTAN · BUKAN WEIGHTS</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={s.cache}
            onChange={(e) => s.patch({ cache: e.target.checked })}
          />
          KV cache {s.cache ? "ON" : "OFF"}
        </label>
      </div>
      <div className="cache-racks">
        {[0, 1].map((layer) => (
          <div key={layer}>
            <span>BLOK {layer + 1}</span>
            {["K", "V"].map((type) => (
              <div className="cache-row" key={type}>
                <b>{type}</b>
                {snapshot.ids.map((id: number, i: number) => (
                  <span
                    key={i}
                    className={i === n - 1 ? "new" : ""}
                    title={`${type} · posisi ${i} · ${VOCAB[id]}`}
                  >
                    {i}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="work-comparison">
        <div>
          <span>Tanpa cache</span>
          <strong>{(n + 1) * 2}</strong>
          <small>baris diproyeksikan ulang / 2 blok</small>
        </div>
        <div className={s.cache ? "active" : ""}>
          <span>Dengan cache</span>
          <strong>2</strong>
          <small>baris baru / 2 blok</small>
        </div>
      </div>
      <p className="fine-print">
        Penghitung pekerjaan ilustratif untuk langkah decode berikutnya, bukan
        latency. Estimasi cache Float32 saat ini: {2 * n * 2 * 4 * 4}{" "}
        byte/layer; {2 * 2 * n * 2 * 4 * 4} byte total.
      </p>
      <div className="sampler-action">
        <button className="button primary" disabled={n >= 12} onClick={compare}>
          <Plus size={15} />
          Decode satu token
        </button>
        <button
          className="button"
          onClick={() => {
            s.resetPrefix();
            setLast(null);
          }}
        >
          Reset prefix & cache <RefreshCw size={14} />
        </button>
      </div>
      {last && (
        <div className="cache-proof">
          <b>
            {last.rows} → {last.rows + 1} token · {last.label}
          </b>
          <p>
            Decode incremental dan forward penuh dihitung terpisah. Selisih
            logit maksimum: {last.delta.toExponential(3)}.{" "}
            {s.cache
              ? "K/V prefix dipakai ulang."
              : "Mode tanpa cache memproyeksikan ulang prefix; hasil tetap sama."}
          </p>
        </div>
      )}
      {n >= 12 && (
        <p role="status">
          Batas 12 token demo tercapai. Reset prefix untuk mulai lagi.
        </p>
      )}
    </>
  );
}
function Analogy() {
  const s = useExperience(),
    result = analogyResult(),
    words = ["king", "man", "woman", "queen"] as const;
  return (
    <>
      <div className="panel-heading">
        <span>CONTOH LOKAL · WORD EMBEDDINGS STATIS</span>
      </div>
      <Formula text="v_{\\mathrm{king}}-v_{\\mathrm{man}}+v_{\\mathrm{woman}}" />
      <svg
        className="analogy-plot"
        viewBox="0 0 480 220"
        role="img"
        aria-label="Panah vektor ujung-ke-pangkal pada proyeksi dimensi 1 dan 2"
      >
        <defs>
          <marker
            id="arrow-vector"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="currentColor" />
          </marker>
        </defs>
        <path d="M40 184H440M60 205V18" stroke="#647074" strokeWidth="1" />
        <g fill="#bccac6" fontSize="10">
          <text x="398" y="200">
            dimensi 1
          </text>
          <text x="70" y="20">
            dimensi 2
          </text>
        </g>
        <g fill="none" strokeWidth="3" markerEnd="url(#arrow-vector)">
          <path
            d="M60 184L302 88"
            stroke="#49d0df"
            style={{ color: "#49d0df" }}
          />
          <path
            d="M302 88L126 100"
            stroke="#ad91e9"
            style={{ color: "#ad91e9" }}
          />
          <path
            d="M126 100L148 28"
            stroke="#e7bb6e"
            style={{ color: "#e7bb6e" }}
          />
        </g>
        <g fill="#edf2ef" fontSize="13">
          <text x="200" y="114">
            king
          </text>
          <text x="190" y="78">
            − man
          </text>
          <text x="160" y="66">
            + woman
          </text>
          <text x="157" y="28">
            ≈ queen
          </text>
        </g>
        <circle cx="152" cy="30" r="5" fill="#88d9ab" />
      </svg>
      <div className="analogy-vectors">
        {words.map((w) => (
          <Vector key={w} label={w} values={ANALOGY[w]} />
        ))}
        <Vector label="hasil" values={result.vector} />
      </div>
      <div className="cosine-rank">
        {result.ranking.map(
          (v: { word: string; cosine: number }, i: number) => (
            <div key={v.word}>
              <span>
                {String(i + 1).padStart(2, "0")} · {v.word}
              </span>
              <b>{v.cosine.toFixed(6)}</b>
            </div>
          ),
        )}
      </div>
      <p className="fine-print">
        Mendekati queen pada fixture ini. Ranking cosine dihitung pada 4 dimensi
        sumber; diagram hanya proyeksi dimensi 1/2.
      </p>
      <button className="text-button" onClick={() => s.navigate("transformer")}>
        Apa bedanya dengan representasi kontekstual GPT?{" "}
        <ArrowUpRight size={15} />
      </button>
    </>
  );
}
export default function StationView({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  return (
    <div className="station-view">
      {s.station === "tokenizer" ? (
        <Tokenizer />
      ) : s.station === "embedding" ? (
        <Embedding snapshot={snapshot} />
      ) : s.station === "attention" ? (
        <Attention snapshot={snapshot} />
      ) : s.station === "sampling" ? (
        <Sampler snapshot={snapshot} />
      ) : s.station === "cache" ? (
        <Cache snapshot={snapshot} />
      ) : s.station === "analogy" ? (
        <Analogy />
      ) : s.station === "transformer" ? (
        <Blocks snapshot={snapshot} />
      ) : (
        <>
          <div className="panel-heading">
            <span>U Wq / U Wk / U Wv · BIAS DEMO = 0</span>
          </div>
          <TokenStrip snapshot={snapshot} />
          <div className="qkv-panels">
            {(["Q", "K", "V"] as const).map((name, index) => (
              <div key={name} className={`qkv-${name.toLowerCase()}`}>
                <b>{name}</b>
                <p>
                  {
                    [
                      "Query · pola dicocokkan",
                      "Key · pola ditawarkan",
                      "Value · informasi dibawa",
                    ][index]
                  }
                </p>
                <Vector
                  label="head 1"
                  values={snapshot.b[name][
                    Math.min(s.token, snapshot.ids.length - 1)
                  ].slice(0, 4)}
                />
                <Vector
                  label="head 2"
                  values={snapshot.b[name][
                    Math.min(s.token, snapshot.ids.length - 1)
                  ].slice(4, 8)}
                />
                <button
                  className="text-button"
                  onClick={() =>
                    s.patch({ step: index + 1, tab: "numbers", traced: true })
                  }
                >
                  Telusuri proyeksi <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Q, K, V berasal dari LayerNorm input yang sama, memakai tiga matriks
            bobot terlatih yang berbeda. Semua bobot demo dibuat deterministik,
            bukan bobot GPT-2.
          </p>
        </>
      )}
    </div>
  );
}
