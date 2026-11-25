import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Pause,
  Plus,
  PlusSquare,
  RotateCw,
  Snowflake,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { ValueSheet, ValueSheetProps } from "@/components/ValueSheet";
import {
  IntervalColor,
  IntervalItem,
  PHASE_COLOR_HEX,
  SeriesItem,
  WorkoutTimer,
} from "@/types";
import {
  formatBigClock,
  formatShortDuration,
  getTotalDurationSec,
  uid,
} from "@/utils/timeline";

interface TimerEditorProps {
  initialTimer: WorkoutTimer;
  isNew: boolean;
  onSave: (timer: WorkoutTimer) => void;
  onCancel: () => void;
}

const COLOR_CYCLE: IntervalColor[] = ["work", "rest", "cycles", "cooldown"];

export function TimerEditor({
  initialTimer,
  isNew,
  onSave,
  onCancel,
}: TimerEditorProps) {
  const [draft, setDraft] = useState<WorkoutTimer>(() =>
    JSON.parse(JSON.stringify(initialTimer))
  );
  const [openSeriesMenuId, setOpenSeriesMenuId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ValueSheetProps | null>(null);

  const totalSec = getTotalDurationSec(draft);

  const updateSeries = (
    seriesId: string,
    updater: (s: SeriesItem) => SeriesItem
  ) => {
    setDraft((prev) => ({
      ...prev,
      series: prev.series.map((s) => (s.id === seriesId ? updater(s) : s)),
    }));
  };

  const handleAddInterval = (seriesId: string) => {
    updateSeries(seriesId, (s) => {
      const last = s.intervals[s.intervals.length - 1];
      const nextIsRest = last ? last.color === "work" : false;
      const newIv: IntervalItem = {
        id: uid("iv"),
        name: nextIsRest ? "REPOS" : "EXERCICE",
        durationSec: 30,
        color: nextIsRest ? "rest" : "work",
      };
      return { ...s, intervals: [...s.intervals, newIv] };
    });
  };

  const handleDeleteInterval = (seriesId: string, intervalId: string) => {
    updateSeries(seriesId, (s) => {
      if (s.intervals.length <= 1) return s;
      return {
        ...s,
        intervals: s.intervals.filter((iv) => iv.id !== intervalId),
      };
    });
  };

  const handleCycleColor = (seriesId: string, intervalId: string) => {
    updateSeries(seriesId, (s) => ({
      ...s,
      intervals: s.intervals.map((iv) => {
        if (iv.id !== intervalId) return iv;
        const idx = COLOR_CYCLE.indexOf(iv.color);
        const nextColor = COLOR_CYCLE[(idx + 1) % COLOR_CYCLE.length];
        return { ...iv, color: nextColor };
      }),
    }));
  };

  const handleUpdateIntervalName = (
    seriesId: string,
    intervalId: string,
    name: string
  ) => {
    updateSeries(seriesId, (s) => ({
      ...s,
      intervals: s.intervals.map((iv) =>
        iv.id === intervalId ? { ...iv, name } : iv
      ),
    }));
  };

  const handleAddSeries = () => {
    const newSeries: SeriesItem = {
      id: uid("serie"),
      rounds: 4,
      intervals: [
        { id: uid("iv"), name: "EXERCICE", durationSec: 30, color: "work" },
        { id: uid("iv"), name: "REPOS", durationSec: 30, color: "rest" },
      ],
    };
    setDraft((prev) => ({ ...prev, series: [...prev.series, newSeries] }));
  };

  const handleDuplicateSeries = (series: SeriesItem) => {
    const copy: SeriesItem = {
      id: uid("serie"),
      rounds: series.rounds,
      intervals: series.intervals.map((iv) => ({ ...iv, id: uid("iv") })),
    };
    setDraft((prev) => ({ ...prev, series: [...prev.series, copy] }));
    setOpenSeriesMenuId(null);
  };

  const handleDeleteSeries = (seriesId: string) => {
    setDraft((prev) => {
      if (prev.series.length <= 1) return prev;
      return { ...prev, series: prev.series.filter((s) => s.id !== seriesId) };
    });
    setOpenSeriesMenuId(null);
  };

  const handleConfirmSave = () => {
    const firstWork = draft.series[0]?.intervals[0];
    const fallbackName = firstWork
      ? `Timer ${formatShortDuration(firstWork.durationSec)} · ${draft.cycles} cycle${draft.cycles > 1 ? "s" : ""}`
      : "Mon minuteur";

    onSave({
      ...draft,
      name: draft.name.trim() || fallbackName,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col pb-12">
      {/* Top bar matching Timer Plus screenshot */}
      <header className="sticky top-0 z-20 border-b border-gym-border/70 bg-gym-bg/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuler"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gym-well text-gym-text active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-gym-text leading-none">
              {isNew ? "Nouveau minuteur" : "Modifier minuteur"}
            </h1>
            <p className="mt-0.5 text-[11px] text-gym-muted tabular-clock">
              Durée totale :{" "}
              <strong className="text-phase-lime font-semibold">
                {formatBigClock(totalSec)}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleConfirmSave}
            aria-label="Enregistrer le minuteur"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-phase-lime text-gym-bg active:scale-95"
          >
            <Check className="h-6 w-6 stroke-[2.8]" />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pt-4">
        {/* Description / Name input */}
        <div>
          <input
            type="text"
            value={draft.name}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Courte description du timer..."
            aria-label="Nom du minuteur"
            className="w-full rounded-2xl border border-gym-border bg-gym-card/60 px-4 py-3.5 text-base text-gym-text placeholder:text-gym-muted focus:border-phase-lime focus:outline-none"
          />
        </div>

        {/* PRÉPARER card */}
        <button
          type="button"
          onClick={() =>
            setSheet({
              mode: "duration",
              title: "Préparer",
              valueSec: draft.prepareSec,
              allowZero: true,
              onConfirm: (sec) => {
                setDraft((prev) => ({ ...prev, prepareSec: sec }));
                setSheet(null);
              },
              onClose: () => setSheet(null),
            })
          }
          className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-gym-border bg-gym-card px-4 py-4 text-left active:bg-gym-well/70"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-phase-prepare" />
              <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
                Préparer
              </span>
            </div>
            <p className="mt-1 text-xs text-gym-muted">
              Compte à rebours avant le début
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
              {formatShortDuration(draft.prepareSec)}
            </span>
            <ChevronRight className="h-5 w-5 text-gym-muted" />
          </div>
        </button>

        {/* SERIES blocks */}
        {draft.series.map((serie, sIdx) => (
          <section key={serie.id} className="space-y-2">
            {/* Series header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gym-muted">
                Série {sIdx + 1}
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSeriesMenuId((cur) =>
                      cur === serie.id ? null : serie.id
                    )
                  }
                  aria-label={`Options Série ${sIdx + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gym-muted hover:bg-gym-well hover:text-gym-text"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {openSeriesMenuId === serie.id && (
                  <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-gym-border bg-gym-well p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => handleDuplicateSeries(serie)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-gym-text hover:bg-gym-card"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Dupliquer la série</span>
                    </button>
                    {draft.series.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSeries(serie.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-phase-rest hover:bg-gym-card"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Supprimer la série</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Series card */}
            <div className="rounded-[20px] border border-gym-border bg-gym-card px-4 py-2 divide-y divide-gym-border/60">
              {serie.intervals.map((iv) => (
                <div
                  key={iv.id}
                  className="flex items-center justify-between gap-2 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Color dot cycles phase color on tap */}
                    <button
                      type="button"
                      onClick={() => handleCycleColor(serie.id, iv.id)}
                      aria-label={`Changer la couleur de ${iv.name}`}
                      title="Toucher pour changer la couleur"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-gym-well"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: PHASE_COLOR_HEX[iv.color] }}
                      />
                    </button>

                    <input
                      type="text"
                      value={iv.name}
                      onChange={(e) =>
                        handleUpdateIntervalName(serie.id, iv.id, e.target.value)
                      }
                      aria-label="Nom de l'intervalle"
                      className="dotted-editable min-w-0 w-full bg-transparent pb-0.5 font-display text-xl font-bold uppercase tracking-wide text-gym-text focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSheet({
                          mode: "duration",
                          title: iv.name || "Durée de l'intervalle",
                          valueSec: iv.durationSec,
                          allowZero: false,
                          onConfirm: (sec) => {
                            updateSeries(serie.id, (s) => ({
                              ...s,
                              intervals: s.intervals.map((item) =>
                                item.id === iv.id
                                  ? { ...item, durationSec: sec }
                                  : item
                              ),
                            }));
                            setSheet(null);
                          },
                          onClose: () => setSheet(null),
                        })
                      }
                      className="flex min-h-[44px] items-center gap-1 rounded-xl px-2 active:bg-gym-well"
                    >
                      <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                        {formatShortDuration(iv.durationSec)}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gym-muted" />
                    </button>

                    {serie.intervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteInterval(serie.id, iv.id)}
                        aria-label={`Supprimer ${iv.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gym-muted hover:text-phase-rest"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add interval to series */}
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => handleAddInterval(serie.id)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-1.5 text-left text-gym-muted hover:text-gym-text"
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  <span className="dotted-editable pb-0.5 font-display text-lg font-semibold uppercase tracking-wide">
                    Ajouter un intervalle à la série
                  </span>
                </button>
              </div>

              {/* ROUNDS row */}
              <button
                type="button"
                onClick={() =>
                  setSheet({
                    mode: "count",
                    title: `Rounds — Série ${sIdx + 1}`,
                    value: serie.rounds,
                    min: 1,
                    max: 99,
                    onConfirm: (val) => {
                      updateSeries(serie.id, (s) => ({ ...s, rounds: val }));
                      setSheet(null);
                    },
                    onClose: () => setSheet(null),
                  })
                }
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left active:bg-gym-well/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <RotateCw className="h-5 w-5 shrink-0 text-phase-rounds" />
                    <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
                      Rounds
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gym-muted leading-snug">
                    Un round correspond à tous les intervalles de cette série
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                    {serie.rounds}
                  </span>
                  <ChevronRight className="h-5 w-5 text-gym-muted" />
                </div>
              </button>
            </div>
          </section>
        ))}

        {/* AJOUTER UNE SÉRIE dashed button */}
        <button
          type="button"
          onClick={handleAddSeries}
          className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-[20px] border border-dashed border-gym-border bg-gym-card/40 px-4 py-3.5 font-display text-xl font-bold uppercase tracking-wide text-gym-text active:bg-gym-well/60"
        >
          <PlusSquare className="h-5 w-5 text-gym-text" />
          <span>Ajouter une série</span>
        </button>

        {/* CYCLES & REPOS ENTRE LES CYCLES card */}
        <div className="rounded-[20px] border border-gym-border bg-gym-card px-4 py-1 divide-y divide-gym-border/60">
          <button
            type="button"
            onClick={() =>
              setSheet({
                mode: "count",
                title: "Cycles",
                value: draft.cycles,
                min: 1,
                max: 50,
                onConfirm: (val) => {
                  setDraft((prev) => ({ ...prev, cycles: val }));
                  setSheet(null);
                },
                onClose: () => setSheet(null),
              })
            }
            className="flex w-full items-center justify-between gap-3 py-3.5 text-left active:bg-gym-well/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <RotateCw className="h-5 w-5 shrink-0 text-phase-cycles" />
                <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
                  Cycles
                </span>
              </div>
              <p className="mt-1 text-xs text-gym-muted">
                Nombre de répétitions de toutes les séries
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                {draft.cycles}
              </span>
              <ChevronRight className="h-5 w-5 text-gym-muted" />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSheet({
                mode: "duration",
                title: "Repos entre les cycles",
                valueSec: draft.restBetweenCyclesSec,
                allowZero: true,
                onConfirm: (sec) => {
                  setDraft((prev) => ({ ...prev, restBetweenCyclesSec: sec }));
                  setSheet(null);
                },
                onClose: () => setSheet(null),
              })
            }
            className="flex w-full items-center justify-between gap-3 py-3.5 text-left active:bg-gym-well/50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <Pause className="h-5 w-5 shrink-0 fill-current text-phase-cycles" />
                <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
                  Repos entre les cycles
                </span>
              </div>
              <p className="mt-1 text-xs text-gym-muted">
                Intervalle de récupération
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                {formatShortDuration(draft.restBetweenCyclesSec)}
              </span>
              <ChevronRight className="h-5 w-5 text-gym-muted" />
            </div>
          </button>
        </div>

        {/* RÉCUPÉRATION card */}
        {draft.cooldownSec === 0 ? (
          <button
            type="button"
            onClick={() =>
              setSheet({
                mode: "duration",
                title: "Récupération",
                valueSec: 120,
                allowZero: true,
                onConfirm: (sec) => {
                  setDraft((prev) => ({ ...prev, cooldownSec: sec }));
                  setSheet(null);
                },
                onClose: () => setSheet(null),
              })
            }
            className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-dashed border-gym-border bg-gym-card/40 px-4 py-4 text-left active:bg-gym-well/60"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <Snowflake className="h-5 w-5 shrink-0 text-phase-cooldown" />
                <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-muted">
                  Récupération
                </span>
              </div>
              <p className="mt-1 text-xs text-gym-muted">
                Récupération à la fin
              </p>
            </div>
            <Plus className="h-6 w-6 text-gym-text shrink-0" />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-[20px] border border-gym-border bg-gym-card px-4 py-4">
            <button
              type="button"
              onClick={() =>
                setSheet({
                  mode: "duration",
                  title: "Récupération",
                  valueSec: draft.cooldownSec,
                  allowZero: true,
                  onConfirm: (sec) => {
                    setDraft((prev) => ({ ...prev, cooldownSec: sec }));
                    setSheet(null);
                  },
                  onClose: () => setSheet(null),
                })
              }
              className="flex flex-1 items-center justify-between gap-3 text-left"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <Snowflake className="h-5 w-5 shrink-0 text-phase-cooldown" />
                  <span className="font-display text-xl font-bold uppercase tracking-wide text-gym-text">
                    Récupération
                  </span>
                </div>
                <p className="mt-1 text-xs text-gym-muted">
                  Récupération à la fin
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-4xl font-bold tabular-clock text-gym-text">
                  {formatShortDuration(draft.cooldownSec)}
                </span>
                <ChevronRight className="h-5 w-5 text-gym-muted" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, cooldownSec: 0 }))}
              aria-label="Retirer la récupération"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gym-muted hover:text-phase-rest"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

      {sheet && <ValueSheet {...sheet} />}
    </div>
  );
}
