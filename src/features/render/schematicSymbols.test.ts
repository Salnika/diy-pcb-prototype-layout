import { describe, expect, it } from "vitest";
import { buildSchematicSymbol, type PinGeometry } from "./schematicSymbols";
import { makeInline2Part, makeTo92Part } from "../../test/fixtures";

function pins(...entries: Array<[string, string, number, number]>): PinGeometry[] {
  return entries.map(([pinId, pinLabel, x, y]) => ({
    pinId,
    pinLabel,
    center: { x, y },
  }));
}

describe("buildSchematicSymbol", () => {
  it("builds inline 2 symbols (resistor, legacy switch, diode, capacitor) with custom pin labels", () => {
    const resistor = buildSchematicSymbol(
      makeInline2Part({ id: "p1", ref: "R1", kind: "resistor" }),
      pins(["1", "A", 0, 0], ["2", "B", 20, 0]),
    );
    const sw = buildSchematicSymbol(
      makeInline2Part({ id: "p0", ref: "SW1", kind: "switch" }),
      pins(["1", "A", 0, 0], ["2", "B", 20, 0]),
    );
    const diode = buildSchematicSymbol(
      makeInline2Part({ id: "p2", ref: "D1", kind: "diode" }),
      pins(["1", "A", 0, 0], ["2", "B", 20, 0]),
    );
    const capacitor = buildSchematicSymbol(
      makeInline2Part({ id: "p3", ref: "C1", kind: "capacitor" }),
      pins(["1", "A", 0, 0], ["2", "B", 20, 0]),
    );

    expect(resistor.primitives.some((p) => p.type === "polyline")).toBe(true);
    expect(sw.primitives.some((p) => p.type === "circle")).toBe(true);
    expect(sw.primitives.filter((p) => p.type === "line").length).toBeGreaterThanOrEqual(4);
    expect(diode.primitives.some((p) => p.type === "polygon")).toBe(true);
    expect(capacitor.primitives.filter((p) => p.type === "line").length).toBeGreaterThanOrEqual(4);
    expect(resistor.texts.map((t) => t.text)).toEqual(expect.arrayContaining(["A", "B"]));
    expect(resistor.refAnchor).toBeDefined();
  });

  it("builds 3-pin switch symbol with middle input and two outputs", () => {
    const sw3 = buildSchematicSymbol(
      {
        ...makeInline2Part({ id: "sw3", ref: "SW3", kind: "switch" }),
        footprint: { type: "to92_inline3", pinNames: ["OUT1", "IN", "OUT2"] as const },
      },
      pins(["1", "OUT1", 0, 0], ["2", "IN", 20, 10], ["3", "OUT2", 0, 20]),
    );

    const lines = sw3.primitives.filter(
      (p): p is Extract<(typeof sw3.primitives)[number], { type: "line" }> => p.type === "line",
    );
    const circles = sw3.primitives.filter(
      (p): p is Extract<(typeof sw3.primitives)[number], { type: "circle" }> => p.type === "circle",
    );
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(circles.length).toBeGreaterThanOrEqual(3);
    expect(circles.some((circle) => circle.cx === 0 && circle.cy === 0)).toBe(true);
    expect(circles.some((circle) => circle.cx === 0 && circle.cy === 20)).toBe(true);
    expect(
      lines.some(
        (line) => (line.x1 === 20 && line.y1 === 10) || (line.x2 === 20 && line.y2 === 10),
      ),
    ).toBe(true);
    expect(lines.some((line) => line.x1 !== line.x2 && line.y1 !== line.y2)).toBe(true);
    expect(sw3.texts.map((t) => t.text)).toEqual(expect.arrayContaining(["OUT1", "IN", "OUT2"]));
  });

  it("falls back to line for near-zero length inline2", () => {
    const part = makeInline2Part({ id: "p1", ref: "R1", kind: "resistor" });
    const symbol = buildSchematicSymbol(part, pins(["1", "1", 10, 10], ["2", "2", 10, 10]));
    expect(symbol.primitives).toHaveLength(1);
    expect(symbol.primitives[0]?.type).toBe("line");
  });

  it("builds potentiometer symbol with wiper text", () => {
    const part = makeTo92Part({ id: "rv1", ref: "RV1", kind: "potentiometer" });
    const symbol = buildSchematicSymbol(
      part,
      pins(["1", "1", 0, 0], ["2", "2", 10, -10], ["3", "3", 20, 0]),
    );
    expect(symbol.primitives.some((p) => p.type === "polyline")).toBe(true);
    expect(symbol.texts.some((t) => t.text === "2")).toBe(true);
  });

  it("builds jack symbol and handles missing pins", () => {
    const part = makeTo92Part({ id: "j1", ref: "J1", kind: "jack" });
    const symbol = buildSchematicSymbol(
      part,
      pins(["1", "T", 0, 0], ["2", "R", 10, 0], ["3", "S", 20, 0]),
    );
    expect(symbol.primitives.some((p) => p.type === "rect")).toBe(true);
    expect(symbol.texts).toHaveLength(3);

    const empty = buildSchematicSymbol(part, pins(["1", "T", 0, 0]));
    expect(empty.primitives).toEqual([]);
    expect(empty.texts).toEqual([]);
  });

  it("builds power symbols (+/-/gnd)", () => {
    const pwrPos = buildSchematicSymbol(
      {
        ...makeInline2Part({ id: "pp", ref: "PWR+", kind: "power_pos" }),
        footprint: { type: "single", pinLabel: "V+" },
      },
      pins(["1", "V+", 10, 20]),
    );
    const pwrNeg = buildSchematicSymbol(
      {
        ...makeInline2Part({ id: "pn", ref: "PWR-", kind: "power_neg" }),
        footprint: { type: "single", pinLabel: "V-" },
      },
      pins(["1", "V-", 10, 20]),
    );
    const gnd = buildSchematicSymbol(
      {
        ...makeInline2Part({ id: "g", ref: "GND", kind: "power_gnd" }),
        footprint: { type: "single", pinLabel: "GND" },
      },
      pins(["1", "GND", 10, 20]),
    );

    expect(pwrPos.texts.some((t) => t.text === "V+")).toBe(true);
    expect(pwrNeg.texts.some((t) => t.text === "V-")).toBe(true);
    expect(gnd.texts).toHaveLength(0);
    expect(gnd.primitives.filter((p) => p.type === "line").length).toBeGreaterThanOrEqual(4);
  });

  it("builds transistor and dip symbols and supports fallback kind", () => {
    const transistor = buildSchematicSymbol(
      makeTo92Part({ id: "q1", ref: "Q1", kind: "transistor" }),
      pins(["1", "E", 0, 0], ["2", "B", 10, 0], ["3", "C", 20, 0]),
    );
    expect(transistor.primitives.some((p) => p.type === "circle")).toBe(true);
    expect(transistor.texts).toHaveLength(3);

    const dipPart = {
      ...makeInline2Part({ id: "u1", ref: "U1", kind: "dip" }),
      footprint: { type: "dip" as const, pins: 8, rowSpan: 3 as const },
    };
    const dip = buildSchematicSymbol(
      dipPart,
      pins(
        ["1", "1", 0, 0],
        ["2", "2", 0, 10],
        ["3", "3", 0, 20],
        ["4", "4", 0, 30],
        ["5", "5", 30, 30],
        ["6", "6", 30, 20],
        ["7", "7", 30, 10],
        ["8", "8", 30, 0],
      ),
    );
    expect(dip.primitives.some((p) => p.type === "rect")).toBe(true);
    expect(dip.primitives.some((p) => p.role === "pin1")).toBe(true);
    expect(dip.texts).toHaveLength(8);
    expect(dip.refAnchor).toEqual({ x: 15, y: 15 });

    const fallback = buildSchematicSymbol(
      { ...makeInline2Part({ id: "x", ref: "X1" }), kind: "unknown_kind" as any },
      pins(["1", "1", 0, 0], ["2", "2", 10, 10]),
    );
    expect(fallback.primitives).toHaveLength(1);
    expect(fallback.primitives[0]?.type).toBe("line");
  });

  it("returns empty symbols when pin requirements are not met", () => {
    const transistor = buildSchematicSymbol(
      makeTo92Part({ id: "q1", ref: "Q1", kind: "transistor" }),
      pins(["1", "E", 0, 0]),
    );
    const dip = buildSchematicSymbol(
      {
        ...makeInline2Part({ id: "u1", ref: "U1", kind: "dip" }),
        footprint: { type: "dip", pins: 8, rowSpan: 3 },
      },
      [],
    );
    expect(transistor.primitives).toEqual([]);
    expect(dip.primitives).toEqual([]);
  });
});
