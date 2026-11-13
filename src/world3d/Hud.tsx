import { useEffect, useRef, useState } from "react";
import { BookMarked, BookOpen, Box, Check, Compass, Eye, Gauge, Hand, Lock, LogOut, Map as MapIcon, MessageCircle, Package, ScanLine, ScrollText, Sparkles, Timer, Trophy, Video, X } from "lucide-react";
import {
  challengeKey,
  isRegionOpen,
  isStationDone,
  parts,
  regionById,
  regions,
  stationById,
  stations,
  stationsIn,
  totalChallenges,
  type StationId,
} from "./content";
import { activeMission, nextStation, useWorld, type Tool } from "./store";
import { achievements, clock, SPEEDRUN_MINUTES } from "./achievements";
import { hint } from "./hints";
import { cycleToken, placeInFront, removeLastBlock, scanNearest, useSentence } from "./Blocks";
import { useLock } from "./FirstPerson";
import { show, vocab } from "./model";
import { modules } from "./Scene";
import { bridges, islands, keeperSpot, lecternOf, lecterns, poses, readerSpot, regionAt, shelf } from "./world";
import { books } from "./books";
import { spreadCount, spreadText } from "./Library";
import { player } from "./player";
import { view } from "./view";

const accent = (c: string) => ({ ["--accent" as string]: c });

/* ------------------------------------------------------------- top bar -- */
/** Nara answers with what to do right now. */
export function askNara() {
  const s = useWorld.getState();
  const mission = activeMission(s);
  const text = hint({
    done: s.done,
    mission: mission?.id ?? null,
    focus: s.focus,
    near: s.near,
    fp: s.view === "fp",
    player: { x: player.pos.x, z: player.pos.z },
    yaw: view.yaw,
  });
  s.askedHint();
  if (!mission) {
    const unread = lecterns.filter((l) => !s.booksRead.includes(l.book));
    if (unread.length) {
      const l = unread.reduce((a, b) => (Math.hypot(a.x - player.pos.x, a.z - player.pos.z) < Math.hypot(b.x - player.pos.x, b.z - player.pos.z) ? a : b));
      return s.say(`Semua misi selesai! Masih ada ${unread.length} buku di mimbar. Yang terdekat: “${books[l.book].title}”, ${Math.round(Math.hypot(l.x - player.pos.x, l.z - player.pos.z))} meter dari sini.`);
    }
  }
  // outside a machine Nara flies a few metres towards the goal
  s.say(text, !s.focus && !!mission);
}

export function readBook(book: string) {
  const [x, z] = readerSpot(book);
  player.pos.set(x, 0, z);
  player.target = null;
  const l = lecternOf(book);
  player.heading = Math.atan2(-l.dir[0], -l.dir[1]);
  useWorld.getState().openBook(book);
}

function Top() {
  const started = useWorld((s) => s.started);
  const count = useWorld((s) => s.done.size);
  const owned = useWorld((s) => parts.filter((p) => isStationDone(s.done, p.station)).length);
  const setPanel = useWorld((s) => s.setPanel);
  const quality = useWorld((s) => s.quality);
  const setQuality = useWorld((s) => s.setQuality);
  const viewMode = useWorld((s) => s.view);
  const setView = useWorld((s) => s.setView);
  const earned = useWorld((s) => s.earned.length);
  return (
    <header className="w3-top" hidden={!started}>
      <div className="w3-brand">
        <b>NeuroLab</b>
        <RegionName />
        <Stopwatch />
      </div>
      <Tracker />
      <nav className="w3-actions" aria-label="Menu">
        <button type="button" onClick={() => setPanel("log")} title="Misi (J)">
          <ScrollText size={16} />
          <span>Misi</span>
          <kbd>J</kbd>
        </button>
        <button type="button" onClick={() => setPanel("map")} title="Peta (M)">
          <MapIcon size={16} />
          <span>Peta</span>
          <kbd>M</kbd>
        </button>
        <button type="button" className="w3-gold" onClick={() => setPanel("cards")} title="Temuan dan komponen">
          <Sparkles size={16} />
          <span>
            <b>{count}</b>/{totalChallenges}
          </span>
          <Package size={14} />
          <span>
            <b>{owned}</b>/{parts.length}
          </span>
        </button>
        <button type="button" className="w3-gold" onClick={() => setPanel("awards")} title="Pencapaian (K)" aria-label={`Pencapaian: ${earned} dari ${achievements.length}`}>
          <Trophy size={16} />
          <span>
            <b>{earned}</b>/{achievements.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setView(viewMode === "fp" ? "tp" : "fp")}
          title="Ganti kamera (V)"
          aria-pressed={viewMode === "fp"}
          aria-label={viewMode === "fp" ? "Kamera orang pertama aktif. Ganti ke orang ketiga" : "Ganti ke kamera orang pertama"}
        >
          {viewMode === "fp" ? <Eye size={16} /> : <Video size={16} />}
          <span>{viewMode === "fp" ? "Orang pertama" : "Orang ketiga"}</span>
          <kbd>V</kbd>
        </button>
        <button type="button" onClick={() => setQuality(quality === "tinggi" ? "ringan" : "tinggi")} title="Kualitas grafik" aria-label={`Grafik ${quality}, ubah`}>
          <Gauge size={16} />
          <span className="w3-optional">{quality === "tinggi" ? "Tinggi" : "Ringan"}</span>
        </button>
      </nav>
    </header>
  );
}

/** Play time for this run, and the best finish so far. */
function Stopwatch() {
  const playTime = useWorld((s) => s.playTime);
  const best = useWorld((s) => s.bestTime);
  const finished = useWorld((s) => s.finished);
  return (
    <span className={`w3-watch${finished ? " is-finished" : ""}`} aria-label={`Waktu bermain ${clock(playTime)}${best !== null ? `, rekor ${clock(best)}` : ""}`}>
      <Timer size={11} /> {clock(playTime)}
      {best !== null && <em> · rekor {clock(best)}</em>}
    </span>
  );
}

/** Counts play time while the tab is visible; nudges the visitor when they seem stuck. */
function Ticker() {
  useEffect(() => {
    let lastDone = -1,
      still = 0,
      lastNudge = -999;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const s = useWorld.getState();
      s.tick(1);
      if (!s.started || s.panel || s.dialog || s.finished) return;
      still = s.done.size === lastDone ? still + 1 : 0;
      lastDone = s.done.size;
      if (still >= 75 && s.playTime - lastNudge > 180) {
        lastNudge = s.playTime;
        s.say("Kelihatannya kamu sedang mencari-cari. Tekan H, aku tunjukkan apa yang harus dilakukan.");
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

const toolInfo: Record<Tool, { name: string; icon: typeof Hand; help: string }> = {
  tangan: { name: "Tangan", icon: Hand, help: "Tekan tombol, tarik tuas, putar drum" },
  pemindai: { name: "Pemindai", icon: ScanLine, help: "Klik mesin, landmark, atau balok untuk info GPT-3" },
  balok: { name: "Balok Token", icon: Box, help: "Klik: pasang · klik kanan atau Shift+klik: bongkar · R: ganti token" },
};
/** Minecraft-style hotbar, plus button fallbacks for each tool. */
function Hotbar() {
  const started = useWorld((s) => s.started);
  const tool = useWorld((s) => s.tool);
  const setTool = useWorld((s) => s.setTool);
  const token = useWorld((s) => s.blockToken);
  const panel = useWorld((s) => s.panel);
  const dialog = useWorld((s) => s.dialog);
  const focus = useWorld((s) => s.focus);
  const reading = useWorld((s) => s.reading);
  if (!started || panel || dialog || reading) return null;
  return (
    <div className={`w3-hotbar-wrap${focus ? " is-raised" : ""}`}>
      <p className="w3-tool-help">
        <b>{toolInfo[tool].name}</b> · {toolInfo[tool].help}
      </p>
      <div className="w3-hotbar" role="toolbar" aria-label="Alat">
        {(Object.keys(toolInfo) as Tool[]).map((t, i) => {
          const Icon = toolInfo[t].icon;
          return (
            <button key={t} type="button" className={tool === t ? "is-on" : ""} aria-pressed={tool === t} onClick={() => setTool(t)} aria-label={`${toolInfo[t].name} (${i + 1})`}>
              <kbd>{i + 1}</kbd>
              <Icon size={22} />
              {t === "balok" && <span className="w3-token-chip">{show(vocab[token])}</span>}
            </button>
          );
        })}
      </div>
      {tool === "pemindai" && (
        <div className="w3-tool-actions">
          <button type="button" onClick={scanNearest}>
            Pindai sekitar
          </button>
        </div>
      )}
      {tool === "balok" && (
        <div className="w3-tool-actions">
          <button type="button" onClick={() => cycleToken(-1)} aria-label="Token sebelumnya">
            ‹
          </button>
          <button type="button" onClick={() => cycleToken(1)} aria-label="Token berikutnya">
            ›
          </button>
          <button type="button" onClick={placeInFront}>
            Taruh balok di depan
          </button>
          <button type="button" onClick={removeLastBlock}>
            Bongkar terakhir
          </button>
        </div>
      )}
    </div>
  );
}

function Crosshair() {
  const fp = useWorld((s) => s.view === "fp");
  const locked = useLock((s) => s.locked);
  const started = useWorld((s) => s.started);
  const panel = useWorld((s) => s.panel);
  const reading = useWorld((s) => s.reading);
  const fine = typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches;
  if (!fp || !started || panel || reading) return null;
  return (
    <>
      <div className="w3-crosshair" aria-hidden="true" />
      {!locked && <p className="w3-lockhint">{fine ? "Klik dunia untuk mengunci kursor · Esc untuk melepas" : "Seret untuk melihat sekeliling · ketuk untuk memakai alat"}</p>}
    </>
  );
}

/** Nara's speech bubble and the hint button. */
function NaraBubble() {
  const nara = useWorld((s) => s.nara);
  const started = useWorld((s) => s.started);
  const dialog = useWorld((s) => s.dialog);
  const panel = useWorld((s) => s.panel);
  const [shown, setShown] = useState(-1);
  useEffect(() => {
    if (!nara) return;
    setShown(nara.n);
    const id = setTimeout(() => setShown(-1), 11000);
    return () => clearTimeout(id);
  }, [nara]);
  if (!started || dialog || panel) return null;
  const open = nara && shown === nara.n;
  return (
    <div className="w3-nara">
      {open && (
        <p className="w3-nara-bubble" role="status">
          <b>Nara</b> {nara.text}
        </p>
      )}
      <button type="button" className="w3-nara-btn" onClick={askNara} title="Minta petunjuk (H)">
        <span className="w3-nara-face" aria-hidden="true" />
        Tanya Nara <kbd>H</kbd>
      </button>
    </div>
  );
}

/** Controls while a book is open on a lectern. */
function BookBar() {
  const reading = useWorld((s) => s.reading);
  const read = useWorld((s) => s.booksRead);
  const turnPage = useWorld((s) => s.turnPage);
  const answer = useWorld((s) => s.answer);
  const closeBook = useWorld((s) => s.closeBook);
  if (!reading) return null;
  const b = books[reading.book];
  const total = spreadCount(b);
  const quiz = b.quiz && reading.page === b.pages.length;
  return (
    <section className="w3-bookbar" style={accent(b.color)} aria-label={`Buku ${b.title}`}>
      <header>
        <BookOpen size={16} />
        <div>
          <b>{b.title}</b>
          <small>
            Halaman {reading.page + 1} dari {total}
            {read.includes(reading.book) ? " \u00b7 tamat" : ""}
          </small>
        </div>
        <button type="button" className="w3-icon" onClick={closeBook} aria-label="Tutup buku (Esc)" title="Tutup (Esc)">
          <X size={16} />
        </button>
      </header>
      <p className="sr-only" aria-live="polite">
        {spreadText(reading.book, reading.page)}
      </p>
      {quiz && b.quiz && (
        <div className="w3-quiz" role="group" aria-label="Jawaban">
          {b.quiz.options.map((o, i) => (
            <button key={i} type="button" aria-pressed={reading.answer === i} className={reading.answer === i ? (i === b.quiz!.answer ? "is-right" : "is-wrong") : ""} onClick={() => answer(i)}>
              <kbd>{i + 1}</kbd> {o}
            </button>
          ))}
        </div>
      )}
      <div className="w3-book-nav">
        <button type="button" onClick={() => turnPage(-1)} disabled={reading.page === 0}>
          ← Sebelumnya
        </button>
        <span>Sentuh halaman kanan untuk lanjut · ← →</span>
        <button type="button" onClick={() => turnPage(1)} disabled={reading.page >= total - 1}>
          Berikutnya →
        </button>
      </div>
    </section>
  );
}

/** What the scanner just read. */
function ScanCard() {
  const scan = useWorld((s) => s.scan);
  const tool = useWorld((s) => s.tool);
  const panel = useWorld((s) => s.panel);
  const reading = useWorld((s) => s.reading);
  if (!scan || tool !== "pemindai" || panel || reading) return null;
  return (
    <section className="w3-scan" aria-live="polite">
      <small>
        <ScanLine size={12} /> Hasil pindai
      </small>
      <h3>{scan.title}</h3>
      <p>{scan.text}</p>
    </section>
  );
}

/** The sentence your blocks spell, and what the Oracle would say next. */
function SentencePanel() {
  const tool = useWorld((s) => s.tool);
  const panel = useWorld((s) => s.panel);
  const sentence = useSentence();
  const reading = useWorld((s) => s.reading);
  if (tool !== "balok" || panel || reading) return null;
  return (
    <section className="w3-sentence" aria-live="polite">
      <small>
        <Box size={12} /> Kalimat balokmu (urutan pasang)
      </small>
      {sentence ? (
        <>
          <div className="w3-sentence-chips">
            {sentence.ids.map((id, i) => (
              <span key={i}>{show(vocab[id])}</span>
            ))}
          </div>
          <p>
            Oracle menebak berikutnya: <b>{show(vocab[sentence.top])}</b> ({Math.round(sentence.p * 100)}%)
          </p>
        </>
      ) : (
        <p>Pasang balok di tanah. Oracle membaca balok sesuai urutan pasang dan menebak token berikutnya.</p>
      )}
    </section>
  );
}

function AwardsPanel() {
  const earned = useWorld((s) => s.earned);
  const playTime = useWorld((s) => s.playTime);
  const best = useWorld((s) => s.bestTime);
  const hints = useWorld((s) => s.hints);
  const finished = useWorld((s) => s.finished);
  return (
    <Overlay label="Pencapaian" wide>
      <SheetHead kicker="Pencapaian" title={`${earned.length} dari ${achievements.length} pencapaian`} />
      <div className="w3-records">
        <div>
          <small>Waktu petualangan ini</small>
          <b>{clock(playTime)}</b>
          <span>{finished ? "selesai" : "masih berjalan"}</span>
        </div>
        <div>
          <small>Rekor terbaik</small>
          <b>{best === null ? "—" : clock(best)}</b>
          <span>target pelari kilat: {SPEEDRUN_MINUTES}:00</span>
        </div>
        <div>
          <small>Petunjuk dari Nara</small>
          <b>{hints}</b>
          <span>3 atau kurang untuk “Mandiri”</span>
        </div>
      </div>
      <div className="w3-awards">
        {achievements.map((a) => {
          const ok = earned.includes(a.id);
          return (
            <article key={a.id} className={ok ? "is-earned" : ""}>
              <Trophy size={20} />
              <div>
                <h4>{a.title}</h4>
                <p>{a.text}</p>
              </div>
              {ok && <Check size={16} strokeWidth={3} />}
            </article>
          );
        })}
      </div>
      <p className="w3-lede">“Mulai ulang” di panel Temuan memulai petualangan baru dengan stopwatch dari nol; rekor dan pencapaian tetap tersimpan.</p>
    </Overlay>
  );
}

/** Island under the walker's feet, refreshed a few times a second. */
function RegionName() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let last = "";
    const id = setInterval(() => {
      const r = regionAt(player.pos.x, player.pos.z);
      const text = r ? `${regionById[r].name} · ${regionById[r].phase}` : "Jembatan";
      if (text !== last && ref.current) ref.current.textContent = last = text;
    }, 300);
    return () => clearInterval(id);
  }, []);
  return <span ref={ref}>Dermaga Awal</span>;
}

/** Compass to the followed mission: an arrow relative to the camera, and a distance. */
function Tracker() {
  const mission = useWorld((s) => activeMission(s));
  const focus = useWorld((s) => s.focus);
  const setPanel = useWorld((s) => s.setPanel);
  const arrow = useRef<SVGSVGElement>(null);
  const dist = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!mission) return;
    let raf = 0;
    const p = poses[mission.id];
    const loop = () => {
      const dx = p.x - player.pos.x,
        dz = p.z - player.pos.z;
      const angle = view.yaw - Math.atan2(dx, dz);
      if (arrow.current) arrow.current.style.transform = `rotate(${(angle * 180) / Math.PI}deg)`;
      if (dist.current) dist.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [mission]);
  if (!mission) return <div className="w3-tracker is-empty">Semua misi selesai</div>;
  const region = regionById[mission.region];
  return (
    <button type="button" className="w3-tracker" style={accent(mission.color)} onClick={() => setPanel("log")} aria-label={`Misi aktif: ${mission.name}, ${region.chapter}. Buka log misi.`}>
      {!focus && (
        <svg ref={arrow} className="w3-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2 L19 20 L12 15.5 L5 20 Z" />
        </svg>
      )}
      <span className="w3-tracker-text">
        <small>{region.chapter}</small>
        <b>{mission.name}</b>
      </span>
      {!focus && <span ref={dist} className="w3-tracker-dist" />}
    </button>
  );
}

/* --------------------------------------------------------------- panel -- */
function StationPanel() {
  const focus = useWorld((s) => s.focus);
  const done = useWorld((s) => s.done);
  const setFocus = useWorld((s) => s.setFocus);
  if (!focus) return null;
  const s = stationById[focus];
  const region = regionById[s.region];
  const { Controls } = modules[focus];
  const current = s.challenges.find((c) => !done.has(challengeKey(s.id, c.id)));
  const next = nextStation(done);
  return (
    <section className="w3-panel" style={accent(s.color)} aria-label={s.name}>
      <header>
        <span className="w3-panel-n">
          <Compass size={15} />
        </span>
        <div className="w3-panel-title">
          <small>{region.chapter}</small>
          <h2>{s.name}</h2>
        </div>
        <button type="button" className="w3-icon" onClick={() => setFocus(null)} aria-label="Keluar dari mesin (Esc)" title="Keluar (Esc)">
          <LogOut size={16} />
        </button>
      </header>
      <p className="w3-brief">
        <b>{region.keeper.name}:</b> {s.brief}
      </p>
      <ol className="w3-goals">
        {s.challenges.map((c) => {
          const ok = done.has(challengeKey(s.id, c.id));
          return (
            <li key={c.id} className={ok ? "is-done" : c === current ? "is-current" : ""}>
              <span aria-hidden="true">{ok ? <Check size={13} strokeWidth={3} /> : ""}</span>
              {c.label}
              {ok && <span className="sr-only"> (selesai)</span>}
            </li>
          );
        })}
      </ol>
      {s.part && (
        <p className={`w3-reward${isStationDone(done, s.id) ? " is-owned" : ""}`}>
          <Package size={14} /> {isStationDone(done, s.id) ? "Didapat" : "Hadiah"}: <b>{s.part.name}</b>
          <small>GPT-3: {s.part.gpt3}</small>
        </p>
      )}
      <details className="w3-more">
        <summary>Kontrol tanpa 3D</summary>
        <Controls />
      </details>
      {!current && (
        <button
          type="button"
          className="w3-primary w3-next"
          onClick={() => {
            setFocus(null);
            if (!next) useWorld.getState().setPanel("finale");
          }}
        >
          {next ? `Lanjutkan petualangan: ${next.name} →` : "Lihat semua temuan →"}
        </button>
      )}
    </section>
  );
}

function NearPrompt() {
  const near = useWorld((s) => s.near);
  const keeper = useWorld((s) => s.nearKeeper);
  const focus = useWorld((s) => s.focus);
  const started = useWorld((s) => s.started);
  const dialog = useWorld((s) => s.dialog);
  const panel = useWorld((s) => s.panel);
  const goTo = useWorld((s) => s.goTo);
  const talk = useWorld((s) => s.talk);
  useWorld((s) => s.nearBook);
  const reading = useWorld((s) => s.reading);
  if (!started || (focus && useWorld.getState().view === "tp") || dialog || panel || reading) return null;
  const nearBook = useWorld.getState().nearBook;
  const fpMode = useWorld.getState().view === "fp";
  if (nearBook && (!near || fpMode)) {
    const b = books[nearBook];
    return (
      <button type="button" className="w3-enter" style={accent(b.color)} onClick={() => useWorld.getState().openBook(nearBook)}>
        <kbd>E</kbd> <BookOpen size={16} /> Baca <b>{b.title}</b>
      </button>
    );
  }
  if (keeper && !near) {
    const r = regionById[keeper];
    return (
      <button type="button" className="w3-enter" style={accent(r.color)} onClick={() => talk(keeper)}>
        <kbd>E</kbd> <MessageCircle size={16} /> Bicara dengan <b>{r.keeper.name}</b>
      </button>
    );
  }
  if (!near || useWorld.getState().view === "fp") return null;
  const s = stationById[near];
  return (
    <button type="button" className="w3-enter" style={accent(s.color)} onClick={() => goTo(near)}>
      <kbd>E</kbd> Masuk ke <b>{s.name}</b>
    </button>
  );
}

function Dialog() {
  const dialog = useWorld((s) => s.dialog);
  const nextLine = useWorld((s) => s.nextLine);
  const talk = useWorld((s) => s.talk);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
  }, [dialog]);
  if (!dialog) return null;
  const r = regionById[dialog.region];
  const lines = r.keeper.lines;
  const last = dialog.line === lines.length - 1;
  return (
    <section className="w3-dialog" style={accent(r.color)} role="dialog" aria-label={`Percakapan dengan ${r.keeper.name}`}>
      <div className="w3-portrait" aria-hidden="true">
        {r.keeper.name[0]}
      </div>
      <div>
        <small>{r.keeper.name}</small>
        <p>{lines[dialog.line]}</p>
        <div className="w3-dialog-actions">
          <button ref={button} type="button" className="w3-primary" onClick={nextLine}>
            {last ? "Siap!" : "Lanjut"} <kbd>Enter</kbd>
          </button>
          {!last && (
            <button type="button" className="w3-link" onClick={() => talk(null)}>
              Lewati
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function WalkHint() {
  const started = useWorld((s) => s.started);
  const focus = useWorld((s) => s.focus);
  const count = useWorld((s) => s.done.size);
  const dialog = useWorld((s) => s.dialog);
  const reading = useWorld((s) => s.reading);
  if (!started || focus || dialog || reading || count > 4) return null;
  return (
    <p className="w3-hint">
      <kbd>W</kbd>
      <kbd>A</kbd>
      <kbd>S</kbd>
      <kbd>D</kbd> jalan · <kbd>Space</kbd> lompat · <kbd>V</kbd> orang pertama · <kbd>1</kbd>–<kbd>3</kbd> alat · <kbd>H</kbd> tanya Nara
    </p>
  );
}

/* ------------------------------------------------------------- toasts -- */
function Toasts() {
  const toasts = useWorld((s) => s.toasts);
  return (
    <div className="w3-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.key} id={t.key} />
      ))}
    </div>
  );
}
function ToastCard({ id }: { id: string }) {
  const toast = useWorld((s) => s.toasts.find((t) => t.key === id));
  const dismiss = useWorld((s) => s.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), 14000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);
  if (!toast) return null;
  const Icon = toast.kind === "part" ? Package : toast.kind === "unlock" ? MapIcon : toast.kind === "achievement" ? Trophy : Sparkles;
  return (
    <article className={`w3-toast is-${toast.kind}`} style={accent(toast.color)}>
      <small>
        <Icon size={12} /> {toast.label}
      </small>
      <h3>{toast.title}</h3>
      <p>{toast.text}</p>
      <button type="button" className="w3-icon" onClick={() => dismiss(id)} aria-label="Tutup">
        <X size={14} />
      </button>
    </article>
  );
}

/* --------------------------------------------------------------- maps -- */
const bounds = { minX: -160, maxX: 160, minZ: -165, maxZ: 140 };
function MapSvg({ big, onPick }: { big?: boolean; onPick?: (id: StationId) => void }) {
  const done = useWorld((s) => s.done);
  const mission = useWorld((s) => activeMission(s));
  const me = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (me.current) me.current.setAttribute("transform", `translate(${player.pos.x} ${player.pos.z}) rotate(${(-player.heading * 180) / Math.PI})`);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.maxX - bounds.minX} ${bounds.maxZ - bounds.minZ}`} className="w3-map-svg" role="img" aria-label="Peta kepulauan">
      <rect x={bounds.minX} y={bounds.minZ} width={bounds.maxX - bounds.minX} height={bounds.maxZ - bounds.minZ} fill="#0d2a3a" />
      {bridges.map((b, i) => {
        const open = isRegionOpen(done, b.to);
        return <line key={i} x1={b.a[0]} y1={b.a[1]} x2={b.b[0]} y2={b.b[1]} stroke={open ? "#c9a46e" : "#56656b"} strokeWidth={big ? 3 : 4.5} strokeDasharray={open ? undefined : "6 5"} />;
      })}
      {islands.map((i) => {
        const open = isRegionOpen(done, i.id);
        const r = regionById[i.id];
        return (
          <g key={i.id}>
            <circle cx={i.x} cy={i.z} r={i.r} fill={open ? i.ground : "#34434a"} stroke={r.color} strokeWidth={big ? 1.5 : 2.5} opacity={open ? 1 : 0.6} />
            {big && (
              <text x={i.x} y={i.z - i.r - 5} textAnchor="middle" className="w3-map-label" fill={r.color}>
                {r.name} · {r.phase}
                {open ? "" : " (terkunci)"}
              </text>
            )}
          </g>
        );
      })}
      {stations.map((s) => {
        const p = poses[s.id];
        const ok = isStationDone(done, s.id);
        const can = big && onPick && isRegionOpen(done, s.region);
        const dot = (
          <g key={s.id} transform={`translate(${p.x} ${p.z})`}>
            {mission?.id === s.id && <circle r={big ? 7 : 9} fill="none" stroke="#ffd166" strokeWidth={2} className="w3-map-pulse" />}
            <circle r={big ? 3.6 : 5} fill={ok ? "#7be0c3" : s.color} stroke="#0d1b20" strokeWidth={1.2} />
            {big && (
              <text y={-6} textAnchor="middle" className="w3-map-station">
                {s.name}
              </text>
            )}
          </g>
        );
        return can ? (
          <a key={s.id} href="#" onClick={(e) => (e.preventDefault(), onPick!(s.id))} aria-label={`Teleport ke ${s.name}`}>
            {dot}
          </a>
        ) : (
          dot
        );
      })}
      {regions.map((r) => {
        const [x, z] = keeperSpot(r.id);
        return isRegionOpen(done, r.id) ? <rect key={r.id} x={x - 2} y={z - 2} width={4} height={4} fill="#ffffff" opacity={0.8} transform={`rotate(45 ${x} ${z})`} /> : null;
      })}
      {lecterns.map((l) => (
        <rect key={l.book} x={l.x - 1.6} y={l.z - 2.2} width={3.2} height={4.4} rx={0.6} fill={books[l.book].color} stroke="#0d1b20" strokeWidth={0.8} opacity={isRegionOpen(done, l.region) ? 1 : 0.35} />
      ))}
      <g ref={me}>
        <path d={big ? "M0 7 L5 -5 L0 -2 L-5 -5 Z" : "M0 9 L7 -7 L0 -3 L-7 -7 Z"} fill="#ffffff" stroke="#0d1b20" strokeWidth={1.2} />
      </g>
    </svg>
  );
}

function Minimap() {
  const started = useWorld((s) => s.started);
  const focus = useWorld((s) => s.focus);
  const fp = useWorld((s) => s.view === "fp");
  const reading = useWorld((s) => s.reading);
  const setPanel = useWorld((s) => s.setPanel);
  // first person keeps the corner free for the tool in hand; the map stays on M
  if (!started || focus || fp || reading) return null;
  return (
    <button type="button" className="w3-minimap" onClick={() => setPanel("map")} aria-label="Buka peta (M)">
      <MapSvg />
    </button>
  );
}

function Overlay({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  const setPanel = useWorld((s) => s.setPanel);
  return (
    <div className="w3-overlay" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.target === e.currentTarget && setPanel(null)}>
      <div className={`w3-sheet${wide ? " is-wide" : ""}`}>{children}</div>
    </div>
  );
}
const SheetHead = ({ kicker, title }: { kicker: string; title: string }) => {
  const setPanel = useWorld((s) => s.setPanel);
  return (
    <header>
      <div>
        <small>{kicker}</small>
        <h2>{title}</h2>
      </div>
      <button type="button" className="w3-icon" onClick={() => setPanel(null)} aria-label="Tutup">
        <X size={18} />
      </button>
    </header>
  );
};

function MapPanel() {
  const goTo = useWorld((s) => s.goTo);
  return (
    <Overlay label="Peta kepulauan">
      <SheetHead kicker="Peta" title="Kepulauan NeuroLab" />
      <p className="w3-lede">Klik mesin di pulau yang sudah terbuka untuk teleport. Lingkaran kuning adalah misi aktif; jembatan putus-putus masih terkunci.</p>
      <div className="w3-bigmap">
        <MapSvg big onPick={(id) => goTo(id)} />
      </div>
    </Overlay>
  );
}

function QuestLog() {
  const done = useWorld((s) => s.done);
  const tracked = useWorld((s) => activeMission(s)?.id);
  const track = useWorld((s) => s.track);
  const goTo = useWorld((s) => s.goTo);
  return (
    <Overlay label="Log misi" wide>
      <SheetHead kicker="Log misi" title="Perjalanan sebuah LLM" />
      <p className="w3-lede">Setiap pulau adalah satu fase hidup model bahasa. Selesaikan semua misi di satu pulau untuk membuka jembatan berikutnya.</p>
      <Shelf />
      <div className="w3-chapters">
        {regions.map((r) => {
          const open = isRegionOpen(done, r.id);
          return (
            <section key={r.id} style={accent(r.color)} className={open ? "" : "is-locked"}>
              <h3>
                {open ? <BookOpen size={15} /> : <Lock size={15} />} {r.chapter}
              </h3>
              <small>{r.name}</small>
              {stationsIn(r.id).map((s) => {
                const ok = isStationDone(done, s.id);
                const count = s.challenges.filter((c) => done.has(challengeKey(s.id, c.id))).length;
                return (
                  <article key={s.id} className={`w3-quest${ok ? " is-done" : ""}${tracked === s.id ? " is-tracked" : ""}`}>
                    <div>
                      <b>
                        {ok && <Check size={13} strokeWidth={3} />} {s.name}
                      </b>
                      <span>
                        {count}/{s.challenges.length}
                        {s.part ? ` · komponen: ${s.part.name}` : ""}
                      </span>
                    </div>
                    {open && !ok && (
                      <div className="w3-quest-actions">
                        <button type="button" onClick={() => track(s.id)} aria-pressed={tracked === s.id}>
                          {tracked === s.id ? "Dilacak" : "Lacak"}
                        </button>
                        <button type="button" onClick={() => goTo(s.id)} aria-label={`Teleport ke ${s.name}`}>
                          Teleport
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </Overlay>
  );
}

function Shelf() {
  const done = useWorld((s) => s.done);
  const read = useWorld((s) => s.booksRead);
  return (
    <section className="w3-shelf">
      <h3>
        <BookMarked size={16} /> Perpustakaan pulau · {read.length}/{lecterns.length} buku tamat
      </h3>
      <p>Bacaan untuk hal yang tidak bisa disimulasikan: sejarah, data, keamanan, skala, hardware, dan evaluasi. Setiap buku ditutup dengan satu pertanyaan.</p>
      <div className="w3-shelf-grid">
        {regions.map((r) =>
          shelf[r.id].map((id) => {
            const b = books[id];
            const open = isRegionOpen(done, r.id);
            const ok = read.includes(id);
            return (
              <article key={id} className={`w3-book${ok ? " is-read" : ""}`} style={accent(b.color)}>
                <div>
                  <b>
                    {ok && <Check size={13} strokeWidth={3} />} {b.title}
                  </b>
                  <span>
                    {r.name} · {b.subtitle}
                  </span>
                </div>
                {open ? (
                  <button type="button" onClick={() => readBook(id)} aria-label={`Baca ${b.title}`}>
                    Baca
                  </button>
                ) : (
                  <Lock size={14} aria-label="terkunci" />
                )}
              </article>
            );
          }),
        )}
      </div>
    </section>
  );
}

function Cards() {
  const panel = useWorld((s) => s.panel);
  const done = useWorld((s) => s.done);
  const setPanel = useWorld((s) => s.setPanel);
  const reset = useWorld((s) => s.reset);
  const all = done.size === totalChallenges;
  return (
    <Overlay label="Kartu temuan" wide>
      <SheetHead kicker={all ? "GPT-3 sudah bangun" : "Temuan dan komponen"} title={all ? "Kamu baru saja menjalani seluruh hidup sebuah LLM" : `${done.size} dari ${totalChallenges} temuan`} />
      {(all || panel === "finale") && (
        <p className="w3-lede">
          Fase belajar: teks dikumpulkan, dipotong jadi token, dan setiap posisi menjadi soal tebak-token. Fase optimasi: gradien menuruni loss dengan komputasi raksasa, lalu
          penyelarasan membentuk perilaku. Fase berjalan: bobot yang beku membaca konteks, menyorot dengan attention, memakai cache, dan mengundi token berikutnya. GPT-3 memakai resep
          yang sama dengan model mini ini, hanya 8,6 juta kali lebih besar.
        </p>
      )}
      <div className="w3-parts" aria-label="Komponen GPT-3">
        {parts.map((p) => {
          const owned = isStationDone(done, p.station);
          return (
            <div key={p.id} className={`w3-part${owned ? " is-owned" : ""}`} style={accent(stationById[p.station].color)}>
              <Package size={14} />
              <b>{owned ? p.name : "???"}</b>
              <small>{owned ? p.gpt3 : stationById[p.station].name}</small>
            </div>
          );
        })}
      </div>
      <div className="w3-grid">
        {stations.map((s) => (
          <section key={s.id} style={accent(s.color)}>
            <h3>{s.name}</h3>
            {s.challenges.map((c) => {
              const ok = done.has(challengeKey(s.id, c.id));
              const open = isRegionOpen(done, s.region);
              return ok ? (
                <article key={c.id} className="w3-card">
                  <h4>{c.insight.title}</h4>
                  <p>{c.insight.text}</p>
                </article>
              ) : (
                <button
                  key={c.id}
                  type="button"
                  className="w3-card is-locked"
                  disabled={!open}
                  onClick={() => {
                    setPanel(null);
                    useWorld.getState().track(s.id);
                  }}
                >
                  <h4>{open ? "???" : "Terkunci"}</h4>
                  <p>{c.label}</p>
                </button>
              );
            })}
          </section>
        ))}
      </div>
      <footer>
        <button type="button" className="w3-link" onClick={() => confirm("Hapus semua temuan dan mulai ulang?") && reset()}>
          Mulai ulang
        </button>
      </footer>
    </Overlay>
  );
}

function Panels() {
  const panel = useWorld((s) => s.panel);
  if (panel === "map") return <MapPanel />;
  if (panel === "log") return <QuestLog />;
  if (panel === "cards" || panel === "finale") return <Cards />;
  if (panel === "awards") return <AwardsPanel />;
  return null;
}

function Intro() {
  const started = useWorld((s) => s.started);
  const start = useWorld((s) => s.start);
  if (started) return null;
  return (
    <div className="w3-intro">
      <div className="w3-intro-card">
        <small>NeuroLab · petualangan</small>
        <h1>Bangunkan GPT-3</h1>
        <p>
          Seberangi kepulauan yang menyimpan seluruh hidup sebuah model bahasa: <b>Hutan Data</b> tempat ia belajar, <b>Pegunungan Loss</b> tempat ia dioptimasi, dan{" "}
          <b>Kota Inferensi</b> tempat ia berjalan. Setiap mesin dijalankan oleh model bahasa mini sungguhan di browsermu.
        </p>
        <button type="button" className="w3-primary w3-big" onClick={start} autoFocus>
          Mulai petualangan
        </button>
        <p className="w3-intro-alt">Materi bacaan ada di buku-buku yang tersebar di setiap pulau: cari mimbar yang bercahaya.</p>
      </div>
    </div>
  );
}

/** Opens the summary once, the moment the last insight lands. */
function FinaleWatcher() {
  const count = useWorld((s) => s.done.size);
  const setPanel = useWorld((s) => s.setPanel);
  const prev = useRef(count);
  useEffect(() => {
    if (prev.current < totalChallenges && count === totalChallenges) setTimeout(() => setPanel("finale"), 2500);
    prev.current = count;
  }, [count, setPanel]);
  return null;
}

export function Hud() {
  return (
    <>
      <Top />
      <StationPanel />
      <NearPrompt />
      <WalkHint />
      <Minimap />
      <Hotbar />
      <BookBar />
      <Crosshair />
      <NaraBubble />
      <ScanCard />
      <SentencePanel />
      <Ticker />
      <Dialog />
      <Toasts />
      <Panels />
      <Intro />
      <FinaleWatcher />
    </>
  );
}

