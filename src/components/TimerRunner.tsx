import {
  ArrowLeft,
  CheckCircle2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioPrefs,
  PHASE_BG_TINT,
  PHASE_COLOR_HEX,
  TimelineStep,
  WorkoutTimer,
} from "@/types";
import { playCue, speakFrench, stopSpeech, unlockAudio } from "@/utils/audio";
import { buildTimeline, formatBigClock, getTotalRoundsCount } from "@/utils/timeline";

interface TimerRunnerProps {
  timer: WorkoutTimer;
  audioPrefs: AudioPrefs;
  onToggleBeep: () => void;
  onToggleVoice: () => void;
  onExit: () => void;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function TimerRunner({
  timer,
  audioPrefs,
  onToggleBeep,
  onToggleVoice,
  onExit,
}: TimerRunnerProps) {
  const steps = useMemo(() => buildTimeline(timer), [timer]);
  const totalWorkoutSec = useMemo(
    () => steps.reduce((sum, s) => sum + s.durationSec, 0),
    [steps]
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(steps[0]?.durationSec ?? 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);

  const endTimestampRef = useRef<number | null>(null);
  const lastBeepedSecRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const currentStep: TimelineStep | undefined = steps[stepIdx];
  const nextStep: TimelineStep | undefined = steps[stepIdx + 1];

  // Remaining total workout time including current step
  const remainingTotalSec = useMemo(() => {
    if (isFinished) return 0;
    let sum = secondsLeft;
    for (let i = stepIdx + 1; i < steps.length; i++) {
      sum += steps[i].durationSec;
    }
    return sum;
  }, [isFinished, secondsLeft, stepIdx, steps]);

  const announceStep = useCallback(
    (step: TimelineStep) => {
      setFlashKey((k) => k + 1);
      if (audioPrefs.beepEnabled) {
        if (step.kind === "rest" || step.kind === "cycle-rest") {
          playCue("rest-start");
        } else {
          playCue("work-start");
        }
      }
      if (audioPrefs.voiceEnabled) {
        const spoken =
          step.kind === "prepare"
            ? "Préparez-vous"
            : step.kind === "cycle-rest"
              ? "Repos entre les cycles"
              : step.kind === "cooldown"
                ? "Récupération"
                : step.isLastRoundOfSeries && step.kind === "work" && step.totalRounds > 1
                  ? `${step.label}, dernier round`
                  : step.label;
        speakFrench(spoken);
      }
    },
    [audioPrefs.beepEnabled, audioPrefs.voiceEnabled]
  );

  // Keep screen awake while runner is mounted and active (Web Wake Lock API)
  useEffect(() => {
    const nav = navigator as unknown as {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!isRunning || !nav.wakeLock) return;

    let cancelled = false;
    nav.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) {
          sentinel.release().catch(() => {});
        } else {
          wakeLockRef.current = sentinel;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [isRunning]);

  // Stop speech when leaving runner
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // High-precision wall-clock interval engine
  useEffect(() => {
    if (!isRunning || isFinished || !currentStep) return;

    if (!endTimestampRef.current) {
      endTimestampRef.current = Date.now() + secondsLeft * 1000;
    }

    const intervalId = window.setInterval(() => {
      if (!endTimestampRef.current) return;
      const msLeft = endTimestampRef.current - Date.now();
      const nextSec = Math.ceil(msLeft / 1000);

      // 3 - 2 - 1 countdown beeps
      if (
        nextSec <= 3 &&
        nextSec >= 1 &&
        lastBeepedSecRef.current !== nextSec &&
        currentStep.durationSec >= 4
      ) {
        lastBeepedSecRef.current = nextSec;
        if (audioPrefs.beepEnabled) {
          playCue("countdown");
        }
      }

      if (msLeft <= 0) {
        lastBeepedSecRef.current = null;
        const upcomingIdx = stepIdx + 1;

        if (upcomingIdx >= steps.length) {
          setIsRunning(false);
          setIsFinished(true);
          setSecondsLeft(0);
          endTimestampRef.current = null;
          if (audioPrefs.beepEnabled) playCue("finish");
          if (audioPrefs.voiceEnabled) speakFrench("Séance terminée ! Bravo !");
        } else {
          const next = steps[upcomingIdx];
          setStepIdx(upcomingIdx);
          setSecondsLeft(next.durationSec);
          endTimestampRef.current = Date.now() + next.durationSec * 1000;
          announceStep(next);
        }
      } else {
        setSecondsLeft(nextSec);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [
    isRunning,
    isFinished,
    currentStep,
    stepIdx,
    steps,
    secondsLeft,
    audioPrefs.beepEnabled,
    audioPrefs.voiceEnabled,
    announceStep,
  ]);

  const handleTogglePlay = () => {
    unlockAudio();
    if (isFinished) {
      handleRestart();
      return;
    }
    if (isRunning) {
      if (endTimestampRef.current) {
        const rem = Math.max(
          0,
          Math.ceil((endTimestampRef.current - Date.now()) / 1000)
        );
        setSecondsLeft(rem);
      }
      endTimestampRef.current = null;
      setIsRunning(false);
      stopSpeech();
    } else {
      const startingFresh =
        stepIdx === 0 && secondsLeft === steps[0]?.durationSec;
      endTimestampRef.current = Date.now() + secondsLeft * 1000;
      lastBeepedSecRef.current = null;
      setIsRunning(true);
      if (startingFresh && currentStep) {
        announceStep(currentStep);
      }
    }
  };

  const handleRestart = () => {
    unlockAudio();
    stopSpeech();
    setStepIdx(0);
    setSecondsLeft(steps[0]?.durationSec ?? 0);
    setIsFinished(false);
    setIsRunning(false);
    endTimestampRef.current = null;
    lastBeepedSecRef.current = null;
  };

  const handleJumpStep = (delta: number) => {
    const target = Math.max(0, Math.min(steps.length - 1, stepIdx + delta));
    const step = steps[target];
    if (!step) return;
    setStepIdx(target);
    setSecondsLeft(step.durationSec);
    setIsFinished(false);
    lastBeepedSecRef.current = null;
    if (isRunning) {
      endTimestampRef.current = Date.now() + step.durationSec * 1000;
      announceStep(step);
    } else {
      endTimestampRef.current = null;
    }
  };

  const handleSafeExit = () => {
    if (isRunning && !isFinished) {
      setConfirmExit(true);
    } else {
      stopSpeech();
      onExit();
    }
  };

  const activeColor = currentStep
    ? PHASE_COLOR_HEX[currentStep.color]
    : "#A3E635";
  const activeTint = currentStep
    ? PHASE_BG_TINT[currentStep.color]
    : "rgba(163, 230, 53, 0.14)";

  const stepProgressPct = currentStep
    ? Math.min(
        100,
        Math.max(
          0,
          ((currentStep.durationSec - secondsLeft) /
            Math.max(1, currentStep.durationSec)) *
            100
        )
      )
    : 100;

  if (isFinished) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gym-bg px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-phase-lime/15 text-phase-lime">
          <CheckCircle2 className="h-11 w-11" />
        </div>
        <h1 className="mt-5 font-display text-5xl font-extrabold uppercase tracking-wide text-gym-text">
          Séance terminée
        </h1>
        <p className="mt-2 text-base text-gym-muted">{timer.name}</p>

        <div className="mt-6 grid w-full max-w-xs grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gym-border bg-gym-card p-3.5">
            <span className="text-xs text-gym-muted">Durée</span>
            <p className="mt-1 font-display text-3xl font-bold tabular-clock text-gym-text">
              {formatBigClock(totalWorkoutSec)}
            </p>
          </div>
          <div className="rounded-2xl border border-gym-border bg-gym-card p-3.5">
            <span className="text-xs text-gym-muted">Rounds</span>
            <p className="mt-1 font-display text-3xl font-bold tabular-clock text-gym-text">
              {getTotalRoundsCount(timer)}
            </p>
          </div>
        </div>

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-phase-lime font-display text-xl font-bold uppercase tracking-wide text-gym-bg"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Relancer la séance</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex h-13 min-h-[50px] items-center justify-center rounded-2xl border border-gym-border bg-gym-card text-sm font-semibold text-gym-text"
          >
            Retour aux minuteurs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-gym-bg transition-colors duration-300"
      style={{
        backgroundImage: `radial-gradient(ellipse 85% 55% at 50% 35%, ${activeTint}, transparent 75%)`,
      }}
    >
      {/* Brief visual transition flash */}
      {audioPrefs.flashEnabled && flashKey > 0 && (
        <div
          key={flashKey}
          aria-hidden="true"
          className="animate-phase-flash pointer-events-none fixed inset-0 z-10"
          style={{ backgroundColor: activeColor }}
        />
      )}

      {/* Top HUD */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/5">
        <button
          type="button"
          onClick={handleSafeExit}
          aria-label="Quitter le chronomètre"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gym-card/90 border border-gym-border text-gym-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-gym-text">
            {timer.name}
          </p>
          <p className="text-xs text-gym-muted tabular-clock">
            Reste {formatBigClock(remainingTotalSec)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleBeep}
            aria-label={audioPrefs.beepEnabled ? "Couper les bips" : "Activer les bips"}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gym-card/90 border border-gym-border"
          >
            {audioPrefs.beepEnabled ? (
              <Volume2 className="h-4 w-4 text-phase-lime" />
            ) : (
              <VolumeX className="h-4 w-4 text-gym-muted" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleVoice}
            aria-label={audioPrefs.voiceEnabled ? "Couper la voix" : "Activer la voix"}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gym-card/90 border border-gym-border"
          >
            {audioPrefs.voiceEnabled ? (
              <Mic className="h-4 w-4 text-phase-rounds" />
            ) : (
              <MicOff className="h-4 w-4 text-gym-muted" />
            )}
          </button>
        </div>
      </header>

      {/* Main Arena — adapts cleanly to Portrait AND Landscape gym projection */}
      <main className="relative z-20 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 px-5 py-4 landscape:flex-row landscape:gap-8 landscape:py-2">
        {/* Giant Phase + Clock column */}
        <div className="flex flex-col items-center justify-center text-center landscape:flex-1">
          {/* Phase Pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-1.5 font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wider"
            style={{
              backgroundColor: activeTint,
              color: activeColor,
              border: `1.5px solid ${activeColor}66`,
            }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
            <span>{currentStep?.label ?? "PRÊT"}</span>
          </div>

          {/* MASSIVE 10-meter gym countdown */}
          <div
            className="mt-3 font-display text-[112px] sm:text-[148px] landscape:text-[136px] font-extrabold leading-[0.9] tracking-tight tabular-clock select-none"
            style={{ color: secondsLeft <= 3 && isRunning ? activeColor : "#F5F7F8" }}
          >
            {formatBigClock(secondsLeft)}
          </div>

          {/* Phase progress bar */}
          <div className="mt-5 h-3 w-full max-w-sm overflow-hidden rounded-full bg-gym-card border border-gym-border">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${stepProgressPct}%`,
                backgroundColor: activeColor,
              }}
            />
          </div>
        </div>

        {/* Counters + Next Up + Controls column */}
        <div className="flex w-full max-w-sm flex-col items-center gap-4 landscape:max-w-xs">
          {/* Cycle / Série / Round counters */}
          <div className="grid w-full grid-cols-3 gap-2">
            <div className="rounded-2xl border border-gym-border bg-gym-card/90 px-3 py-2.5 text-center">
              <span className="text-[11px] uppercase tracking-wider text-gym-muted">
                Round
              </span>
              <p className="font-display text-2xl font-bold tabular-clock text-phase-rounds">
                {currentStep && currentStep.totalRounds > 0
                  ? `${currentStep.roundIndex}/${currentStep.totalRounds}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-gym-border bg-gym-card/90 px-3 py-2.5 text-center">
              <span className="text-[11px] uppercase tracking-wider text-gym-muted">
                Série
              </span>
              <p className="font-display text-2xl font-bold tabular-clock text-gym-text">
                {currentStep && currentStep.seriesIndex > 0
                  ? `${currentStep.seriesIndex}/${currentStep.totalSeries}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-gym-border bg-gym-card/90 px-3 py-2.5 text-center">
              <span className="text-[11px] uppercase tracking-wider text-gym-muted">
                Cycle
              </span>
              <p className="font-display text-2xl font-bold tabular-clock text-phase-cycles">
                {currentStep && currentStep.cycleIndex > 0
                  ? `${currentStep.cycleIndex}/${currentStep.totalCycles}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Next interval preview */}
          <div className="flex w-full items-center justify-between rounded-2xl border border-gym-border bg-gym-card/80 px-4 py-2.5 text-sm">
            <span className="text-xs uppercase tracking-wider text-gym-muted">
              Suivant
            </span>
            {nextStep ? (
              <span className="flex items-center gap-2 font-semibold text-gym-text truncate">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PHASE_COLOR_HEX[nextStep.color] }}
                />
                <span className="truncate max-w-[150px]">{nextStep.label}</span>
                <span className="font-display text-base font-bold text-gym-muted tabular-clock">
                  {formatBigClock(nextStep.durationSec)}
                </span>
              </span>
            ) : (
              <span className="font-medium text-phase-lime">Fin de séance</span>
            )}
          </div>

          {/* Gym-sized playback controls */}
          <div className="flex w-full items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleJumpStep(-1)}
              disabled={stepIdx === 0}
              aria-label="Intervalle précédent"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gym-border bg-gym-card text-gym-text disabled:opacity-30 active:scale-95"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-16 flex-1 items-center justify-center gap-2.5 rounded-2xl font-display text-2xl font-extrabold uppercase tracking-wide transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: isRunning ? "#191C1E" : activeColor,
                color: isRunning ? "#F5F7F8" : "#0E1011",
                border: isRunning ? `2px solid ${activeColor}` : "none",
              }}
            >
              {isRunning ? (
                <>
                  <Pause className="h-6 w-6 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 fill-current" />
                  <span>
                    {stepIdx === 0 && secondsLeft === steps[0]?.durationSec
                      ? "Démarrer"
                      : "Reprendre"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleJumpStep(1)}
              disabled={stepIdx >= steps.length - 1}
              aria-label="Intervalle suivant"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gym-border bg-gym-card text-gym-text disabled:opacity-30 active:scale-95"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {!isRunning && (stepIdx > 0 || secondsLeft < (steps[0]?.durationSec ?? 0)) && (
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-4 text-xs font-medium text-gym-muted hover:text-gym-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Recommencer depuis le début</span>
            </button>
          )}
        </div>
      </main>

      {/* Safe exit confirmation modal */}
      {confirmExit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Quitter la séance en cours"
        >
          <div className="w-full max-w-xs rounded-3xl border border-gym-border bg-gym-card p-5 text-center">
            <h2 className="font-display text-2xl font-bold uppercase text-gym-text">
              Arrêter la séance ?
            </h2>
            <p className="mt-1.5 text-sm text-gym-muted">
              Le chronomètre en cours sera réinitialisé.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-gym-well text-sm font-semibold text-gym-text"
              >
                Continuer
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  onExit();
                }}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-phase-rest text-sm font-semibold text-white"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
