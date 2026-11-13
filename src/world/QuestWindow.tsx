import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Circle, ExternalLink, Play, Sparkles, X } from "lucide-react";
import { findMission, missions, type LevelId } from "../content/paths";
import { lessons } from "../content/investigation";
import { labs } from "../app/labs";
import { GuideMark } from "../app/Guide";
import { XP, type Progress } from "./progress";
import "../app/investigation.css";
import "../app/journey.css";

export default function QuestWindow({
  level,
  missionId,
  progress,
  card,
  complete,
  onCard,
  onPost,
  onClose,
}: {
  level: LevelId;
  missionId: string;
  progress: Progress;
  card: string;
  complete: (id: string) => void;
  onCard: (card: string) => void;
  onPost: (level: LevelId, mission: string, post: number) => void;
  onClose: () => void;
}) {
  const mission = findMission(level, missionId)!;
  const list = missions[level];
  const index = list.indexOf(mission);
  const Lab = mission.lab && labs[mission.lab];
  const active = mission.tasks.find((t) => !progress.isTaskDone(t));
  const finished = !active;
  const [justFinished, setJustFinished] = useState(false);
  const wasFinished = useRef(finished);
  const [tab, setTab] = useState<"lab" | "notes">("lab");
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (finished && !wasFinished.current) setJustFinished(true);
    wasFinished.current = finished;
  }, [finished]);
  useEffect(() => {
    dialog.current?.focus();
  }, []);

  const hasNotes = !!(mission.lens || mission.production || mission.sources);
  const doneCount = mission.tasks.filter(progress.isTaskDone).length;
  const reward = mission.tasks.length * XP.task + XP.quest;

  return (
    <div className="overlay quest-overlay" role="dialog" aria-modal="true" aria-labelledby="quest-title">
      <div className="quest-window" ref={dialog} tabIndex={-1}>
        <header className="quest-head">
          <div>
            <p className="quest-kicker">
              QUEST {index + 1}/{list.length} · LEVEL {["pemula", "menengah", "mahir"].indexOf(level) + 1}
            </p>
            <h2 id="quest-title">{mission.title}</h2>
            <p className="quest-goal">{mission.goal}</p>
          </div>
          <div className="quest-reward" title="Hadiah quest">
            <Sparkles size={14} />
            <b>{reward}</b>
            <small>XP</small>
          </div>
          <button className="icon-close" onClick={onClose} aria-label="Tutup quest dan kembali ke dunia">
            <X size={20} />
          </button>
        </header>

        <div className="quest-body">
          <aside className="quest-side">
            <section className="quest-nara">
              <GuideMark size={36} />
              <div aria-live="polite">
                <small>Nara</small>
                <p>{active ? active.guide : mission.wrap}</p>
              </div>
            </section>
            <section className="quest-objectives">
              <h3>
                Tujuan <span>{doneCount}/{mission.tasks.length}</span>
              </h3>
              <ol>
                {mission.tasks.map((task) => {
                  const done = progress.isTaskDone(task);
                  return (
                    <li key={task.id} className={done ? "done" : task === active ? "active" : ""}>
                      {done ? <Check size={15} /> : <Circle size={15} />}
                      <span>
                        <span className="sr-only">{done ? "Selesai: " : "Belum: "}</span>
                        {task.label}
                        {task.post !== undefined && !done && (
                          <button className="quest-post-link" onClick={() => onPost(level, mission.id, task.post!)}>
                            Masuk ke Pos {String(task.post).padStart(2, "0")} <ArrowRight size={13} />
                          </button>
                        )}
                      </span>
                      {!done && <em>+{XP.task}</em>}
                    </li>
                  );
                })}
              </ol>
            </section>
          </aside>

          <section className="quest-main">
            {hasNotes && (
              <div className="quest-tabs" role="tablist">
                <button role="tab" aria-selected={tab === "lab"} onClick={() => setTab("lab")}>
                  Simulasi
                </button>
                <button role="tab" aria-selected={tab === "notes"} onClick={() => setTab("notes")}>
                  Catatan lapangan
                </button>
              </div>
            )}

            {tab === "lab" && (
              <div className="investigation quest-lab">
                {Lab && (
                  <Lab
                    key={mission.id}
                    complete={complete}
                    isDone={(id) => progress.isTaskDone({ id, label: "", guide: "" })}
                    card={card}
                    onCard={onCard}
                  />
                )}
                {mission.posts && (
                  <div className="quest-posts">
                    <h3>{Lab ? "Lanjutkan di ruang mesin" : "Ruang mesin"}</h3>
                    <p>
                      Setiap pos adalah simulasi 3D dari model mini. Buat dugaan, buka hasilnya, lalu
                      jelaskan buktinya untuk mencentang tujuan. Kamu akan kembali ke sini setelahnya.
                    </p>
                    <div>
                      {mission.posts.map((post) => {
                        const done = progress.isTaskDone({ id: "", label: "", guide: "", post });
                        return (
                          <button key={post} className={done ? "done" : ""} onClick={() => onPost(level, mission.id, post)}>
                            <span className="quest-post-num">
                              {done ? <Check size={14} /> : String(post).padStart(2, "0")}
                            </span>
                            <span>
                              <b>{lessons[post].short}</b>
                              <small>{lessons[post].title}</small>
                            </span>
                            <Play size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "notes" && (
              <div className="investigation quest-lab quest-notes">
                {mission.lens && (
                  <table className="journey-lens">
                    <caption>{level === "mahir" ? "Model mini dan GPT-3" : "Padanan dari dunia software"}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{level === "mahir" ? "Decoder mini" : "Yang kamu kenal"}</th>
                        <th scope="col">{level === "mahir" ? "GPT-3 175B" : "Di dalam LLM"}</th>
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
                {mission.production && (
                  <div className="journey-notes">
                    <h3>Saat kamu membangun dengan LLM</h3>
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
              </div>
            )}
          </section>
        </div>

        {finished && (
          <footer className={`quest-complete ${justFinished ? "fresh" : ""}`} role="status">
            <div>
              <b>{justFinished ? "QUEST SELESAI!" : "Quest ini sudah tuntas"}</b>
              <p>{mission.wrap}</p>
            </div>
            <button className="btn-gold" onClick={onClose}>
              Kembali ke dunia <ArrowRight size={16} />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
