import { Copy, Edit3, Mic, MicOff, Play, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { AudioPrefs, PHASE_COLOR_HEX, WorkoutTimer } from "@/types";
import {
  formatBigClock,
  getTotalDurationSec,
  getTotalRoundsCount,
} from "@/utils/timeline";

interface TimerLibraryProps {
  timers: WorkoutTimer[];
  audioPrefs: AudioPrefs;
  onLaunch: (timer: WorkoutTimer) => void;
  onCreateNew: () => void;
  onEdit: (timer: WorkoutTimer) => void;
  onDuplicate: (timer: WorkoutTimer) => void;
  onDelete: (id: string) => void;
  onToggleBeep: () => void;
  onToggleVoice: () => void;
}

export function TimerLibrary({
  timers,
  audioPrefs,
  onLaunch,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleBeep,
  onToggleVoice,
}: TimerLibraryProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col pb-24">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-gym-border/80 bg-gym-bg/92 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gym-card border border-gym-border"
              aria-hidden="true"
            >
              <svg viewBox="0 0 32 32" className="h-5 w-5">
                <circle
                  cx="16"
                  cy="17"
                  r="10"
                  fill="none"
                  stroke="#2B3034"
                  strokeWidth="2.8"
                />
                <path
                  d="M16 7 A10 10 0 1 1 6.7 20.8"
                  fill="none"
                  stroke="#A3E635"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <rect x="12.5" y="2.5" width="7" height="2.4" rx="1.2" fill="#A3E635" />
                <line
                  x1="16"
                  y1="17"
                  x2="16"
                  y2="11"
                  stroke="#F5F7F8"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-extrabold uppercase leading-none tracking-wide text-gym-text whitespace-nowrap">
                Coach Timer
              </h1>
              <p className="text-[11px] text-gym-muted mt-1 whitespace-nowrap">
                {timers.length}{" "}
                {timers.length > 1 ? "minuteurs" : "minuteur"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleBeep}
              aria-label={audioPrefs.beepEnabled ? "Couper les bips" : "Activer les bips"}
              title={audioPrefs.beepEnabled ? "Bips activés" : "Bips coupés"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                audioPrefs.beepEnabled
                  ? "border-gym-border bg-gym-card text-phase-lime"
                  : "border-gym-border bg-gym-card text-gym-muted"
              }`}
            >
              {audioPrefs.beepEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleVoice}
              aria-label={
                audioPrefs.voiceEnabled
                  ? "Couper la voix française"
                  : "Activer la voix française"
              }
              title={audioPrefs.voiceEnabled ? "Voix FR activée" : "Voix FR coupée"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                audioPrefs.voiceEnabled
                  ? "border-gym-border bg-gym-card text-phase-rounds"
                  : "border-gym-border bg-gym-card text-gym-muted"
              }`}
            >
              {audioPrefs.voiceEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onCreateNew}
              aria-label="Créer un nouveau minuteur"
              className="flex h-10 items-center gap-1 rounded-xl bg-phase-lime px-3 font-display text-base font-bold uppercase tracking-wide text-gym-bg active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.8]" />
              <span>Nouveau</span>
            </button>
          </div>
        </div>
      </header>

      {/* Saved workout cards */}
      <main className="flex-1 space-y-3 px-4 pt-4">
        {timers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gym-border bg-gym-card/60 px-6 py-10 text-center">
            <p className="font-display text-2xl font-bold uppercase text-gym-text">
              Aucun minuteur enregistré
            </p>
            <p className="mt-1.5 text-sm text-gym-muted">
              Crée ton premier timer HIIT, Tabata ou circuit en 15 secondes.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-phase-lime px-6 font-display text-lg font-bold uppercase tracking-wide text-gym-bg"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span>Nouveau minuteur</span>
            </button>
          </div>
        ) : (
          timers.map((timer) => {
            const totalSec = getTotalDurationSec(timer);
            const totalRounds = getTotalRoundsCount(timer);
            const firstIntervals = timer.series[0]?.intervals ?? [];
            const isConfirmingDelete = confirmDeleteId === timer.id;

            return (
              <article
                key={timer.id}
                className="rounded-[22px] border border-gym-border bg-gym-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-gym-text leading-snug break-words">
                      {timer.name.trim() || "Minuteur sans nom"}
                    </h2>
                    <p className="mt-1 text-xs text-gym-muted">
                      {timer.cycles} {timer.cycles > 1 ? "cycles" : "cycle"} ·{" "}
                      {timer.series.length}{" "}
                      {timer.series.length > 1 ? "séries" : "série"} ·{" "}
                      {totalRounds} {totalRounds > 1 ? "rounds" : "round"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="font-display text-3xl font-bold leading-none tabular-clock text-gym-text">
                      {formatBigClock(totalSec)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-gym-muted mt-0.5">
                      Durée totale
                    </span>
                  </div>
                </div>

                {/* Color preview bar of the main series */}
                <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-gym-bg gap-0.5">
                  {timer.prepareSec > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "12%",
                        backgroundColor: PHASE_COLOR_HEX.prepare,
                      }}
                    />
                  )}
                  {firstIntervals.map((iv) => (
                    <div
                      key={iv.id}
                      className="h-full flex-1 rounded-full"
                      style={{
                        flexGrow: Math.max(1, iv.durationSec),
                        backgroundColor: PHASE_COLOR_HEX[iv.color],
                      }}
                    />
                  ))}
                  {timer.cooldownSec > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "12%",
                        backgroundColor: PHASE_COLOR_HEX.cooldown,
                      }}
                    />
                  )}
                </div>

                {/* Quick interval chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {firstIntervals.slice(0, 4).map((iv) => (
                    <span
                      key={iv.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gym-bg px-2.5 py-1 text-xs text-gym-text"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: PHASE_COLOR_HEX[iv.color] }}
                      />
                      <span className="truncate max-w-[115px]">{iv.name}</span>
                      <span className="font-display text-sm font-bold text-gym-muted tabular-clock">
                        {formatBigClock(iv.durationSec)}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Action bar */}
                <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-gym-border/70">
                  <button
                    type="button"
                    onClick={() => onLaunch(timer)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-phase-lime px-4 font-display text-lg font-bold uppercase tracking-wide text-gym-bg active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Lancer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(timer)}
                    aria-label={`Modifier ${timer.name}`}
                    title="Modifier"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text hover:bg-gym-border"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(timer)}
                    aria-label={`Dupliquer ${timer.name}`}
                    title="Dupliquer"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-text hover:bg-gym-border"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(timer.id);
                        setConfirmDeleteId(null);
                      }}
                      className="flex h-11 items-center rounded-xl bg-phase-rest px-3 text-xs font-semibold text-white"
                    >
                      Confirmer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(timer.id)}
                      aria-label={`Supprimer ${timer.name}`}
                      title="Supprimer"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-gym-well text-gym-muted hover:text-phase-rest"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
