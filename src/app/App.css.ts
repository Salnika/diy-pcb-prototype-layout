import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const app = style({
  minHeight: "100%",
  display: "grid",
  gridTemplateRows: "48px 40px 1fr",
});

export const topBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  padding: `0 ${vars.space.lg}`,
  background: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const brand = style({
  fontWeight: 700,
  letterSpacing: "0.2px",
});

export const topHint = style({
  color: vars.color.mutedText,
  fontSize: 13,
});

export const topActions = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginLeft: "auto",
});

export const tabBar = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `0 ${vars.space.lg}`,
  background: vars.color.surface2,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const tabList = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  overflowX: "auto",
});

export const tabButton = style({
  padding: "6px 10px",
  borderRadius: vars.radius.md,
  background: "transparent",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  ":hover": {
    background: "rgba(255,255,255,0.04)",
  },
});

export const tabButtonActive = style([
  tabButton,
  {
    borderColor: "rgba(110,168,254,0.7)",
    background: "rgba(110,168,254,0.16)",
  },
]);

export const tabAdd = style([
  tabButton,
  {
    minWidth: 28,
    padding: "6px 8px",
    fontWeight: 700,
  },
]);

export const main = style({
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "max-content 1fr 300px",
});

const paneBase = style({
  minHeight: 0,
  padding: vars.space.lg,
  background: vars.color.surface,
});

export const leftPane = style([
  paneBase,
  {
    borderRight: `1px solid ${vars.color.border}`,
    width: "max-content",
  },
]);

export const centerPane = style({
  minWidth: 0,
  minHeight: 0,
  padding: vars.space.lg,
  background: vars.color.background,
});

export const rightPane = style([
  paneBase,
  {
    borderLeft: `1px solid ${vars.color.border}`,
  },
]);

export const rightPaneCollapsed = style({
  padding: vars.space.sm,
  width: 44,
});

export const inspectorHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const inspectorToggle = style({
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.radius.md,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  cursor: "pointer",
  ":hover": { background: "rgba(255,255,255,0.05)" },
});

export const paneTitle = style({
  margin: 0,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: vars.color.mutedText,
});

export const paneSection = style({
  marginTop: vars.space.lg,
  display: "grid",
  gap: vars.space.sm,
});

export const toolGroup = style({
  marginTop: vars.space.md,
  display: "grid",
  gridTemplateColumns: "repeat(2, 44px)",
  justifyContent: "center",
  gap: vars.space.xs,
});

export const toolButton = style({
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  borderRadius: vars.radius.md,
  background: "transparent",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  cursor: "pointer",
  ":hover": {
    background: "rgba(255,255,255,0.03)",
  },
});

export const toolButtonActive = style([
  toolButton,
  {
    borderColor: "rgba(110,168,254,0.6)",
    background: "rgba(110,168,254,0.12)",
  },
]);

export const toolIcon = style({
  width: 20,
  height: 20,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const toolKbd = style({
  fontFamily: vars.font.mono,
  fontSize: 11,
  color: vars.color.mutedText,
});

export const divider = style({
  height: 1,
  background: vars.color.border,
  marginTop: vars.space.lg,
});

export const inspectorRow = style({
  display: "grid",
  gap: vars.space.xs,
});

export const label = style({
  fontSize: 12,
  color: vars.color.mutedText,
});

export const input = style({
  width: "100%",
  padding: "8px 10px",
  borderRadius: vars.radius.md,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  outline: "none",
  ":focus": {
    borderColor: "rgba(110,168,254,0.75)",
  },
});

export const smallButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.xs,
  padding: "8px 10px",
  borderRadius: vars.radius.md,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  cursor: "pointer",
  ":hover": { background: "rgba(255,255,255,0.05)" },
});

export const iconButton = style([
  smallButton,
  {
    width: 34,
    height: 34,
    padding: 0,
  },
]);

export const topActionIcon = style({
  width: 16,
  height: 16,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const dropdownRoot = style({
  position: "relative",
});

export const dropdownTrigger = style([
  smallButton,
  {
    listStyle: "none",
    selectors: {
      "&::-webkit-details-marker": { display: "none" },
      "&::marker": { content: '""' },
    },
  },
]);

export const dropdownChevron = style({
  fontSize: 11,
  lineHeight: 1,
});

export const dropdownMenu = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: 120,
  display: "grid",
  gap: vars.space.xs,
  padding: vars.space.xs,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
  boxShadow: vars.shadow.sm,
  zIndex: 30,
});

export const dropdownItem = style({
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "8px 10px",
  borderRadius: vars.radius.sm,
  border: `1px solid transparent`,
  background: "transparent",
  color: vars.color.text,
  cursor: "pointer",
  fontSize: 12,
  ":hover": {
    background: "rgba(255,255,255,0.05)",
    borderColor: vars.color.border,
  },
});

export const smallButtonActive = style([
  smallButton,
  {
    borderColor: "rgba(110,168,254,0.7)",
    background: "rgba(110,168,254,0.12)",
  },
]);

export const dangerButton = style([
  smallButton,
  { borderColor: "rgba(255,107,107,0.6)", color: vars.color.danger },
]);

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  padding: `2px 8px`,
  borderRadius: 999,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.mutedText,
  fontSize: 12,
});

export const errorBar = style({
  marginLeft: vars.space.lg,
  padding: "6px 10px",
  borderRadius: vars.radius.md,
  background: "rgba(255,107,107,0.12)",
  border: "1px solid rgba(255,107,107,0.35)",
  color: vars.color.danger,
  fontSize: 12,
  fontFamily: vars.font.mono,
});

export const netList = style({
  display: "grid",
  gap: vars.space.xs,
});

export const netButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  padding: "6px 8px",
  borderRadius: vars.radius.md,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
  ":hover": {
    background: "rgba(255,255,255,0.05)",
  },
});

export const netButtonActive = style([
  netButton,
  {
    borderColor: "rgba(110,168,254,0.7)",
    background: "rgba(110,168,254,0.14)",
  },
]);

export const netCount = style({
  minWidth: 20,
  textAlign: "center",
  padding: "2px 6px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.mutedText,
  fontSize: 11,
});

export const netTerminalList = style({
  display: "grid",
  gap: vars.space.xs,
});

export const netTerminalRow = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: vars.space.sm,
  padding: "6px 8px",
  borderRadius: vars.radius.md,
  background: vars.color.surface2,
  border: `1px solid ${vars.color.border}`,
  fontSize: 12,
});

export const netTerminalLabel = style({
  fontFamily: vars.font.mono,
  color: vars.color.text,
});

export const netTerminalMeta = style({
  color: vars.color.mutedText,
  fontSize: 11,
});

export const traceColorRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const traceColorButton = style({
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surface2,
  cursor: "pointer",
  padding: 0,
  ":hover": {
    background: "rgba(255,255,255,0.05)",
  },
});

export const traceColorDot = style({
  width: 14,
  height: 14,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.55)",
});

export const traceColorInput = style({
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
});
