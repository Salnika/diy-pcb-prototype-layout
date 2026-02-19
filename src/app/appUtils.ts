import { holeLabel } from "../model";
import type { BoardLabeling, Net, NetTerminal, Part, PartKind } from "../model";
import { makeDefaultPart, type Tool } from "./store";

export const BOARD_MIN = 1;
export const BOARD_MAX = 64;
export const INSPECTOR_COLLAPSE_KEY = "diypcbprototype.ui.inspectorCollapsed";

export function isToolActive(current: Tool, candidate: Tool): boolean {
  if (current.type !== candidate.type) return false;
  if (current.type === "placePart" && candidate.type === "placePart") {
    return current.kind === candidate.kind;
  }
  return true;
}

function refPrefix(kind: PartKind): string {
  switch (kind) {
    case "resistor":
      return "R";
    case "capacitor":
    case "capacitor_ceramic":
    case "capacitor_electrolytic":
    case "capacitor_film":
      return "C";
    case "diode":
      return "D";
    case "transistor":
      return "Q";
    case "potentiometer":
      return "RV";
    case "jack":
      return "J";
    case "power_pos":
    case "power_neg":
    case "power_gnd":
      return "PWR";
    case "dip":
      return "U";
  }
}

function convertRef(oldRef: string, nextKind: PartKind): string {
  const match = oldRef.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return oldRef;
  return `${refPrefix(nextKind)}${match[2]}`;
}

export function convertPartKind(part: Part, nextKind: PartKind): Part {
  const defaults = makeDefaultPart(nextKind, part.placement.origin);
  return {
    ...defaults,
    id: part.id,
    ref: convertRef(part.ref, nextKind),
    placement: part.placement,
    value: part.value,
  };
}

export function safeFilename(base: string): string {
  const trimmed = base.trim() || "project";
  const safe = trimmed.replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/^-+|-+$/g, "");
  return safe || "project";
}

export function netDisplayName(net: Net, index: number): string {
  const name = net.name?.trim();
  return name && name.length > 0 ? name : `Net ${index + 1}`;
}

export function formatTerminal(
  terminal: NetTerminal,
  parts: readonly Part[],
  labeling: BoardLabeling,
): { title: string; meta?: string } {
  if (terminal.kind === "hole") {
    return { title: holeLabel(terminal.hole, labeling), meta: "hole" };
  }
  const part = parts.find((entry) => entry.id === terminal.partId);
  if (!part) return { title: `pin ${terminal.pinId}`, meta: "part manquant" };
  return { title: `${part.ref}.${terminal.pinId}`, meta: part.kind };
}

export function clampBoardSize(value: number): number {
  return Math.max(BOARD_MIN, Math.min(BOARD_MAX, Math.round(value)));
}

export function toggleBoardLabeling(labeling: BoardLabeling): BoardLabeling {
  if (labeling.rows === "alpha" && labeling.cols === "numeric") {
    return { rows: "numeric", cols: "alpha" };
  }
  return { rows: "alpha", cols: "numeric" };
}
