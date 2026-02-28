import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle(":root", {
  colorScheme: "dark",
});

globalStyle("html, body, #root", {
  height: "100%",
  overflow: "hidden",
});

globalStyle("body", {
  margin: 0,
  backgroundColor: vars.color.chromeAppBg,
  backgroundImage: "none",
  color: vars.color.chromeText,
  fontFamily: vars.font.body,
  lineHeight: 1.4,
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("#root", {
  isolation: "isolate",
});

globalStyle("button, input, select, textarea", {
  font: "inherit",
  color: "inherit",
});

globalStyle("button", {
  border: "none",
  background: "none",
});

globalStyle("button:disabled", {
  opacity: 0.52,
  cursor: "not-allowed",
});

globalStyle(
  "button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible",
  {
    outline: `2px solid ${vars.color.focusRing}`,
    outlineOffset: 2,
  },
);

globalStyle("::selection", {
  background: vars.color.chromeAccentSoft,
  color: vars.color.chromeText,
});
