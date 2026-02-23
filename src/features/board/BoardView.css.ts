import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

export const root = style({
  height: "100%",
  minHeight: 420,
  display: "grid",
  gridTemplateRows: "40px 1fr",
  borderRadius: vars.radius.lg,
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  boxShadow: vars.shadow.sm,
  overflow: "hidden",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `0 ${vars.space.md}`,
  background: vars.color.surface2,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const toolbarTitle = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.sm,
});

export const title = style({
  fontWeight: 700,
});

export const meta = style({
  color: vars.color.mutedText,
  fontSize: 12,
  fontFamily: vars.font.mono,
});

export const viewport = style({
  position: "relative",
  background: vars.color.surface,
  userSelect: "none",
});

export const svg = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  touchAction: "none",
});

export const label = style({
  fill: vars.color.mutedText,
  fontSize: 11,
  fontFamily: vars.font.mono,
});

export const boardBg = style({
  fill: "rgba(255,255,255,0.03)",
  stroke: vars.color.border,
});

export const hole = style({
  fill: "rgba(238,240,255,0.12)",
});

export const holeHover = style({
  fill: vars.color.accent,
});

export const trace = style({
  fill: "none",
  strokeWidth: 2.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  opacity: 0.9,
});

export const traceHot = style([
  trace,
  {
    strokeWidth: 4,
    opacity: 1,
  },
]);

export const traceSelected = style([
  trace,
  {
    strokeWidth: 5,
    opacity: 1,
    filter: "drop-shadow(0 0 6px rgba(110,168,254,0.35))",
  },
]);

export const traceDraft = style({
  fill: "none",
  stroke: "rgba(238,240,255,0.65)",
  strokeWidth: 2.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  strokeDasharray: "6 6",
});

export const traceHandle = style({
  fill: "rgba(110,168,254,0.16)",
  stroke: vars.color.accent,
  strokeWidth: 1.5,
});

export const partBody = style({
  fill: "rgba(255,255,255,0.04)",
  stroke: "rgba(238,240,255,0.45)",
  strokeWidth: 2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
});

export const partBodySelected = style([
  partBody,
  {
    stroke: vars.color.accent,
    strokeWidth: 3,
    filter: "drop-shadow(0 0 10px rgba(110,168,254,0.35))",
  },
]);

export const partBodyInvalid = style([
  partBody,
  {
    stroke: vars.color.danger,
    strokeWidth: 3,
    fill: "rgba(255,107,107,0.08)",
  },
]);

export const partPin = style({
  fill: "rgba(238,240,255,0.9)",
  stroke: "rgba(17,18,24,0.8)",
  strokeWidth: 1,
});

export const partPinHandle = style({
  fill: "rgba(126,231,135,0.12)",
  stroke: vars.color.accent2,
  strokeWidth: 0,
  ":hover": {
    strokeWidth: 1,
  },
});

export const connectDraft = style({
  fill: "rgba(110,168,254,0.18)",
  stroke: vars.color.accent,
  strokeWidth: 2,
});

export const partLockMarker = style({
  fill: "rgba(126,231,135,0.25)",
  stroke: vars.color.accent2,
  strokeWidth: 1,
  pointerEvents: "none",
});

export const fixedHole = style({
  fill: "rgba(126,231,135,0.16)",
  stroke: vars.color.accent2,
  strokeWidth: 1,
});

export const fixedHoleCross = style({
  stroke: vars.color.accent2,
  strokeWidth: 1,
});

export const partPin1Marker = style({
  fill: vars.color.accent,
  stroke: "rgba(17,18,24,0.8)",
  strokeWidth: 1,
  pointerEvents: "none",
});

export const partLabel = style({
  fill: vars.color.text,
  fontFamily: vars.font.mono,
  fontSize: 11,
});

export const partValueLabel = style({
  fill: vars.color.mutedText,
  fontFamily: vars.font.mono,
  fontSize: 9,
});

export const partPinLabel = style({
  fill: vars.color.mutedText,
  fontFamily: vars.font.mono,
  fontSize: 8,
  pointerEvents: "none",
});

export const netLabelBg = style({
  fill: "rgba(255,255,255,0.05)",
  stroke: vars.color.border,
});

export const netLabelBgSelected = style([
  netLabelBg,
  {
    stroke: vars.color.accent,
    fill: "rgba(110,168,254,0.12)",
  },
]);

export const netLabelText = style({
  fill: vars.color.text,
  fontFamily: vars.font.mono,
  fontSize: 11,
});

export const netLabelLeader = style({
  stroke: "rgba(238,240,255,0.55)",
  strokeWidth: 1.4,
  strokeDasharray: "4 4",
});
