import { t } from "../i18n/core.mjs";
import { create } from "zustand";
import { useExperience } from "./experience";
import { stations, type StationId } from "../content/lessons";
import { fieldTools, type ToolId } from "../content/world";
import { VOCAB, effectiveIds } from "../simulation/engine.mjs";
import { usePlayground } from "./playground";

export const gameInput = {
  forward: 0,
  strafe: 0,
  jump: false,
  walking: 0,
  wake: () => {},
};
type Panel = "journal" | "map" | "settings" | "missions" | null;
type GameState = {
  tool: ToolId;
  locked: boolean;
  ready: boolean;
  guide: boolean;
  aimed: StationId | null;
  distance: number;
  panel: Panel;
  journalTab: "guide" | "experiment";
  scanned: StationId[];
  destination: StationId;
  travelSerial: number;
  waypoint: StationId;
  pulse: number;
  notice: { serial: number; text: string } | null;
  setAim: (id: StationId | null, distance: number) => void;
  equip: (tool: ToolId) => void;
  openPanel: (panel: Panel) => void;
  travel: (id: StationId) => void;
  notify: (text: string) => void;
  useTool: () => void;
  advance: () => void;
};
export const useGame = create<GameState>((set, get) => ({
  tool: "scanner",
  locked: false,
  ready: false,
  guide: true,
  aimed: null,
  distance: Infinity,
  panel: null,
  journalTab: "guide",
  scanned: [],
  destination: useExperience.getState().station,
  travelSerial: 0,
  waypoint: useExperience.getState().station,
  pulse: 0,
  notice: null,
  setAim: (aimed, distance) => set({ aimed, distance }),
  equip: (tool) => set({ tool }),
  openPanel: (panel) => {
    if (panel && document.pointerLockElement) document.exitPointerLock();
    gameInput.forward = 0;
    gameInput.strafe = 0;
    set({ panel });
  },
  travel: (destination) => {
    const playing = useExperience.getState().playing;
    useExperience.getState().navigate(destination);
    useExperience.getState().patch({ playing, finished: false });
    get().openPanel(null);
    set({
      destination,
      aimed: null,
      distance: Infinity,
      waypoint: destination,
      travelSerial: get().travelSerial + 1,
    });
  },
  notify: (text) =>
    set({ notice: { text, serial: Date.now() + Math.random() } }),
  useTool: () => {
    const g = get(),
      s = useExperience.getState();
    set({ pulse: g.pulse + 1 });
    if (g.tool === "time") {
      s.patch({ playing: !s.playing });
      g.notify(
        s.playing
          ? t("Waktu dijeda. Tekan R untuk maju satu operasi.")
          : t("Sinyal mengalir kembali."),
      );
      return;
    }
    if (!g.aimed || g.distance > 7.2) {
      g.notify(t("Dekati instrumen dan arahkan bidikan ke bagian tengahnya."));
      return;
    }
    const station = g.aimed;
    if (s.station !== station)
      s.patch({ station, step: 0, column: 0, local: false });
    if (g.tool === "tuner") {
      g.notify(usePlayground.getState().cycle(station));
      return;
    }
    const active = useExperience.getState();
    if (g.tool === "scanner") {
      set({
        scanned: [...new Set([...g.scanned, station])],
        journalTab: "guide",
      });
      g.openPanel("journal");
    } else if (g.tool === "token") {
      const local =
        active.local && active.experiment === "C" && station === "attention";
      const ids = effectiveIds(active);
      const token = (active.token + 1) % (local ? 3 : ids.length);
      active.patch({
        token,
        traced: true,
        column: 0,
        step:
          station === "attention"
            ? 4
            : station === "tokenizer"
              ? 1
              : active.step,
      });
      g.notify(
        local
          ? t("Melacak posisi {0} pada vignette Q/K/V.", token)
          : t(
              "Melacak {0} · posisi {1}. Sorotan matriks mengikuti token ini.",
              VOCAB[ids[token]].trim(),
              token,
            ),
      );
    } else if (g.tool === "lens") {
      if (!["qkv", "attention", "transformer"].includes(station)) {
        g.notify(
          t(
            "Lensa head digunakan pada Q/K/V, causal attention, atau blok Transformer.",
          ),
        );
        return;
      }
      const head = active.head === 0 ? 1 : 0;
      active.patch({
        head,
        column: 0,
        step: station === "attention" ? 4 : active.step,
      });
      g.notify(
        t(
          "Head demo {0} aktif. Perhatikan perubahan proyeksi dan bobot attention.",
          head + 1,
        ),
      );
    }
  },
  advance: () => {
    const s = useExperience.getState();
    s.next();
    const next = useExperience.getState();
    if (next.station !== s.station) {
      set({ waypoint: next.station });
      get().notify(
        t(
          "Tahap berikutnya: {0}. Ikuti penanda atau buka peta [M].",
          stations.find((st) => st.id === next.station)!.title,
        ),
      );
    } else if (next.finished) {
      get().notify(
        t(
          "Perjalanan satu token selesai. Jelajahi lagi dengan alat lain atau pilih eksperimen di catatan.",
        ),
      );
    }
  },
}));
export function cycleTool(direction: number) {
  const current = fieldTools.findIndex((t) => t.id === useGame.getState().tool);
  useGame
    .getState()
    .equip(
      fieldTools[(current + direction + fieldTools.length) % fieldTools.length]
        .id,
    );
}
