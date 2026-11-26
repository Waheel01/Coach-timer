import fs from "fs";
import path from "path";

const androidDir = path.resolve("android");
const appMain = path.join(androidDir, "app", "src", "main");
const javaPkgDir = path.join(
  appMain,
  "java",
  "com",
  "zakaria",
  "coachtimer"
);

// 1. Write native Android CoachAudioBridge.java (French TTS + loud gym tones + Spotify ducking)
fs.mkdirSync(javaPkgDir, { recursive: true });
const audioBridgeJava = `package com.zakaria.coachtimer;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class CoachAudioBridge {
    private static final int SAMPLE_RATE = 44100;

    private final AudioManager audioManager;
    private final AudioAttributes audioAttributes;
    private final AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener focusListener = focusChange -> {};
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicInteger utteranceCounter = new AtomicInteger(0);

    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private boolean hasAudioFocus = false;
    private final Runnable releaseFocusRunnable = this::abandonDuckFocus;

    public CoachAudioBridge(Context context) {
        Context appCtx = context.getApplicationContext();
        this.audioManager = (AudioManager) appCtx.getSystemService(Context.AUDIO_SERVICE);

        this.audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            this.focusRequest = new AudioFocusRequest.Builder(
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            )
                    .setAudioAttributes(this.audioAttributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setWillPauseWhenDucked(false)
                    .setOnAudioFocusChangeListener(focusListener)
                    .build();
        } else {
            this.focusRequest = null;
        }

        this.tts = new TextToSpeech(appCtx, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                tts.setAudioAttributes(audioAttributes);
                int res = tts.setLanguage(Locale.FRENCH);
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    res = tts.setLanguage(Locale.FRANCE);
                }
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(Locale.getDefault());
                }
                tts.setSpeechRate(1.06f);
                tts.setPitch(1.0f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {}

                    @Override
                    public void onDone(String utteranceId) {
                        if (utteranceId != null && !utteranceId.startsWith("cd_")) {
                            scheduleFocusRelease(350);
                        }
                    }

                    @Override
                    public void onError(String utteranceId) {
                        scheduleFocusRelease(350);
                    }
                });
                ttsReady = true;
            }
        });
    }

    private void requestDuckFocus(long safetyReleaseMs) {
        mainHandler.post(() -> {
            mainHandler.removeCallbacks(releaseFocusRunnable);
            if (!hasAudioFocus && audioManager != null) {
                int granted;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                    granted = audioManager.requestAudioFocus(focusRequest);
                } else {
                    granted = audioManager.requestAudioFocus(
                            focusListener,
                            AudioManager.STREAM_MUSIC,
                            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                    );
                }
                if (granted == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                    hasAudioFocus = true;
                }
            }
            mainHandler.postDelayed(releaseFocusRunnable, safetyReleaseMs);
        });
    }

    private void scheduleFocusRelease(long delayMs) {
        mainHandler.post(() -> {
            mainHandler.removeCallbacks(releaseFocusRunnable);
            mainHandler.postDelayed(releaseFocusRunnable, delayMs);
        });
    }

    private void abandonDuckFocus() {
        mainHandler.removeCallbacks(releaseFocusRunnable);
        if (hasAudioFocus && audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                audioManager.abandonAudioFocus(focusListener);
            }
            hasAudioFocus = false;
        }
    }

    private void playPcmNotes(double[][] notes) {
        // Each note: { freqHz, durationMs, gapAfterMs, gain (0..1) }
        int totalSamples = 0;
        for (double[] n : notes) {
            totalSamples += (int) ((n[1] + n[2]) * SAMPLE_RATE / 1000.0);
        }
        if (totalSamples <= 0) return;

        short[] pcm = new short[totalSamples];
        int offset = 0;

        for (double[] n : notes) {
            double freq = n[0];
            int toneSamples = (int) (n[1] * SAMPLE_RATE / 1000.0);
            int gapSamples = (int) (n[2] * SAMPLE_RATE / 1000.0);
            double gain = n[3];
            int fadeIn = Math.max(1, Math.min(toneSamples / 4, (int) (0.008 * SAMPLE_RATE)));
            int fadeOut = Math.max(1, Math.min(toneSamples / 3, (int) (0.014 * SAMPLE_RATE)));

            for (int i = 0; i < toneSamples && (offset + i) < pcm.length; i++) {
                double env = 1.0;
                if (i < fadeIn) {
                    env = (double) i / fadeIn;
                } else if (i > toneSamples - fadeOut) {
                    env = (double) (toneSamples - i) / fadeOut;
                }
                double t = (double) i / SAMPLE_RATE;
                // Fundamental + mild 2nd harmonic cuts clearly through gym music
                double wave = 0.80 * Math.sin(2.0 * Math.PI * freq * t)
                        + 0.20 * Math.sin(2.0 * Math.PI * (freq * 2.0) * t);
                double sample = wave * env * gain * Short.MAX_VALUE;
                pcm[offset + i] = (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, sample));
            }
            offset += toneSamples + gapSamples;
        }

        int byteLength = pcm.length * 2;
        AudioTrack track = null;
        try {
            AudioFormat format = new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build();

            track = new AudioTrack(
                    audioAttributes,
                    format,
                    byteLength,
                    AudioTrack.MODE_STATIC,
                    AudioManager.AUDIO_SESSION_ID_GENERATE
            );

            track.write(pcm, 0, pcm.length);
            track.play();

            long durationMs = (long) ((pcm.length * 1000.0) / SAMPLE_RATE);
            Thread.sleep(durationMs + 25);
        } catch (Throwable ignored) {
        } finally {
            if (track != null) {
                try {
                    track.stop();
                } catch (Throwable ignored) {}
                try {
                    track.release();
                } catch (Throwable ignored) {}
            }
        }
    }

    private void speakInternal(String text, String idPrefix) {
        if (!ttsReady || tts == null || text == null || text.trim().isEmpty()) {
            return;
        }
        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
        String utteranceId = idPrefix + utteranceCounter.incrementAndGet();
        tts.speak(text.trim(), TextToSpeech.QUEUE_FLUSH, params, utteranceId);
    }

    @JavascriptInterface
    public void countdown(final int sec, final boolean beepEnabled, final boolean voiceEnabled) {
        if (!beepEnabled && !voiceEnabled) return;
        // Hold Spotify ducked cleanly across 3 -> 2 -> 1 -> transition without pumping
        requestDuckFocus(1550);
        executor.execute(() -> {
            if (beepEnabled) {
                playPcmNotes(new double[][]{
                        {960.0, 115.0, 15.0, 0.82}
                });
            }
            if (voiceEnabled) {
                speakInternal(String.valueOf(sec), "cd_");
            }
        });
    }

    @JavascriptInterface
    public void announce(
            final String cueType,
            final String spokenText,
            final boolean beepEnabled,
            final boolean voiceEnabled
    ) {
        if (!beepEnabled && !voiceEnabled) return;
        long safetyMs = (voiceEnabled && spokenText != null && !spokenText.trim().isEmpty()) ? 3200 : 900;
        requestDuckFocus(safetyMs);

        executor.execute(() -> {
            if (beepEnabled) {
                if ("rest-start".equals(cueType)) {
                    playPcmNotes(new double[][]{
                            {720.0, 120.0, 35.0, 0.84},
                            {480.0, 240.0, 20.0, 0.84}
                    });
                } else if ("finish".equals(cueType)) {
                    playPcmNotes(new double[][]{
                            {660.0, 120.0, 30.0, 0.82},
                            {880.0, 120.0, 30.0, 0.85},
                            {1320.0, 320.0, 25.0, 0.88}
                    });
                } else {
                    playPcmNotes(new double[][]{
                            {1050.0, 110.0, 35.0, 0.85},
                            {1580.0, 240.0, 20.0, 0.88}
                    });
                }
            }

            if (voiceEnabled && spokenText != null && !spokenText.trim().isEmpty()) {
                speakInternal(spokenText, "ph_");
            } else {
                scheduleFocusRelease(250);
            }
        });
    }

    @JavascriptInterface
    public void stop() {
        executor.execute(() -> {
            if (tts != null) {
                try {
                    tts.stop();
                } catch (Throwable ignored) {}
            }
        });
        mainHandler.post(this::abandonDuckFocus);
    }

    public void shutdown() {
        abandonDuckFocus();
        executor.shutdownNow();
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Throwable ignored) {}
            tts = null;
            ttsReady = false;
        }
    }
}
`;
fs.writeFileSync(
  path.join(javaPkgDir, "CoachAudioBridge.java"),
  audioBridgeJava,
  "utf8"
);
console.log("Created CoachAudioBridge.java (French TTS + Spotify ducking)");

// 2. Patch MainActivity.java with FLAG_KEEP_SCREEN_ON + CoachAudioNative JS bridge
const mainActivityPath = path.join(javaPkgDir, "MainActivity.java");
if (fs.existsSync(mainActivityPath)) {
  const customActivity = `package com.zakaria.coachtimer;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private CoachAudioBridge audioBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        audioBridge = new CoachAudioBridge(this);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(audioBridge, "CoachAudioNative");
        }
    }

    @Override
    public void onDestroy() {
        if (audioBridge != null) {
            audioBridge.shutdown();
            audioBridge = null;
        }
        super.onDestroy();
    }
}
`;
  fs.writeFileSync(mainActivityPath, customActivity, "utf8");
  console.log("Patched MainActivity.java with FLAG_KEEP_SCREEN_ON + CoachAudioNative");
} else {
  console.warn("MainActivity.java not found at:", mainActivityPath);
}

// 3. Add WAKE_LOCK, VIBRATE, and Android 11+ TTS_SERVICE <queries> to AndroidManifest.xml
const manifestPath = path.join(appMain, "AndroidManifest.xml");
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, "utf8");
  const permissions = [
    '<uses-permission android:name="android.permission.WAKE_LOCK" />',
    '<uses-permission android:name="android.permission.VIBRATE" />',
  ];
  for (const perm of permissions) {
    if (!manifest.includes(perm)) {
      manifest = manifest.replace("</manifest>", `    ${perm}\n</manifest>`);
    }
  }
  const ttsQueries = `    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>`;
  if (!manifest.includes("android.intent.action.TTS_SERVICE")) {
    manifest = manifest.replace("</manifest>", `${ttsQueries}\n</manifest>`);
  }
  fs.writeFileSync(manifestPath, manifest, "utf8");
  console.log("Patched AndroidManifest.xml with WAKE_LOCK, VIBRATE, and TTS_SERVICE queries");
}

// 4. Set dark status bar & navigation bar colors + launcher background
const valuesDir = path.join(appMain, "res", "values");
fs.mkdirSync(valuesDir, { recursive: true });
fs.writeFileSync(
  path.join(valuesDir, "colors.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0E1011</color>
    <color name="colorPrimaryDark">#0E1011</color>
    <color name="colorAccent">#A3E635</color>
</resources>
`,
  "utf8"
);
fs.writeFileSync(
  path.join(valuesDir, "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0E1011</color>
</resources>
`,
  "utf8"
);

// 5. Create crisp native adaptive vector launcher icon (Android 8+)
const drawableDir = path.join(appMain, "res", "drawable");
fs.mkdirSync(drawableDir, { recursive: true });
fs.writeFileSync(
  path.join(drawableDir, "coach_timer_icon_fg.xml"),
  `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Top crown button -->
    <path
        android:fillColor="#A3E635"
        android:pathData="M46,24h16a3,3 0 0,1 3,3v2a3,3 0 0,1 -3,3H46a3,3 0 0,1 -3,-3v-2a3,3 0 0,1 3,-3z" />
    <!-- Base ring -->
    <path
        android:fillColor="#00000000"
        android:strokeColor="#2B3034"
        android:strokeWidth="6"
        android:pathData="M54,34 A23,23 0 1,1 53.99,34 Z" />
    <!-- Active lime progress arc -->
    <path
        android:fillColor="#00000000"
        android:strokeColor="#A3E635"
        android:strokeWidth="6"
        android:strokeLineCap="round"
        android:pathData="M54,34 A23,23 0 1,1 32.8,66.2" />
    <!-- Hand -->
    <path
        android:fillColor="#00000000"
        android:strokeColor="#F5F7F8"
        android:strokeWidth="5"
        android:strokeLineCap="round"
        android:pathData="M54,57 L54,43" />
    <!-- Center dot -->
    <path
        android:fillColor="#A3E635"
        android:pathData="M54,53 A4,4 0 1,1 53.99,53 Z" />
</vector>
`,
  "utf8"
);

const anydpiDir = path.join(appMain, "res", "mipmap-anydpi-v26");
fs.mkdirSync(anydpiDir, { recursive: true });
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/coach_timer_icon_fg" />
</adaptive-icon>
`;
fs.writeFileSync(path.join(anydpiDir, "ic_launcher.xml"), adaptiveXml, "utf8");
fs.writeFileSync(
  path.join(anydpiDir, "ic_launcher_round.xml"),
  adaptiveXml,
  "utf8"
);
console.log("Installed adaptive vector launcher icon for Coach Timer");
