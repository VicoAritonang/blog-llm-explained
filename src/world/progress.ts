import { missions, type Mission, type Task } from "../content/paths";
import {
  gates,
  questObjects,
  zones,
  interactables,
  type Interactable,
  type ZoneId,
} from "./map";
import { books } from "./books";

export const WORLD_KEY = "neurolab-world-v1";
export type WorldSave = {
  started: boolean;
  books: string[]; // books read to the last page
  quiz: string[]; // books whose quiz was answered correctly
  exams: number[]; // gates opened by the skip exam
  seenLevel: number;
  pos: { x: number; y: number } | null;
};
const empty: WorldSave = {
  started: false,
  books: [],
  quiz: [],
  exams: [],
  seenLevel: 1,
  pos: null,
};
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];

export function readWorld(): WorldSave {
  try {
    const d = JSON.parse(localStorage.getItem(WORLD_KEY) || "{}");
    const pos =
      d.pos && Number.isFinite(d.pos.x) && Number.isFinite(d.pos.y)
        ? { x: d.pos.x, y: d.pos.y }
        : null;
    return {
      started: d.started === true,
      books: strings(d.books).filter((id) => id in books),
      quiz: strings(d.quiz).filter((id) => id in books),
      exams: Array.isArray(d.exams)
        ? d.exams.filter((n: unknown) => n === 0 || n === 1 || n === 2)
        : [],
      seenLevel: [1, 2, 3, 4].includes(d.seenLevel) ? d.seenLevel : 1,
      pos,
    };
  } catch {
    return { ...empty };
  }
}
export function writeWorld(save: WorldSave) {
  try {
    localStorage.setItem(WORLD_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export const XP = { task: 25, quest: 100, book: 20, quiz: 15, exam: 60 };

export type Progress = {
  isTaskDone: (task: Task) => boolean;
  missionDone: (m: Mission) => boolean;
  missionCount: (m: Mission) => [number, number];
  zoneQuests: (zone: ZoneId) => [number, number];
  gateOpen: (gate: number) => boolean;
  gateByQuests: (gate: number) => boolean;
  /** 1 Pemula · 2 Menengah · 3 Mahir · 4 Arsitek */
  level: number;
  xp: number;
  tasksDone: number;
  questsDone: number;
  booksRead: number;
  recommended: Interactable | null;
};

export function computeProgress(
  done: string[],
  explained: Set<number>,
  save: WorldSave,
): Progress {
  const doneSet = new Set(done);
  const isTaskDone = (task: Task) =>
    task.post === undefined ? doneSet.has(task.id) : explained.has(task.post);
  const missionDone = (m: Mission) => m.tasks.every(isTaskDone);
  const missionCount = (m: Mission): [number, number] => [
    m.tasks.filter(isTaskDone).length,
    m.tasks.length,
  ];
  const zoneMissions = (zone: ZoneId) => {
    const level = zones[zone].level;
    return level ? missions[level] : [];
  };
  const zoneQuests = (zone: ZoneId): [number, number] => {
    const list = zoneMissions(zone);
    return [list.filter(missionDone).length, list.length];
  };
  const gateByQuests = (gate: number) => {
    const [d, t] = zoneQuests(gate as ZoneId);
    return t > 0 && d === t;
  };
  const gateOpen = (gate: number) =>
    gateByQuests(gate) || save.exams.includes(gate);

  let level = 1;
  while (level <= gates.length && gateOpen(level - 1)) level++;

  const allTasks = [...missions.pemula, ...missions.menengah, ...missions.mahir]
    .flatMap((m) => m.tasks)
    // A post task appears in more than one level; it pays once per id.
    .filter((t, i, list) => list.findIndex((o) => o.id === t.id) === i);
  const tasksDone = allTasks.filter(isTaskDone).length;
  const questsDone = questObjects.filter((q) => {
    const m = missions[q.level].find((m) => m.id === q.mission);
    return m && missionDone(m);
  }).length;
  const xp =
    tasksDone * XP.task +
    questsDone * XP.quest +
    save.books.length * XP.book +
    save.quiz.length * XP.quiz +
    save.exams.length * XP.exam;

  // Next thing worth doing: the first open quest of the newest zone, or the
  // trophy once every gate is open.
  const open =
    level <= 3 ? zoneMissions((level - 1) as ZoneId).find((m) => !missionDone(m)) : null;
  const recommended: Interactable | null =
    (open
      ? interactables.find((o) => o.kind === "quest" && o.mission === open.id)
      : interactables.find((o) => o.kind === "trophy")) ?? null;

  return {
    isTaskDone,
    missionDone,
    missionCount,
    zoneQuests,
    gateOpen,
    gateByQuests,
    level,
    xp,
    tasksDone,
    questsDone,
    booksRead: save.books.length,
    recommended,
  };
}

export const levelNames = ["", "Pemula", "Menengah", "Mahir", "Arsitek"];
export const levelRanks = [
  "",
  "Peneliti Magang",
  "Teknisi Mesin",
  "Auditor Skala",
  "Arsitek LLM",
];
