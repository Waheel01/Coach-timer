import { TimelineStep, WorkoutTimer } from "@/types";

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/**
 * Formats seconds like Timer Plus: ":30" when under 1 minute, "2:00" when >= 1 min.
 */
export function formatShortDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) {
    return `:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats full clock readout for the giant runner ("00:30" or "02:00" or "1:05:00").
 */
export function formatBigClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Compiles a WorkoutTimer definition into a flat deterministic list of timeline steps.
 */
export function buildTimeline(timer: WorkoutTimer): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const totalCycles = Math.max(1, timer.cycles);
  const totalSeries = timer.series.length;

  if (timer.prepareSec > 0) {
    steps.push({
      index: steps.length,
      kind: "prepare",
      color: "prepare",
      label: "PRÉPARER",
      durationSec: timer.prepareSec,
      cycleIndex: 0,
      totalCycles,
      seriesIndex: 0,
      totalSeries,
      roundIndex: 0,
      totalRounds: 0,
      isLastRoundOfSeries: false,
    });
  }

  for (let c = 1; c <= totalCycles; c++) {
    timer.series.forEach((serie, sIdx) => {
      const rounds = Math.max(1, serie.rounds);
      const validIntervals = serie.intervals.filter((iv) => iv.durationSec > 0);

      for (let r = 1; r <= rounds; r++) {
        validIntervals.forEach((iv) => {
          const isRest = iv.color === "rest";
          steps.push({
            index: steps.length,
            kind: isRest ? "rest" : "work",
            color: iv.color,
            label: iv.name.trim() || (isRest ? "REPOS" : "EXERCICE"),
            durationSec: iv.durationSec,
            cycleIndex: c,
            totalCycles,
            seriesIndex: sIdx + 1,
            totalSeries,
            roundIndex: r,
            totalRounds: rounds,
            isLastRoundOfSeries: r === rounds,
          });
        });
      }
    });

    // Rest between cycles (only between cycle c and c+1)
    if (c < totalCycles && timer.restBetweenCyclesSec > 0) {
      steps.push({
        index: steps.length,
        kind: "cycle-rest",
        color: "cycles",
        label: "REPOS ENTRE CYCLES",
        durationSec: timer.restBetweenCyclesSec,
        cycleIndex: c,
        totalCycles,
        seriesIndex: 0,
        totalSeries,
        roundIndex: 0,
        totalRounds: 0,
        isLastRoundOfSeries: false,
      });
    }
  }

  if (timer.cooldownSec > 0) {
    steps.push({
      index: steps.length,
      kind: "cooldown",
      color: "cooldown",
      label: "RÉCUPÉRATION",
      durationSec: timer.cooldownSec,
      cycleIndex: 0,
      totalCycles,
      seriesIndex: 0,
      totalSeries,
      roundIndex: 0,
      totalRounds: 0,
      isLastRoundOfSeries: false,
    });
  }

  return steps;
}

export function getTotalDurationSec(timer: WorkoutTimer): number {
  return buildTimeline(timer).reduce((sum, step) => sum + step.durationSec, 0);
}

export function getTotalRoundsCount(timer: WorkoutTimer): number {
  const perCycle = timer.series.reduce(
    (sum, s) => sum + Math.max(1, s.rounds),
    0
  );
  return perCycle * Math.max(1, timer.cycles);
}

export function createBlankTimer(): WorkoutTimer {
  return {
    id: uid("timer"),
    name: "",
    prepareSec: 10,
    series: [
      {
        id: uid("serie"),
        rounds: 6,
        intervals: [
          { id: uid("iv"), name: "EXERCICE", durationSec: 30, color: "work" },
          { id: uid("iv"), name: "REPOS", durationSec: 30, color: "rest" },
        ],
      },
    ],
    cycles: 2,
    restBetweenCyclesSec: 30,
    cooldownSec: 0,
    updatedAt: new Date().toISOString(),
  };
}
