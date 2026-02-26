import type { Hole, Part, Placement, PinRef, Rotation } from "./types";

type PinDef = Readonly<{
  pinId: string;
  pinLabel: string;
  dx: number;
  dy: number;
}>;

function rotateOffset(
  offset: Readonly<{ dx: number; dy: number }>,
  rotation: Rotation,
): Readonly<{ dx: number; dy: number }> {
  const { dx, dy } = offset;
  switch (rotation) {
    case 0:
      return { dx, dy };
    case 90:
      return { dx: -dy, dy: dx };
    case 180:
      return { dx: -dx, dy: -dy };
    case 270:
      return { dx: dy, dy: -dx };
  }
}

function applyPlacement(placement: Placement, local: Readonly<{ dx: number; dy: number }>): Hole {
  const rotated = rotateOffset(local, placement.rotation);
  return {
    x: placement.origin.x + rotated.dx,
    y: placement.origin.y + rotated.dy,
  };
}

function inline2(span: number, pinLabels?: readonly [string, string]): readonly PinDef[] {
  return [
    { pinId: "1", pinLabel: pinLabels?.[0] ?? "1", dx: 0, dy: 0 },
    { pinId: "2", pinLabel: pinLabels?.[1] ?? "2", dx: span, dy: 0 },
  ];
}

function defaultTo92PinNames(kind: Part["kind"]): readonly [string, string, string] {
  switch (kind) {
    case "transistor":
      return ["E", "B", "C"];
    case "potentiometer":
      return ["1", "2", "3"];
    case "jack":
      return ["T", "R", "S"];
    default:
      return ["1", "2", "3"];
  }
}

function to92Inline3(
  kind: Part["kind"],
  pinNames?: readonly [string, string, string],
): readonly PinDef[] {
  const names = pinNames ?? defaultTo92PinNames(kind);
  if (kind === "switch") {
    return [
      { pinId: "1", pinLabel: names[0] ?? "1", dx: 0, dy: 0 },
      { pinId: "2", pinLabel: names[1] ?? "2", dx: 1, dy: 1 },
      { pinId: "3", pinLabel: names[2] ?? "3", dx: 0, dy: 2 },
    ];
  }

  return [
    { pinId: "1", pinLabel: names[0] ?? "1", dx: 0, dy: 0 },
    { pinId: "2", pinLabel: names[1] ?? "2", dx: 1, dy: 0 },
    { pinId: "3", pinLabel: names[2] ?? "3", dx: 2, dy: 0 },
  ];
}

function free2(dx: number, dy: number, pinLabels?: readonly [string, string]): readonly PinDef[] {
  return [
    { pinId: "1", pinLabel: pinLabels?.[0] ?? "1", dx: 0, dy: 0 },
    { pinId: "2", pinLabel: pinLabels?.[1] ?? "2", dx, dy },
  ];
}

function dip(pins: number, rowSpan: 3): readonly PinDef[] {
  const perSide = pins / 2;
  const defs: PinDef[] = [];

  for (let i = 0; i < perSide; i += 1) {
    const pin = i + 1;
    defs.push({ pinId: String(pin), pinLabel: String(pin), dx: 0, dy: i });
  }

  for (let i = 0; i < perSide; i += 1) {
    const pin = pins - i;
    defs.push({ pinId: String(pin), pinLabel: String(pin), dx: rowSpan, dy: i });
  }

  return defs;
}

function single(pinLabel?: string): readonly PinDef[] {
  return [{ pinId: "1", pinLabel: pinLabel ?? "1", dx: 0, dy: 0 }];
}

export function getPartPins(part: Part): readonly PinRef[] {
  const { placement } = part;
  let pins: readonly PinDef[] = [];

  switch (part.footprint.type) {
    case "inline2":
      pins = inline2(part.footprint.span, part.footprint.pinLabels);
      break;
    case "to92_inline3":
      pins = to92Inline3(part.kind, part.footprint.pinNames);
      break;
    case "free2":
      pins = free2(part.footprint.dx, part.footprint.dy, part.footprint.pinLabels);
      break;
    case "single":
      pins = single(part.footprint.pinLabel);
      break;
    case "dip":
      pins = dip(part.footprint.pins, part.footprint.rowSpan);
      break;
  }

  return pins.map((pin) => {
    const hole = applyPlacement(placement, { dx: pin.dx, dy: pin.dy });
    return {
      partId: part.id,
      ref: part.ref,
      pinId: pin.pinId,
      pinLabel: pin.pinLabel,
      hole,
    };
  });
}
