import type { Hole, NetTerminal, Part, PartKind, Rotation } from "../../model";
import { makeDefaultPart } from "../../app/store";

type TwoPinPlacement = {
  origin: Hole;
  rotation: Rotation;
  footprint:
    | { type: "inline2"; span: number; pinLabels?: readonly [string, string] }
    | { type: "free2"; dx: number; dy: number; pinLabels?: readonly [string, string] };
};

export function isInline2Kind(kind: PartKind): boolean {
  return (
    kind === "resistor" ||
    kind === "switch" ||
    kind === "diode" ||
    kind === "capacitor" ||
    kind === "capacitor_ceramic" ||
    kind === "capacitor_electrolytic" ||
    kind === "capacitor_film"
  );
}

export function sameTerminal(a: NetTerminal, b: NetTerminal): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "pin" && b.kind === "pin") {
    return a.partId === b.partId && a.pinId === b.pinId;
  }
  if (a.kind === "hole" && b.kind === "hole") {
    return a.hole.x === b.hole.x && a.hole.y === b.hole.y;
  }
  return false;
}

function twoPinPlacementFromPins(
  pin1: Hole,
  pin2: Hole,
  pinLabels?: readonly [string, string],
): TwoPinPlacement | null {
  const dx = pin2.x - pin1.x;
  const dy = pin2.y - pin1.y;
  if (dx === 0 && dy === 0) return null;

  if (dx === 0 || dy === 0) {
    if (dx > 0) {
      return { origin: pin1, rotation: 0, footprint: { type: "inline2", span: dx, pinLabels } };
    }
    if (dx < 0) {
      return { origin: pin1, rotation: 180, footprint: { type: "inline2", span: Math.abs(dx), pinLabels } };
    }
    if (dy > 0) {
      return { origin: pin1, rotation: 90, footprint: { type: "inline2", span: dy, pinLabels } };
    }
    return { origin: pin1, rotation: 270, footprint: { type: "inline2", span: Math.abs(dy), pinLabels } };
  }

  return { origin: pin1, rotation: 0, footprint: { type: "free2", dx, dy, pinLabels } };
}

export function applyInline2Placement(part: Part, pin1: Hole, pin2: Hole): Part | null {
  if (part.footprint.type !== "inline2" && part.footprint.type !== "free2") return null;
  const pinLabels = part.footprint.pinLabels;
  const placement = twoPinPlacementFromPins(pin1, pin2, pinLabels);
  if (!placement) return null;

  return {
    ...part,
    placement: { ...part.placement, origin: placement.origin, rotation: placement.rotation },
    footprint: placement.footprint,
  };
}

export function createInline2Part(kind: PartKind, pin1: Hole, pin2: Hole): Part | null {
  const part = makeDefaultPart(kind, pin1);
  if (part.footprint.type !== "inline2") return null;
  const placement = twoPinPlacementFromPins(pin1, pin2, part.footprint.pinLabels);
  if (!placement) return null;

  return {
    ...part,
    placement: { ...part.placement, origin: placement.origin, rotation: placement.rotation },
    footprint: placement.footprint,
  };
}
