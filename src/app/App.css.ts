import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const panelFrame = {
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanel,
  boxShadow: "none",
};

const interactiveFrame = {
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanelAlt,
  color: vars.color.chromeText,
  transition: [
    `border-color ${vars.motion.fast} ease`,
    `background ${vars.motion.fast} ease`,
    `transform ${vars.motion.fast} ease`,
  ].join(", "),
};

export const app = style({
  height: "100%",
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "56px 46px minmax(0, 1fr)",
  "@media": {
    "screen and (max-width: 980px)": {
      gridTemplateRows: "56px 42px minmax(0, 1fr)",
    },
  },
});

export const topBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  padding: `0 ${vars.space.lg}`,
  background: vars.color.chromePanel,
  borderBottom: `1px solid ${vars.color.chromeBorder}`,
  boxShadow: "none",
  backdropFilter: "none",
  "@media": {
    "screen and (max-width: 1200px)": {
      paddingLeft: vars.space.md,
      paddingRight: vars.space.md,
    },
  },
  selectors: {
    '&[data-has-error="true"]': {
      borderBottomColor: vars.color.danger,
    },
  },
});

export const brandWrap = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  minWidth: 0,
});

export const brandBadge = style({
  width: 28,
  height: 28,
  borderRadius: 999,
  background: vars.color.chromeAccent,
  border: `1px solid ${vars.color.chromeAccent}`,
  boxShadow: "none",
  display: "grid",
  placeItems: "center",
  fontFamily: vars.font.mono,
  fontSize: 11,
  color: "#0c1e33",
  fontWeight: 700,
  letterSpacing: "0.02em",
  flexShrink: 0,
});

export const brandTextGroup = style({
  minWidth: 0,
  display: "grid",
  gap: 1,
});

export const brand = style({
  fontFamily: vars.font.bodyAlt,
  fontWeight: 600,
  letterSpacing: "0.015em",
  color: vars.color.chromeText,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const brandSub = style({
  fontSize: 11,
  color: vars.color.chromeMutedText,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  "@media": {
    "screen and (max-width: 1200px)": {
      display: "none",
    },
  },
});

export const topActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: vars.space.sm,
  minWidth: 0,
  flexWrap: "nowrap",
});

export const topActionsCluster = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: "3px",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanelMuted,
});

export const topActionsSecondary = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const mobileOnly = style({
  display: "none",
  "@media": {
    "screen and (max-width: 980px)": {
      display: "inline-flex",
    },
  },
});

export const desktopOnly = style({
  display: "inline-flex",
  "@media": {
    "screen and (max-width: 980px)": {
      display: "none",
    },
  },
});

export const tabBar = style({
  display: "flex",
  alignItems: "flex-end",
  gap: vars.space.sm,
  padding: `0 ${vars.space.lg}`,
  background: vars.color.chromePanel,
  borderBottom: `1px solid ${vars.color.chromeBorder}`,
  boxShadow: "none",
  "@media": {
    "screen and (max-width: 1200px)": {
      paddingLeft: vars.space.md,
      paddingRight: vars.space.md,
    },
  },
});

export const tabList = style({
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "flex-end",
  gap: 2,
  overflowX: "auto",
  height: "100%",
  paddingTop: 8,
  paddingBottom: 0,
  selectors: {
    "&::-webkit-scrollbar": {
      height: 4,
    },
    "&::-webkit-scrollbar-thumb": {
      background: vars.color.chromeBorderStrong,
      borderRadius: 999,
    },
  },
});

export const tabButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  maxWidth: 240,
  minWidth: 108,
  height: 34,
  padding: "0 14px",
  borderRadius: "8px 8px 0 0",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.008em",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  position: "relative",
  border: `1px solid ${vars.color.chromeBorder}`,
  borderBottomColor: vars.color.chromeBorder,
  background: vars.color.chromePanelAlt,
  color: vars.color.chromeMutedText,
  transition: [
    `border-color ${vars.motion.fast} ease`,
    `background ${vars.motion.fast} ease`,
    `color ${vars.motion.fast} ease`,
  ].join(", "),
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
    color: vars.color.chromeText,
  },
});

export const tabButtonActive = style([
  tabButton,
  {
    borderColor: vars.color.chromeAccent,
    borderBottomColor: "transparent",
    background: vars.color.chromePanel,
    color: vars.color.chromeText,
    zIndex: 1,
    boxShadow: "none",
    selectors: {
      "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        background: vars.color.chromePanel,
      },
    },
  },
]);

export const tabAdd = style([
  {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    minWidth: 28,
    height: 28,
    minHeight: 28,
    padding: 0,
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    color: vars.color.chromeText,
    border: `1px solid ${vars.color.chromeBorder}`,
    background: vars.color.chromePanel,
    borderRadius: vars.radius.sm,
    marginBottom: 5,
    marginLeft: 2,
    transition: [
      `border-color ${vars.motion.fast} ease`,
      `background ${vars.motion.fast} ease`,
      `transform ${vars.motion.fast} ease`,
    ].join(", "),
    ":hover": {
      borderColor: vars.color.chromeBorderStrong,
      background: vars.color.chromePanelMuted,
    },
    ":active": {
      transform: "translateY(1px)",
    },
  },
]);

export const tabButtonText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const tabButtonMeta = style({
  fontSize: 10,
  fontFamily: vars.font.mono,
  color: vars.color.chromeMutedText,
  flexShrink: 0,
});

export const main = style({
  minHeight: 0,
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr) 340px",
  gap: vars.space.md,
  padding: vars.space.md,
  overflow: "hidden",
  position: "relative",
  "@media": {
    "screen and (max-width: 1200px)": {
      gap: vars.space.sm,
      padding: vars.space.sm,
    },
    "screen and (max-width: 980px)": {
      gridTemplateColumns: "1fr",
      padding: vars.space.sm,
    },
  },
});

export const mobileBackdrop = style({
  display: "none",
  position: "fixed",
  inset: 0,
  opacity: 0,
  pointerEvents: "none",
  background: vars.color.chromeOverlay,
  backdropFilter: "blur(2px)",
  transition: `opacity ${vars.motion.fast} ease`,
  zIndex: 15,
  "@media": {
    "screen and (max-width: 980px)": {
      display: "block",
    },
  },
});

export const mobileBackdropVisible = style({
  opacity: 1,
  pointerEvents: "auto",
});

const paneBase = style({
  minHeight: 0,
  minWidth: 0,
  ...panelFrame,
});

export const leftPane = style([
  paneBase,
  {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: vars.space.md,
    padding: vars.space.md,
    overflowY: "auto",
    overflowX: "hidden",
    "@media": {
      "screen and (max-width: 980px)": {
        position: "fixed",
        top: 108,
        bottom: 10,
        left: 10,
        width: "min(86vw, 340px)",
        transform: "translateX(-115%)",
        transition: `transform ${vars.motion.normal} ease`,
        zIndex: 20,
      },
    },
  },
]);

export const leftPaneMobileOpen = style({
  "@media": {
    "screen and (max-width: 980px)": {
      transform: "translateX(0)",
    },
  },
});

export const centerPane = style({
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  overflow: "hidden",
  position: "relative",
});

export const rightPane = style([
  paneBase,
  {
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: vars.space.sm,
    padding: vars.space.md,
    overflowY: "hidden",
    overflowX: "hidden",
    "@media": {
      "screen and (max-width: 980px)": {
        position: "fixed",
        top: 108,
        bottom: 10,
        right: 10,
        width: "min(88vw, 360px)",
        transform: "translateX(115%)",
        transition: `transform ${vars.motion.normal} ease`,
        zIndex: 20,
      },
    },
  },
]);

export const rightPaneMobileOpen = style({
  "@media": {
    "screen and (max-width: 980px)": {
      transform: "translateX(0)",
    },
  },
});

export const rightPaneCollapsed = style({
  width: 56,
  minWidth: 56,
  padding: vars.space.sm,
  overflow: "hidden",
  "@media": {
    "screen and (max-width: 980px)": {
      width: "min(88vw, 360px)",
      minWidth: "min(88vw, 360px)",
      padding: vars.space.md,
    },
  },
});

export const smallButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.xs,
  minHeight: 30,
  padding: "0 10px",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0,
  whiteSpace: "nowrap",
  ...interactiveFrame,
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
  },
  ":active": {
    transform: "translateY(1px)",
  },
  selectors: {
    "&:disabled": {
      background: vars.color.chromePanelMuted,
      borderColor: vars.color.chromeBorder,
      color: vars.color.chromeMutedText,
      transform: "none",
    },
  },
});

export const iconButton = style([
  smallButton,
  {
    width: 30,
    minWidth: 30,
    minHeight: 30,
    padding: 0,
  },
]);

export const topActionIcon = style({
  width: 16,
  height: 16,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const paneHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const paneTitleGroup = style({
  minWidth: 0,
  display: "grid",
  gap: 2,
});

export const paneTitle = style({
  margin: 0,
  fontFamily: vars.font.body,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: vars.color.chromeMutedText,
});

export const paneSubtitle = style({
  margin: 0,
  fontSize: 11,
  color: vars.color.chromeMutedText,
});

export const drawerClose = style([
  smallButton,
  {
    display: "none",
    width: 28,
    minWidth: 28,
    height: 28,
    minHeight: 28,
    padding: 0,
    fontSize: 16,
    lineHeight: 1,
    "@media": {
      "screen and (max-width: 980px)": {
        display: "inline-flex",
      },
    },
  },
]);

export const inspectorHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const inspectorHeaderActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
  flexShrink: 0,
});

export const inspectorToggle = style({
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  ...interactiveFrame,
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
  },
});

export const inspectorToggleIcon = style({
  width: 14,
  height: 14,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const paneSection = style({
  display: "grid",
  alignContent: "start",
  gap: vars.space.md,
});

export const inspectorBody = style({
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: vars.space.md,
  overflow: "hidden",
});

export const inspectorContent = style({
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 2,
});

export const inspectorTabs = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 2,
  padding: 2,
  borderRadius: vars.radius.sm,
  background: vars.color.chromePanelMuted,
  border: `1px solid ${vars.color.chromeBorder}`,
});

export const inspectorTab = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 0,
  minHeight: 30,
  padding: "0 10px",
  borderRadius: vars.radius.sm,
  border: `1px solid transparent`,
  background: "transparent",
  color: vars.color.chromeMutedText,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  transition: `all ${vars.motion.fast} ease`,
  ":hover": {
    color: vars.color.chromeText,
    background: vars.color.chromePanelMuted,
  },
});

export const inspectorTabActive = style([
  inspectorTab,
  {
    color: vars.color.chromeText,
    borderColor: vars.color.chromeAccent,
    background: vars.color.chromeAccentSoft,
  },
]);

export const toolSectionTitle = style({
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.color.chromeMutedText,
});

export const toolGroup = style({
  marginTop: vars.space.sm,
  display: "grid",
  gridTemplateColumns: "repeat(3, 44px)",
  gap: vars.space.sm,
  justifyContent: "start",
});

export const toolButton = style({
  width: 44,
  minWidth: 44,
  height: 44,
  minHeight: 44,
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  ...interactiveFrame,
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
  },
  ":active": {
    transform: "translateY(1px)",
  },
  selectors: {
    "&::after": {
      content: "attr(data-tooltip)",
      position: "absolute",
      left: "50%",
      bottom: "calc(100% + 9px)",
      transform: "translate(-50%, 4px)",
      opacity: 0,
      pointerEvents: "none",
      zIndex: 8,
      maxWidth: 168,
      padding: "4px 8px",
      borderRadius: vars.radius.sm,
      border: `1px solid ${vars.color.chromeBorderStrong}`,
      background: vars.color.chromePanel,
      color: vars.color.chromeText,
      fontSize: 10,
      fontWeight: 500,
      textAlign: "center",
      lineHeight: 1.25,
      whiteSpace: "normal",
      boxShadow: vars.shadow.sm,
      transition: [`opacity ${vars.motion.fast} ease`, `transform ${vars.motion.fast} ease`].join(
        ", ",
      ),
    },
    "&::before": {
      content: '""',
      position: "absolute",
      left: "50%",
      bottom: "calc(100% + 3px)",
      transform: "translateX(-50%)",
      opacity: 0,
      pointerEvents: "none",
      zIndex: 7,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: `6px solid ${vars.color.chromePanel}`,
      transition: `opacity ${vars.motion.fast} ease`,
    },
    "&:hover::after, &:focus-visible::after": {
      opacity: 1,
      transform: "translate(-50%, 0)",
    },
    "&:hover::before, &:focus-visible::before": {
      opacity: 1,
    },
  },
});

export const toolButtonActive = style([
  toolButton,
  {
    borderColor: vars.color.chromeAccent,
    background: vars.color.chromeAccentSoft,
    boxShadow: "none",
  },
]);

export const toolIcon = style({
  width: 20,
  height: 20,
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
});

export const divider = style({
  height: 1,
  background: vars.color.chromeBorder,
  margin: `${vars.space.sm} 0`,
});

export const inspectorRow = style({
  display: "grid",
  gap: vars.space.xs,
});

export const rowInlineWrap = style({
  display: "flex",
  gap: vars.space.sm,
  flexWrap: "wrap",
  alignItems: "center",
});

export const twoColGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: vars.space.sm,
});

export const threeColGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: vars.space.sm,
});

export const label = style({
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: vars.color.chromeMutedText,
});

export const input = style({
  width: "100%",
  minHeight: 36,
  padding: "8px 10px",
  borderRadius: vars.radius.sm,
  ...interactiveFrame,
  outline: "none",
  boxShadow: "none",
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
  },
  ":focus": {
    borderColor: vars.color.chromeAccent,
    boxShadow: `0 0 0 3px ${vars.color.focusRing}`,
  },
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
  fontSize: 10,
  lineHeight: 1,
  color: vars.color.chromeMutedText,
});

export const dropdownMenu = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  minWidth: 152,
  display: "grid",
  gap: vars.space.xs,
  padding: vars.space.xs,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.chromeBorderStrong}`,
  background: vars.color.chromePanel,
  boxShadow: vars.shadow.md,
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
  color: vars.color.chromeText,
  cursor: "pointer",
  fontSize: 12,
  ":hover": {
    borderColor: vars.color.chromeBorder,
    background: vars.color.chromePanelMuted,
  },
});

export const smallButtonActive = style([
  smallButton,
  {
    borderColor: vars.color.chromeAccent,
    background: vars.color.chromeAccentSoft,
  },
]);

export const dangerButton = style([
  smallButton,
  {
    borderColor: vars.color.danger,
    background: vars.color.chromeDangerSoft,
    color: "#fecaca",
    ":hover": {
      borderColor: vars.color.danger,
      background: "rgba(248, 113, 113, 0.22)",
    },
  },
]);

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "0 9px",
  borderRadius: 999,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanelMuted,
  color: vars.color.chromeMutedText,
  fontSize: 11,
  lineHeight: 1,
  whiteSpace: "nowrap",
});

export const errorBar = style({
  maxWidth: 280,
  marginLeft: vars.space.sm,
  padding: "7px 10px",
  borderRadius: vars.radius.sm,
  background: vars.color.chromeDangerSoft,
  border: `1px solid ${vars.color.danger}`,
  color: "#fecaca",
  fontSize: 11,
  fontFamily: vars.font.mono,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  "@media": {
    "screen and (max-width: 1200px)": {
      maxWidth: 200,
    },
    "screen and (max-width: 980px)": {
      display: "none",
    },
  },
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
  width: "100%",
  padding: "7px 8px",
  borderRadius: vars.radius.sm,
  textAlign: "left",
  fontSize: 12,
  cursor: "pointer",
  ...interactiveFrame,
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
  },
});

export const netButtonActive = style([
  netButton,
  {
    borderColor: vars.color.chromeAccent,
    background: vars.color.chromeAccentSoft,
  },
]);

export const netCount = style({
  minWidth: 22,
  textAlign: "center",
  padding: "2px 7px",
  borderRadius: 999,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanel,
  color: vars.color.chromeMutedText,
  fontSize: 11,
  fontFamily: vars.font.mono,
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
  padding: "8px 9px",
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanelMuted,
  fontSize: 12,
});

export const netTerminalLabel = style({
  fontFamily: vars.font.mono,
  color: vars.color.chromeText,
});

export const netTerminalMeta = style({
  color: vars.color.chromeMutedText,
  fontSize: 11,
});

export const traceColorRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const traceColorButton = style({
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  borderRadius: 999,
  cursor: "pointer",
  ...interactiveFrame,
  ":hover": {
    borderColor: vars.color.chromeBorderStrong,
    background: vars.color.chromePanelMuted,
  },
});

export const traceColorDot = style({
  width: 14,
  height: 14,
  borderRadius: 999,
  border: `1px solid ${vars.color.chromeBorderStrong}`,
});

export const traceColorInput = style({
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
});

export const bomTableWrap = style({
  overflowX: "auto",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.chromeBorder}`,
  background: vars.color.chromePanelMuted,
});

export const bomTable = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
});

export const bomHeadCell = style({
  padding: "8px 10px",
  textAlign: "left",
  color: vars.color.chromeMutedText,
  borderBottom: `1px solid ${vars.color.chromeBorder}`,
  whiteSpace: "nowrap",
  fontWeight: 600,
  letterSpacing: "0.03em",
});

export const bomCell = style({
  padding: "8px 10px",
  borderBottom: `1px solid ${vars.color.chromeBorder}`,
  color: vars.color.chromeText,
  selectors: {
    "&:last-child": {
      textAlign: "right",
      whiteSpace: "nowrap",
    },
  },
});

export const bomRefCell = style([
  bomCell,
  {
    fontFamily: vars.font.mono,
  },
]);
