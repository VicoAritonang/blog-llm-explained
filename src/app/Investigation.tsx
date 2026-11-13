import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Layers3,
  RotateCcw,
  ScanLine,
  X,
} from "lucide-react";
import { acts, lessons, routes } from "../content/investigation";
import type { Level, Mission } from "../content/paths";
import { GuideMark, GuideName } from "./Guide";
import {
  model,
  cases,
  fmt,
  percent,
  visible,
  getRun,
  getTrace,
  promptIds,
  readBook,
  BOOK_KEY,
  downloadJSON,
  tracePacket,
  type CaseId,
  type Evidence,
} from "./investigation-data";
import {
  forward,
  distribution,
  maxDifference,
  decode,
  biasTraining,
} from "../simulation/story/engine.mjs";
import { StoryDiagram } from "../scene/StoryDiagram";
import {
  Candidates,
  LookupPanel,
  AttentionPanel,
  OperatorExample,
  BlockPanel,
  CachePanel,
  TrainingPanel,
  SortingPanel,
  GroundingPanel,
  TransferPanel,
} from "./InvestigationPanels";
import "./investigation.css";
import "./journey.css";

const Scene = lazy(() => import("../scene/InvestigationScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function canRender3D() {
  if (new URLSearchParams(location.search).get("mode") === "2d") return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
const initialLesson = () => {
  const n = Number(new URLSearchParams(location.search).get("lesson") || 0);
  return Number.isInteger(n) && n >= 0 && n < 14 ? n : 0;
};
const initialCase = (l: number): CaseId =>
  l === 13 ? "transfer" : l === 12 ? "missing" : "blue";
const shuffled = (length: number, offset: number) =>
  Array.from({ length }, (_, i) => (i + offset) % length);

export type GuidedSession = {
  level: Level;
  mission: Mission;
  notes: Record<number, string>;
  onExit: () => void;
  exitLabel?: string;
};

export default function Investigation({ guided }: { guided?: GuidedSession }) {
  const [lesson, setLesson] = useState(initialLesson),
    [route, setRoute] = useState<keyof typeof routes>("main");
  const [caseId, setCaseId] = useState<CaseId>(() =>
    initialCase(initialLesson()),
  );
  const [step, setStep] = useState(() =>
      [9, 12, 13].includes(initialLesson()) ? 0 : 2,
    ),
    [selected, setSelected] = useState(() =>
      initialLesson() === 5 ? 6 : [2, 3].includes(initialLesson()) ? 2 : -1,
    );
  const [layer, setLayer] = useState(0),
    [head, setHead] = useState(0),
    [mode, setMode] = useState<"3d" | "2d">(() =>
      canRender3D() ? "3d" : "2d",
    );
  const [orbit, setOrbit] = useState(false),
    [tab, setTab] = useState<string>(guided?.level.tab ?? "Makna");
  const [prediction, setPrediction] = useState<number | null>(null),
    [revealed, setRevealed] = useState(false),
    [demonstrated, setDemonstrated] = useState(false);
  const [evidenceChoice, setEvidenceChoice] = useState<number | null>(null),
    [reflection, setReflection] = useState(""),
    [feedback, setFeedback] = useState("");
  const [book, setBook] = useState(readBook),
    [bookOpen, setBookOpen] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [temperature, setTemperature] = useState(1),
    [topK, setTopK] = useState(0),
    [topP, setTopP] = useState(1),
    [seed, setSeed] = useState(42),
    [greedy, setGreedy] = useState(false);
  const [tokenOrder, setTokenOrder] = useState([0, 1, 3, 2]),
    [blockOrder, setBlockOrder] = useState([0, 2, 1, 3]);
  const [sortingValid, setSortingValid] = useState(false),
    [transferValid, setTransferValid] = useState(false);
  const [diagnosticMask, setDiagnosticMask] = useState(false),
    [sourceOpen, setSourceOpen] = useState(false);
  const [ablation, setAblation] = useState("none");
  const [trainingUpdates, setTrainingUpdates] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    bookButtonRef = useRef<HTMLButtonElement>(null);
  const current = lessons[lesson],
    run = useMemo(() => getRun(caseId), [caseId]);
  const activeStep = Math.min(step, run.steps.length - 1);
  const trace = useMemo(
    () => getTrace(caseId, activeStep),
    [caseId, activeStep],
  );
  const diagnostic =
    revealed &&
    ((lesson === 5 && diagnosticMask) || (lesson === 7 && ablation !== "none"));
  const inspectedTrace = useMemo(
    () =>
      diagnostic
        ? forward(trace.ids, model, {
            causal: !(lesson === 5 && diagnosticMask),
            attention: ablation !== "attention",
            mlp: ablation !== "mlp",
            residual: ablation !== "residual",
          })
        : trace,
    [trace, diagnostic, lesson, diagnosticMask, ablation],
  );
  const position =
    selected < 0
      ? trace.ids.length - 1
      : Math.min(selected, trace.ids.length - 1);
  const comparison = useMemo(
    () =>
      revealed && (lesson === 0 || lesson === 5)
        ? getTrace("green", activeStep)
        : null,
    [revealed, lesson, activeStep],
  );
  const probabilities = useMemo(
    () =>
      distribution(trace.lastLogits, { temperature, topK, topP, seed, greedy }),
    [trace, temperature, topK, topP, seed, greedy],
  );
  const steps = guided?.mission.posts ?? routes[route].steps,
    currentRouteIndex = steps.indexOf(lesson),
    next = steps.find((n) => n > lesson);
  const explained = book.filter(
    (e) => e.status === "explained" && steps.includes(e.lesson),
  ).length;
  const lessonExplained = book.some(
    (e) => e.lesson === lesson && e.status === "explained",
  );
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    try {
      localStorage.setItem(BOOK_KEY, JSON.stringify(book));
    } catch {
      setStorageError(true);
    }
  }, [book]);
  useEffect(() => {
    if (bookOpen) {
      dialogRef.current?.showModal();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      bookButtonRef.current?.focus();
    }
  }, [bookOpen]);
  function go(n: number, evidence?: Evidence) {
    setLesson(n);
    setCaseId(evidence?.caseId ?? initialCase(n));
    setStep(evidence?.step ?? ([9, 12, 13].includes(n) ? 0 : 2));
    setSelected(
      evidence?.position ?? (n === 5 ? 6 : n === 2 || n === 3 ? 2 : -1),
    );
    setLayer(evidence?.layer ?? 0);
    setHead(evidence?.head ?? 0);
    setPrediction(null);
    setRevealed(false);
    setDemonstrated(false);
    setEvidenceChoice(null);
    setReflection("");
    setFeedback("");
    setDiagnosticMask(evidence?.diagnosticMask ?? false);
    setAblation(evidence?.ablation ?? "none");
    setTab(guided?.level.tab ?? (route === "deep" ? "Angka" : "Makna"));
    setTrainingUpdates(evidence?.trainingUpdates ?? 0);
    setSortingValid(false);
    setTransferValid(false);
    setTemperature(evidence?.policy?.temperature ?? 1);
    setTopK(evidence?.policy?.topK ?? 0);
    setTopP(evidence?.policy?.topP ?? 1);
    setSeed(evidence?.policy?.seed ?? 42);
    setGreedy(evidence?.policy?.greedy ?? false);
    const url = new URL(location.href);
    url.searchParams.set("lesson", String(n));
    history.replaceState(null, "", url);
    requestAnimationFrame(() =>
      titleRef.current?.focus({ preventScroll: true }),
    );
  }
  function changeCase(id: CaseId) {
    if (lesson === 0 || lesson === 5) return;
    setCaseId(id);
    setStep(lesson >= 12 ? 0 : 2);
    setSelected(-1);
    setFeedback("");
  }
  function observe(demo = false) {
    setRevealed(true);
    setDemonstrated(demo);
    setFeedback("");
  }
  function observation() {
    if (lesson === 0 && comparison)
      return `Checkpoint ${model.checkpoint.slice(0, 12)} tetap; Δ logits A/B maks ${fmt(maxDifference(trace.lastLogits, comparison.lastLogits))}; greedy A ${model.vocab[distribution(trace.lastLogits, { greedy: true }).selected!]}, B ${model.vocab[distribution(comparison.lastLogits, { greedy: true }).selected!]}.`;
    if (lesson === 1)
      return `Rekonstruksi ${tokenOrder.every((n, i) => n === i) ? "persis" : "belum persis"}; ${promptIds(caseId).length} token prompt, ${cases[caseId].prompt.length} karakter; ID kunci di posisi 2 dan 13 sama.`;
    if (lesson === 2 || lesson === 3)
      return `ID ${trace.ids[position]} pada posisi ${position}; embedding lookup tetap. E[0]=${fmt(trace.embeddings[position][0])}, P[0]=${fmt(trace.positions[position][0])}, X[0]=${fmt(trace.X0[position][0])}.`;
    if (lesson === 5 && comparison)
      return `Δ prefix 0–6 blok 1 = ${fmt(maxDifference(trace.blocks[0].output.slice(0, 7), comparison.blocks[0].output.slice(0, 7)))}; blok 2 = ${fmt(maxDifference(trace.blocks[1].output.slice(0, 7), comparison.blocks[1].output.slice(0, 7)))}.`;
    if (lesson === 4 || lesson === 6)
      return `Query pos ${position}, blok ${layer + 1}, head ${head + 1}: Σ A = ${fmt(trace.blocks[layer].heads[head].A[position].reduce((a: number, b: number) => a + b, 0))}, Z[0]=${fmt(trace.blocks[layer].heads[head].Z[position][0])}.`;
    if (lesson === 7)
      return `Blok ${layer + 1}, fitur 0 posisi ${position}: R ${fmt(trace.blocks[layer].R[position][0])} + MLP ${fmt(trace.blocks[layer].mlp[position][0])} = ${fmt(trace.blocks[layer].output[position][0])}.`;
    if (lesson === 8)
      return `T=${temperature}, top-k=${topK}, top-p=${topP}, seed=${seed}, ${greedy ? "greedy" : "sampling"}; terpilih ${model.vocab[probabilities.selected!]}, p=${percent(probabilities.probabilities[probabilities.selected!])}. Logits tidak berubah karena policy.`;
    if (lesson === 9) {
      const ids = activeStep ? trace.ids.slice(0, -1) : trace.ids,
        old = forward(ids, model),
        full = forward(
          [...ids, activeStep ? trace.ids.at(-1) : run.steps[0].token],
          model,
        ),
        cached = forward(full.ids, model, { cache: old.cache });
      return `Δ logits cache/full ${fmt(maxDifference(full.lastLogits, cached.lastLogits))}; pekerjaan ${full.computedPositions} vs ${cached.computedPositions} posisi × layer.`;
    }
    if (lesson === 10) {
      let d = biasTraining();
      for (let i = 0; i < trainingUpdates; i++) d = biasTraining(d.updated);
      return `Demo tiga bias: ${trainingUpdates} langkah diterapkan; calon langkah berikut loss ${fmt(d.lossBefore)} → ${fmt(d.lossAfter)}. Checkpoint utama tetap. Uji sintetis ditahan: 112/112 jawaban cocok; tidak mewakili bahasa umum.`;
    }
    if (lesson === 11)
      return `Kategori konteks / parameter / decoding / aplikasi ${sortingValid ? "sudah tepat" : "masih perlu diperiksa"}. Ini skema konseptual, bukan perbandingan dua checkpoint.`;
    return `Kasus ${caseId}; input ${cases[caseId].prompt}; keluaran asli ${decode(run.output, model)}; dukungan sumber ${cases[caseId].support ?? "tidak ada sumber tunggal yang mendukung"}; stop ${run.stop}.`;
  }
  function saveEvidence(observedOnly = false) {
    const taskValid =
      (lesson !== 1 || tokenOrder.every((n, i) => n === i)) &&
      (lesson !== 7 || blockOrder.every((n, i) => n === i)) &&
      (lesson !== 11 || sortingValid) &&
      (lesson !== 13 || transferValid);
    if (!observedOnly && (evidenceChoice !== current.answer || !taskValid)) {
      setFeedback(
        "Periksa lagi bukti dan tugas di meja kerja. Dugaan awal boleh keliru; revisi penjelasan setelah melihat hasil.",
      );
      return;
    }
    if (!observedOnly && lesson === 13 && reflection.trim().length < 30) {
      setFeedback(
        "Tuliskan hubungan konteks, bobot, cache, dan sumber dengan kata-katamu sendiri sebelum menyimpan bukti akhir.",
      );
      return;
    }
    const evidence: Evidence = {
      lesson,
      checkpoint: model.checkpoint,
      prediction:
        prediction === null
          ? "Demonstrasi tanpa prediksi"
          : current.choices[prediction],
      changed:
        lesson === 0 || lesson === 5
          ? "Satu ID warna pada posisi 7"
          : current.action,
      controls: `checkpoint tetap; case=${caseId}; step=${activeStep}; layer=${layer}; head=${head}; position=${position}; causal=${inspectedTrace.config.causal}; ablation=${ablation}`,
      observation:
        observation() +
        (diagnostic
          ? ` Diagnosis tambahan: causal=${inspectedTrace.config.causal}, ablation=${ablation}, Δ logits normal/diagnostik=${fmt(maxDifference(trace.lastLogits, inspectedTrace.lastLogits))}.`
          : ""),
      conclusion: observedOnly
        ? "Sudah diamati; belum dijelaskan sendiri"
        : current.evidence[current.answer],
      reflection,
      status: observedOnly ? "observed" : "explained",
      caseId,
      step: activeStep,
      layer,
      head,
      position,
      policy: { temperature, topK, topP, seed, greedy },
      diagnosticMask,
      ablation,
      trainingUpdates,
    };
    setBook((old) =>
      [...old.filter((e) => e.lesson !== lesson), evidence].sort(
        (a, b) => a.lesson - b.lesson,
      ),
    );
    setFeedback(
      observedOnly
        ? "Bukti tersimpan sebagai sudah diamati."
        : "Bukti dan penjelasan tersimpan. Dugaan awal tetap tercatat.",
    );
  }
  const sceneProps = {
    trace: inspectedTrace,
    comparison,
    vocab: model.vocab,
    lesson,
    position,
    layer,
    head,
    probabilities: probabilities.probabilities,
    onPosition: setSelected,
    orbit: orbit && !reducedMotion,
  };
  const reconstructionPieces = ["Catatan", ":", " kunci", " cadangan"];
  const blockPieces = [
    "LN → QKV → attention",
    "+ X → R",
    "LN → MLP",
    "+ R → X berikut",
  ];
  const supportedResult = cases[caseId].support;

  return (
    <main className="investigation">
      <a className="story-skip" href="#story-workbench">
        Lewati navigasi ke meja kerja
      </a>
      <header className="story-topbar">
        <a href="/id/" className="story-brand">
          <span className="story-mark">
            <Layers3 size={23} />
          </span>
          <span>
            NEUROLAB<small>DI BALIK SATU JAWABAN</small>
          </span>
        </a>
        <div className="story-top-route">
          <span className="story-dot" /> LAB INTERAKTIF <span>/</span>{" "}
          INVESTIGASI 01
        </div>
        <nav aria-label="Pengaturan investigasi">
          <button onClick={() => setMode((m) => (m === "3d" ? "2d" : "3d"))}>
            <Box size={15} />
            {mode === "3d" ? "Diagram 2D" : "Model 3D"}
          </button>
          <button ref={bookButtonRef} onClick={() => setBookOpen(true)}>
            <BookOpen size={15} />
            Buku bukti <span>{book.length}</span>
          </button>
          <a href="?explore=1" title="Eksplorasi bebas model matematika lama">
            <ExternalLink size={15} />
            <span>Eksplorasi bebas</span>
          </a>
        </nav>
      </header>
      <div className="story-layout">
        <aside className="story-sidebar">
          {guided ? (
            <div className="story-route story-route-guided">
              <small>JALUR {guided.level.name.toUpperCase()}</small>
              <b>{guided.mission.short}</b>
              <button onClick={guided.onExit}>
                <ArrowLeft size={15} />
                {guided.exitLabel ?? "Kembali ke misi"}
              </button>
            </div>
          ) : (
            <div className="story-route">
              <small>RUTE BELAJAR</small>
              <label>
                <span className="sr-only">Pilih rute</span>
                <select
                  value={route}
                  onChange={(e) => {
                    const r = e.target.value as keyof typeof routes;
                    setRoute(r);
                    if (r === "deep") setTab("Angka");
                  }}
                >
                  {Object.entries(routes).map(([key, r]) => (
                    <option key={key} value={key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <span>{routes[route].duration} · perkiraan</span>
            </div>
          )}
          <nav aria-label="Peta investigasi">
            {acts.map((act, a) =>
              !steps.some((i) => lessons[i].act === a) ? null : (
                <div className="story-act" key={act}>
                  <h2>
                    <span>{["I", "II", "III", "IV"][a]}</span>
                    {act}
                  </h2>
                  {steps
                    .filter((i) => lessons[i].act === a)
                    .map((i) => (
                      <button
                        key={i}
                        onClick={() => go(i)}
                        className={lesson === i ? "active" : ""}
                        aria-current={lesson === i ? "step" : undefined}
                      >
                        <span className="story-step-no">
                          {book.find((e) => e.lesson === i)?.status ===
                          "explained" ? (
                            <Check size={13} />
                          ) : (
                            String(i).padStart(2, "0")
                          )}
                        </span>
                        <span>{lessons[i].short}</span>
                        {lesson === i && <ChevronRight size={13} />}
                      </button>
                    ))}
                </div>
              ),
            )}
          </nav>
          <div className="story-progress">
            <span>
              {explained} / {steps.length} <small>bukti dijelaskan</small>
            </span>
            <progress max={steps.length} value={explained} />
            <p>
              Prediksi boleh keliru.
              <br />
              Pemahaman tumbuh dari bukti.
            </p>
          </div>
        </aside>
        <section className="story-main" id="story-workbench">
          <div className="story-heading">
            <div>
              <p className="story-eyebrow">
                BABAK {["I", "II", "III", "IV"][current.act]} /{" "}
                {acts[current.act].toUpperCase()}{" "}
                <span>POS {String(lesson).padStart(2, "0")}</span>
              </p>
              <h1 ref={titleRef} tabIndex={-1}>
                {current.title}
              </h1>
              <p>{current.question}</p>
            </div>
            <span className="story-page-count">
              {String(lesson).padStart(2, "0")}
              <small>/ 13</small>
            </span>
          </div>
          {guided && (
            <aside className="story-guide" aria-label="Catatan pemandu">
              <GuideMark />
              <div>
                <GuideName label={guided.level.noteLabel.toLowerCase()} />
                <p>{guided.notes[lesson]}</p>
              </div>
              <ul aria-label="Checklist pos ini">
                {[
                  ["Simpan dugaan", revealed && prediction !== null],
                  ["Buka hasilnya", revealed],
                  ["Jelaskan buktinya", lessonExplained],
                ].map(([label, done]) => (
                  <li key={String(label)} className={done ? "done" : ""}>
                    {done ? <Check size={14} /> : <ChevronRight size={14} />}
                    <span>
                      <span className="sr-only">
                        {done ? "Selesai: " : "Belum: "}
                      </span>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <div className="story-view-top">
            <span>
              <span className="story-dot" />{" "}
              {diagnostic
                ? "DIAGNOSTIK · ARSITEKTUR DIUBAH"
                : lesson === 11
                  ? "SKEMA KONSEPTUAL"
                  : "HASIL MODEL MINI"}{" "}
              <button
                onClick={() => setSourceOpen(!sourceOpen)}
                aria-expanded={sourceOpen}
              >
                Asal data ↗
              </button>
            </span>
            <span>
              2 blok · 2 head · d = 32{" "}
              <span className="story-mobile-hide">
                · {model.training.parameterCount.toLocaleString("id")} parameter
              </span>
            </span>
          </div>
          {sourceOpen && (
            <div className="story-provenance">
              <b>keys-decoder-v1 · dihitung langsung di browser</b>
              <p>
                Checkpoint <code>{model.checkpoint}</code> · tokenizer literal
                longest-match v1, vocabulary {model.vocab.length}, konteks 64.
                Pre-norm, learned absolute position, GELU, final LayerNorm, tied
                embedding.
              </p>
              <p>
                Data sintetis, seed {model.seed}, Adam 1.800 langkah. Angka
                panel dan 3D mengacu ke trace yang sama. Geometri adalah
                proyeksi visual; tinggi strip memperlihatkan magnitudo fitur
                0–2, bukan seluruh ruang makna. Warna ungu berarti komponen
                negatif.
              </p>
              <button
                onClick={() =>
                  downloadJSON(
                    "neurolab-trace.json",
                    tracePacket(
                      caseId,
                      activeStep,
                      layer,
                      head,
                      position,
                      inspectedTrace,
                      { temperature, topK, topP, seed, greedy },
                    ),
                  )
                }
              >
                <Download size={14} />
                Unduh trace aktif
              </button>
              <p>
                <a
                  href="https://github.com/openai/gpt-2/blob/master/src/model.py"
                  target="_blank"
                  rel="noreferrer"
                >
                  Referensi susunan decoder
                </a>{" "}
                ·{" "}
                <a
                  href="https://huggingface.co/docs/transformers/main/cache_explanation"
                  target="_blank"
                  rel="noreferrer"
                >
                  Referensi cache
                </a>
              </p>
            </div>
          )}
          <div className="story-viewport" data-testid="story-viewport">
            {mode === "3d" ? (
              <SceneBoundary onFail={() => setMode("2d")}>
                <Suspense
                  fallback={
                    <p className="story-loading">
                      Menyiapkan meja investigasi…
                    </p>
                  }
                >
                  <Scene {...sceneProps} />
                </Suspense>
              </SceneBoundary>
            ) : (
              <StoryDiagram {...sceneProps} />
            )}
            <div className="story-view-caption">
              <span>
                <ScanLine size={13} />
                {lesson === 0
                  ? "KASUS KUNCI CADANGAN"
                  : `POS ${position} · ID ${trace.ids[position]} · ${visible(model.vocab[trace.ids[position]])}`}
              </span>
              <span>
                {mode === "3d"
                  ? "Proyeksi visual · kamera terpandu"
                  : "Diagram · data yang sama"}
              </span>
            </div>
            {mode === "3d" && (
              <button
                className="story-camera"
                onClick={() => setOrbit(!orbit)}
                disabled={reducedMotion}
              >
                {orbit ? "Kunci kamera" : "Putar model"}
                {reducedMotion ? " · reduced motion" : ""}
              </button>
            )}
          </div>
          <div className="story-state">
            <span>
              KASUS <b>{cases[caseId].title}</b>
            </span>
            <span>
              INPUT{" "}
              <b>
                {promptIds(caseId).length} + {activeStep} token keluaran
              </b>
            </span>
            <span>
              CHECKPOINT <b>{model.checkpoint.slice(0, 8)} · tetap</b>
            </span>
          </div>
          <div className="story-case-cards">
            <article>
              <small>
                {lesson === 0
                  ? "A · KONDISI AWAL"
                  : "KONTEKS YANG DITERIMA MODEL"}
              </small>
              <pre>
                {cases[caseId].prompt}
                <strong>
                  {decode(
                    run.output
                      .slice(0, activeStep)
                      .filter((id: number) => id !== 19),
                    model,
                  )}
                </strong>
                <span className="story-cursor">▌</span>
              </pre>
              <p>
                {activeStep} token keluaran di atas berasal dari generation
                model; tidak diketik sebagai prefix tersembunyi.
              </p>
            </article>
            {lesson === 0 && (
              <article className="story-case-b">
                <small>B · SATU PERUBAHAN</small>
                <p className="story-note">
                  Catatan: kunci cadangan ada di laci <mark>hijau</mark>.
                </p>
                <p>
                  Pertanyaan dan checkpoint tetap. Simpan dugaan sebelum membuka
                  hasil pembanding.
                </p>
                <span className="story-chip">
                  {revealed
                    ? "Hasil pembanding dibuka"
                    : "Hasil B masih tertutup"}
                </span>
              </article>
            )}
          </div>
          <div
            className="story-tabs"
            role="tablist"
            aria-label="Kedalaman penjelasan"
          >
            {["Makna", "Angka", "Kode"].map((t) => (
              <button
                key={t}
                id={`story-tab-${t}`}
                role="tab"
                aria-selected={tab === t}
                aria-controls="story-tab-panel"
                tabIndex={tab === t ? 0 : -1}
                onKeyDown={(e) => {
                  const names = ["Makna", "Angka", "Kode"];
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next =
                      names[
                        (names.indexOf(tab) +
                          (e.key === "ArrowRight" ? 1 : 2)) %
                          3
                      ];
                    setTab(next);
                    document.getElementById(`story-tab-${next}`)?.focus();
                  }
                }}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            <span>
              {lesson >= 4 && lesson <= 7
                ? "DI DALAM BLOK TRANSFORMER"
                : "SATU KASUS · SATU SUMBER ANGKA"}
            </span>
          </div>
          <div
            id="story-tab-panel"
            role="tabpanel"
            aria-labelledby={`story-tab-${tab}`}
            className="story-reading"
          >
            {tab === "Makna" ? (
              <p>{current.story}</p>
            ) : tab === "Kode" ? (
              <pre>{current.code}</pre>
            ) : (
              <>
                <p>
                  Trace aktif: case {caseId} / step {activeStep} / layer{" "}
                  {layer + 1} / head {head + 1} / query pos {position}. Shape
                  input [{trace.ids.length}, 32], Q/K/V [{trace.ids.length},
                  32], satu head [{trace.ids.length}, 16], vocabulary [32].
                </p>
                <button
                  onClick={() =>
                    downloadJSON(
                      "neurolab-trace.json",
                      tracePacket(
                        caseId,
                        activeStep,
                        layer,
                        head,
                        position,
                        inspectedTrace,
                        { temperature, topK, topP, seed, greedy },
                      ),
                    )
                  }
                >
                  Unduh semua tensor
                </button>
                <p>
                  Angka dibulatkan hanya pada tampilan. Simbol −∞ diekspor JSON
                  sebagai null pada skor yang dimask; konfigurasi causal dan
                  indeks baris/kolom menentukan lokasinya.
                </p>
              </>
            )}
          </div>

          {lesson >= 1 && lesson <= 9 && (
            <div
              className="story-position-strip"
              aria-label="Pilih posisi token"
            >
              {trace.ids.map((id: number, i: number) => (
                <button
                  key={i}
                  className={`${i === position ? "selected" : ""} ${i >= promptIds(caseId).length ? "generated" : ""}`}
                  aria-pressed={i === position}
                  onClick={() => setSelected(i)}
                >
                  <small>
                    pos {i} · id {id}
                  </small>
                  <span>{visible(model.vocab[id])}</span>
                </button>
              ))}
            </div>
          )}
          {lesson >= 4 && lesson <= 9 && (
            <div className="story-controls">
              <label>
                Blok{" "}
                <select
                  aria-label="Blok"
                  value={layer}
                  onChange={(e) => setLayer(Number(e.target.value))}
                >
                  <option value={0}>1 / 2</option>
                  <option value={1}>2 / 2</option>
                </select>
              </label>
              <label>
                Head{" "}
                <select
                  aria-label="Head"
                  value={head}
                  onChange={(e) => setHead(Number(e.target.value))}
                >
                  <option value={0}>1 / 2</option>
                  <option value={1}>2 / 2</option>
                </select>
              </label>
              <span>
                Posisi terpilih: {position}. Blok ≠ langkah generation.
              </span>
            </div>
          )}

          {lesson === 1 && (
            <div className="story-instrument">
              <h3>Susun ulang empat potongan pertama</h3>
              <p>
                Gunakan tombol panah untuk memulihkan “Catatan: kunci cadangan”.
                Potongan lain tetap terkunci. Spasi adalah bagian token.
              </p>
              <div className="story-sort">
                {tokenOrder.map((n, i) => (
                  <div key={n}>
                    <code>{visible(reconstructionPieces[n])}</code>
                    <button
                      disabled={i === 0}
                      aria-label={`Pindahkan ${visible(reconstructionPieces[n])} ke kiri`}
                      onClick={() =>
                        setTokenOrder((old) => {
                          const a = [...old];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          return a;
                        })
                      }
                    >
                      ←
                    </button>
                    <button
                      disabled={i === 3}
                      aria-label={`Pindahkan ${visible(reconstructionPieces[n])} ke kanan`}
                      onClick={() =>
                        setTokenOrder((old) => {
                          const a = [...old];
                          [a[i], a[i + 1]] = [a[i + 1], a[i]];
                          return a;
                        })
                      }
                    >
                      →
                    </button>
                  </div>
                ))}
              </div>
              <p>
                Rekonstruksi:{" "}
                <code>
                  {tokenOrder.map((n) => reconstructionPieces[n]).join("")}
                </code>
              </p>
              {revealed && (
                <p role="status">
                  {tokenOrder.every((n, i) => n === i)
                    ? "Persis: seluruh potongan bisa digabung kembali tanpa kehilangan karakter."
                    : "Urutan belum persis. Perhatikan posisi “ kunci” dan “ cadangan”."}
                </p>
              )}
              <details>
                <summary>Contoh subword terpisah</summary>
                <p>
                  “bel” + “ajar” = “belajar”. Dua token dapat membentuk satu
                  kata. Ini contoh segmentasi terpisah, bukan keluaran tokenizer
                  checkpoint atau klaim BPE.
                </p>
              </details>
            </div>
          )}
          {lesson === 7 && (
            <div className="story-instrument">
              <h3>Pasang urutan operasi satu blok</h3>
              <div className="story-sort">
                {blockOrder.map((n, i) => (
                  <div key={n}>
                    <span>{blockPieces[n]}</span>
                    <button
                      disabled={i === 0}
                      aria-label={`Geser operasi ${n + 1} ke kiri`}
                      onClick={() =>
                        setBlockOrder((old) => {
                          const a = [...old];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          return a;
                        })
                      }
                    >
                      ←
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section
            className="story-prediction"
            aria-label="Prediksi sebelum hasil"
          >
            <div className="story-section-title">
              <span>01</span>
              <h2>Simpan dugaanmu</h2>
              <small>
                {revealed
                  ? "Tersimpan sebelum observasi"
                  : "HASIL PEMBANDING BELUM DIBUKA"}
              </small>
            </div>
            <fieldset disabled={revealed}>
              <legend>{current.prediction}</legend>
              {shuffled(current.choices.length, lesson % 3).map((i) => (
                <label
                  key={i}
                  className={`story-radio ${prediction === i ? "checked" : ""}`}
                >
                  <input
                    type="radio"
                    name="prediction"
                    checked={prediction === i}
                    onChange={() => setPrediction(i)}
                  />
                  <span>{current.choices[i]}</span>
                </label>
              ))}
            </fieldset>
            <div className="story-actions">
              <button
                className="story-primary"
                disabled={prediction === null || revealed}
                onClick={() => observe()}
              >
                {revealed ? <Check size={16} /> : <ArrowRight size={16} />}{" "}
                {current.action}
              </button>
              {!revealed && (
                <button
                  className="story-text-button"
                  onClick={() => observe(true)}
                >
                  Tunjukkan demonstrasi
                </button>
              )}
              {revealed && (
                <button
                  onClick={() => {
                    setRevealed(false);
                    setEvidenceChoice(null);
                    setFeedback("");
                  }}
                >
                  Ulangi prediksi
                </button>
              )}
            </div>
          </section>

          {revealed && (
            <section
              className="story-observation"
              data-testid="story-observation"
            >
              <div className="story-section-title">
                <span>02</span>
                <h2>Buka mesin, baca buktinya</h2>
                <small>HASIL AKTUAL</small>
              </div>
              {lesson === 0 && comparison && (
                <>
                  <div className="story-ab">
                    <Candidates
                      logits={trace.lastLogits}
                      probabilities={
                        distribution(trace.lastLogits).probabilities
                      }
                      title="A · catatan biru"
                    />
                    <Candidates
                      logits={comparison.lastLogits}
                      probabilities={
                        distribution(comparison.lastLogits).probabilities
                      }
                      title="B · catatan hijau"
                    />
                  </div>
                  <p className="story-result">{observation()}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Titik pemeriksaan</th>
                        <th>Δ maksimum A/B</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Input posisi terakhir (E + P)</th>
                        <td>
                          {fmt(
                            maxDifference(
                              trace.X0.at(-1),
                              comparison.X0.at(-1),
                            ),
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Query terakhir, blok 1</th>
                        <td>
                          {fmt(
                            maxDifference(
                              trace.blocks[0].Q.at(-1),
                              comparison.blocks[0].Q.at(-1),
                            ),
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Output attention terakhir, blok 1</th>
                        <td>
                          {fmt(
                            maxDifference(
                              trace.blocks[0].attention.at(-1),
                              comparison.blocks[0].attention.at(-1),
                            ),
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Query terakhir, blok 2</th>
                        <td>
                          {fmt(
                            maxDifference(
                              trace.blocks[1].Q.at(-1),
                              comparison.blocks[1].Q.at(-1),
                            ),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p>
                    Perbandingan lokal berhenti di prefix jawaban yang masih
                    sama. Sesudah warna berbeda, keduanya menjadi cabang
                    generation berbeda.
                  </p>
                </>
              )}
              {(lesson === 2 || lesson === 3) && (
                <LookupPanel
                  trace={trace}
                  position={position}
                  lesson={lesson}
                />
              )}
              {lesson >= 4 && lesson <= 6 && (
                <AttentionPanel
                  trace={inspectedTrace}
                  position={position}
                  layer={layer}
                  head={head}
                  lesson={lesson}
                />
              )}
              {lesson === 5 && comparison && (
                <>
                  <p className="story-result">{observation()}</p>
                  <button onClick={() => setDiagnosticMask(!diagnosticMask)}>
                    {diagnosticMask
                      ? "Tutup diagnosis tanpa mask"
                      : "Buka mask pada salinan diagnostik"}
                  </button>
                  {diagnosticMask && (
                    <p>
                      Arsitektur diubah untuk demonstrasi kebocoran. Δ prefix
                      tanpa mask ={" "}
                      {fmt(
                        maxDifference(
                          forward(trace.ids, model, {
                            causal: false,
                          }).blocks[1].output.slice(0, 7),
                          forward(comparison.ids, model, {
                            causal: false,
                          }).blocks[1].output.slice(0, 7),
                        ),
                      )}
                      . Ini bukan mode normal model.
                    </p>
                  )}
                </>
              )}
              {lesson === 6 && <OperatorExample />}
              {lesson === 7 && (
                <BlockPanel
                  trace={trace}
                  altered={inspectedTrace}
                  position={position}
                  layer={layer}
                  ablation={ablation}
                  onAblation={setAblation}
                />
              )}
              {lesson === 8 && (
                <>
                  <div className="story-controls">
                    <label>
                      Temperature{" "}
                      <input
                        aria-label="Temperature"
                        type="range"
                        min="0"
                        max="4"
                        step=".1"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                      />
                      <b>
                        {temperature.toFixed(1)}
                        {temperature === 0 ? " (greedy)" : ""}
                      </b>
                    </label>
                    <label>
                      Top-k{" "}
                      <select
                        value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                      >
                        {[0, 1, 3, 5, 10].map((k) => (
                          <option key={k} value={k}>
                            {k || "Semua"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Top-p{" "}
                      <select
                        value={topP}
                        onChange={(e) => setTopP(Number(e.target.value))}
                      >
                        {[1, 0.95, 0.8, 0.5].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Seed{" "}
                      <input
                        type="number"
                        aria-label="Seed"
                        min="0"
                        max="999999"
                        value={seed}
                        onChange={(e) =>
                          setSeed(
                            Math.max(
                              0,
                              Math.min(999999, Number(e.target.value)),
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="story-radio">
                      <input
                        type="checkbox"
                        checked={greedy}
                        onChange={(e) => setGreedy(e.target.checked)}
                      />
                      Greedy
                    </label>
                  </div>
                  <Candidates
                    logits={trace.lastLogits}
                    probabilities={probabilities.probabilities}
                  />
                  <button onClick={() => setSeed((s) => s + 1)}>
                    Undi lagi dari logits yang sama
                  </button>
                  <p className="story-result">
                    Pilihan:{" "}
                    <b>{visible(model.vocab[probabilities.selected!])}</b> ·{" "}
                    {probabilities.greedy
                      ? "argmax tanpa undian"
                      : `draw ${fmt(probabilities.draw)}`}
                    . Hanya satu pilihan dibandingkan di meja ini; loop
                    generation memakai greedy.
                  </p>
                  <details>
                    <summary>Contoh hitung terpisah: logits [2,1,0]</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>T</th>
                          <th>A</th>
                          <th>B</th>
                          <th>C</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[0.5, 1, 2].map((t) => (
                          <tr key={t}>
                            <th>{t}</th>
                            {distribution([2, 1, 0], {
                              temperature: t,
                            }).probabilities.map((p: number, i: number) => (
                              <td key={i}>{percent(p)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              )}
              {lesson === 9 && (
                <>
                  <div className="story-generation">
                    <h3>Prefill → pilih → tambah konteks → hitung lagi</h3>
                    <ol>
                      {run.steps.map((s, i) => (
                        <li
                          key={i}
                          className={i === activeStep ? "active" : ""}
                        >
                          <button
                            onClick={() => {
                              setStep(i);
                              setSelected(-1);
                            }}
                            disabled={i > activeStep + 1}
                          >
                            {i + 1}.{" "}
                            {i <= activeStep
                              ? visible(model.vocab[s.token])
                              : "belum dipilih"}
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button
                      className="story-primary"
                      disabled={activeStep >= run.steps.length - 1}
                      onClick={() => {
                        setStep((s) => s + 1);
                        setSelected(-1);
                      }}
                    >
                      Tambahkan pilihan dan hitung langkah berikutnya
                    </button>
                    <button
                      onClick={() => {
                        setStep(0);
                        setSelected(-1);
                      }}
                    >
                      <RotateCcw size={14} />
                      Ulangi prefill
                    </button>
                    <p>
                      Konteks di atas berisi prompt + {activeStep} token. Posisi
                      terakhir {trace.ids.length - 1} menghasilkan pilihan{" "}
                      {visible(model.vocab[run.steps[activeStep].token])}.{" "}
                      {activeStep === run.steps.length - 1
                        ? `Berhenti: ${run.stop}. Titik bukan aturan berhenti; EOS adalah token khusus.`
                        : "K/V pilihan ini belum dihitung sampai langkah berikutnya."}
                    </p>
                  </div>
                  <CachePanel
                    prefixIds={activeStep ? trace.ids.slice(0, -1) : trace.ids}
                    nextToken={
                      activeStep ? trace.ids.at(-1) : run.steps[0].token
                    }
                  />
                </>
              )}
              {lesson === 10 && (
                <TrainingPanel
                  updates={trainingUpdates}
                  onUpdates={setTrainingUpdates}
                />
              )}
              {lesson === 11 && (
                <SortingPanel key={lesson} onValid={setSortingValid} />
              )}
              {lesson === 12 && (
                <GroundingPanel caseId={caseId} onCase={changeCase} />
              )}
              {lesson === 13 && (
                <>
                  <p className="story-result">
                    Hasil aktual: {decode(run.output, model)} ·{" "}
                    {supportedResult ===
                    decode(
                      run.output.filter((id: number) => id !== 19),
                      model,
                    )
                      ? "Cocok dengan catatan."
                      : "Belum cocok dengan catatan."}
                  </p>
                  <TransferPanel onValid={setTransferValid} />
                  <details>
                    <summary>Tinjau dugaan pembuka</summary>
                    <p>
                      {book.find((e) => e.lesson === 0)?.prediction ??
                        "Dugaan pembuka belum disimpan dalam buku bukti."}
                    </p>
                    <p>
                      Bandingkan dengan penjelasanmu sekarang. Kesalahan awal
                      bukan penalti.
                    </p>
                  </details>
                </>
              )}
              <div className="story-takeaway">
                <small>YANG BARU SAJA KITA TEMUKAN</small>
                <p>{current.takeaway}</p>
              </div>
              <div className="story-section-title">
                <span>03</span>
                <h2>Jelaskan dan simpan bukti</h2>
              </div>
              <fieldset>
                <legend>Kesimpulan mana yang didukung percobaan?</legend>
                {shuffled(current.evidence.length, (lesson + 1) % 3).map(
                  (i) => (
                    <label
                      className={`story-radio ${evidenceChoice === i ? "checked" : ""}`}
                      key={i}
                    >
                      <input
                        type="radio"
                        name="evidence"
                        checked={evidenceChoice === i}
                        onChange={() => setEvidenceChoice(i)}
                      />
                      {current.evidence[i]}
                    </label>
                  ),
                )}
              </fieldset>
              <label className="story-reflection">
                {lesson === 13
                  ? "Jelaskan hubungan konteks, bobot, cache, dan sumber dengan kata-katamu sendiri"
                  : "Catatan dengan kata-katamu sendiri (opsional)"}
                <textarea
                  value={reflection}
                  maxLength={2000}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Saya mengira… Setelah memeriksa…, saya menemukan…"
                  rows={3}
                />
              </label>
              <div className="story-actions">
                <button
                  className="story-primary"
                  onClick={() => saveEvidence()}
                >
                  <BookOpen size={15} />
                  Simpan bukti dan penjelasan
                </button>
                <button onClick={() => saveEvidence(true)}>
                  {demonstrated
                    ? "Catat demonstrasi sebagai diamati"
                    : "Simpan sebagai sudah diamati"}
                </button>
              </div>
              {feedback && (
                <p role="status" className="story-feedback">
                  {feedback}
                </p>
              )}
            </section>
          )}
          <footer className="story-next">
            <p>{current.transition}</p>
            <div>
              <button
                disabled={guided ? currentRouteIndex <= 0 : lesson === 0}
                onClick={() =>
                  go(steps[Math.max(0, currentRouteIndex - 1)] ?? 0)
                }
              >
                <ArrowLeft size={15} />
                Kembali
              </button>
              {next !== undefined ? (
                <button className="story-primary" onClick={() => go(next)}>
                  {lessons[next].short}
                  <ArrowRight size={16} />
                </button>
              ) : guided ? (
                <button className="story-primary" onClick={guided.onExit}>
                  Kembali ke misi
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="story-primary"
                  onClick={() => setBookOpen(true)}
                >
                  Tinjau buku bukti
                  <BookOpen size={16} />
                </button>
              )}
            </div>
          </footer>
          <details className="story-annex">
            <summary>Eksplorasi lanjutan dan batas model</summary>
            <p>
              Semua angka utama berasal dari model mini terlatih. Ruang lama
              adalah workbench matematika dengan bobot acak deterministik dan
              fixture terpisah; bukan kelanjutan trace kasus kunci.
            </p>
            <a href="?explore=1">Buka eksplorasi bebas 3D ↗</a>
            <p>
              Model besar dapat memakai RoPE, RMSNorm, gated MLP, GQA atau MoE.
              Profil lab sengaja memakai dua blok kecil dengan dense causal
              attention; ukurannya tidak mewakili kemampuan model besar.
            </p>
            <p>
              Proyeksi fitur 0–2 bukan PCA dan tidak membuktikan dimensi “warna”
              atau “makna”. Generalisasi dan pemahaman pengunjung tetap perlu
              diuji dengan orang nyata.
            </p>
            <label>
              Kasus numerik tambahan{" "}
              <select
                value={caseId}
                disabled={lesson === 0 || lesson === 5}
                onChange={(e) => changeCase(e.target.value as CaseId)}
              >
                {Object.entries(cases).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <p>{cases[caseId].provenance}</p>
          </details>
        </section>
      </div>
      <dialog
        ref={dialogRef}
        className="story-book"
        aria-labelledby="story-book-title"
        onCancel={() => setBookOpen(false)}
        onClose={() => setBookOpen(false)}
      >
        <header>
          <div>
            <small>CATATAN INVESTIGASI</small>
            <h2 id="story-book-title">Buku bukti</h2>
          </div>
          <button
            aria-label="Tutup buku bukti"
            onClick={() => setBookOpen(false)}
          >
            <X size={20} />
          </button>
        </header>
        <p>
          {explained} bukti dijelaskan · {book.length - explained} diamati.
          Tersimpan di perangkat ini.
          {storageError
            ? " Penyimpanan lokal tidak tersedia; unduh bukti sebelum menutup halaman."
            : ""}
        </p>
        <button
          onClick={() =>
            downloadJSON("neurolab-buku-bukti.json", {
              version: 2,
              checkpoint: model.checkpoint,
              evidence: book,
            })
          }
        >
          <Download size={16} />
          Unduh buku bukti
        </button>
        {book.length === 0 ? (
          <p>
            Belum ada bukti. Simpan prediksi, amati hasil, lalu jelaskan
            hubungan yang ditemukan.
          </p>
        ) : (
          book.map((e) => (
            <article key={e.lesson}>
              <span className="story-chip">
                {e.status === "explained"
                  ? "Sudah dijelaskan"
                  : "Sudah diamati"}{" "}
                · POS {e.lesson}
              </span>
              <h3>{lessons[e.lesson].title}</h3>
              <dl>
                <dt>Dugaan awal</dt>
                <dd>{e.prediction}</dd>
                <dt>Yang diubah</dt>
                <dd>{e.changed}</dd>
                <dt>Kondisi</dt>
                <dd>{e.controls}</dd>
                <dt>Hasil</dt>
                <dd>{e.observation}</dd>
                <dt>Kesimpulan</dt>
                <dd>{e.conclusion}</dd>
                {e.reflection && (
                  <>
                    <dt>Penjelasanmu</dt>
                    <dd>{e.reflection}</dd>
                  </>
                )}
              </dl>
              <button
                onClick={() => {
                  setBookOpen(false);
                  go(e.lesson, e);
                }}
              >
                Buka kembali percobaan
              </button>
            </article>
          ))
        )}
      </dialog>
    </main>
  );
}
