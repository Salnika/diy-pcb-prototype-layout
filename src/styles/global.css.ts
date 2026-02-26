import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle("html, body, #root", {
  height: "100%",
  overflow: "hidden",
});

globalStyle("body", {
  margin: 0,
  background: vars.color.background,
  color: vars.color.text,
  fontFamily: vars.font.body,
});

globalStyle("button, input, select, textarea", {
  font: "inherit",
});
