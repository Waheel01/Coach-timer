/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#0E1011",
          card: "#191C1E",
          well: "#23272A",
          border: "#2B3034",
          muted: "#8C939A",
          text: "#F5F7F8",
        },
        phase: {
          lime: "#A3E635",
          prepare: "#FACC15",
          work: "#22C55E",
          rest: "#EF4444",
          rounds: "#38BDF8",
          cycles: "#FB923C",
          cooldown: "#60A5FA",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
