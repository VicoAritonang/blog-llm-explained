import { isLevel, type LevelId } from "../content/paths";

export const JOURNEY_KEY = "neurolab-journey-v1";
export type JourneyState = {
  level: LevelId | null;
  done: string[];
  card: string;
};

export function readJourney(): JourneyState {
  try {
    const data = JSON.parse(localStorage.getItem(JOURNEY_KEY) || "{}");
    return {
      level: isLevel(data.level) ? data.level : null,
      done: Array.isArray(data.done)
        ? data.done.filter((id: unknown) => typeof id === "string")
        : [],
      card: typeof data.card === "string" ? data.card.slice(0, 400) : "",
    };
  } catch {
    return { level: null, done: [], card: "" };
  }
}
export function writeJourney(state: JourneyState) {
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
export function subscribeLocation(listener: () => void) {
  listeners.add(listener);
  addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    removeEventListener("popstate", listener);
  };
}
// Only the route keys are replaced, so ?mode=2d survives every move.
export function navigate(route: {
  level?: LevelId;
  mission?: string;
  lesson?: number;
  pick?: boolean;
  from?: "world";
}) {
  const url = new URL(location.href);
  for (const key of ["level", "mission", "lesson", "pick", "from"])
    url.searchParams.delete(key);
  if (route.level) url.searchParams.set("level", route.level);
  if (route.mission) url.searchParams.set("mission", route.mission);
  if (route.lesson !== undefined)
    url.searchParams.set("lesson", String(route.lesson));
  if (route.pick) url.searchParams.set("pick", "1");
  if (route.from) url.searchParams.set("from", route.from);
  history.pushState(null, "", url);
  listeners.forEach((listener) => listener());
  scrollTo(0, 0);
}
