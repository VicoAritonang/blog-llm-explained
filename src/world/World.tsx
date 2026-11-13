import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Map as MapIcon,
  ScrollText,
  Sparkles,
  Trophy,
} from "lucide-react";
import { missions, type LevelId } from "../content/paths";
import { navigate, readJourney, writeJourney } from "../app/journey-state";
import { WorldEngine, zoneAccent, type Marker, type Target } from "./engine";
import { SPAWN, interactables, questObjects, zones, type ZoneId } from "./map";
import { books } from "./books";
import {
  computeProgress,
  levelNames,
  levelRanks,
  readWorld,
  writeWorld,
  XP,
  type WorldSave,
} from "./progress";
import { BookReader } from "./BookReader";
import { GateExam } from "./GateExam";
import { Certificate, GateNotice, Intro, LevelUp, NaraDialog } from "./Dialogs";
import { Journal, WorldMap } from "./Panels";
import "./world.css";

const QuestWindow = lazy(() => import("./QuestWindow"));

export type Overlay =
  | { type: "intro" }
  | { type: "quest"; level: LevelId; mission: string }
  | { type: "book"; id: string }
  | { type: "exam"; gate: number }
  | { type: "gate"; gate: number }
  | { type: "npc"; zone: ZoneId }
  | { type: "map" }
  | { type: "journal" }
  | { type: "cert" }
  | { type: "levelup"; level: number }
  | null;
type Toast = { id: number; title: string; text?: string; tone: "xp" | "quest" | "info" };

export default function World() {
  const [journey, setJourney] = useState(readJourney);
  const [save, setSave] = useState<WorldSave>(readWorld);
  const [explained, setExplained] = useState<Set<number>>(() => new Set());
  const [overlay, setOverlay] = useState<Overlay>(() => (readWorld().started ? null : { type: "intro" }));
  const [near, setNear] = useState<Target | null>(null);
  const [zone, setZone] = useState<ZoneId>(0);
  const [banner, setBanner] = useState<{ zone: ZoneId; key: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorldEngine | null>(null);

  const progress = useMemo(
    () => computeProgress(journey.done, explained, save),
    [journey.done, explained, save],
  );
  const unlockedZone = Math.min(progress.level - 1, 3);

  // Investigation evidence decides the post tasks; it lives with the model data.
  useEffect(() => {
    let alive = true;
    const load = () =>
      import("../app/investigation-data").then((m) => {
        if (alive)
          setExplained(
            new Set(m.readBook().filter((e) => e.status === "explained").map((e) => e.lesson)),
          );
      });
    load();
    addEventListener("focus", load);
    return () => {
      alive = false;
      removeEventListener("focus", load);
    };
  }, []);

  useEffect(() => {
    document.title = "NeuroLab · Game simulasi untuk memahami LLM";
  }, []);
  useEffect(() => {
    writeWorld(save);
  }, [save]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3700);
    return () => clearTimeout(t);
  }, [banner]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((old) => [...old.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((old) => old.filter((x) => x.id !== id)), 3800);
  }, []);

  // ---------- engine ----------
  const openTarget = useCallback(
    (t: Target) => {
      if (t.kind === "gate") return setOverlay({ type: "gate", gate: t.gate.id });
      if (t.zone > unlockedZone) {
        toast({ tone: "info", title: "Area ini masih terkunci", text: "Buka gerbangnya lebih dulu." });
        return;
      }
      if (t.kind === "quest") setOverlay({ type: "quest", level: t.level, mission: t.mission });
      else if (t.kind === "book") setOverlay({ type: "book", id: t.book });
      else if (t.kind === "npc") setOverlay({ type: "npc", zone: t.zone });
      else if (t.kind === "exam") setOverlay({ type: "exam", gate: t.gate });
      else if (t.kind === "trophy") setOverlay({ type: "cert" });
    },
    [unlockedZone, toast],
  );
  const openRef = useRef(openTarget);
  openRef.current = openTarget;

  useEffect(() => {
    const start = save.pos ?? SPAWN;
    const e = new WorldEngine(
      canvas.current!,
      {
        onNear: setNear,
        onInteract: (t) => openRef.current(t),
        onZone: (z) => {
          setZone(z);
          setBanner({ zone: z, key: Date.now() });
        },
      },
      start,
    );
    engine.current = e;
    const persist = () =>
      setSave((old) => ({ ...old, pos: e.position() }));
    const timer = setInterval(persist, 5000);
    addEventListener("pagehide", persist);
    return () => {
      clearInterval(timer);
      removeEventListener("pagehide", persist);
      writeWorld({ ...readWorld(), pos: e.position() });
      e.destroy();
      engine.current = null;
    };
    // The engine lives for the whole visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed markers, labels and gates to the renderer.
  useEffect(() => {
    const markers: Record<string, Marker> = {},
      labels: Record<string, string> = {};
    for (const o of interactables) {
      if (o.kind === "quest") {
        const list = missions[o.level];
        const m = list.find((x) => x.id === o.mission)!;
        const [d, t] = progress.missionCount(m);
        markers[o.id] =
          o.zone > unlockedZone
            ? { kind: "none" }
            : d === t
              ? { kind: "done" }
              : d > 0
                ? { kind: "progress", done: d, total: t }
                : { kind: "new" };
        labels[o.id] = `${list.indexOf(m) + 1}. ${m.short}`;
      } else if (o.kind === "book") {
        markers[o.id] = { kind: "book", read: save.books.includes(o.book) };
        labels[o.id] = books[o.book].title;
      } else if (o.kind === "npc") {
        markers[o.id] = { kind: "talk" };
        labels[o.id] = "Nara · pemandu";
      } else if (o.kind === "exam") {
        markers[o.id] = { kind: "exam", open: progress.gateOpen(o.gate) };
        labels[o.id] = "Ujian lompat";
      } else {
        markers[o.id] = progress.level === 4 ? { kind: "star" } : { kind: "none" };
        labels[o.id] = "Piala Arsitek";
      }
    }
    engine.current?.setState({
      markers,
      labels,
      gates: [0, 1, 2].map(progress.gateOpen),
      recommended: progress.recommended?.id ?? null,
      unlockedZone,
    });
  }, [progress, save.books, unlockedZone]);

  useEffect(() => {
    engine.current?.setPaused(overlay !== null);
    if (overlay) setSave((old) => ({ ...old, pos: engine.current?.position() ?? old.pos }));
  }, [overlay]);

  // ---------- rewards ----------
  const prevQuests = useRef(progress.questsDone);
  const prevTasks = useRef(progress.tasksDone);
  useEffect(() => {
    const e = engine.current;
    if (progress.tasksDone > prevTasks.current && e) {
      e.floatText(`+${XP.task * (progress.tasksDone - prevTasks.current)} XP`);
    }
    if (progress.questsDone > prevQuests.current) {
      toast({ tone: "quest", title: "Quest selesai!", text: `+${XP.quest} XP bonus` });
      e?.burst(e.player.x, e.player.y, ["#ffcf4a", "#5fd4e0", "#8fd694", "#f08a7e"]);
    }
    prevTasks.current = progress.tasksDone;
    prevQuests.current = progress.questsDone;
  }, [progress.tasksDone, progress.questsDone, toast]);

  // A level-up waits until the current window closes.
  const [pendingLevel, setPendingLevel] = useState<number | null>(null);
  useEffect(() => {
    if (progress.level > save.seenLevel) {
      setSave((old) => ({ ...old, seenLevel: progress.level }));
      setPendingLevel(progress.level);
    }
  }, [progress.level, save.seenLevel]);
  useEffect(() => {
    if (pendingLevel && overlay === null) {
      setOverlay({ type: "levelup", level: pendingLevel });
      setPendingLevel(null);
    }
  }, [pendingLevel, overlay]);

  // ---------- actions ----------
  const completeTask = useCallback((id: string) => {
    setJourney((old) => {
      if (old.done.includes(id)) return old;
      const next = { ...old, done: [...old.done, id] };
      writeJourney(next);
      return next;
    });
  }, []);
  const saveCard = useCallback((card: string) => {
    setJourney((old) => {
      const next = { ...old, card };
      writeJourney(next);
      return next;
    });
  }, []);
  const finishBook = useCallback((id: string) => {
    setSave((old) => {
      if (old.books.includes(id)) return old;
      engine.current?.floatText(`+${XP.book} XP`, "#cfe7ff");
      return { ...old, books: [...old.books, id] };
    });
  }, []);
  const answerQuiz = useCallback((id: string) => {
    setSave((old) => (old.quiz.includes(id) ? old : { ...old, quiz: [...old.quiz, id] }));
  }, []);
  const passExam = useCallback((gate: number) => {
    setSave((old) => (old.exams.includes(gate) ? old : { ...old, exams: [...old.exams, gate] }));
  }, []);
  const close = useCallback(() => setOverlay(null), []);
  const guideTo = useCallback((id: string) => {
    setOverlay(null);
    requestAnimationFrame(() => engine.current?.goTo(id, false));
  }, []);
  const travel = useCallback((id: string) => {
    setOverlay(null);
    requestAnimationFrame(() => engine.current?.teleport(id));
  }, []);
  const openPost = useCallback((level: LevelId, mission: string, post: number) => {
    const pos = engine.current?.position();
    writeWorld({ ...readWorld(), pos: pos ?? null });
    navigate({ level, mission, lesson: post, from: "world" });
  }, []);

  // Keyboard shortcuts for panels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "Escape" && overlay && overlay.type !== "intro") setOverlay(null);
      if (overlay || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") setOverlay({ type: "map" });
      if (k === "j" || k === "q") setOverlay({ type: "journal" });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [overlay]);

  const zoneInfo = zones[zone];
  const levelZone = Math.min(progress.level, 3) as 1 | 2 | 3;
  const [zDone, zTotal] = progress.zoneQuests((levelZone - 1) as ZoneId);
  const rec = progress.recommended;
  const recMission =
    rec?.kind === "quest" ? missions[rec.level].find((m) => m.id === rec.mission) : null;
  const recTask = recMission?.tasks.find((t) => !progress.isTaskDone(t));
  const totalQuests = questObjects.length;

  const nearLabel = (() => {
    if (!near) return null;
    if (near.kind === "gate") return { verb: "Periksa", what: `Gerbang Level ${near.gate.id + 2}` };
    if (near.kind === "quest") {
      const m = missions[near.level].find((x) => x.id === near.mission)!;
      return { verb: progress.missionDone(m) ? "Ulangi quest" : "Mulai quest", what: m.short };
    }
    if (near.kind === "book") return { verb: "Baca", what: books[near.book].title };
    if (near.kind === "npc") return { verb: "Bicara", what: "Nara" };
    if (near.kind === "exam") return { verb: "Ikuti", what: "Ujian lompat" };
    return { verb: "Lihat", what: "Piala Arsitek" };
  })();

  return (
    <main className="world" style={{ ["--zone" as string]: zoneAccent[zone] }}>
      <h1 className="sr-only">NeuroLab: game simulasi untuk memahami cara kerja LLM</h1>
      <canvas
        ref={canvas}
        className="world-canvas"
        aria-label="Dunia NeuroLab. Pakai panah atau WASD untuk berjalan, E untuk berinteraksi, atau buka Peta untuk daftar semua tempat."
        role="img"
      />

      <header className="hud-top">
        <section className="hud-player" aria-label="Status pemain">
          <div className="hud-level" aria-hidden="true">
            <small>LV</small>
            <b>{progress.level}</b>
          </div>
          <div className="hud-player-info">
            <p>
              <b>{levelRanks[progress.level]}</b>
              <span>Level {progress.level} · {levelNames[progress.level]}</span>
            </p>
            {progress.level < 4 ? (
              <div className="hud-bar" role="progressbar" aria-label="Quest level ini" aria-valuemin={0} aria-valuemax={zTotal} aria-valuenow={zDone}>
                <i style={{ width: `${(zDone / zTotal) * 100}%` }} />
                <span>
                  {zDone}/{zTotal} quest menuju Level {progress.level + 1}
                </span>
              </div>
            ) : (
              <div className="hud-bar full">
                <i style={{ width: "100%" }} />
                <span>Semua gerbang terbuka</span>
              </div>
            )}
          </div>
          <div className="hud-xp" title="Total XP">
            <Sparkles size={14} />
            <b>{progress.xp}</b>
            <small>XP</small>
          </div>
        </section>
        <nav className="hud-actions" aria-label="Menu game">
          <button onClick={() => setOverlay({ type: "journal" })} title="Jurnal (J)">
            <ScrollText size={17} />
            <span>Jurnal</span>
            <kbd>J</kbd>
          </button>
          <button onClick={() => setOverlay({ type: "map" })} title="Peta (M)">
            <MapIcon size={17} />
            <span>Peta</span>
            <kbd>M</kbd>
          </button>
          <button onClick={() => setOverlay({ type: "intro" })} title="Cara bermain" aria-label="Cara bermain">
            <HelpCircle size={17} />
          </button>
          <a
            href={`?level=${zones[levelZone - 1].level}`}
            onClick={(e) => {
              e.preventDefault();
              navigate({ level: zones[levelZone - 1].level! });
            }}
            title="Mode teks tanpa game"
            className="hud-text-mode"
          >
            <FileText size={16} />
            <span>Mode teks</span>
          </a>
        </nav>
      </header>

      {banner && (
        <div key={banner.key} className="zone-banner" style={{ ["--zone" as string]: zoneAccent[banner.zone] }} aria-live="polite">
          <small>{zones[banner.zone].level ? `LEVEL ${banner.zone + 1}` : "TAMAT"}</small>
          <b>{zones[banner.zone].name}</b>
          <span>{zones[banner.zone].tagline}</span>
        </div>
      )}

      {rec && (
        <button className="hud-tracker" onClick={() => guideTo(rec.id)}>
          <small>{rec.kind === "trophy" ? "TUJUAN AKHIR" : "QUEST BERIKUTNYA"}</small>
          <b>
            {recMission ? recMission.short : "Ambil Piala Arsitek"}
          </b>
          {recTask && <span>{recTask.label}</span>}
          <em>Klik untuk diantar ke sana →</em>
        </button>
      )}

      <div className="hud-stats" aria-hidden="true">
        <span>
          <Trophy size={13} /> {progress.questsDone}/{totalQuests}
        </span>
        <span>
          <BookOpen size={13} /> {progress.booksRead}/{Object.keys(books).length}
        </span>
        <span className="hud-zone">{zoneInfo.name}</span>
      </div>

      {nearLabel && !overlay && (
        <button className="hud-prompt" onClick={() => engine.current?.interactNear()}>
          <kbd>E</kbd>
          <span>
            {nearLabel.verb} <b>{nearLabel.what}</b>
          </span>
        </button>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <b>{t.title}</b>
            {t.text && <span>{t.text}</span>}
          </div>
        ))}
      </div>

      {overlay?.type === "intro" && (
        <Intro
          returning={save.started}
          onStart={() => {
            setSave((old) => ({ ...old, started: true }));
            setOverlay(save.started ? null : { type: "npc", zone: 0 });
          }}
        />
      )}
      {overlay?.type === "quest" && (
        <Suspense fallback={<div className="overlay"><p className="loading">Menyalakan mesin simulasi…</p></div>}>
          <QuestWindow
            level={overlay.level}
            missionId={overlay.mission}
            progress={progress}
            card={journey.card}
            complete={completeTask}
            onCard={saveCard}
            onPost={openPost}
            onClose={close}
          />
        </Suspense>
      )}
      {overlay?.type === "book" && (
        <BookReader
          id={overlay.id}
          read={save.books.includes(overlay.id)}
          answered={save.quiz.includes(overlay.id)}
          onFinish={finishBook}
          onCorrect={(id) => {
            answerQuiz(id);
            toast({ tone: "xp", title: "Jawaban tepat!", text: `+${XP.quiz} XP` });
          }}
          onClose={close}
        />
      )}
      {overlay?.type === "exam" && (
        <GateExam
          gate={overlay.gate}
          open={progress.gateOpen(overlay.gate)}
          onPass={passExam}
          onClose={close}
        />
      )}
      {overlay?.type === "gate" && (
        <GateNotice
          gate={overlay.gate}
          done={progress.zoneQuests(overlay.gate as ZoneId)}
          onExam={() => setOverlay({ type: "exam", gate: overlay.gate })}
          onGuide={() => rec && guideTo(rec.id)}
          onClose={close}
        />
      )}
      {overlay?.type === "npc" && (
        <NaraDialog
          zone={overlay.zone}
          progress={progress}
          onGuide={() => rec && guideTo(rec.id)}
          onClose={close}
        />
      )}
      {overlay?.type === "map" && (
        <WorldMap
          progress={progress}
          save={save}
          unlockedZone={unlockedZone}
          player={engine.current?.position() ?? SPAWN}
          onTravel={travel}
          onOpen={(id) => {
            const t = interactables.find((o) => o.id === id);
            if (t) openTarget(t);
          }}
          onClose={close}
        />
      )}
      {overlay?.type === "journal" && (
        <Journal
          progress={progress}
          save={save}
          unlockedZone={unlockedZone}
          onGuide={guideTo}
          onClose={close}
        />
      )}
      {overlay?.type === "levelup" && (
        <LevelUp
          level={overlay.level}
          onClose={() => {
            const gate = overlay.level - 2;
            setOverlay(null);
            requestAnimationFrame(() => engine.current?.goTo(`gate-${gate}`, false));
          }}
        />
      )}
      {overlay?.type === "cert" && (
        <Certificate progress={progress} save={save} onClose={close} />
      )}
    </main>
  );
}
