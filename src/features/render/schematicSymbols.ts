import type { Part } from "../../model";

export type Point = Readonly<{ x: number; y: number }>;

export type TextAnchor = "start" | "middle" | "end";

export type SymbolPrimitiveRole = "body" | "pin1";

export type SymbolPrimitive =
  | Readonly<{ type: "line"; role: SymbolPrimitiveRole; x1: number; y1: number; x2: number; y2: number }>
  | Readonly<{ type: "rect"; role: SymbolPrimitiveRole; x: number; y: number; width: number; height: number; rx?: number }>
  | Readonly<{ type: "circle"; role: SymbolPrimitiveRole; cx: number; cy: number; r: number }>
  | Readonly<{ type: "polyline"; role: SymbolPrimitiveRole; points: string }>
  | Readonly<{ type: "polygon"; role: SymbolPrimitiveRole; points: string }>;

export type SymbolTextRole = "pinLabel";

export type SymbolText = Readonly<{
  type: "text";
  role: SymbolTextRole;
  x: number;
  y: number;
  text: string;
  textAnchor: TextAnchor;
}>;

export type PinGeometry = Readonly<{
  pinId: string;
  pinLabel: string;
  center: Point;
}>;

export type PartSymbol = Readonly<{
  primitives: readonly SymbolPrimitive[];
  texts: readonly SymbolText[];
  refAnchor?: Point;
}>;

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mul(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

function len(v: Point): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Point): Point {
  const l = len(v);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

function perp(v: Point): Point {
  // Chosen so that for a left->right vector, the perpendicular points "up" in SVG space.
  return { x: v.y, y: -v.x };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointsAttr(points: readonly Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function pickPin(pins: readonly PinGeometry[], pinId: string): PinGeometry | null {
  return pins.find((p) => p.pinId === pinId) ?? null;
}

function anchorFromDirection(v: Point): TextAnchor {
  if (Math.abs(v.x) > 0.55) return v.x > 0 ? "start" : "end";
  return "middle";
}

function inline2PinLabels(pins: readonly PinGeometry[], mid: Point): readonly SymbolText[] {
  const labels = pins.map((p) => p.pinLabel);
  if (labels.length < 2) return [];
  const hasCustom =
    (labels[0] && labels[0] !== "1") || (labels[1] && labels[1] !== "2");
  if (!hasCustom) return [];

  return pins.map((pin) => {
    const dir = normalize(sub(pin.center, mid));
    const pos = add(pin.center, mul(dir, 7));
    return {
      type: "text",
      role: "pinLabel",
      x: pos.x,
      y: pos.y + 3,
      text: pin.pinLabel,
      textAnchor: anchorFromDirection(dir),
    };
  });
}

function symbolForInline2(
  pins: readonly PinGeometry[],
  kind: "resistor" | "diode" | "capacitor",
): PartSymbol {
  const p1 = pickPin(pins, "1")?.center ?? pins[0]?.center;
  const p2 = pickPin(pins, "2")?.center ?? pins[pins.length - 1]?.center;
  if (!p1 || !p2) return { primitives: [], texts: [] };

  const v = sub(p2, p1);
  const l = len(v);
  if (l < 1e-6) {
    return {
      primitives: [{ type: "line", role: "body", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }],
      texts: [],
      refAnchor: { x: p1.x, y: p1.y - 10 },
    };
  }

  const d = normalize(v);
  const n = perp(d);
  const mid = midpoint(p1, p2);

  const maxHalf = Math.max(0, l / 2 - 4);
  const bodyHalf = Math.min(10, maxHalf);
  if (bodyHalf < 2) {
    return {
      primitives: [{ type: "line", role: "body", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }],
      texts: inline2PinLabels(pins, mid),
      refAnchor: { x: mid.x, y: mid.y - 10 },
    };
  }

  const bodyStart = sub(mid, mul(d, bodyHalf));
  const bodyEnd = add(mid, mul(d, bodyHalf));

  if (kind === "resistor") {
    const amplitude = Math.min(4, bodyHalf * 0.8);
    const segments = 6;
    const bodyLen = bodyHalf * 2;

    const zig: Point[] = [bodyStart];
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const along = add(bodyStart, mul(d, bodyLen * t));
      const offset = mul(n, i % 2 === 0 ? -amplitude : amplitude);
      zig.push(add(along, offset));
    }
    zig.push(bodyEnd);

    const points = pointsAttr([p1, ...zig, p2]);
    return {
      primitives: [{ type: "polyline", role: "body", points }],
      texts: inline2PinLabels(pins, mid),
      refAnchor: { x: mid.x, y: mid.y - 10 },
    };
  }

  if (kind === "capacitor") {
    const gap = Math.max(3, Math.min(6, l / 3));
    const plateHalf = 6;
    const plate1 = sub(mid, mul(d, gap / 2));
    const plate2 = add(mid, mul(d, gap / 2));
    const plate1a = add(plate1, mul(n, plateHalf));
    const plate1b = sub(plate1, mul(n, plateHalf));
    const plate2a = add(plate2, mul(n, plateHalf));
    const plate2b = sub(plate2, mul(n, plateHalf));

    return {
      primitives: [
        { type: "line", role: "body", x1: p1.x, y1: p1.y, x2: plate1.x, y2: plate1.y },
        { type: "line", role: "body", x1: plate2.x, y1: plate2.y, x2: p2.x, y2: p2.y },
        { type: "line", role: "body", x1: plate1a.x, y1: plate1a.y, x2: plate1b.x, y2: plate1b.y },
        { type: "line", role: "body", x1: plate2a.x, y1: plate2a.y, x2: plate2b.x, y2: plate2b.y },
      ],
      texts: inline2PinLabels(pins, mid),
      refAnchor: { x: mid.x, y: mid.y - 10 },
    };
  }

  // diode
  const triHalf = Math.min(6, bodyHalf * 0.9);
  const baseTop = add(bodyStart, mul(n, triHalf));
  const baseBottom = sub(bodyStart, mul(n, triHalf));
  const tip = bodyEnd;
  const barA = add(bodyEnd, mul(n, triHalf));
  const barB = sub(bodyEnd, mul(n, triHalf));

  return {
    primitives: [
      { type: "line", role: "body", x1: p1.x, y1: p1.y, x2: bodyStart.x, y2: bodyStart.y },
      { type: "line", role: "body", x1: bodyEnd.x, y1: bodyEnd.y, x2: p2.x, y2: p2.y },
      { type: "polygon", role: "body", points: pointsAttr([baseTop, baseBottom, tip]) },
      { type: "line", role: "body", x1: barA.x, y1: barA.y, x2: barB.x, y2: barB.y },
    ],
    texts: inline2PinLabels(pins, mid),
    refAnchor: { x: mid.x, y: mid.y - 10 },
  };
}

function switch3PinLabels(
  pin1: PinGeometry,
  pin2: PinGeometry,
  pin3: PinGeometry,
  normal: Point,
): readonly SymbolText[] {
  const defaults = ["1", "2", "3"];
  const labels = [pin1.pinLabel, pin2.pinLabel, pin3.pinLabel];
  const hasCustom = labels.some((label, index) => label && label !== defaults[index]);
  if (!hasCustom) return [];

  const dir1 = normalize(sub(pin1.center, pin2.center));
  const dir3 = normalize(sub(pin3.center, pin2.center));
  const dir2 = len(normal) < 1e-6 ? { x: 0, y: -1 } : normalize(normal);

  const pos1 = add(pin1.center, mul(dir1, 7));
  const pos2 = add(pin2.center, mul(dir2, 8));
  const pos3 = add(pin3.center, mul(dir3, 7));

  return [
    {
      type: "text",
      role: "pinLabel",
      x: pos1.x,
      y: pos1.y + 3,
      text: pin1.pinLabel,
      textAnchor: anchorFromDirection(dir1),
    },
    {
      type: "text",
      role: "pinLabel",
      x: pos2.x,
      y: pos2.y + 3,
      text: pin2.pinLabel,
      textAnchor: anchorFromDirection(dir2),
    },
    {
      type: "text",
      role: "pinLabel",
      x: pos3.x,
      y: pos3.y + 3,
      text: pin3.pinLabel,
      textAnchor: anchorFromDirection(dir3),
    },
  ];
}

function symbolForSwitch2Pin(
  p1: Point,
  p2: Point,
  labelPins: readonly PinGeometry[],
): PartSymbol {
  const v = sub(p2, p1);
  const l = len(v);
  if (l < 1e-6) {
    return {
      primitives: [{ type: "line", role: "body", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }],
      texts: [],
      refAnchor: { x: p1.x, y: p1.y - 10 },
    };
  }

  const d = normalize(v);
  const n = perp(d);
  const mid = midpoint(p1, p2);

  const gap = Math.max(2, Math.min(5, l / 4));
  const contactA = sub(mid, mul(d, gap));
  const contactB = add(mid, mul(d, gap));
  const leverEnd = add(contactB, mul(n, -4));
  const contactHeight = 3;
  const contactBarA = add(contactB, mul(n, contactHeight));
  const contactBarB = sub(contactB, mul(n, contactHeight));

  return {
    primitives: [
      { type: "line", role: "body", x1: p1.x, y1: p1.y, x2: contactA.x, y2: contactA.y },
      { type: "line", role: "body", x1: contactB.x, y1: contactB.y, x2: p2.x, y2: p2.y },
      { type: "line", role: "body", x1: contactA.x, y1: contactA.y, x2: leverEnd.x, y2: leverEnd.y },
      { type: "line", role: "body", x1: contactBarA.x, y1: contactBarA.y, x2: contactBarB.x, y2: contactBarB.y },
      { type: "circle", role: "body", cx: contactA.x, cy: contactA.y, r: 1.8 },
    ],
    texts: inline2PinLabels(labelPins, mid),
    refAnchor: { x: mid.x, y: mid.y - 10 },
  };
}

function symbolForSwitch3Pin(pin1: PinGeometry, pin2: PinGeometry, pin3: PinGeometry): PartSymbol {
  const outA = pin1.center;
  const common = pin2.center;
  const outB = pin3.center;

  const toA = sub(outA, common);
  const toB = sub(outB, common);
  const lenA = len(toA);
  const lenB = len(toB);
  if (lenA < 1e-6 || lenB < 1e-6) return fallbackLine([pin1, pin2, pin3]);

  const dB = normalize(toB);
  let n = perp(dB);
  // Keep the lever on the same side as pin 1, matching the classic SPDT look.
  if (n.x * toA.x + n.y * toA.y < 0) {
    n = mul(n, -1);
  }

  const fixedGap = Math.max(1.5, Math.min(3.2, lenB * 0.28));
  const fixedContact = sub(outB, mul(dB, fixedGap));
  const leverLift = Math.max(2.8, Math.min(4.2, lenB * 0.45));
  const leverEnd = add(fixedContact, mul(n, leverLift));
  const contactBarHalf = 2.6;
  const contactBarA = add(outB, mul(n, contactBarHalf));
  const contactBarB = sub(outB, mul(n, contactBarHalf));
  const freeStubLen = Math.max(2.2, Math.min(4.2, lenA * 0.45));
  const freeStubEnd = sub(outA, mul(dB, freeStubLen));

  return {
    primitives: [
      { type: "line", role: "body", x1: outA.x, y1: outA.y, x2: freeStubEnd.x, y2: freeStubEnd.y },
      { type: "line", role: "body", x1: outB.x, y1: outB.y, x2: fixedContact.x, y2: fixedContact.y },
      { type: "line", role: "body", x1: common.x, y1: common.y, x2: leverEnd.x, y2: leverEnd.y },
      { type: "line", role: "body", x1: contactBarA.x, y1: contactBarA.y, x2: contactBarB.x, y2: contactBarB.y },
      { type: "circle", role: "body", cx: common.x, cy: common.y, r: 1.6 },
      { type: "circle", role: "body", cx: outA.x, cy: outA.y, r: 1.2 },
      { type: "circle", role: "body", cx: outB.x, cy: outB.y, r: 1.2 },
    ],
    texts: switch3PinLabels(pin1, pin2, pin3, n),
    refAnchor: add(midpoint(outA, outB), mul(n, 10)),
  };
}

function symbolForSwitch(pins: readonly PinGeometry[]): PartSymbol {
  const pin1 = pickPin(pins, "1") ?? pins[0];
  const pin2 = pickPin(pins, "2") ?? pins[1];
  const pin3 = pickPin(pins, "3") ?? pins[2];
  if (!pin1 || !pin2) return { primitives: [], texts: [] };

  if (pin3) return symbolForSwitch3Pin(pin1, pin2, pin3);
  return symbolForSwitch2Pin(pin1.center, pin2.center, [pin1, pin2]);
}

function symbolForPotentiometer(pins: readonly PinGeometry[]): PartSymbol {
  const p1 = pickPin(pins, "1") ?? pins[0];
  const p2 = pickPin(pins, "2") ?? pins[1];
  const p3 = pickPin(pins, "3") ?? pins[2];
  if (!p1 || !p2 || !p3) return { primitives: [], texts: [] };

  const endPins: PinGeometry[] = [
    { pinId: "1", pinLabel: p1.pinLabel, center: p1.center },
    { pinId: "2", pinLabel: p3.pinLabel, center: p3.center },
  ];
  const base = symbolForInline2(endPins, "resistor");

  const mid = midpoint(p1.center, p3.center);
  const dirToMid = normalize(sub(mid, p2.center));
  const arrowTip = add(p2.center, mul(dirToMid, 10));
  const headLeft = add(arrowTip, add(mul(perp(dirToMid), -2), mul(dirToMid, -3)));
  const headRight = add(arrowTip, add(mul(perp(dirToMid), 2), mul(dirToMid, -3)));

  return {
    primitives: [
      ...base.primitives,
      { type: "line", role: "body", x1: p2.center.x, y1: p2.center.y, x2: arrowTip.x, y2: arrowTip.y },
      { type: "polyline", role: "body", points: pointsAttr([headLeft, arrowTip, headRight]) },
    ],
    texts: [
      ...base.texts,
      {
        type: "text",
        role: "pinLabel",
        x: p2.center.x,
        y: p2.center.y + 12,
        text: p2.pinLabel,
        textAnchor: "middle",
      },
    ],
    refAnchor: base.refAnchor,
  };
}

function symbolForJack(pins: readonly PinGeometry[]): PartSymbol {
  if (pins.length < 2) return { primitives: [], texts: [] };
  const xs = pins.map((p) => p.center.x);
  const ys = pins.map((p) => p.center.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);

  const bodyWidth = Math.max(12, maxX - minX + 10);
  const bodyHeight = 10;
  const bodyX = (minX + maxX) / 2 - bodyWidth / 2;
  const bodyY = minY - 14;

  const leads: SymbolPrimitive[] = pins.map((p) => ({
    type: "line",
    role: "body",
    x1: p.center.x,
    y1: p.center.y,
    x2: p.center.x,
    y2: bodyY + bodyHeight,
  }));

  return {
    primitives: [
      { type: "rect", role: "body", x: bodyX, y: bodyY, width: bodyWidth, height: bodyHeight, rx: 3 },
      ...leads,
    ],
    texts: pins.map((pin) => ({
      type: "text",
      role: "pinLabel",
      x: pin.center.x,
      y: pin.center.y + 12,
      text: pin.pinLabel,
      textAnchor: "middle",
    })),
    refAnchor: { x: bodyX + bodyWidth / 2, y: bodyY - 6 },
  };
}

function symbolForPower(kind: "power_pos" | "power_neg" | "power_gnd", pins: readonly PinGeometry[]): PartSymbol {
  const pin = pins[0]?.center;
  if (!pin) return { primitives: [], texts: [] };
  const stemTop = { x: pin.x, y: pin.y - 8 };
  const primitives: SymbolPrimitive[] = [
    { type: "line", role: "body", x1: pin.x, y1: pin.y, x2: stemTop.x, y2: stemTop.y },
  ];

  const texts: SymbolText[] = [];
  if (kind === "power_gnd") {
    const line1 = { x1: stemTop.x - 6, y1: stemTop.y - 2, x2: stemTop.x + 6, y2: stemTop.y - 2 };
    const line2 = { x1: stemTop.x - 4, y1: stemTop.y + 1, x2: stemTop.x + 4, y2: stemTop.y + 1 };
    const line3 = { x1: stemTop.x - 2, y1: stemTop.y + 4, x2: stemTop.x + 2, y2: stemTop.y + 4 };
    primitives.push(
      { type: "line", role: "body", ...line1 },
      { type: "line", role: "body", ...line2 },
      { type: "line", role: "body", ...line3 },
    );
  } else {
    texts.push({
      type: "text",
      role: "pinLabel",
      x: stemTop.x,
      y: stemTop.y - 2,
      text: kind === "power_pos" ? "V+" : "V-",
      textAnchor: "middle",
    });
  }

  return {
    primitives,
    texts,
    refAnchor: { x: pin.x, y: stemTop.y - 10 },
  };
}

function symbolForTransistor(pins: readonly PinGeometry[]): PartSymbol {
  const p1 = pickPin(pins, "1") ?? pins[0];
  const p2 = pickPin(pins, "2") ?? pins[1];
  const p3 = pickPin(pins, "3") ?? pins[2];
  if (!p1 || !p2 || !p3) return { primitives: [], texts: [] };

  const v = sub(p3.center, p1.center);
  const d = normalize(v);
  const n = perp(d);
  const bodyCenter = add(p2.center, mul(n, 12));
  const radius = 8;

  const leadPrimitives: SymbolPrimitive[] = [];
  const pinTexts: SymbolText[] = [];
  for (const pin of [p1, p2, p3]) {
    const dir = normalize(sub(pin.center, bodyCenter));
    const edge = add(bodyCenter, mul(dir, radius));
    leadPrimitives.push({ type: "line", role: "body", x1: pin.center.x, y1: pin.center.y, x2: edge.x, y2: edge.y });

    const labelPos = add(pin.center, mul(dir, 7));
    pinTexts.push({
      type: "text",
      role: "pinLabel",
      x: labelPos.x,
      y: labelPos.y + 3,
      text: pin.pinLabel,
      textAnchor: anchorFromDirection(dir),
    });
  }

  return {
    primitives: [
      { type: "circle", role: "body", cx: bodyCenter.x, cy: bodyCenter.y, r: radius },
      ...leadPrimitives,
    ],
    texts: pinTexts,
    refAnchor: { x: bodyCenter.x, y: bodyCenter.y - radius - 6 },
  };
}

function symbolForDip(pins: readonly PinGeometry[]): PartSymbol {
  if (pins.length === 0) return { primitives: [], texts: [] };

  const xs = pins.map((p) => p.center.x);
  const ys = pins.map((p) => p.center.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const pad = 8;
  const rect = {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
    rx: 8,
  };

  const texts: SymbolText[] = pins.map((pin) => {
    const c = pin.center;
    const dLeft = Math.abs(c.x - minX);
    const dRight = Math.abs(maxX - c.x);
    const dTop = Math.abs(c.y - minY);
    const dBottom = Math.abs(maxY - c.y);
    const min = Math.min(dLeft, dRight, dTop, dBottom);

    if (min === dLeft) {
      return { type: "text", role: "pinLabel", x: c.x - 6, y: c.y + 3, text: pin.pinLabel, textAnchor: "end" };
    }
    if (min === dRight) {
      return { type: "text", role: "pinLabel", x: c.x + 6, y: c.y + 3, text: pin.pinLabel, textAnchor: "start" };
    }
    if (min === dTop) {
      return { type: "text", role: "pinLabel", x: c.x, y: c.y - 6, text: pin.pinLabel, textAnchor: "middle" };
    }
    return { type: "text", role: "pinLabel", x: c.x, y: c.y + 12, text: pin.pinLabel, textAnchor: "middle" };
  });

  const pin1 = pickPin(pins, "1");
  const pin1Marker: SymbolPrimitive[] = [];
  if (pin1) {
    const bodyCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const toward = normalize(sub(bodyCenter, pin1.center));
    const markerPos = add(pin1.center, mul(toward, 10));
    pin1Marker.push({ type: "circle", role: "pin1", cx: markerPos.x, cy: markerPos.y, r: 2.3 });
  }

  return {
    primitives: [
      { type: "rect", role: "body", ...rect },
      ...pin1Marker,
    ],
    texts,
    refAnchor: { x: rect.x + rect.width / 2, y: rect.y - 6 },
  };
}

function fallbackLine(pins: readonly PinGeometry[]): PartSymbol {
  const first = pins[0]?.center;
  const last = pins[pins.length - 1]?.center;
  if (!first || !last) return { primitives: [], texts: [] };
  const mid = midpoint(first, last);
  return {
    primitives: [{ type: "line", role: "body", x1: first.x, y1: first.y, x2: last.x, y2: last.y }],
    texts: [],
    refAnchor: { x: mid.x, y: mid.y - 10 },
  };
}

export function buildSchematicSymbol(part: Part, pins: readonly PinGeometry[]): PartSymbol {
  switch (part.kind) {
    case "resistor":
      return symbolForInline2(pins, "resistor");
    case "switch":
      return symbolForSwitch(pins);
    case "diode":
      return symbolForInline2(pins, "diode");
    case "capacitor":
    case "capacitor_ceramic":
    case "capacitor_electrolytic":
    case "capacitor_film":
      return symbolForInline2(pins, "capacitor");
    case "transistor":
      return symbolForTransistor(pins);
    case "potentiometer":
      return symbolForPotentiometer(pins);
    case "jack":
      return symbolForJack(pins);
    case "power_pos":
      return symbolForPower("power_pos", pins);
    case "power_neg":
      return symbolForPower("power_neg", pins);
    case "power_gnd":
      return symbolForPower("power_gnd", pins);
    case "dip":
      return symbolForDip(pins);
    default:
      return fallbackLine(pins);
  }
}
