export type IntervalColor = "work" | "rest" | "prepare" | "cycles" | "cooldown";

export interface IntervalItem {
  id: string;
  name: string;
  durationSec: number;
  color: IntervalColor;
}

export interface SeriesItem {
  id: string;
  rounds: number;
  intervals: IntervalItem[];
}

export interface WorkoutTimer {
  id: string;
  name: string;
  prepareSec: number;
  series: SeriesItem[];
  cycles: number;
  restBetweenCyclesSec: number;
  cooldownSec: number; // 0 = disabled
  updatedAt: string;
}

export type StepKind =
  | "prepare"
  | "work"
  | "rest"
  | "cycle-rest"
  | "cooldown";

export interface TimelineStep {
  index: number;
  kind: StepKind;
  color: IntervalColor;
  label: string;
  durationSec: number;
  cycleIndex: number; // 1-based (0 for prepare/cooldown)
  totalCycles: number;
  seriesIndex: number; // 1-based (0 for prepare/cooldown/cycle-rest)
  totalSeries: number;
  roundIndex: number; // 1-based (0 for prepare/cooldown/cycle-rest)
  totalRounds: number;
  isLastRoundOfSeries: boolean;
}

export interface AudioPrefs {
  beepEnabled: boolean;
  voiceEnabled: boolean;
  flashEnabled: boolean;
}

export const PHASE_COLOR_HEX: Record<IntervalColor, string> = {
  prepare: "#FACC15",
  work: "#22C55E",
  rest: "#EF4444",
  cycles: "#FB923C",
  cooldown: "#60A5FA",
};

export const PHASE_BG_TINT: Record<IntervalColor, string> = {
  prepare: "rgba(250, 204, 21, 0.14)",
  work: "rgba(34, 197, 94, 0.16)",
  rest: "rgba(239, 68, 68, 0.16)",
  cycles: "rgba(251, 146, 60, 0.16)",
  cooldown: "rgba(96, 165, 250, 0.16)",
};
