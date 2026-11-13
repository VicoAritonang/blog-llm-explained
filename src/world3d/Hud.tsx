import { useEffect, useRef } from "react";
import { Check, Layers, LogOut, Sparkles, X } from "lucide-react";
import { challengeKey, stationById, stations, totalChallenges } from "./content";
import { nextStation, useWorld } from "./store";
import { modules } from "./Scene";
import { stationDone } from "./Island";

function Route() {
  const done = useWorld((s) => s.done);
  const focus = useWorld((s) => s.focus);
  const near = useWorld((s) => s.near);
  const goTo = useWorld((s) => s.goTo);
  const next = nextStation(done);
  return (
    <nav className="w3-route" aria-label="Mesin di pulau">
      {stations.map((s, i) => {
        const complete = stationDone(done, i);
        const here = focus === s.id || (!focus && near === s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={`w3-stop${here ? " is-here" : ""}${complete ? " is-done" : ""}${next?.id === s.id ? " is-next" : ""}`}
            style={{ ["--accent" as string]: s.color }}
            onClick={() => goTo(s.id)}
            aria-current={focus === s.id ? "location" : undefined}
            aria-label={`${i + 1}. ${s.name}${complete ? ", selesai" : ""}`}
          >
            <span className="w3-stop-n">{complete ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            <span className="w3-stop-name">{s.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Top() {
  const count = useWorld((s) => s.done.size);
  const started = useWorld((s) => s.started);
  const setPanel = useWorld((s) => s.setPanel);
  return (
    <header className="w3-top" hidden={!started}>
      <div className="w3-brand">
        <b>NeuroLab</b>
        <span>di dalam model bahasa</span>
      </div>
      <Route />
      <button type="button" className="w3-cards-btn" onClick={() => setPanel("cards")}>
        <Sparkles size={16} />
        <span>
          <b>{count}</b>/{totalChallenges} temuan
        </span>
      </button>
    </header>
  );
}

function StationPanel() {
  const focus = useWorld((s) => s.focus);
  const done = useWorld((s) => s.done);
  const setFocus = useWorld((s) => s.setFocus);
  if (!focus) return null;
  const s = stationById[focus];
  const index = stations.indexOf(s);
  const { Controls } = modules[focus];
  const current = s.challenges.find((c) => !done.has(challengeKey(s.id, c.id)));
  return (
    <section className="w3-panel" style={{ ["--accent" as string]: s.color }} aria-label={s.name}>
      <header>
        <span className="w3-panel-n">{index + 1}</span>
        <h2>{s.name}</h2>
        <button type="button" className="w3-icon" onClick={() => setFocus(null)} aria-label="Keluar dari mesin (Esc)" title="Keluar (Esc)">
          <LogOut size={16} />
        </button>
      </header>
      <p className="w3-hook">{s.hook}</p>
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
      <details className="w3-more">
        <summary>Kontrol tanpa 3D</summary>
        <Controls />
      </details>
      {!current && (
        <button type="button" className="w3-primary w3-next" onClick={() => {
          const next = nextStation(done);
          if (next) useWorld.getState().goTo(next.id);
          else useWorld.getState().setPanel("finale");
        }}>
          {nextStation(done) ? `Lanjut ke ${nextStation(done)!.name} →` : "Lihat semua temuan →"}
        </button>
      )}
    </section>
  );
}

function NearPrompt() {
  const near = useWorld((s) => s.near);
  const focus = useWorld((s) => s.focus);
  const started = useWorld((s) => s.started);
  const goTo = useWorld((s) => s.goTo);
  if (!started || focus || !near) return null;
  const s = stationById[near];
  return (
    <button type="button" className="w3-enter" style={{ ["--accent" as string]: s.color }} onClick={() => goTo(near)}>
      <kbd>E</kbd> Masuk ke <b>{s.name}</b>
    </button>
  );
}

function WalkHint() {
  const started = useWorld((s) => s.started);
  const focus = useWorld((s) => s.focus);
  const count = useWorld((s) => s.done.size);
  if (!started || focus || count > 3) return null;
  return (
    <p className="w3-hint">
      <kbd>W</kbd>
      <kbd>A</kbd>
      <kbd>S</kbd>
      <kbd>D</kbd> atau klik tanah untuk berjalan · klik mesin untuk masuk · <kbd>1</kbd>–<kbd>8</kbd> pindah mesin
    </p>
  );
}

function Toasts() {
  const toasts = useWorld((s) => s.toasts);
  const dismiss = useWorld((s) => s.dismiss);
  return (
    <div className="w3-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.key} toast={t} onClose={() => dismiss(t.key)} />
      ))}
    </div>
  );
}
function ToastCard({ toast, onClose }: { toast: ReturnType<typeof useWorld.getState>["toasts"][number]; onClose: () => void }) {
  const timer = useRef<number>(0);
  useEffect(() => {
    timer.current = window.setTimeout(onClose, 14000);
    return () => clearTimeout(timer.current);
  }, [onClose]);
  const s = stationById[toast.station];
  return (
    <article className="w3-toast" style={{ ["--accent" as string]: s.color }}>
      <small>
        <Sparkles size={12} /> Temuan baru · {s.name}
      </small>
      <h3>{toast.title}</h3>
      <p>{toast.text}</p>
      <button type="button" className="w3-icon" onClick={onClose} aria-label="Tutup temuan">
        <X size={14} />
      </button>
    </article>
  );
}

function Cards() {
  const panel = useWorld((s) => s.panel);
  const done = useWorld((s) => s.done);
  const setPanel = useWorld((s) => s.setPanel);
  const reset = useWorld((s) => s.reset);
  if (panel !== "cards" && panel !== "finale") return null;
  const all = done.size === totalChallenges;
  return (
    <div className="w3-overlay" role="dialog" aria-modal="true" aria-label="Kartu temuan" onClick={(e) => e.target === e.currentTarget && setPanel(null)}>
      <div className="w3-sheet">
        <header>
          <div>
            <small>{all ? "Semua mesin sudah kamu jalankan" : "Kartu temuan"}</small>
            <h2>{all ? "Kamu baru saja melihat seluruh isi model bahasa" : `${done.size} dari ${totalChallenges} temuan`}</h2>
          </div>
          <button type="button" className="w3-icon" onClick={() => setPanel(null)} aria-label="Tutup">
            <X size={18} />
          </button>
        </header>
        {all && (
          <p className="w3-lede">
            Teks dipotong jadi token, token jadi titik di ruang angka, attention memilih apa yang dilihat, lalu model mengundi token berikutnya. Semua angka itu terbentuk lewat latihan, dan
            tetap bisa salah dengan yakin. Model besar memakai resep yang sama, hanya jauh lebih besar.
          </p>
        )}
        <div className="w3-grid">
          {stations.map((s, i) => (
            <section key={s.id} style={{ ["--accent" as string]: s.color }}>
              <h3>
                <span>{i + 1}</span> {s.name}
              </h3>
              {s.challenges.map((c) => {
                const ok = done.has(challengeKey(s.id, c.id));
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
                    onClick={() => {
                      setPanel(null);
                      useWorld.getState().goTo(s.id);
                    }}
                  >
                    <h4>???</h4>
                    <p>{c.label}</p>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
        <footer>
          <a href="?lesson=0">Investigasi mendalam: 14 pos dengan angka lengkap</a>
          <a href="?pick=1">Mode teks per level</a>
          <a href="?mode=klasik">Dunia 2D lama</a>
          <button type="button" className="w3-link" onClick={() => confirm("Hapus semua temuan dan mulai ulang?") && reset()}>
            Mulai ulang
          </button>
        </footer>
      </div>
    </div>
  );
}

function Intro() {
  const started = useWorld((s) => s.started);
  const start = useWorld((s) => s.start);
  if (started) return null;
  return (
    <div className="w3-intro">
      <div className="w3-intro-card">
        <small>NeuroLab</small>
        <h1>Masuk ke dalam sebuah model bahasa</h1>
        <p>
          Pulau ini adalah model bahasa sungguhan berisi 20.256 angka yang berjalan di browsermu. Delapan mesinnya mengikuti perjalanan teks dari pertanyaan sampai jawaban. Jangan membaca:
          sentuh, putar, cabut, dan lihat apa yang terjadi.
        </p>
        <button type="button" className="w3-primary w3-big" onClick={start} autoFocus>
          Mulai menjelajah
        </button>
        <p className="w3-intro-alt">
          <Layers size={14} /> Lebih suka membaca? <a href="?pick=1">Mode teks</a> · <a href="?lesson=0">investigasi lengkap</a>
        </p>
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
      <Toasts />
      <Cards />
      <Intro />
      <FinaleWatcher />
    </>
  );
}
