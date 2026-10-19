import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Box,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CircleHelp,
  Compass,
  Check,
  Expand,
  FlaskConical,
  Grid2X2,
  Home,
  Layers3,
  Link2,
  Network,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  X,
  Zap,
} from "lucide-react";
import {
  stations,
  experiments,
  operations,
  checkpoints,
  glossary,
  references,
} from "../content/lessons";
import { useExperience } from "../store/experience";
import { getSnapshot } from "../simulation/snapshot";
import { writeLink } from "../navigation/state";
import Inspector from "../inspector/Inspector";
import StationView, { TokenStrip } from "../stations/StationView";
const LabScene = lazy(() => import("../scene/LabScene"));
class SceneBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-failure">
        <Box size={36} />
        <p>3D tidak tersedia. Semua operasi tetap bisa dipelajari.</p>
        <button className="button primary" onClick={this.props.onFallback}>
          Lanjutkan dengan diagram 2D
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Network size={20} strokeWidth={1.6} />
      </span>
      Neuro<span>Lab</span>
      <span className="brand-version">/ 01</span>
    </span>
  );
}
function Header({ onNotes }: { onNotes: () => void }) {
  const s = useExperience();
  return (
    <header className="site-header">
      <a
        href={import.meta.env.VITE_EXIT_URL ?? "./"}
        className="logo-link"
        onClick={(e) => {
          if (!import.meta.env.VITE_EXIT_URL) {
            e.preventDefault();
            s.patch({ entered: false, playing: false });
          }
        }}
        aria-label="NeuroLab beranda"
      >
        <Logo />
      </a>
      <nav>
        <span className="header-label">AN INTERACTIVE LEARNING LAB</span>
        <button className="text-button" onClick={onNotes}>
          Catatan engineering <ArrowUpRight size={14} />
        </button>
        {s.entered && (
          <button
            className="exit-link"
            onClick={() => s.patch({ entered: false, playing: false })}
          >
            <ArrowLeft size={14} /> Artikel
          </button>
        )}
      </nav>
    </header>
  );
}
function Landing({ onNotes }: { onNotes: () => void }) {
  const s = useExperience();
  const start = (mode: "3d" | "2d") => {
    s.patch({ entered: true, mode, overview: false });
    window.scrollTo({ top: 0 });
  };
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> THE LANGUAGE MODEL, EXPLAINED.
          </div>
          <h1>
            Satu token.
            <br />
            Seluruh <em>perjalanan.</em>
          </h1>
          <p className="hero-description">
            Bagaimana teks menjadi angka, menemukan konteks, lalu memilih kata
            berikutnya? Masuk ke laboratorium dan lihat cara kerja LLM dari
            dalam.
          </p>
          <div className="hero-actions">
            <button
              className="button primary large"
              onClick={() => start("3d")}
            >
              Ikuti satu token <ArrowRight size={17} />
            </button>
            <button className="button large" onClick={() => start("2d")}>
              <BookOpen size={17} /> Baca tanpa 3D
            </button>
          </div>
          <div className="hero-meta">
            <span>8 STASIUN</span>
            <i />
            <span>7 EKSPERIMEN</span>
            <i />
            <span>8–12 MENIT</span>
          </div>
          <div className="simulation-note">
            <FlaskConical size={16} />
            <p>
              Simulator edukasi. Angka diperkecil dan dikurasi;
              <br />
              bukan keluaran GPT-2 asli.
            </p>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-topline">
            <span>
              <i /> OBSERVATORY / LIVE FIELD GUIDE
            </span>
            <span>VOL. 001</span>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}lab-overview.jpg`}
            alt="Observatorium NeuroLab: ruang laboratorium dengan delapan instrumen yang mengikuti jalur U"
            width="1360"
            height="900"
          />
          <div className="visual-grid" />
          <div className="floating-label">
            <span className="mini-dot" />
            <div>
              <small>FOLLOW THE SIGNAL</small>
              <b>Teks → token → konteks</b>
            </div>
            <ArrowUpRight size={21} />
          </div>
          <div className="visual-bottom">
            <span>36 × 24 M · EIGHT STATIONS</span>
            <button
              onClick={() => {
                start("3d");
                s.patch({ overview: true, camera: "orbit" });
              }}
            >
              Jelajahi lab <Compass size={15} />
            </button>
          </div>
        </div>
      </section>
      <section className="route-intro">
        <div>
          <span className="section-kicker">DARI INPUT KE TOKEN BERIKUTNYA</span>
          <h2>
            Ikuti sinyalnya.
            <br />
            <em>Pahami mekanismenya.</em>
          </h2>
        </div>
        <p>
          Setiap instrumen menjawab satu pertanyaan. Ikuti cerita, lihat angka,
          lalu telusuri operasinya. Tidak perlu kalkulus atau kemampuan navigasi
          3D.
        </p>
      </section>
      <div className="landing-stations">
        {stations.map((st, i) => (
          <button
            key={st.id}
            onClick={() => {
              start("3d");
              s.navigate(st.id);
            }}
          >
            <span className="station-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="station-symbol" style={{ color: st.color }}>
              {i === 0 ? (
                <ScanLine />
              ) : i === 2 ? (
                <Network />
              ) : i === 4 ? (
                <Layers3 />
              ) : i === 5 ? (
                <Zap />
              ) : (
                <Grid2X2 />
              )}
            </span>
            <h3>{st.title}</h3>
            <p>{st.short}</p>
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <section className="experiment-section" id="experiments">
        <div className="section-heading">
          <div>
            <span className="section-kicker">SEVEN WAYS TO ASK WHY</span>
            <h2>Coba. Ubah. Amati.</h2>
          </div>
          <span>Eksperimen kecil untuk ide besar.</span>
        </div>
        <div className="experiment-grid">
          {experiments.map((e) => (
            <button
              className="experiment-card"
              key={e.id}
              onClick={() => {
                s.experimentTo(e.id);
                start("3d");
              }}
            >
              <div>
                <span className="experiment-letter">{e.id}</span>
                <small>{e.tag}</small>
                <span>{e.duration}</span>
              </div>
              <h3>{e.name}</h3>
              <p>{e.subtitle}</p>
              <ArrowUpRight size={19} />
            </button>
          ))}
        </div>
      </section>
      <section className="article-body">
        <div className="section-kicker">SEBELUM MASUK LAB</div>
        <div className="article-columns">
          <article>
            <h2>Mengapa GPT-2?</h2>
            <p>
              Arsitektur decoder-only GPT-2 memiliki implementasi publik yang
              dapat ditelusuri. Ia memberi titik awal konkret untuk memahami
              pre-norm attention, learned position embeddings, GELU, residual,
              dan autoregresi.
            </p>
            <p>
              Model referensi GPT-2 small memiliki 12 blok, 12 head, lebar 768,
              dan vocabulary 50.257. Lab menggunakan 2 blok, 2 head, lebar 8,
              dan 16 token mainan. Browser tidak memuat bobot GPT-2.
            </p>
            <a
              className="text-button"
              href="https://github.com/openai/gpt-2/blob/master/src/model.py"
              target="_blank"
              rel="noreferrer"
            >
              Periksa implementasi referensi <ArrowUpRight size={15} />
            </a>
          </article>
          <article>
            <h2>Apa yang bisa dipelajari?</h2>
            <p>
              Bagaimana satu representasi menghasilkan Q/K/V, mengapa masa depan
              ditutup, bagaimana Value dicampurkan, dan bagaimana distribusi
              vocabulary memilih token berikutnya.
            </p>
            <p>
              Angka pipeline dihitung dari bobot mainan deterministik. Vignette
              attention dan sampling lokal diberi label terpisah. Attention
              memperlihatkan operasi; ia bukan penjelasan lengkap penyebab
              keputusan model.
            </p>
            <button className="text-button" onClick={onNotes}>
              Sumber, asumsi, dan keputusan engineering{" "}
              <ArrowUpRight size={15} />
            </button>
          </article>
        </div>
      </section>
      <footer className="site-footer">
        <Logo />
        <span>Dibuat untuk rasa ingin tahu.</span>
        <span>GPT-2 REFERENCE · TOY SIMULATION</span>
      </footer>
    </main>
  );
}
function Checkpoints({ onClose }: { onClose: () => void }) {
  const s = useExperience(),
    [answers, setAnswers] = useState<Record<number, number>>({});
  const score = checkpoints.reduce(
    (n, q, i) => n + Number(answers[i] === q.correct),
    0,
  );
  return (
    <>
      <div className="section-kicker">SESUDAH PERJALANAN</div>
      <h2>Tiga pertanyaan kecil.</h2>
      <p>
        Periksa apakah mekanismenya sudah terasa masuk akal. Jawaban salah
        disertai penjelasan dan jalan kembali ke instrumen.
      </p>
      <div className="quiz">
        {checkpoints.map((q, i) => (
          <fieldset key={i}>
            <legend>
              {i + 1}. {q.question}
            </legend>
            {q.choices.map((a, j) => (
              <label
                key={j}
                className={
                  answers[i] === j
                    ? j === q.correct
                      ? "correct"
                      : "incorrect"
                    : ""
                }
              >
                <input
                  type="radio"
                  name={`question-${i}`}
                  checked={answers[i] === j}
                  onChange={() => setAnswers({ ...answers, [i]: j })}
                />
                {a}
              </label>
            ))}
            {answers[i] !== undefined && (
              <div className="quiz-feedback">
                <b>
                  {answers[i] === q.correct
                    ? "Tepat."
                    : "Coba perhatikan mekanismenya."}
                </b>
                <p>{q.explanation}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    s.navigate(q.station);
                    onClose();
                  }}
                >
                  Kembali ke {q.station} <ArrowUpRight size={14} />
                </button>
              </div>
            )}
          </fieldset>
        ))}
      </div>
      {Object.keys(answers).length === 3 && (
        <div className="quiz-result">
          <b>{score} dari 3 jawaban tepat.</b>
          <p>
            {score >= 2 &&
            s.traced &&
            s.finished &&
            s.experiment === "A" &&
            new Set(s.completedStations).size >= 7
              ? "Perjalanan selesai, satu angka ditelusuri, dan checkpoint terjawab: sesi belajar berhasil."
              : score >= 2
                ? "Konsep dasarnya sudah terbaca. Selesaikan perjalanan dan telusuri satu derivasi angka untuk melengkapi sesi."
                : "Anda bisa mengulang stasiun yang relevan, lalu memperbarui jawaban."}
          </p>
        </div>
      )}
      <button
        className="button primary"
        onClick={() => {
          s.experimentTo("A");
          onClose();
        }}
      >
        Ulangi perjalanan <RotateCcw size={15} />
      </button>
    </>
  );
}
function Notes() {
  return (
    <>
      <span className="section-kicker">TRANSPARANSI & REFERENSI</span>
      <h2>Keputusan di balik lab.</h2>
      <p>
        Lab adalah metafora ruang belajar. Perhitungan decoder berjalan lokal
        dengan dimensi kecil; tidak ada inference GPT-2, training, API LLM,
        akun, atau tracking input.
      </p>
      <div className="notes-grid">
        <div>
          <h3>Pipeline yang dapat diaudit</h3>
          <p>
            Seed 42 menghasilkan bobot yang sama. LayerNorm memakai epsilon
            1e−5, gamma 1, beta 0. Bias nol tersedia di inspector. Dua blok
            lengkap meliputi attention dan MLP; proyeksi vocabulary berbagi
            embedding input.
          </p>
        </div>
        <div>
          <h3>Dua sumber angka</h3>
          <p>
            Pipeline fixture menghubungkan seluruh tensor secara matematis.
            Concept vignette adalah contoh lokal terkurasi untuk mengisolasi
            satu konsep. Logits masuk akal di eksperimen F tidak diklaim sebagai
            keluaran pipeline.
          </p>
        </div>
        <div>
          <h3>Representasi, bukan pikiran</h3>
          <p>
            Warna dan beam mengodekan nilai, tanda, dan bobot. Attention tidak
            membuktikan penyebab lengkap suatu keputusan. Head tidak diberi
            peran semantik universal dan neuron bukan tempat satu fakta.
          </p>
        </div>
        <div>
          <h3>Akses & performa</h3>
          <p>
            Three.js dimuat setelah masuk mode 3D. Model GLB dibatch per
            material; kamera dan tabel berbagi snapshot. Mode 2D tetap lengkap,
            DPR dibatasi, idle rendering berhenti, dan reduced motion
            menghindari camera flight.
          </p>
        </div>
      </div>
      <h3>Glossary singkat</h3>
      <dl className="glossary">
        {glossary.map(([word, definition]) => (
          <div key={word}>
            <dt>{word}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
      <h3>Sumber primer</h3>
      <div className="reference-list">
        {references.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noreferrer">
            <div>
              <b>{r.title}</b>
              <p>{r.note}</p>
            </div>
            <ArrowUpRight size={17} />
          </a>
        ))}
      </div>
      <p className="small">
        Integrasi portofolio dapat memakai subpath Vite atau iframe. Konfigurasi
        VITE_ASSET_BASE_URL dan VITE_EXIT_URL tersedia; tidak ada URL profil
        pribadi yang dikarang.
      </p>
    </>
  );
}
function Modal({
  kind,
  onClose,
}: {
  kind: "notes" | "quiz" | "help";
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const close = () => onClose();
    d.addEventListener("cancel", close);
    return () => {
      d.removeEventListener("cancel", close);
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={
        kind === "quiz"
          ? "Checkpoint pembelajaran"
          : kind === "notes"
            ? "Catatan engineering"
            : "Bantuan navigasi"
      }
    >
      <button
        className="modal-close icon-button"
        onClick={onClose}
        aria-label="Tutup dialog"
      >
        <X size={20} />
      </button>
      {kind === "notes" ? (
        <Notes />
      ) : kind === "quiz" ? (
        <Checkpoints onClose={onClose} />
      ) : (
        <>
          <span className="section-kicker">PANDUAN NAVIGASI</span>
          <h2>Lab ini milik rasa ingin tahu Anda.</h2>
          <p>
            Gunakan peta stasiun dan Lanjut untuk mengikuti tur. Tab Makna,
            Angka, dan Kode mengubah kedalaman tanpa mengulang perjalanan. Klik
            sel matriks untuk derivasi angka.
          </p>
          <dl className="glossary">
            <div>
              <dt>Orbit</dt>
              <dd>
                Drag untuk memutar instrumen; scroll atau pinch untuk zoom.
              </dd>
            </div>
            <div>
              <dt>Jelajahi lab</dt>
              <dd>
                Klik canvas untuk menangkap mouse. WASD / arrow berjalan. ESC
                keluar. Home kembali ke koridor aman.
              </dd>
            </div>
            <div>
              <dt>Keyboard</dt>
              <dd>
                Tab berpindah kontrol; Enter / Space memilih. Input tidak
                menggerakkan kamera.
              </dd>
            </div>
            <div>
              <dt>Mode 2D</dt>
              <dd>
                Operasi, kontrol, dan tujuan belajar yang sama. Cocok untuk
                mobile dan perangkat tanpa WebGL.
              </dd>
            </div>
          </dl>
          <p>
            Pause saat tab browser tersembunyi. Reduced motion memakai
            perpindahan kamera langsung.
          </p>
        </>
      )}
    </dialog>
  );
}
function Experience({
  onModal,
}: {
  onModal: (kind: "notes" | "quiz" | "help") => void;
}) {
  const s = useExperience(),
    [view, setView] = useState<"room" | "diagram">("room"),
    [copied, setCopied] = useState(false),
    [inspectorOpen, setInspectorOpen] = useState(false),
    [shareError, setShareError] = useState("");
  const full = useRef<HTMLDivElement>(null);
  const station = stations.find((x) => x.id === s.station)!;
  useEffect(() => {
    if (s.tab !== "meaning" && matchMedia("(max-width:680px)").matches)
      setInspectorOpen(true);
  }, [s.tab, s.token, s.column]);
  const p = useMemo(
    () => getSnapshot(s),
    [
      s.ids,
      s.swapped,
      s.experiment,
      s.station,
      s.step,
      s.head,
      s.layer,
      s.token,
      s.column,
      s.suffix,
      s.local,
      s.temperature,
      s.sampler,
      s.topK,
      s.topP,
    ],
  );
  useEffect(() => {
    if (s.mode !== "3d") return;
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2");
    if (!context) {
      s.patch({ mode: "2d", playing: false });
      setShareError(
        "3D tidak tersedia. Pelajaran tetap dapat dilanjutkan dengan diagram 2D.",
      );
    } else context.getExtension("WEBGL_lose_context")?.loseContext();
  }, [s.mode, s.patch]);
  useEffect(() => {
    if (!s.playing || document.hidden) return;
    const timer = setTimeout(s.next, 2700 / s.speed);
    return () => clearTimeout(timer);
  }, [s.playing, s.speed, s.station, s.step, s.next]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) s.patch({ playing: false });
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [s.patch]);
  useEffect(() => {
    if (s.finished) onModal("quiz");
  }, [s.finished]);
  const share = async () => {
    const url = new URL(location.href);
    url.hash = writeLink(s).slice(1);
    try {
      history.replaceState(null, "", url);
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setShareError("");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setShareError(
        "Tautan siap di bilah alamat. Salin URL untuk membagikan preset dan langkah ini.",
      );
    }
  };
  return (
    <main className="experience" ref={full}>
      <div className="lab-toolbar">
        <div className="lab-breadcrumb">
          <span className="mini-dot" />
          <b>OBSERVATORY</b>
          <ChevronRight size={14} />
          <span>Eksperimen {s.experiment}</span>
        </div>
        <div className="toolbar-actions">
          <select
            aria-label="Pilih eksperimen"
            value={s.experiment}
            onChange={(e) => {
              s.experimentTo(e.target.value as typeof s.experiment);
            }}
          >
            {experiments.map((e) => (
              <option value={e.id} key={e.id}>
                {e.id} · {e.name}
              </option>
            ))}
          </select>
          <div className="segmented">
            <button
              className={s.mode === "3d" ? "active" : ""}
              onClick={() => s.patch({ mode: "3d" })}
            >
              <Box size={14} />
              3D
            </button>
            <button
              className={s.mode === "2d" ? "active" : ""}
              onClick={() => s.patch({ mode: "2d", camera: "guided" })}
            >
              <Grid2X2 size={14} />
              2D
            </button>
          </div>
          <button
            className="icon-button"
            onClick={share}
            aria-label="Salin tautan langkah ini"
            title="Salin tautan langkah ini"
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else
                void full.current
                  ?.requestFullscreen()
                  .catch(() =>
                    setShareError("Fullscreen tidak tersedia di browser ini."),
                  );
            }}
            aria-label="Fullscreen"
          >
            <Expand size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => onModal("help")}
            aria-label="Bantuan"
          >
            <CircleHelp size={16} />
          </button>
        </div>
      </div>
      {shareError && (
        <p className="status-message" role="status">
          {shareError}
        </p>
      )}
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="stage-heading">
            <div>
              <span className="section-kicker">
                STASIUN {String(stations.indexOf(station) + 1).padStart(2, "0")}{" "}
                / 08
              </span>
              <h1>{station.title}</h1>
              <p>{station.short}</p>
            </div>
            <div className="stage-badge">
              <span className="mini-dot" />
              {p.provenance.startsWith("concept-vignette")
                ? "CONTOH LOKAL"
                : "ANGKA SIMULASI"}
            </div>
          </div>
          <div className="stage-view-switch">
            <button
              className={view === "room" && s.mode === "3d" ? "active" : ""}
              onClick={() => {
                s.patch({ mode: "3d" });
                setView("room");
              }}
            >
              <Box size={14} />
              Instrumen 3D
            </button>
            <button
              className={view === "diagram" || s.mode === "2d" ? "active" : ""}
              onClick={() => setView("diagram")}
            >
              <Grid2X2 size={14} />
              Diagram & kontrol
            </button>
          </div>
          {s.mode === "3d" && view === "room" ? (
            <div className="scene-region">
              <SceneBoundary onFallback={() => s.patch({ mode: "2d" })}>
                <Suspense
                  fallback={
                    <div className="scene-loading">
                      <span className="loading-ring" />
                      <p>Menyiapkan instrumen…</p>
                      <small>Outline dan inspector sudah bisa digunakan.</small>
                    </div>
                  }
                >
                  <LabScene snapshot={p} />
                </Suspense>
              </SceneBoundary>
              <div className="scene-top-controls">
                <button
                  className={s.overview ? "active" : ""}
                  onClick={() =>
                    s.patch({ overview: !s.overview, camera: "guided" })
                  }
                >
                  <Home size={14} />
                  {s.overview ? "Fokus stasiun" : "Overview"}
                </button>
                <button
                  className={s.camera === "orbit" ? "active" : ""}
                  onClick={() =>
                    s.patch({
                      camera: s.camera === "orbit" ? "guided" : "orbit",
                    })
                  }
                >
                  <RotateCcw size={14} />
                  Orbit
                </button>
                <button
                  className={`walk-button ${s.camera === "walk" ? "active" : ""}`}
                  onClick={() =>
                    s.patch({ camera: s.camera === "walk" ? "guided" : "walk" })
                  }
                >
                  <Compass size={14} />
                  {s.camera === "walk" ? "Kembali ke tur" : "Jelajahi lab"}
                </button>
              </div>
              <div className="scene-caption">
                <span className="mini-dot" />
                {s.camera === "walk"
                  ? "Klik canvas · WASD / arrow · ESC keluar · Home posisi aman"
                  : "Klik sel untuk menelusuri angka. Diagram menyediakan semua kontrol eksperimen."}
              </div>
            </div>
          ) : (
            <div className="diagram-region">
              <StationView snapshot={p} />
            </div>
          )}
          <div className="scene-data">
            <div>
              <span className="section-kicker">URUTAN AKTIF</span>
              <span>
                {p.local
                  ? `${p.attention.A.length} POSISI · vignette Q/K/V`
                  : `${p.ids.length} TOKEN · toy vocabulary`}
              </span>
            </div>
            <TokenStrip snapshot={p} />
          </div>
          <div className="timeline">
            <div className="timeline-current">
              <span>
                {String(s.step + 1).padStart(2, "0")} /{" "}
                {String(operations[s.station].length).padStart(2, "0")}
              </span>
              <strong>{p.op.name}</strong>
              <button
                className="text-button"
                onClick={s.replay}
                aria-label="Ulangi stasiun"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <input
              aria-label="Seek operasi stasiun"
              type="range"
              min="0"
              max={operations[s.station].length - 1}
              step="1"
              value={s.step}
              onChange={(e) =>
                s.patch({ step: +e.target.value, playing: false, column: 0 })
              }
            />
            <div className="timeline-controls">
              <div>
                <button
                  className="icon-button"
                  onClick={s.previous}
                  disabled={s.station === "tokenizer" && s.step === 0}
                  aria-label="Operasi sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="play-button"
                  onClick={() => s.patch({ playing: !s.playing })}
                  aria-label={s.playing ? "Pause" : "Play"}
                >
                  {s.playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <select
                  aria-label="Kecepatan putar"
                  value={s.speed}
                  onChange={(e) => s.patch({ speed: +e.target.value })}
                >
                  {[0.25, 0.5, 1, 2].map((v) => (
                    <option key={v} value={v}>
                      {v}×
                    </option>
                  ))}
                </select>
              </div>
              <span className="timeline-hint">
                HENTIKAN WAKTU. PERIKSA ANGKANYA.
              </span>
              <button
                className="button primary"
                onClick={() => {
                  if (
                    (s.station === "cache" && s.step === 2) ||
                    (s.station === "analogy" && s.step === 2)
                  ) {
                    s.patch({
                      playing: false,
                      finished: true,
                      completedStations:
                        s.experiment === "A"
                          ? [...new Set([...s.completedStations, s.station])]
                          : s.completedStations,
                    });
                    onModal("quiz");
                  } else s.next();
                }}
              >
                {(s.station === "cache" &&
                  s.step === operations.cache.length - 1) ||
                (s.station === "analogy" && s.step === 2)
                  ? "Checkpoint"
                  : s.experiment === "B" &&
                      s.station === "tokenizer" &&
                      s.step === 2
                    ? "Ke tur utama"
                    : s.experiment === "C" && p.local && s.step === 5
                      ? "Coba pipeline"
                      : "Lanjut"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
        <div
          className={`inspector-column ${inspectorOpen ? "sheet-open" : ""}`}
          id="lab-inspector"
        >
          <button
            className="sheet-close icon-button"
            aria-label="Tutup inspector"
            onClick={() => setInspectorOpen(false)}
          >
            <X size={18} />
          </button>
          <div className="tensor-selectors">
            <label>
              HEAD
              <select
                aria-label="Pilih attention head"
                disabled={p.local}
                value={s.head}
                onChange={(e) => s.patch({ head: +e.target.value, column: 0 })}
              >
                <option value="0">01</option>
                <option value="1">02</option>
              </select>
            </label>
            <label>
              BLOK DEMO
              <select
                aria-label="Pilih blok demo"
                disabled={p.local}
                value={s.layer}
                onChange={(e) => s.patch({ layer: +e.target.value, column: 0 })}
              >
                <option value="0">01 / 02</option>
                <option value="1">02 / 02</option>
              </select>
            </label>
            <label>
              RENDER
              <select
                aria-label="Kualitas render"
                value={s.quality}
                onChange={(e) =>
                  s.patch({ quality: e.target.value as typeof s.quality })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <Inspector snapshot={p} />
        </div>
      </div>
      {!inspectorOpen && (
        <button
          className="mobile-inspector-toggle"
          aria-controls="lab-inspector"
          aria-expanded={inspectorOpen}
          onClick={() => setInspectorOpen(true)}
        >
          <BookOpen size={17} />
          <span>
            Catatan lab <small>Makna · Angka · Kode</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
      )}
      <nav className="station-map" aria-label="Peta stasiun">
        {stations.map((st, i) => (
          <button
            key={st.id}
            className={s.station === st.id ? "active" : ""}
            onClick={() => s.navigate(st.id)}
            aria-current={s.station === st.id ? "step" : undefined}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <b>{st.title}</b>
              <small>{st.short}</small>
            </div>
            <ChevronRight size={13} />
          </button>
        ))}
      </nav>
      <div className="lab-bottomline">
        <span>
          SIMULATOR EDUKASI · DIMENSI DIPERKECIL · BUKAN OUTPUT GPT-2 ASLI
        </span>
        <div>
          <button className="text-button" onClick={() => onModal("quiz")}>
            Checkpoint belajar <ArrowUpRight size={13} />
          </button>
          <button className="text-button" onClick={() => onModal("notes")}>
            Sumber & batasan <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
      {s.mode === "3d" && view === "room" && (
        <section className="below-scene">
          <div className="section-heading">
            <div>
              <span className="section-kicker">INTERACTIVE WORKBENCH</span>
              <h2>Ubah variabelnya. Lihat apa yang berubah.</h2>
            </div>
            <button className="button" onClick={() => setView("diagram")}>
              Fokus diagram <ArrowUpRight size={15} />
            </button>
          </div>
          <StationView snapshot={p} />
        </section>
      )}
    </main>
  );
}
export default function App() {
  const s = useExperience(),
    [modal, setModal] = useState<"notes" | "quiz" | "help" | null>(null);
  const closeModal = () => {
    setModal(null);
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <Header onNotes={() => setModal("notes")} />
      <div id="main-content">
        {s.entered ? (
          <Experience onModal={setModal} />
        ) : (
          <Landing onNotes={() => setModal("notes")} />
        )}
      </div>
      {modal && <Modal key={modal} kind={modal} onClose={closeModal} />}
    </>
  );
}
