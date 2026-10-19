import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ArrowUpRight, Info, Braces, Table2, BookOpen } from "lucide-react";
import { useExperience } from "../store/experience";
import { stations, operations } from "../content/lessons";
import { fmt, weights, type Snapshot } from "../simulation/snapshot";
import { dot, gelu } from "../simulation/engine.mjs";
export function Formula({ text }: { text: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(text, {
        throwOnError: false,
        output: "htmlAndMathml",
        displayMode: true,
      }),
    [text],
  );
  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
export function MatrixTable({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience();
  const { values, mask, row, column } = snapshot;
  const max = Math.max(...values.flat().map(Math.abs), 1e-6);
  return (
    <div
      className="matrix-scroll"
      tabIndex={0}
      aria-label="Tabel angka; geser horizontal untuk semua kolom"
    >
      <table className="matrix-table">
        <caption>
          {snapshot.tensorId} · {values.length} × {values[0].length} · klik sel
          untuk derivasi
        </caption>
        <thead>
          <tr>
            <th scope="col">i / j</th>
            {values[0].map((_, j) => (
              <th key={j} scope="col">
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.map((r, i) => (
            <tr key={i}>
              <th scope="row">{i}</th>
              {r.map((x, j) => (
                <td key={j}>
                  <button
                    className={`${mask?.[i][j] ? "masked" : ""} ${i === row && j === column ? "selected" : ""}`}
                    style={{
                      backgroundColor: mask?.[i][j]
                        ? undefined
                        : `rgba(${x < 0 ? "168,142,232" : "30,169,155"},${0.09 + (Math.abs(x) / max) * 0.3})`,
                    }}
                    onClick={() =>
                      s.patch({ token: i, column: j, traced: true })
                    }
                    aria-label={`${snapshot.tensorId}, baris ${i}, kolom ${j}: ${mask?.[i][j] ? "minus tak hingga; masa depan belum tersedia" : x}`}
                    aria-pressed={i === row && j === column}
                  >
                    {mask?.[i][j] ? "−∞" : fmt(x, 3)}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Derivation({ snapshot: p }: { snapshot: Snapshot }) {
  const s = useExperience(),
    { row: i, column: j, values, op, b, attention: h } = p;
  const key = op.tensor;
  const x = values[i][j];
  let formula = "",
    terms: { left: number; right: number; label: string }[] = [],
    detail = "";
  if (["raw", "scaled", "masked", "A"].includes(key)) {
    const query = h.Q[i],
      k = h.K[j];
    terms = query.map((q: number, d: number) => ({
      left: q,
      right: k[d],
      label: `q[${i},${d}] × k[${j},${d}]`,
    }));
    const raw = dot(query, k);
    formula = `q_${i}\\cdot k_${j}=${fmt(raw, 6)},\\quad s_{${i},${j}}=${fmt(raw, 6)}/2`;
    const exps = h.scaled[i].map((v: number, c: number) =>
      c <= i ? Math.exp(v - Math.max(...h.scaled[i].slice(0, i + 1))) : 0,
    );
    detail =
      j > i
        ? "Masa depan: j > i. Mask mengganti skor dengan −∞; softmax memberi bobot 0 tepat."
        : `Skor scaled = ${fmt(raw / 2, 8)}. Softmax stabil: exp(s − max) / Σ exp(s − max) = ${fmt(exps[j], 8)} / ${fmt(
            exps.reduce((a: number, v: number) => a + v, 0),
            8,
          )} = ${fmt(h.A[i][j], 8)}. Σ bobot baris = ${fmt(
            h.A[i].reduce((a: number, v: number) => a + v, 0),
            8,
          )}.`;
  } else if (key === "Z") {
    terms = h.A[i].map((a: number, t: number) => ({
      left: a,
      right: h.V[t][j],
      label: `A[${i},${t}] × V[${t},${j}]`,
    }));
    formula = `Z_{${i},${j}}=\\sum_t A_{${i},t}V_{t,${j}}=${fmt(x, 6)}`;
    detail =
      "Kolom di tabel kontribusi adalah komponen Value; bobot attention sendiri tidak sama dengan kontribusi.";
  } else if (["Q", "K", "V", "out", "expanded", "M"].includes(key)) {
    const w = weights.blocks[s.layer];
    const map: Record<string, [number[][], number[][], number[]]> = {
      Q: [b.U, w.Wq, w.bq],
      K: [b.U, w.Wk, w.bk],
      V: [b.U, w.Wv, w.bv],
      out: [b.concat, w.Wo, w.bo],
      expanded: [b.N, w.W1, w.b1],
      M: [b.activation, w.W2, w.b2],
    };
    const [input, weight, bias] = map[key];
    terms = input[i].map((a: number, t: number) => ({
      left: a,
      right: weight[t][j],
      label: `input[${i},${t}] × W[${t},${j}]`,
    }));
    formula = `${key}_{${i},${j}}=\\sum_d\\mathrm{input}_{${i},d}W_{d,${j}}+b_${j}`;
    detail = `Bias = ${bias[j]}. Jumlah + bias = ${fmt(x, 10)}. Bobot tetap pada fixture seed 42.`;
  } else if (["X0", "R", "X"].includes(key)) {
    const a =
      key === "X0"
        ? p.result.embeddings[i][j]
        : key === "R"
          ? b.input[i][j]
          : b.R[i][j];
    const c =
      key === "X0"
        ? p.result.positions[i][j]
        : key === "R"
          ? b.out[i][j]
          : b.M[i][j];
    formula = `${fmt(a, 6)}+(${fmt(c, 6)})=${fmt(x, 6)}`;
    detail =
      key === "X0"
        ? "Embedding token + embedding posisi. ID hanya memilih baris."
        : "Residual mempertahankan input dengan penjumlahan elemen demi elemen.";
  } else if (["U", "N", "H"].includes(key)) {
    const input =
      key === "U" ? b.input[i] : key === "N" ? b.R[i] : p.result.blocks[1].X[i];
    const mean = input.reduce((a: number, v: number) => a + v, 0) / 8,
      variance =
        input.reduce((a: number, v: number) => a + (v - mean) ** 2, 0) / 8;
    formula = `\\frac{x_j-\\mu}{\\sqrt{\\sigma^2+10^{-5}}}\\gamma_j+\\beta_j`;
    detail = `x = ${fmt(input[j], 8)}; mean = ${fmt(mean, 8)}; variance = ${fmt(variance, 8)}; gamma=1; beta=0. Hasil = ${fmt(x, 10)}. Statistik meliputi 8 fitur satu token, bukan seluruh urutan.`;
  } else if (key === "activation") {
    formula =
      "\\mathrm{GELU}(x)=\\frac{x}{2}\\left(1+\\tanh\\left[\\sqrt{2/\\pi}(x+0.044715x^3)\\right]\\right)";
    detail = `Input ${fmt(b.expanded[i][j], 8)} → output ${fmt(gelu(b.expanded[i][j]), 10)}. Aproksimasi tanh mengikuti GPT-2.`;
  } else if (key === "logits" && s.experiment !== "F") {
    terms = p.result.H.at(-1)!.map((a: number, t: number) => ({
      left: a,
      right: weights.E[j][t],
      label: `H[last,${t}] × E[${j},${t}]`,
    }));
    formula = `\\mathrm{logit}_${j}=H_{N-1}\\cdot E_${j}`;
    detail = `Tied embedding: matriks input digunakan lagi untuk proyeksi output. Logit = ${fmt(x, 10)}.`;
  } else if (key === "probabilities") {
    formula = "p_j=\\exp(\\ell_j/T-m)\\big/\\sum_k\\exp(\\ell_k/T-m)";
    detail = `Temperature = ${s.temperature}; mode ${s.sampler}; top-k ${s.topK || "semua"}; top-p ${s.topP}. Hasil setelah filter dan renormalisasi: ${fmt(x, 10)}. Σ p = ${fmt(
      values[0].reduce((a, v) => a + v, 0),
      10,
    )}.`;
    if (s.sampler === "greedy" || s.temperature === 0) {
      formula = "\\mathrm{chosen}=\\arg\\max_j\\ell_j";
      detail = `Greedy/T=0 memilih logit tertinggi. Vektor one-hot hanya menandai pilihan: nilai sel = ${x}. Tidak ada pembagian dengan temperature 0; ini bukan softmax pada T positif.`;
    }
  } else {
    formula = `${fmt(x, 6)}`;
    detail =
      key === "concat"
        ? "Kolom 0–3 berasal dari head 1; kolom 4–7 berasal dari head 2."
        : "Lookup/vektor ilustratif. Periksa sumber dan shape untuk melihat asal angka ini.";
  }
  return (
    <section className="derivation">
      <div className="section-kicker">
        DERIVASI SEL [{i}, {j}]
      </div>
      <Formula text={formula} />
      {terms.length > 0 && (
        <div className="terms">
          <table>
            <thead>
              <tr>
                <th>Pasangan</th>
                <th>Input</th>
                <th>Bobot</th>
                <th>Hasil ×</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t, d) => (
                <tr key={d}>
                  <td>{t.label}</td>
                  <td>{fmt(t.left, 5)}</td>
                  <td>{fmt(t.right, 5)}</td>
                  <td>{fmt(t.left * t.right, 6)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3}>Jumlah</th>
                <td>
                  {fmt(
                    terms.reduce((a, t) => a + t.left * t.right, 0),
                    8,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p>{detail}</p>
      <p className="precision">
        Nilai presisi penuh:{" "}
        <code>
          {p.mask?.[i][j] ? "−∞ (mask terpisah di JSON)" : x.toPrecision(15)}
        </code>
      </p>
    </section>
  );
}
export default function Inspector({ snapshot }: { snapshot: Snapshot }) {
  const s = useExperience(),
    station = stations.find((x) => x.id === s.station)!;
  return (
    <aside className="inspector" aria-label="Inspector pembelajaran">
      <header>
        <div>
          <span className="section-kicker">CATATAN LAB</span>
          <h2>Di balik angka.</h2>
        </div>
        <Info size={18} />
      </header>
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label="Kedalaman pembelajaran"
      >
        {(["meaning", "numbers", "code"] as const).map((id, i) => (
          <button
            key={id}
            role="tab"
            aria-selected={s.tab === id}
            aria-controls="inspector-content"
            onClick={() => {
              s.patch({ tab: id });
            }}
            className={s.tab === id ? "active" : ""}
          >
            {i === 0 ? (
              <BookOpen size={14} />
            ) : i === 1 ? (
              <Table2 size={14} />
            ) : (
              <Braces size={14} />
            )}
            {["Makna", "Angka", "Kode"][i]}
          </button>
        ))}
      </div>
      <div className="inspector-content" id="inspector-content" role="tabpanel">
        <div className="tensor-meta">
          <span>{snapshot.tensorId}</span>
          <span>
            [{snapshot.values.length}, {snapshot.values[0].length}]
          </span>
        </div>
        {s.tab === "meaning" && (
          <>
            <span className="section-kicker">
              PERTANYAAN{" "}
              {String(stations.indexOf(station) + 1).padStart(2, "0")}
            </span>
            <h3>{station.question}</h3>
            <p>{station.description}</p>
            <Formula text={station.formula} />
            <div className="insight">
              <span className="mini-dot" /> <strong>{snapshot.op.name}</strong>
              <p>{snapshot.op.note}</p>
            </div>
            <button
              className="text-button"
              onClick={() => s.patch({ tab: "numbers", traced: true })}
            >
              Telusuri satu angka <ArrowUpRight size={16} />
            </button>
          </>
        )}
        {s.tab === "numbers" && (
          <>
            <p className="small">
              Baris = posisi token; kolom mengikuti tensor aktif. Batch tunggal
              B=1 disembunyikan.
            </p>
            <MatrixTable snapshot={snapshot} />
            <Derivation snapshot={snapshot} />
          </>
        )}
        {s.tab === "code" && (
          <>
            <div className="code-label">PSEUDOCODE · TIDAK DIEKSEKUSI</div>
            <pre className="code-list">
              {operations[s.station].map((op, i) => (
                <span key={i} className={s.step === i ? "active" : ""}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  {op.code}
                  {"\n"}
                </span>
              ))}
            </pre>
            <p>{snapshot.op.note}</p>
            <a
              className="text-button"
              href="https://github.com/openai/gpt-2/blob/master/src/model.py"
              target="_blank"
              rel="noreferrer"
            >
              Lihat implementasi GPT-2 <ArrowUpRight size={14} />
            </a>
          </>
        )}
        <details className="provenance">
          <summary>Provenance & sumber tensor</summary>
          <p>
            {snapshot.provenance
              .replace("exemple local", "contoh lokal")
              .replace("logits locaux", "logits lokal")}
          </p>
          <p>
            Dimensi 8 · 2 head × 4 · MLP 32 · 2 blok. Bias 0. Angka mainan
            deterministik, bukan aktivasi atau prediksi GPT-2.
          </p>
          <p>
            Sumber: {snapshot.sources.join(" → ") || "lookup vocabulary mainan"}
          </p>
          <p>
            {snapshot.provenance.startsWith("concept-vignette")
              ? "Vignette ini berdiri sendiri dan tidak berasal dari hidden state pipeline."
              : "Operasi mengikuti pipeline GPT-2; bobot demo tidak dilatih untuk bahasa."}
          </p>
        </details>
      </div>
      <footer>
        <span className="mini-dot" /> ANGKA SIMULASI · DIMENSI DIPERKECIL
      </footer>
    </aside>
  );
}
