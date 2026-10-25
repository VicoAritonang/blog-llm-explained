import { t, locale, languagePath } from "../i18n/core.mjs";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ScanLine,
  Box,
  Focus,
  Timer,
  Map,
  BookOpen,
  Lightbulb,
  Settings2,
  X,
  ArrowRight,
  ChevronRight,
  Pause,
  Play,
  Move,
  MousePointer2,
  Check,
  Layers3,
  RotateCcw,
  Footprints,
  Flag,
  Wrench,
} from "lucide-react";
import { useExperience } from "../store/experience";
import { useGame, gameInput } from "../store/game";
import { writeLink } from "../navigation/state";
import { fieldTools, toolHints, worldStations } from "../content/world";
import { stations, operations, experiments } from "../content/lessons";
import { architecture } from "../content/architecture";
import { getSnapshot, type Snapshot } from "../simulation/snapshot";
import { VOCAB } from "../simulation/engine.mjs";
import { captureWorld } from "../scene/Player";
import Inspector from "../inspector/Inspector";
import StationView from "../stations/StationView";
import MissionsPanel, { MissionTracker } from "./MissionsPanel";
import { usePlayground } from "../store/playground";
import { missions } from "../simulation/playground.mjs";
import "./game.css";

const SimulationWorld = lazy(() => import("../scene/SimulationWorld"));
const toolIcons = {
  scanner: ScanLine,
  token: Box,
  lens: Focus,
  time: Timer,
  tuner: Wrench,
};
function openLearningGuide() {
  useGame.getState().openPanel(null);
  (document.activeElement as HTMLElement)?.blur();
  if (document.pointerLockElement) document.exitPointerLock();
  requestAnimationFrame(() =>
    document
      .getElementById("learning-guide")
      ?.scrollIntoView({ block: "start" }),
  );
}
class WorldBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function FieldGuide() {
  const g = useGame(),
    s = useExperience();
  const playground = usePlayground();
  const id = g.aimed ?? s.station,
    station = stations.find((st) => st.id === id)!;
  const index = stations.indexOf(station),
    same = id === s.station;
  const touch = matchMedia("(pointer: coarse)").matches;
  const challenge =
    g.tool === "tuner"
      ? missions.find((m) => m.id === playground.active && m.station === id)
      : undefined;
  const guidance = challenge
    ? t(
        "{0} Gunakan Kalibrator untuk mengubah konfigurasi, lalu buka Misi untuk prediksi dan uji.",
        challenge.goal,
      )
    : toolHints[id];
  const hint = touch
    ? guidance
        .replaceAll(t("tekan E"), t("ketuk Gunakan"))
        .replaceAll(t("Tekan R"), t("Ketuk Operasi berikut"))
    : guidance;
  return (
    <aside className="field-guide" aria-label="Live guide">
      <header>
        <span>
          <Lightbulb size={14} /> LIVE GUIDE
        </span>
        <button
          onClick={() => useGame.setState({ guide: false })}
          aria-label={t("Tutup hint")}
        >
          <X size={15} />
        </button>
      </header>
      <div className="guide-body">
        <div className="guide-location">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <small>{worldStations[id].zone}</small>
            <h2>{station.title}</h2>
          </div>
        </div>
        <p className="guide-task">{hint}</p>
        {g.scanned.length === 0 && (
          <div className="guide-start">
            <MousePointer2 size={15} />
            <span>
              {touch ? (
                t(
                  "Joystick untuk berjalan. Seret dunia untuk melihat. Pilih alat, lalu ketuk Gunakan.",
                )
              ) : (
                <>
                  {t("Klik dunia untuk mengendalikan mouse.")}
                  <b>WASD</b>
                  {t("berjalan ·")} <b>E</b>
                  {t("memakai alat ·")}
                  <b>Esc</b>
                  {t("melepas mouse.")}
                </>
              )}
            </span>
          </div>
        )}
        {challenge && (
          <div className="guide-operation">
            <span>{t("MODEL EKSPERIMEN · FIXTURE")}</span>
            <b>{challenge.options[playground.settings[challenge.id]]}</b>
            <p>{challenge.readings[playground.settings[challenge.id]]}</p>
          </div>
        )}
        {same && !challenge && (
          <div className="guide-operation">
            <span>
              {t("OPERASI")} {s.step + 1} / {operations[id].length}
            </span>
            <b>{operations[id][s.step].name}</b>
            <p>{operations[id][s.step].note}</p>
          </div>
        )}
        <details>
          <summary>{t("Mengapa tahap ini penting?")}</summary>
          <p>{architecture[id].story}</p>
          <button className="learning-guide-link" onClick={openLearningGuide}>
            {t("Baca panduan lengkap")} ↗
          </button>
        </details>
      </div>
      <footer>
        <button
          onClick={() => {
            g.equip("scanner");
            if (s.mode === "2d") g.openPanel("journal");
            else g.useTool();
          }}
        >
          <ScanLine size={14} />
          {t("Pindai")}
        </button>
        <button onClick={challenge ? () => g.openPanel("missions") : g.advance}>
          {challenge ? t("Prediksi & uji") : t("Operasi berikut")}{" "}
          <ArrowRight size={14} />
        </button>
      </footer>
    </aside>
  );
}

function TouchMovement() {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
  const update = (e: React.PointerEvent<HTMLDivElement>) => {
    const x = e.clientX - center.current.x,
      y = e.clientY - center.current.y,
      scale = Math.max(1, Math.hypot(x, y) / 30);
    setStick({ x: x / scale, y: y / scale });
    gameInput.strafe = x / scale / 30;
    gameInput.forward = -y / scale / 30;
    gameInput.wake();
  };
  const release = () => {
    gameInput.forward = 0;
    gameInput.strafe = 0;
    setStick({ x: 0, y: 0 });
  };
  useEffect(() => {
    if (useGame.getState().panel) release();
    return release;
  }, []);
  return (
    <div
      className="touch-movement"
      aria-label={t("Joystick gerak")}
      role="group"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <Move size={16} />
      <span style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
    </div>
  );
}

function FieldPanel({ snapshot }: { snapshot: Snapshot }) {
  const g = useGame(),
    s = useExperience(),
    dialog = useRef<HTMLDialogElement>(null);
  const station = stations.find((st) => st.id === s.station)!;
  useEffect(() => {
    if (!g.panel) return;
    const node = dialog.current;
    node?.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      g.openPanel(null);
    };
    node?.addEventListener("cancel", cancel);
    return () => {
      node?.removeEventListener("cancel", cancel);
      node?.close();
    };
  }, [g.panel]);
  if (!g.panel) return null;
  return (
    <dialog
      ref={dialog}
      className={`game-panel ${g.panel === "journal" ? "field-journal" : g.panel === "missions" ? "mission-dialog" : ""}`}
      aria-label={
        g.panel === "map"
          ? t("Peta fasilitas")
          : g.panel === "journal"
            ? t("Catatan lapangan")
            : g.panel === "missions"
              ? t("Misi eksperimen")
              : t("Pengaturan dunia")
      }
    >
      <header className="panel-title">
        <div>
          <small>NEUROLAB / FIELD SYSTEM</small>
          <h2>
            {g.panel === "map"
              ? t("Peta fasilitas")
              : g.panel === "journal"
                ? station.title
                : g.panel === "missions"
                  ? t("Misi eksperimen")
                  : t("Pengaturan dunia")}
          </h2>
        </div>
        <button onClick={() => g.openPanel(null)} aria-label={t("Tutup panel")}>
          <X size={20} />
        </button>
      </header>
      {g.panel === "missions" ? (
        <MissionsPanel />
      ) : g.panel === "map" ? (
        <>
          <p className="panel-intro">
            {t(
              "Ikuti jalur hijau di lantai, atau pilih instrumen untuk berpindah langsung ke depannya.",
            )}
          </p>
          <div
            className="facility-map"
            role="navigation"
            aria-label={t("Peta stasiun")}
          >
            {[0, 1, 2, 3, 7, 6, 5, 4].map((index) => {
              const st = stations[index];
              return (
                <button
                  key={st.id}
                  onClick={() => g.travel(st.id)}
                  style={{ "--station-color": st.color } as CSSProperties}
                  aria-label={t("Pergi ke {0}", st.title)}
                >
                  <span className="map-number">
                    {String(index + 1).padStart(2, "0")}
                    {g.scanned.includes(st.id) && <Check size={12} />}
                  </span>
                  <strong>{st.title}</strong>
                  <small>{worldStations[st.id].zone}</small>
                  <ArrowRight size={15} />
                </button>
              );
            })}
          </div>
          <div className="map-legend">
            <span>
              <i /> {t("{0} / 8 instrumen dipindai", g.scanned.length)}
            </span>
            <span>{t("Annex vektor berada di luar alur inferensi.")}</span>
          </div>
          <p className="reference-note">
            <Layers3 size={16} />
            {t(
              "Q/K/V, attention, dan residual/MLP membedah satu blok yang diulang 96× pada referensi GPT-3 175B. Angka yang dapat diperiksa memakai model mainan dua blok.",
            )}
          </p>
        </>
      ) : g.panel === "journal" ? (
        <>
          <div className="journal-toolbar">
            <div>
              <button
                className={g.journalTab === "guide" ? "active" : ""}
                onClick={() => useGame.setState({ journalTab: "guide" })}
              >
                {t("Catatan & angka")}
              </button>
              <button
                className={g.journalTab === "experiment" ? "active" : ""}
                onClick={() => useGame.setState({ journalTab: "experiment" })}
              >
                {t("Eksperimen")}
              </button>
            </div>
            <select
              aria-label={t("Pilih eksperimen")}
              value={s.experiment}
              onChange={(e) => {
                s.experimentTo(e.target.value as typeof s.experiment);
                const next = useExperience.getState(),
                  step = next.step;
                const panel = g.panel;
                g.travel(next.station);
                next.patch({ step });
                g.openPanel(panel);
              }}
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="journal-shape">
            {architecture[s.station].shape} <span>{t("SKALA REFERENSI")}</span>
          </div>
          {g.journalTab === "guide" ? (
            <Inspector snapshot={snapshot} />
          ) : (
            <StationView snapshot={snapshot} />
          )}
          <div className="journal-controls">
            <button
              className="button"
              onClick={s.previous}
              disabled={s.station === "tokenizer" && s.step === 0}
            >
              {t("Sebelumnya")}
            </button>
            <span>{snapshot.op.name}</span>
            <button className="button primary" onClick={g.advance}>
              {t("Lanjut")}
              <ArrowRight size={14} />
            </button>
          </div>
          <details className="journal-reference">
            <summary>{t("Referensi model dan batas ilustrasi")}</summary>
            <p>
              {t(
                "Visual dan aliran ini merupakan ilustrasi edukatif. Referensi GPT-3 175B memiliki 96 blok, 96 head per blok, dan lebar 12.288. Paper memakai attention dense dan locally banded sparse bergantian; lab membedah causal dense attention. Workbench memakai bobot mainan, dua blok, dua head, dan lebar 8. Tidak ada bobot GPT-3 yang dimuat.",
              )}
            </p>
            <p>
              {t(
                "Inferensi mempertahankan bobot. Saat training, loss, backpropagation, dan optimizer memperbarui bobot. KV cache menyimpan aktivasi prefix per layer selama urutan ini.",
              )}
            </p>
            <a
              href="https://arxiv.org/abs/2005.14165"
              target="_blank"
              rel="noreferrer"
            >
              {t("Paper GPT-3 ↗")}
            </a>
          </details>
        </>
      ) : (
        <div className="world-settings">
          <div className="language-settings">
            <b>{t("Bahasa")}</b>
            <a
              href={languagePath("id", writeLink(s))}
              lang="id"
              hrefLang="id"
              aria-current={locale === "id" ? "page" : undefined}
            >
              {t("Bahasa Indonesia")}
            </a>
            <a
              href={languagePath("en", writeLink(s))}
              lang="en"
              hrefLang="en"
              aria-current={locale === "en" ? "page" : undefined}
            >
              English
            </a>
            <button className="learning-guide-link" onClick={openLearningGuide}>
              {t("Panduan belajar")} ↗
            </button>
          </div>
          <label>
            {t("Kualitas dunia")}
            <select
              aria-label={t("Kualitas render")}
              value={s.quality}
              onChange={(e) =>
                s.patch({ quality: e.target.value as typeof s.quality })
              }
            >
              <option value="low">{t("Ringan · 1× DPR")}</option>
              <option value="medium">{t("Seimbang · 1.25× DPR")}</option>
              <option value="high">{t("Tinggi · 1.75× DPR")}</option>
            </select>
          </label>
          <label>
            {t("Kecepatan aliran")}
            <select
              aria-label={t("Kecepatan aliran")}
              value={s.speed}
              onChange={(e) => s.patch({ speed: +e.target.value })}
            >
              {[0.25, 0.5, 1, 2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </label>
          <label className="motion-setting">
            <input
              type="checkbox"
              checked={s.reducedMotion}
              onChange={(e) => s.patch({ reducedMotion: e.target.checked })}
            />{" "}
            {t("Kurangi gerakan kamera dan alat; bekukan animasi sinyal")}
          </label>
          <div className="controls-grid">
            <span>
              <kbd>W A S D</kbd>
              {t("Berjalan")}
            </span>
            <span>
              <kbd>Mouse</kbd>
              {t("Melihat sekitar")}
            </span>
            <span>
              <kbd>Shift</kbd>
              {t("Berjalan cepat")}
            </span>
            <span>
              <kbd>Space</kbd>
              {t("Lompat")}
            </span>
            <span>
              <kbd>1–5 / Scroll</kbd>
              {t("Pilih alat")}
            </span>
            <span>
              <kbd>{t("E / Klik")}</kbd>
              {t("Gunakan alat")}
            </span>
            <span>
              <kbd>R</kbd>
              {t("Operasi berikut")}
            </span>
            <span>
              <kbd>Esc</kbd>
              {t("Lepas mouse")}
            </span>
          </div>
          <p>
            {t(
              "Pada layar sentuh: joystick untuk berjalan, seret dunia untuk melihat, dan tombol Gunakan untuk memakai alat. Jika pointer lock tidak tersedia, seret mouse untuk melihat dan gunakan WASD.",
            )}
          </p>
          <button
            className="mode-switch"
            onClick={() => {
              s.patch({ mode: s.mode === "3d" ? "2d" : "3d" });
              g.openPanel(null);
            }}
          >
            {s.mode === "3d"
              ? t("Buka mode diagram 2D")
              : t("Kembali ke dunia 3D")}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </dialog>
  );
}

export default function GameExperience() {
  const s = useExperience(),
    g = useGame(),
    canvas = useRef<HTMLCanvasElement | null>(null);
  const snapshot = useMemo(() => getSnapshot(s), [s]);
  const tool = fieldTools.find((t) => t.id === g.tool)!,
    ToolIcon = toolIcons[g.tool];
  const target = stations.find((st) => st.id === g.aimed),
    active = stations.find((st) => st.id === s.station)!;
  const onFailure = useCallback(() => {
    useExperience.getState().patch({ mode: "2d", playing: false });
    useGame.setState({ ready: false });
  }, []);
  const onCanvas = useCallback((element: HTMLCanvasElement) => {
    canvas.current = element;
  }, []);
  useEffect(() => {
    document.body.classList.add("in-world");
    s.patch({ entered: true, camera: "walk", playing: !s.reducedMotion });
    const probe = document.createElement("canvas"),
      context = probe.getContext("webgl2");
    if (!context) onFailure();
    else context.getExtension("WEBGL_lose_context")?.loseContext();
    return () => document.body.classList.remove("in-world");
  }, [onFailure]);
  useEffect(() => {
    if (!g.notice) return;
    const timeout = setTimeout(() => useGame.setState({ notice: null }), 4800);
    return () => clearTimeout(timeout);
  }, [g.notice]);
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root || !("IntersectionObserver" in window)) return;
    let offscreen = false,
      resume = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !offscreen) {
        resume = useExperience.getState().playing;
        offscreen = true;
        useExperience.getState().patch({ playing: false });
      } else if (entry.isIntersecting && offscreen) {
        offscreen = false;
        if (resume) useExperience.getState().patch({ playing: true });
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  return (
    <main
      className={`game-experience ${s.mode === "2d" ? "diagram-world" : ""} ${g.tool === "tuner" ? "sandbox-view" : ""}`}
      aria-label={t("NeuroLab, dunia interaktif LLM")}
    >
      {s.mode === "3d" ? (
        <WorldBoundary onFailure={onFailure}>
          <Suspense
            fallback={
              <div className="world-loading">
                <span />
                <b>{t("Menyiapkan dunia…")}</b>
                <small>{t("Menyalakan instrumen dan aliran token")}</small>
              </div>
            }
          >
            <SimulationWorld
              snapshot={snapshot}
              onCanvas={onCanvas}
              onFailure={onFailure}
            />
          </Suspense>
        </WorldBoundary>
      ) : (
        <section className="accessible-world">
          <div>
            <span className="game-eyebrow">
              {t("MODE DIAGRAM · SEMUA INSTRUMEN TERSEDIA")}
            </span>
            <h2>{active.title}</h2>
            <p>{architecture[s.station].story}</p>
            <div className="diagram-stations">
              {stations.map((st) => (
                <button
                  key={st.id}
                  className={st.id === s.station ? "active" : ""}
                  onClick={() => s.navigate(st.id)}
                >
                  {st.title}
                </button>
              ))}
            </div>
            <StationView snapshot={snapshot} />
            <button className="button" onClick={() => g.openPanel("journal")}>
              {t("Buka catatan & angka")}
              <BookOpen size={15} />
            </button>
          </div>
        </section>
      )}
      <div className="game-hud">
        <header className="game-topbar">
          <div className="game-brand">
            <span>
              <Box size={22} />
            </span>
            <div>
              <h1>
                NeuroLab<span> / FIELD EXPLORER</span>
              </h1>
              <small>{t("MASUK KE DALAM MESIN BAHASA")}</small>
            </div>
          </div>
          <div className="world-status">
            <i className={s.playing ? "live" : ""} />
            <span>{s.playing ? "SIGNAL LIVE" : "SIGNAL PAUSED"}</span>
            <small>GPT-3 · ARCHITECTURE STUDY</small>
          </div>
          <nav aria-label={t("Kontrol dunia")}>
            <a
              className="language-toggle"
              href={languagePath(locale === "id" ? "en" : "id", writeLink(s))}
              lang={locale === "id" ? "en" : "id"}
              hrefLang={locale === "id" ? "en" : "id"}
              aria-label={
                locale === "id"
                  ? "Switch to English"
                  : "Ganti ke Bahasa Indonesia"
              }
            >
              {locale === "id" ? "EN" : "ID"}
            </a>
            <button
              onClick={() => g.openPanel("missions")}
              aria-label={t("Misi")}
              title={t("Misi [F]")}
            >
              <Flag size={16} />
              <span>{t("Misi")}</span>
              <kbd>F</kbd>
            </button>
            <button
              onClick={() => g.openPanel("map")}
              title={t("Peta [M]")}
              aria-label={t("Peta")}
            >
              <Map size={16} />
              <span>{t("Peta")}</span>
              <kbd>M</kbd>
            </button>
            <button
              onClick={() => g.openPanel("journal")}
              title={t("Catatan [J]")}
              aria-label={t("Catatan")}
            >
              <BookOpen size={16} />
              <span>{t("Catatan")}</span>
              <kbd>J</kbd>
            </button>
            <button
              className={`hint-toggle ${g.guide ? "active" : ""}`}
              aria-expanded={g.guide}
              onClick={() => useGame.setState({ guide: !g.guide })}
            >
              <Lightbulb size={16} />
              <span>Hint</span>
              <kbd>H</kbd>
            </button>
            <button
              className="settings-trigger"
              aria-label={t("Pengaturan dunia")}
              onClick={() => g.openPanel("settings")}
            >
              <Settings2 size={17} />
            </button>
          </nav>
        </header>
        <div className="world-location">
          <span className="location-line" />
          <span>{worldStations[s.station].zone}</span>
          <ChevronRight size={11} />
          <b>{String(stations.indexOf(active) + 1).padStart(2, "0")} / 08</b>
        </div>
        {g.guide && <FieldGuide />}
        <MissionTracker />
        {s.mode === "3d" && (
          <>
            <div
              className={`world-reticle ${target && g.distance <= 7.2 ? "can-use" : ""}`}
              aria-hidden="true"
            >
              <span />
              <i />
            </div>
            {target && (
              <div className="target-card">
                <span>
                  {String(stations.indexOf(target) + 1).padStart(2, "0")} /{" "}
                  {worldStations[target.id].zone}
                </span>
                <b>{target.title}</b>
                <small>
                  {g.distance <= 7.2 ? (
                    <>
                      <kbd>
                        {matchMedia("(pointer: coarse)").matches ? "↗" : "E"}
                      </kbd>{" "}
                      {tool.action}
                    </>
                  ) : (
                    t("Dekati instrumen · {0} m", g.distance.toFixed(1))
                  )}
                </small>
              </div>
            )}
            {!g.locked && !g.panel && g.ready && (
              <button
                className="capture-prompt"
                onClick={() => captureWorld(canvas.current)}
              >
                <MousePointer2 size={15} />
                <span>
                  {t("Klik untuk menjelajah")}{" "}
                  <small>
                    {t("WASD bergerak · seret mouse jika kendali bebas")}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            )}
          </>
        )}
        <div className="exploration-progress">
          <span>
            <Footprints size={14} />
            {t("CATATAN PERJALANAN")}
          </span>
          <b>
            {String(g.scanned.length).padStart(2, "0")}{" "}
            <small>{t("/ 08 instrumen dipindai")}</small>
          </b>
          <div>
            {stations.map((st) => (
              <i
                key={st.id}
                className={g.scanned.includes(st.id) ? "done" : ""}
              />
            ))}
          </div>
          <button onClick={() => g.openPanel("map")}>
            {t("Pilih tujuan")}
            <ArrowRight size={12} />
          </button>
        </div>
        {g.notice && (
          <div className="world-notice" role="status" key={g.notice.serial}>
            <ToolIcon size={16} />
            {g.notice.text}
          </div>
        )}
        <div className="game-inventory">
          <div className="equipped-caption">
            <span>{t("PERALATAN LAPANGAN")}</span>
            <b>{tool.name}</b>
          </div>
          <div
            className="tool-hotbar"
            role="toolbar"
            aria-label={t("Pilih alat")}
          >
            {fieldTools.map((t) => {
              const Icon = toolIcons[t.id];
              return (
                <button
                  key={t.id}
                  aria-label={`${t.key}. ${t.name}`}
                  aria-pressed={g.tool === t.id}
                  className={g.tool === t.id ? "selected" : ""}
                  onClick={() => g.equip(t.id)}
                  style={{ "--tool-color": t.color } as CSSProperties}
                >
                  <kbd>{t.key}</kbd>
                  <Icon size={25} strokeWidth={1.5} />
                  <small>{t.short}</small>
                  <i />
                </button>
              );
            })}
          </div>
          <div className="keyboard-legend">
            <span>
              <kbd>E</kbd>
              {t("gunakan")}
            </span>
            <span>
              <kbd>R</kbd>
              {t("operasi berikut")}
            </span>
            <span>
              <kbd>Esc</kbd>
              {t("mouse bebas")}
            </span>
          </div>
        </div>
        <div
          className="equipped-info"
          style={{ "--tool-color": tool.color } as CSSProperties}
        >
          <ToolIcon size={16} />
          <div>
            <b>{tool.name}</b>
            <p>{tool.description}</p>
            <small>
              {g.tool === "token"
                ? snapshot.local
                  ? `VIGNETTE · POS ${snapshot.row}`
                  : `TOKEN: ${VOCAB[snapshot.ids[Math.min(s.token, snapshot.ids.length - 1)]].trim()} · POS ${Math.min(s.token, snapshot.ids.length - 1)}`
                : g.tool === "lens"
                  ? t("HEAD DEMO {0} / 2", s.head + 1)
                  : g.tool === "time"
                    ? s.playing
                      ? t("ALIRAN BERJALAN")
                      : t("WAKTU DIJEDA")
                    : g.tool === "tuner"
                      ? t("E · UBAH MODEL / F · MISI")
                      : t("E / KLIK · BACA INSTRUMEN")}
            </small>
          </div>
        </div>
        <div className="signal-controls">
          <button
            aria-label={s.playing ? t("Jeda sinyal") : t("Jalankan sinyal")}
            onClick={() => s.patch({ playing: !s.playing })}
          >
            {s.playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button aria-label={t("Ulangi operasi stasiun")} onClick={s.replay}>
            <RotateCcw size={14} />
          </button>
          <span>
            {g.tool === "tuner" ? t("Kalibrator · fixture") : snapshot.op.name}
          </span>
        </div>
        {s.mode === "3d" && (
          <div className="touch-controls">
            <TouchMovement />
            <button className="touch-use" onClick={g.useTool}>
              <ToolIcon size={22} />
              <span>{t("Gunakan")}</span>
            </button>
            <button
              className="touch-jump"
              aria-label={t("Lompat")}
              onClick={() => {
                gameInput.jump = true;
                gameInput.wake();
              }}
            >
              ↑
            </button>
          </div>
        )}
      </div>
      <FieldPanel snapshot={snapshot} />
    </main>
  );
}
