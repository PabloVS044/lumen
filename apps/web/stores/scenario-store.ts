/**
 * Estado global compartido (sección 6.2). Archivo compartido (docs/team/ROLES.md).
 * Lo que debe ser compartible por URL vive en nuqs (lib/url-state.ts), no aquí.
 * Aquí: estado de UI efímero (instante actual mientras se reproduce, velocidad, modo).
 */
import { create } from "zustand";

export type Mode = "planner" | "explore";

export interface ActiveSite {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  obsHeightM: number;
  color: string;
}

interface ScenarioState {
  sites: ActiveSite[];
  currentTime: string | null;
  playing: boolean;
  speedHoursPerSecond: number;
  mode: Mode;
  addSite: (site: ActiveSite) => void;
  removeSite: (index: number) => void;
  setCurrentTime: (iso: string) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (hoursPerSecond: number) => void;
  setMode: (mode: Mode) => void;
}

export const MAX_SITES = 4;

export const useScenarioStore = create<ScenarioState>((set) => ({
  sites: [],
  currentTime: null,
  playing: false,
  speedHoursPerSecond: 6,
  mode: "planner",
  addSite: (site) => set((s) => (s.sites.length >= MAX_SITES ? s : { sites: [...s.sites, site] })),
  removeSite: (index) => set((s) => ({ sites: s.sites.filter((_, i) => i !== index) })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speedHoursPerSecond) => set({ speedHoursPerSecond }),
  setMode: (mode) => set({ mode }),
}));
