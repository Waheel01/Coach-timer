import fs from "fs";
import path from "path";

const androidDir = path.resolve("android");
const appMain = path.join(androidDir, "app", "src", "main");

// 1. Keep screen awake natively in MainActivity.java
const mainActivityPath = path.join(
  appMain,
  "java",
  "com",
  "zakaria",
  "coachtimer",
  "MainActivity.java"
);

if (fs.existsSync(mainActivityPath)) {
  const customActivity = `package com.zakaria.coachtimer;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
`;
  fs.writeFileSync(mainActivityPath, customActivity, "utf8");
  console.log("Patched MainActivity.java with FLAG_KEEP_SCREEN_ON");
} else {
  console.warn("MainActivity.java not found at:", mainActivityPath);
}

// 2. Add WAKE_LOCK and VIBRATE permissions to AndroidManifest.xml
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
  fs.writeFileSync(manifestPath, manifest, "utf8");
  console.log("Patched AndroidManifest.xml with WAKE_LOCK and VIBRATE");
}

// 3. Set dark status bar & navigation bar colors + launcher background
const valuesDir = path.join(appMain, "res", "values");
fs.mkdirSync(valuesDir, { recursive: true });
const colorsPath = path.join(valuesDir, "colors.xml");
fs.writeFileSync(
  colorsPath,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0E1011</color>
    <color name="colorPrimaryDark">#0E1011</color>
    <color name="colorAccent">#A3E635</color>
</resources>
`,
  "utf8"
);
const launcherBgPath = path.join(valuesDir, "ic_launcher_background.xml");
fs.writeFileSync(
  launcherBgPath,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0E1011</color>
</resources>
`,
  "utf8"
);

// 4. Create crisp native adaptive vector launcher icon (Android 8+)
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
