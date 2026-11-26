interface NativeAudioBridge {
  countdown: (
    sec: number,
    beepEnabled: boolean,
    voiceEnabled: boolean
  ) => void;
  announce: (
    cueType: string,
    spokenText: string,
    beepEnabled: boolean,
    voiceEnabled: boolean
  ) => void;
  stop: () => void;
}

function getNativeBridge(): NativeAudioBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (
    window as unknown as { CoachAudioNative?: NativeAudioBridge }
  ).CoachAudioNative;
  return bridge && typeof bridge.announce === "function" ? bridge : null;
}

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
  if (!getNativeBridge()) {
    ensureAudioContext();
  }
}

function playWebTone(
  freq: number,
  durationSec: number,
  startOffsetSec = 0,
  volume = 0.45,
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

function playWebCue(cue: "countdown" | "work-start" | "rest-start" | "finish"): void {
  if (cue === "countdown") {
    playWebTone(920, 0.14, 0, 0.42, "sine");
  } else if (cue === "work-start") {
    playWebTone(1174.66, 0.14, 0, 0.5, "triangle");
    playWebTone(1567.98, 0.34, 0.13, 0.55, "triangle");
  } else if (cue === "rest-start") {
    playWebTone(659.25, 0.16, 0, 0.48, "triangle");
    playWebTone(493.88, 0.32, 0.16, 0.46, "sine");
  } else if (cue === "finish") {
    playWebTone(587.33, 0.16, 0, 0.48, "triangle");
    playWebTone(880, 0.16, 0.16, 0.52, "triangle");
    playWebTone(1174.66, 0.55, 0.32, 0.56, "triangle");
  }
}

function speakWebFrench(text: string): void {
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

/**
 * Plays a 3-2-1 countdown cue, ducking Spotify on Android and speaking clearly in French.
 */
export function triggerCountdownCue(
  sec: number,
  beepEnabled: boolean,
  voiceEnabled: boolean
): void {
  if (!beepEnabled && !voiceEnabled) return;
  const nativeBridge = getNativeBridge();
  if (nativeBridge) {
    nativeBridge.countdown(sec, beepEnabled, voiceEnabled);
    return;
  }
  if (beepEnabled) playWebCue("countdown");
  if (voiceEnabled) speakWebFrench(String(sec));
}

/**
 * Plays a phase start/end cue + French voice announcement, ducking Spotify on Android.
 */
export function triggerPhaseCue(
  cue: "work-start" | "rest-start" | "finish",
  spokenText: string,
  beepEnabled: boolean,
  voiceEnabled: boolean
): void {
  if (!beepEnabled && !voiceEnabled) return;
  const nativeBridge = getNativeBridge();
  if (nativeBridge) {
    nativeBridge.announce(cue, spokenText, beepEnabled, voiceEnabled);
    return;
  }
  if (beepEnabled) playWebCue(cue);
  if (voiceEnabled && spokenText) speakWebFrench(spokenText);
}

/**
 * Stops any ongoing voice/audio and immediately restores Spotify volume on Android.
 */
export function stopAllAudio(): void {
  const nativeBridge = getNativeBridge();
  if (nativeBridge) {
    nativeBridge.stop();
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}
