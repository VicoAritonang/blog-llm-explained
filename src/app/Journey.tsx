import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  ExternalLink,
  Layers3,
  Repeat2,
  Gamepad2,
} from "lucide-react";
import {
  levels,
  missions,
  nextLevel,
  findMission,
  type LevelId,
  type Mission,
  type Task,
} from "../content/paths";
import { lessons } from "../content/investigation";
import { readBook } from "./investigation-data";
import { navigate, readJourney, writeJourney } from "./journey-state";
import { GuideMark, GuideName } from "./Guide";
import { labs } from "./labs";
import "./investigation.css";
import "./journey.css";

export default function Journey({
  level,
  missionId,
}: {
  level: LevelId;
  missionId: string | null;
}) {
  const [state, setState] = useState(readJourney);
  const [storageFailed, setStorageFailed] = useState(false);
  // On a phone the map would push the guide a full screen down.
  const [mapOpen, setMapOpen] = useState(
    () => !matchMedia("(max-width: 860px)").matches,
  );
  const book = useMemo(readBook, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const list = missions[level];
  const isDone = useCallback(
    (task: Task) =>
      task.post === undefined
        ? state.done.includes(task.id)
        : book.some((e) => e.lesson === task.post && e.status === "explained"),
    [state.done, book],
  );
  const finished = (m: Mission) => m.tasks.every(isDone);
  const mission =
    findMission(level, missionId) ?? list.find((m) => !finished(m)) ?? list[0];
  const index = list.indexOf(mission),
    following = list[index + 1],
    completed = list.filter(finished).length,
    activeTask = mission.tasks.find((task) => !isDone(task)),
    allDone = completed === list.length,
    upgrade = nextLevel(level);

  const complete = useCallback((id: string) => {
    setState((old) =>
      old.done.includes(id) ? old : { ...old, done: [...old.done, id] },
    );
  }, []);
  const saveCard = useCallback((card: string) => {
    setState((old) => ({ ...old, card }));
  }, []);

  useEffect(() => {
    setStorageFailed(!writeJourney({ ...state, level }));
  }, [state, level]);
  useEffect(() => {
    document.title = `${mission.short} · ${levels[level].name} | NeuroLab`;
    heading.current?.focus({ preventScroll: true });
  }, [mission, level]);

  const Lab = mission.lab && labs[mission.lab];
  const mahir = level === "mahir";

  return (
    <main className="investigation journey">
      <a className="story-skip" href="#journey-stage">
        Lewati navigasi ke misi
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
        <nav aria-label="Pengaturan jalur">
          <span className="journey-level">
            {levels[level].name} <small>{levels[level].audience}</small>
          </span>
          <button onClick={() => navigate({ pick: true })}>
            <Repeat2 size={15} />
            Ganti level
          </button>
          <button onClick={() => navigate({})}>
            <Gamepad2 size={15} />
            Kembali ke game
          </button>
        </nav>
      </header>
      <div className="journey-layout">
        <aside className="journey-map">
          <details
            open={mapOpen}
            onToggle={(e) => setMapOpen(e.currentTarget.open)}
          >
            <summary>
              Peta misi
              <small>
                {completed} dari {list.length} selesai
              </small>
            </summary>
            <progress
              max={list.length}
              value={completed}
              aria-label="Misi selesai"
            />
            <nav aria-label="Peta misi">
              <ol>
                {list.map((m, i) => (
                  <li key={m.id} className={finished(m) ? "done" : ""}>
                    <button
                      onClick={() => navigate({ level, mission: m.id })}
                      className={m === mission ? "active" : ""}
                      aria-current={m === mission ? "step" : undefined}
                    >
                      <span className="journey-node">
                        {finished(m) ? <Check size={13} /> : i + 1}
                      </span>
                      <span>{m.short}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
        </aside>

        <section className="journey-stage" id="journey-stage">
          <p className="story-eyebrow">
            MISI {index + 1} DARI {list.length}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {mission.title}
          </h1>
          <p className="journey-goal">{mission.goal}</p>

          {mission.lens && (
            <table className="journey-lens">
              <caption>
                {mahir ? "Model mini dan GPT-3" : "Padanan dari dunia software"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    {mahir ? "Decoder mini" : "Yang kamu kenal"}
                  </th>
                  <th scope="col">{mahir ? "GPT-3 175B" : "Di dalam LLM"}</th>
                </tr>
              </thead>
              <tbody>
                {mission.lens.map(([known, inside]) => (
                  <tr key={known}>
                    <th scope="row">{known}</th>
                    <td>{inside}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {Lab && (
            <Lab
              key={mission.id}
              complete={complete}
              card={state.card}
              onCard={saveCard}
              isDone={(id) => state.done.includes(id)}
            />
          )}

          {mission.posts && (
            <div className="journey-posts">
              <h2>Buka mesinnya</h2>
              <p>
                Setiap pos meminta dugaan sebelum hasil dibuka. Tugas tercentang
                setelah buktinya kamu jelaskan.
              </p>
              {mission.posts.map((post) => {
                const explained = book.some(
                  (e) => e.lesson === post && e.status === "explained",
                );
                return (
                  <button
                    key={post}
                    onClick={() =>
                      navigate({ level, mission: mission.id, lesson: post })
                    }
                  >
                    <span className="journey-node">
                      {explained ? (
                        <Check size={13} />
                      ) : (
                        String(post).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      <b>{lessons[post].short}</b>
                      <small>{lessons[post].title}</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                );
              })}
            </div>
          )}

          {mission.production && (
            <div className="journey-notes">
              <h2>Saat kamu membangun dengan LLM</h2>
              <ul>
                {mission.production.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {mission.sources && (
            <p className="journey-sources">
              Sumber:{" "}
              {mission.sources.map((source, i) => (
                <span key={source.url}>
                  {i > 0 && " · "}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                    <ExternalLink size={12} />
                  </a>
                </span>
              ))}
            </p>
          )}

          <footer className="story-next">
            <div>
              <button
                disabled={index === 0}
                onClick={() => navigate({ level, mission: list[index - 1].id })}
              >
                <ArrowLeft size={15} />
                Misi sebelumnya
              </button>
              {following ? (
                <button
                  className={activeTask ? "" : "story-primary"}
                  onClick={() => navigate({ level, mission: following.id })}
                >
                  {activeTask ? "Lewati ke misi berikutnya" : "Misi berikutnya"}
                  <ArrowRight size={16} />
                </button>
              ) : (
                upgrade &&
                allDone && (
                  <button
                    className="story-primary"
                    onClick={() => navigate({ level: upgrade })}
                  >
                    Lanjut ke jalur {levels[upgrade].name}
                    <ArrowRight size={16} />
                  </button>
                )
              )}
            </div>
          </footer>
        </section>

        <aside className="journey-rail" aria-label="Pemandu dan checklist">
          <section className="journey-guide">
            <GuideMark />
            <div aria-live="polite">
              <GuideName />
              <p>{activeTask ? activeTask.guide : mission.wrap}</p>
            </div>
          </section>
          <section className="journey-checklist">
            <h2>Checklist misi</h2>
            <ul>
              {mission.tasks.map((task) => {
                const done = isDone(task);
                return (
                  <li
                    key={task.id}
                    className={
                      done ? "done" : task === activeTask ? "active" : ""
                    }
                  >
                    {done ? <Check size={15} /> : <Circle size={15} />}
                    <span>
                      <span className="sr-only">
                        {done ? "Selesai: " : "Belum: "}
                      </span>
                      {task.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            {!activeTask && (
              <p role="status" className="journey-done">
                {allDone
                  ? `Seluruh jalur ${levels[level].name} tuntas.`
                  : "Misi selesai."}
              </p>
            )}
            {storageFailed && (
              <p role="status">
                Penyimpanan lokal tidak tersedia. Progres hilang saat halaman
                ditutup.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
