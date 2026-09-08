import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        "ink-line": "var(--color-ink-line)",
        ivory: "var(--color-ivory)",
        muted: "var(--color-muted)",
        brass: "var(--color-brass)",
        "brass-contrast": "var(--color-brass-contrast)",
        sage: "var(--color-sage)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
