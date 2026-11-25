import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zakaria.coachtimer",
  appName: "Coach Timer",
  webDir: "dist",
  backgroundColor: "#0E1011",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0E1011",
  },
};

export default config;
