import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        "paper-sunken": "var(--paper-sunken)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        line: "var(--line)",
        accent: "var(--accent)",
      },
      fontFamily: {
        // One font for the whole site: every utility (sans/mono/display)
        // resolves to the same stack so existing class names keep working.
        mono: ["Courier New", "Courier", "monospace"],
        display: ["Courier New", "Courier", "monospace"],
        sans: ["Courier New", "Courier", "monospace"],
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
