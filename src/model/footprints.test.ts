import { describe, expect, it } from "vitest";
import { getPartPins } from "./footprints";
import { makeInline2Part, makeTo92Part } from "../test/fixtures";

describe("getPartPins", () => {
  it("handles inline2 footprint with rotation", () => {
    const part = makeInline2Part({
      id: "p1",
      ref: "R1",
      origin: { x: 1, y: 2 },
      rotation: 90,
      span: 3,
      pinLabels: ["A", "B"],
    });
    const pins = getPartPins(part);
    expect(pins).toHaveLength(2);
    expect(pins[0].pinLabel).toBe("A");
    expect(pins[1].pinLabel).toBe("B");
    expect(pins[0].hole).toEqual({ x: 1, y: 2 });
    expect(pins[1].hole).toEqual({ x: 1, y: 5 });
  });

  it("handles to92 defaults by part kind", () => {
    const transistor = makeTo92Part({ id: "q", ref: "Q1", kind: "transistor" });
    const potentiometer = makeTo92Part({ id: "rv", ref: "RV1", kind: "potentiometer" });
    const jack = makeTo92Part({ id: "j", ref: "J1", kind: "jack" });
    const misc = { ...transistor, kind: "power_pos" as const };

    expect(getPartPins(transistor).map((p) => p.pinLabel)).toEqual(["E", "B", "C"]);
    expect(getPartPins(potentiometer).map((p) => p.pinLabel)).toEqual(["1", "2", "3"]);
    expect(getPartPins(jack).map((p) => p.pinLabel)).toEqual(["T", "R", "S"]);
    expect(getPartPins(misc).map((p) => p.pinLabel)).toEqual(["1", "2", "3"]);
  });

  it("handles free2, single and dip footprints", () => {
    const free2 = {
      ...makeInline2Part({ id: "c1", ref: "C1" }),
      footprint: { type: "free2" as const, dx: 3, dy: -2, pinLabels: ["+", "-"] as const },
    };
    const single = {
      ...makeInline2Part({ id: "pwr", ref: "PWR1", kind: "power_pos" }),
      footprint: { type: "single" as const, pinLabel: "V+" },
    };
    const dip = {
      ...makeInline2Part({ id: "u1", ref: "U1", kind: "dip" }),
      footprint: { type: "dip" as const, pins: 8, rowSpan: 3 as const },
    };

    expect(getPartPins(free2).map((p) => p.pinLabel)).toEqual(["+", "-"]);
    expect(getPartPins(single)[0].pinLabel).toBe("V+");
    const dipPins = getPartPins(dip);
    expect(dipPins).toHaveLength(8);
    expect(dipPins[0].pinId).toBe("1");
    expect(dipPins[7].pinId).toBe("5");
  });

  it("supports all rotations and nullish labels fallbacks", () => {
    const part0 = makeInline2Part({ id: "p0", ref: "R0", origin: { x: 3, y: 3 }, rotation: 0, span: 1 });
    const part180 = makeInline2Part({ id: "p180", ref: "R180", origin: { x: 3, y: 3 }, rotation: 180, span: 1 });
    const part270 = makeInline2Part({ id: "p270", ref: "R270", origin: { x: 3, y: 3 }, rotation: 270, span: 1 });

    expect(getPartPins(part0)[1].hole).toEqual({ x: 4, y: 3 });
    expect(getPartPins(part180)[1].hole).toEqual({ x: 2, y: 3 });
    expect(getPartPins(part270)[1].hole).toEqual({ x: 3, y: 2 });

    const oddTo92 = {
      ...makeTo92Part({ id: "rv", ref: "RV1", kind: "potentiometer", pinNames: ["", "", ""] }),
      footprint: { type: "to92_inline3" as const, pinNames: [undefined, undefined, undefined] as any },
    };
    const oddFree2 = {
      ...makeInline2Part({ id: "f1", ref: "F1" }),
      footprint: { type: "free2" as const, dx: 1, dy: 0, pinLabels: [undefined, undefined] as any },
    };
    const oddSingle = {
      ...makeInline2Part({ id: "s1", ref: "S1", kind: "power_pos" }),
      footprint: { type: "single" as const, pinLabel: undefined },
    };

    expect(getPartPins(oddTo92).map((p) => p.pinLabel)).toEqual(["1", "2", "3"]);
    expect(getPartPins(oddFree2).map((p) => p.pinLabel)).toEqual(["1", "2"]);
    expect(getPartPins(oddSingle)[0].pinLabel).toBe("1");
  });
});
