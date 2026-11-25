import { AudioPrefs, WorkoutTimer } from "@/types";

const TIMERS_KEY = "coachtimer_v1_timers";
const AUDIO_KEY = "coachtimer_v1_audio";

const STARTER_TIMERS: WorkoutTimer[] = [
  {
    id: "preset-hiit-3030",
    name: "HIIT 30/30 — 2 cycles",
    prepareSec: 15,
    series: [
      {
        id: "s-hiit-1",
        rounds: 6,
        intervals: [
          { id: "i-hiit-1", name: "EXERCICE", durationSec: 30, color: "work" },
          { id: "i-hiit-2", name: "REPOS", durationSec: 30, color: "rest" },
        ],
      },
    ],
    cycles: 2,
    restBetweenCyclesSec: 60,
    cooldownSec: 120,
    updatedAt: "2026-11-25T12:00:00.000Z",
  },
  {
    id: "preset-tabata",
    name: "Tabata 20/10 Express",
    prepareSec: 10,
    series: [
      {
        id: "s-tab-1",
        rounds: 8,
        intervals: [
          { id: "i-tab-1", name: "EFFORT MAX", durationSec: 20, color: "work" },
          { id: "i-tab-2", name: "REPOS", durationSec: 10, color: "rest" },
        ],
      },
    ],
    cycles: 1,
    restBetweenCyclesSec: 0,
    cooldownSec: 0,
    updatedAt: "2026-11-25T11:55:00.000Z",
  },
  {
    id: "preset-circuit-4515",
    name: "Circuit Collectif 45/15",
    prepareSec: 15,
    series: [
      {
        id: "s-cir-1",
        rounds: 4,
        intervals: [
          { id: "i-cir-1", name: "STATION TRAVAIL", durationSec: 45, color: "work" },
          { id: "i-cir-2", name: "ROTATION", durationSec: 15, color: "rest" },
        ],
      },
    ],
    cycles: 3,
    restBetweenCyclesSec: 90,
    cooldownSec: 180,
    updatedAt: "2026-11-25T11:50:00.000Z",
  },
  {
    id: "preset-emom-10",
    name: "EMOM 10 minutes",
    prepareSec: 10,
    series: [
      {
        id: "s-emom-1",
        rounds: 10,
        intervals: [
          { id: "i-emom-1", name: "MINUTE EMOM", durationSec: 60, color: "work" },
        ],
      },
    ],
    cycles: 1,
    restBetweenCyclesSec: 0,
    cooldownSec: 0,
    updatedAt: "2026-11-25T11:45:00.000Z",
  },
];

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  beepEnabled: true,
  voiceEnabled: true,
  flashEnabled: true,
};

export function loadTimers(): WorkoutTimer[] {
  try {
    const raw = localStorage.getItem(TIMERS_KEY);
    if (!raw) return STARTER_TIMERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_TIMERS;
  } catch {
    return STARTER_TIMERS;
  }
}

export function saveTimers(timers: WorkoutTimer[]): void {
  try {
    localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
  } catch {
    // Ignore quota errors
  }
}

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return DEFAULT_AUDIO_PREFS;
    return { ...DEFAULT_AUDIO_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUDIO_PREFS;
  }
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}
