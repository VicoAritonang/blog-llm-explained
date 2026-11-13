import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Lock, Navigation, X } from "lucide-react";
import { missions } from "../content/paths";
import { books } from "./books";
import { zoneAccent } from "./engine";
import {
  COLS,
  ROWS,
  bookObjects,
  buildFloor,
  gates,
  interactables,
  questObjects,
  zones,
} from "./map";
import { type Progress, type WorldSave } from "./progress";

const floor = buildFloor();

function Shell({
  title,
  kicker,
  onClose,
  children,
  wide,
}: {
  title: string;
  kicker: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <section className={`panel ${wide ? "wide" : ""}`} ref={ref} tabIndex={-1}>
        <header className="panel-head">
          <div>
            <small>{kicker}</small>
            <h2 id="panel-title">{title}</h2>
          </div>
          <button className="icon-close" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

const missionOf = (o: (typeof questObjects)[number]) =>
  missions[o.level].find((m) => m.id === o.mission)!;

export function WorldMap({
  progress,
  save,
  unlockedZone,
  player,
  onTravel,
  onOpen,
  onClose,
}: {
  progress: Progress;
  save: WorldSave;
  unlockedZone: number;
  player: { x: number; y: number };
  onTravel: (id: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Shell title="Peta NeuroLab" kicker="PETA · TEKAN M" onClose={onClose} wide>
      <svg className="minimap" viewBox={`0 0 ${COLS} ${ROWS}`} role="img" aria-label="Peta mini empat area">
        {floor.map((row, y) =>
          row.map((f, x) => {
            if (!f) return null;
            const z = zones.findIndex((zz) => x >= zz.x0 && x <= zz.x1);
            const locked = z > unlockedZone;
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1.02}
                height={1.02}
                fill={z < 0 ? "#3a4a55" : zoneAccent[z]}
                opacity={locked ? 0.08 : 0.2}
              />
            );
          }),
        )}
        {gates.map((g) => (
          <rect
            key={g.id}
            x={g.x}
            y={g.ys[0]}
            width={1}
            height={2}
            fill={progress.gateOpen(g.id) ? "#8fd694" : "#ff8c64"}
          />
        ))}
        {interactables.map((o) => {
          const locked = o.zone > unlockedZone;
          const fill =
            o.kind === "quest"
              ? progress.missionDone(missionOf(o))
                ? "#8fd694"
                : "#ffcf4a"
              : o.kind === "book"
                ? save.books.includes(o.book)
                  ? "#5d7280"
                  : "#8db8e8"
                : o.kind === "npc"
                  ? "#8ce3ca"
                  : "#e1edf0";
          return (
            <g
              key={o.id}
              className={locked ? "locked" : "pin"}
              onClick={() => !locked && onTravel(o.id)}
            >
              <circle
                cx={o.x + 0.5}
                cy={o.y + 0.5}
                r={o.kind === "quest" ? 0.6 : 0.45}
                fill={fill}
                opacity={locked ? 0.25 : 1}
              />
              {progress.recommended?.id === o.id && (
                <circle cx={o.x + 0.5} cy={o.y + 0.5} r={1.1} fill="none" stroke="#ffcf4a" strokeWidth={0.18} />
              )}
            </g>
          );
        })}
        <circle cx={player.x} cy={player.y} r={0.55} fill="#fff" stroke="#08141a" strokeWidth={0.2} />
        {zones.map((z) => (
          <text key={z.id} x={(z.x0 + z.x1 + 1) / 2} y={z.y0 + 1.6} textAnchor="middle" className="minimap-label">
            {z.id > unlockedZone ? "🔒 " : ""}
            {z.name}
          </text>
        ))}
      </svg>
      <p className="muted small">
        Klik titik di peta atau tombol di bawah untuk berteleportasi. Kuning: quest, biru: buku, hijau:
        selesai.
      </p>
      <div className="map-lists">
        {zones.map((z) => {
          const locked = z.id > unlockedZone;
          const items = interactables.filter((o) => o.zone === z.id && o.kind !== "npc");
          return (
            <section key={z.id} className={locked ? "locked" : ""} style={{ ["--zone" as string]: zoneAccent[z.id] }}>
              <h3>
                {locked && <Lock size={14} />} {z.level ? `Level ${z.id + 1} · ` : ""}
                {z.name}
              </h3>
              <ul>
                {items.map((o) => {
                  const label =
                    o.kind === "quest"
                      ? missionOf(o).short
                      : o.kind === "book"
                        ? books[o.book].title
                        : o.kind === "exam"
                          ? `Ujian lompat ke Level ${o.gate + 2}`
                          : "Piala Arsitek";
                  const done =
                    o.kind === "quest"
                      ? progress.missionDone(missionOf(o))
                      : o.kind === "book"
                        ? save.books.includes(o.book)
                        : o.kind === "exam"
                          ? progress.gateOpen(o.gate)
                          : false;
                  return (
                    <li key={o.id}>
                      <span className={`map-kind ${o.kind}`}>
                        {done ? <Check size={12} /> : o.kind === "book" ? <BookOpen size={12} /> : o.kind === "exam" ? "?" : "!"}
                      </span>
                      <span className="map-label">{label}</span>
                      <button disabled={locked} onClick={() => onTravel(o.id)} aria-label={`Teleport ke ${label}`}>
                        Pergi
                      </button>
                      <button disabled={locked} onClick={() => onOpen(o.id)} aria-label={`Buka ${label}`}>
                        Buka
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}

export function Journal({
  progress,
  save,
  unlockedZone,
  onGuide,
  onClose,
}: {
  progress: Progress;
  save: WorldSave;
  unlockedZone: number;
  onGuide: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"quest" | "book">("quest");
  return (
    <Shell title="Jurnal peneliti" kicker="JURNAL · TEKAN J" onClose={onClose}>
      <div className="quest-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "quest"} onClick={() => setTab("quest")}>
          Quest {progress.questsDone}/{questObjects.length}
        </button>
        <button role="tab" aria-selected={tab === "book"} onClick={() => setTab("book")}>
          Buku {save.books.length}/{bookObjects.length}
        </button>
      </div>
      {tab === "quest" &&
        zones.slice(0, 3).map((z) => {
          const locked = z.id > unlockedZone;
          const [d, t] = progress.zoneQuests(z.id);
          return (
            <section key={z.id} className={`journal-zone ${locked ? "locked" : ""}`} style={{ ["--zone" as string]: zoneAccent[z.id] }}>
              <h3>
                {locked ? <Lock size={14} /> : null} Level {z.id + 1} · {z.name}
                <span>
                  {d}/{t}
                </span>
              </h3>
              <ol>
                {questObjects
                  .filter((q) => q.zone === z.id)
                  .map((q) => {
                    const m = missionOf(q);
                    const [cd, ct] = progress.missionCount(m);
                    const next = m.tasks.find((task) => !progress.isTaskDone(task));
                    return (
                      <li key={q.id} className={cd === ct ? "done" : ""}>
                        <span className="journal-check">{cd === ct ? <Check size={13} /> : `${cd}/${ct}`}</span>
                        <div>
                          <b>{m.short}</b>
                          <small>{next ? next.label : "Selesai"}</small>
                        </div>
                        {!locked && (
                          <button onClick={() => onGuide(q.id)} aria-label={`Antar ke ${m.short}`}>
                            <Navigation size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
              </ol>
            </section>
          );
        })}
      {tab === "book" && (
        <ol className="journal-books">
          {bookObjects.map((b) => {
            const book = books[b.book];
            const locked = b.zone > unlockedZone;
            const read = save.books.includes(b.book);
            return (
              <li key={b.id} className={locked ? "locked" : read ? "done" : ""} style={{ ["--book" as string]: book.color }}>
                <i aria-hidden="true" />
                <div>
                  <b>{locked ? "Buku terkunci" : book.title}</b>
                  <small>
                    {zones[b.zone].name}
                    {read ? " · sudah dibaca" : ""}
                    {save.quiz.includes(b.book) ? " · kuis benar" : ""}
                  </small>
                </div>
                {!locked && (
                  <button onClick={() => onGuide(b.id)} aria-label={`Antar ke ${book.title}`}>
                    <Navigation size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Shell>
  );
}
