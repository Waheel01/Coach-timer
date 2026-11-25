import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatShortDuration } from "@/utils/timeline";

interface DurationSheetProps {
  mode: "duration";
  title: string;
  valueSec: number;
  allowZero?: boolean;
  onConfirm: (sec: number) => void;
  onClose: () => void;
}

interface CountSheetProps {
  mode: "count";
  title: string;
  value: number;
  min?: number;
  max?: number;
  onConfirm: (count: number) => void;
  onClose: () => void;
}

export type ValueSheetProps = DurationSheetProps | CountSheetProps;

const QUICK_DURATIONS = [10, 15, 20, 30, 40, 45, 60, 90, 120, 180];
const QUICK_COUNTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

export function ValueSheet(props: ValueSheetProps) {
  const [minutes, setMinutes] = useState(
    props.mode === "duration" ? Math.floor(props.valueSec / 60) : 0
  );
  const [seconds, setSeconds] = useState(
    props.mode === "duration" ? props.valueSec % 60 : 0
  );
  const [count, setCount] = useState(props.mode === "count" ? props.value : 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const totalSec = minutes * 60 + seconds;

  const adjustMinutes = (delta: number) => {
    setMinutes((m) => Math.max(0, Math.min(99, m + delta)));
  };

  const adjustSeconds = (delta: number) => {
    const nextTotal = Math.max(
      props.mode === "duration" && !props.allowZero ? 5 : 0,
      Math.min(99 * 60 + 55, totalSec + delta)
    );
    setMinutes(Math.floor(nextTotal / 60));
    setSeconds(nextTotal % 60);
  };

  const handleConfirm = () => {
    if (props.mode === "duration") {
      const safeSec = props.allowZero ? Math.max(0, totalSec) : Math.max(1, totalSec);
      props.onConfirm(safeSec);
    } else {
      const min = props.min ?? 1;
      const max = props.max ?? 99;
      props.onConfirm(Math.max(min, Math.min(max, count)));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
      onClick={props.onClose}
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-gym-border bg-gym-card p-5 pb-7 sm:pb-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
            {props.title}
          </h3>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gym-well text-gym-muted hover:text-gym-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {props.mode === "duration" ? (
          <>
            {/* Minutes & Seconds big steppers */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gym-border bg-gym-bg p-3 text-center">
                <span className="text-xs font-medium text-gym-muted">Minutes</span>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustMinutes(-1)}
                    aria-label="Retirer 1 minute"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text active:scale-95"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                    {String(minutes).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustMinutes(1)}
                    aria-label="Ajouter 1 minute"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gym-border bg-gym-bg p-3 text-center">
                <span className="text-xs font-medium text-gym-muted">
                  Secondes (±5s)
                </span>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => adjustSeconds(-5)}
                    aria-label="Retirer 5 secondes"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text active:scale-95"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                    {String(seconds).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustSeconds(5)}
                    aria-label="Ajouter 5 secondes"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Fine +-1s adjustment */}
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => adjustSeconds(-1)}
                className="min-h-[36px] rounded-xl border border-gym-border bg-gym-well/70 px-3.5 text-xs font-medium text-gym-muted hover:text-gym-text"
              >
                -1 sec
              </button>
              <span className="font-display text-lg font-bold text-phase-lime tabular-clock px-2">
                {formatShortDuration(totalSec)}
              </span>
              <button
                type="button"
                onClick={() => adjustSeconds(1)}
                className="min-h-[36px] rounded-xl border border-gym-border bg-gym-well/70 px-3.5 text-xs font-medium text-gym-muted hover:text-gym-text"
              >
                +1 sec
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="mt-4">
              <p className="text-xs text-gym-muted mb-2">Durées rapides</p>
              <div className="grid grid-cols-5 gap-2">
                {props.allowZero && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinutes(0);
                      setSeconds(0);
                    }}
                    className={`min-h-[40px] rounded-xl border text-xs font-semibold transition-colors ${
                      totalSec === 0
                        ? "border-phase-lime bg-phase-lime/15 text-phase-lime"
                        : "border-gym-border bg-gym-bg text-gym-text"
                    }`}
                  >
                    0:00
                  </button>
                )}
                {(props.allowZero
                  ? QUICK_DURATIONS.slice(0, 9)
                  : QUICK_DURATIONS
                ).map((sec) => {
                  const selected = totalSec === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setMinutes(Math.floor(sec / 60));
                        setSeconds(sec % 60);
                      }}
                      className={`min-h-[40px] rounded-xl border font-display text-base font-bold tracking-wide transition-colors ${
                        selected
                          ? "border-phase-lime bg-phase-lime/15 text-phase-lime"
                          : "border-gym-border bg-gym-bg text-gym-text"
                      }`}
                    >
                      {formatShortDuration(sec)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Count stepper */}
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-gym-border bg-gym-bg px-5 py-4">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(props.min ?? 1, c - 1))}
                aria-label="Diminuer"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gym-well text-gym-text active:scale-95"
              >
                <Minus className="h-6 w-6" />
              </button>
              <span className="font-display text-6xl font-bold tabular-clock text-gym-text">
                {count}
              </span>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(props.max ?? 99, c + 1))}
                aria-label="Augmenter"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gym-well text-gym-text active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-gym-muted mb-2">Choix rapide</p>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_COUNTS.map((val) => {
                  const selected = count === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCount(val)}
                      className={`min-h-[42px] rounded-xl border font-display text-lg font-bold transition-colors ${
                        selected
                          ? "border-phase-lime bg-phase-lime/15 text-phase-lime"
                          : "border-gym-border bg-gym-bg text-gym-text"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Confirm CTA */}
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-5 flex h-13 min-h-[52px] w-full items-center justify-center rounded-2xl bg-phase-lime font-display text-xl font-bold uppercase tracking-wide text-gym-bg transition-transform active:scale-[0.98]"
        >
          Valider
        </button>
      </div>
    </div>
  );
}
