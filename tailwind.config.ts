import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1815",
        "ink-soft": "#24201B",
        "ink-line": "#3A342C",
        ivory: "#EDE5D6",
        muted: "#9C917E",
        brass: "#C79A54",
        sage: "#6E7E58",
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
