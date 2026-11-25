import { useEffect, useState } from "react";
import { TimerEditor } from "@/components/TimerEditor";
import { TimerLibrary } from "@/components/TimerLibrary";
import { TimerRunner } from "@/components/TimerRunner";
import { AudioPrefs, WorkoutTimer } from "@/types";
import { unlockAudio } from "@/utils/audio";
import {
  loadAudioPrefs,
  loadTimers,
  saveAudioPrefs,
  saveTimers,
} from "@/utils/storage";
import { createBlankTimer, uid } from "@/utils/timeline";

type ViewState =
  | { screen: "library" }
  | { screen: "editor"; timer: WorkoutTimer; isNew: boolean }
  | { screen: "runner"; timer: WorkoutTimer };

export default function App() {
  const [timers, setTimers] = useState<WorkoutTimer[]>(() => loadTimers());
  const [audioPrefs, setAudioPrefs] = useState<AudioPrefs>(() =>
    loadAudioPrefs()
  );
  const [view, setView] = useState<ViewState>({ screen: "library" });

  useEffect(() => saveTimers(timers), [timers]);
  useEffect(() => saveAudioPrefs(audioPrefs), [audioPrefs]);

  const handleCreateNew = () => {
    setView({ screen: "editor", timer: createBlankTimer(), isNew: true });
  };

  const handleEdit = (timer: WorkoutTimer) => {
    setView({ screen: "editor", timer, isNew: false });
  };

  const handleSaveTimer = (saved: WorkoutTimer) => {
    setTimers((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
    setView({ screen: "library" });
  };

  const handleDuplicate = (timer: WorkoutTimer) => {
    const copy: WorkoutTimer = {
      ...JSON.parse(JSON.stringify(timer)),
      id: uid("timer"),
      name: `${timer.name} (copie)`,
      updatedAt: new Date().toISOString(),
    };
    setTimers((prev) => [copy, ...prev]);
  };

  const handleDelete = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLaunch = (timer: WorkoutTimer) => {
    unlockAudio();
    setView({ screen: "runner", timer });
  };

  const toggleBeep = () => {
    unlockAudio();
    setAudioPrefs((p) => ({ ...p, beepEnabled: !p.beepEnabled }));
  };

  const toggleVoice = () => {
    unlockAudio();
    setAudioPrefs((p) => ({ ...p, voiceEnabled: !p.voiceEnabled }));
  };

  if (view.screen === "editor") {
    return (
      <TimerEditor
        initialTimer={view.timer}
        isNew={view.isNew}
        onSave={handleSaveTimer}
        onCancel={() => setView({ screen: "library" })}
      />
    );
  }

  if (view.screen === "runner") {
    return (
      <TimerRunner
        timer={view.timer}
        audioPrefs={audioPrefs}
        onToggleBeep={toggleBeep}
        onToggleVoice={toggleVoice}
        onExit={() => setView({ screen: "library" })}
      />
    );
  }

  return (
    <TimerLibrary
      timers={timers}
      audioPrefs={audioPrefs}
      onLaunch={handleLaunch}
      onCreateNew={handleCreateNew}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
      onToggleBeep={toggleBeep}
      onToggleVoice={toggleVoice}
    />
  );
}
