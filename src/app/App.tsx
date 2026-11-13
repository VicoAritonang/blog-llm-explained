import { lazy, Suspense, useSyncExternalStore } from "react";
import { findMission, isLevel, levels, postNotes } from "../content/paths";
import { navigate, subscribeLocation } from "./journey-state";
const Investigation = lazy(() => import("./Investigation"));
const GameExperience = lazy(() => import("./GameExperience"));
const Onboarding = lazy(() => import("./Onboarding"));
const Journey = lazy(() => import("./Journey"));
const World = lazy(() => import("../world/World"));
const World3D = lazy(() => import("../world3d/World3D"));

function Route({ search }: { search: string }) {
  const params = new URLSearchParams(search),
    requested = params.get("level"),
    level = isLevel(requested) ? requested : null,
    lesson = params.get("lesson");
  // A bare ?lesson= link keeps opening the full investigation, as it always has.
  if (lesson !== null) {
    const mission = level && findMission(level, params.get("mission"));
    return level &&
      level !== "pemula" &&
      mission?.posts?.includes(Number(lesson)) ? (
      <Investigation
        key={mission.id}
        guided={{
          level: levels[level],
          mission,
          notes: postNotes[level],
          onExit: () =>
            params.get("from") === "world"
              ? navigate({})
              : navigate({ level, mission: mission.id }),
          exitLabel:
            params.get("from") === "world" ? "Kembali ke dunia game" : undefined,
        }}
      />
    ) : (
      <Investigation />
    );
  }
  // The 3D world is the front door. Text mode, the level picker and the
  // earlier 2D map stay reachable with ?level=, ?pick=1 and ?mode=klasik.
  if (level) return <Journey level={level} missionId={params.get("mission")} />;
  if (params.has("pick")) return <Onboarding />;
  if (requested !== null) return <Onboarding />;
  if (params.get("mode") === "klasik") return <World />;
  return <World3D />;
}

export default function App() {
  const search = useSyncExternalStore(subscribeLocation, () => location.search);
  const english = /^\/en(?:\/|$)/.test(location.pathname);
  const explore = new URLSearchParams(search).get("explore") === "1" || english;
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Menyiapkan NeuroLab…</p>}>
      {explore ? (
        <>
          <a className="story-return" href="/id/">
            {english ? '← Guided investigation (Bahasa Indonesia)' : '← Kembali ke investigasi kasus kunci'}
          </a>
          <GameExperience />
        </>
      ) : (
        <Route search={search} />
      )}
    </Suspense>
  );
}
