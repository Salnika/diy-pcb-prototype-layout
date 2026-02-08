import { createTheme, createThemeContract } from "@vanilla-extract/css";

export const vars = createThemeContract({
  color: {
    background: null,
    surface: null,
    surface2: null,
    text: null,
    mutedText: null,
    border: null,
    accent: null,
    accent2: null,
    danger: null,
    warning: null,
  },
  font: {
    body: null,
    mono: null,
  },
  space: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null,
  },
  radius: {
    sm: null,
    md: null,
    lg: null,
  },
  shadow: {
    sm: null,
  },
});

export const themeClass = createTheme(vars, {
  color: {
    background: "#0b0c10",
    surface: "#111218",
    surface2: "#171923",
    text: "#eef0ff",
    mutedText: "#aab0d6",
    border: "rgba(238, 240, 255, 0.12)",
    accent: "#6ea8fe",
    accent2: "#7ee787",
    danger: "#ff6b6b",
    warning: "#ffd166",
  },
  font: {
    body:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    mono:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
  },
  shadow: {
    sm: "0 1px 0 rgba(0,0,0,0.2), 0 12px 30px rgba(0,0,0,0.35)",
  },
});

