let audioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio(): void {
  ensureAudioContext();
}

function playTone(
  freq: number,
  durationSec: number,
  startOffsetSec = 0,
  volume = 0.28,
  type: OscillatorType = "triangle"
) {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + durationSec + 0.03);
}

/**
 * Clear gym-grade audio cues engineered to cut through Bluetooth speakers.
 */
export function playCue(
  cue: "countdown" | "work-start" | "rest-start" | "finish"
): void {
  if (cue === "countdown") {
    playTone(880, 0.14, 0, 0.26, "sine");
  } else if (cue === "work-start") {
    // Sharp double whistle-like start tone
    playTone(1174.66, 0.14, 0, 0.32, "triangle");
    playTone(1567.98, 0.34, 0.13, 0.34, "triangle");
  } else if (cue === "rest-start") {
    // Distinct downward double tone for rest
    playTone(659.25, 0.16, 0, 0.28, "triangle");
    playTone(493.88, 0.3, 0.16, 0.26, "sine");
  } else if (cue === "finish") {
    // Triumphant 3-note gym finish fanfare
    playTone(587.33, 0.16, 0, 0.28, "triangle");
    playTone(880, 0.16, 0.16, 0.3, "triangle");
    playTone(1174.66, 0.55, 0.32, 0.34, "triangle");
  }
}

/**
 * Offline French voice coach via native device speech synthesis.
 */
export function speakFrench(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore on unsupported webviews
  }
}

export function stopSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}
