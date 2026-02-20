import { describe, expect, it } from "vitest";
import { applyInline2Placement, createInline2Part, isInline2Kind, sameTerminal } from "./boardPlacement";
import { makeInline2Part } from "../../test/fixtures";

describe("boardPlacement", () => {
  it("detects inline2 kinds", () => {
    expect(isInline2Kind("resistor")).toBe(true);
    expect(isInline2Kind("switch")).toBe(true);
    expect(isInline2Kind("capacitor_film")).toBe(true);
    expect(isInline2Kind("transistor")).toBe(false);
  });

  it("compares terminals", () => {
    expect(sameTerminal({ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p1", pinId: "1" })).toBe(true);
    expect(sameTerminal({ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p1", pinId: "2" })).toBe(false);
    expect(sameTerminal({ kind: "hole", hole: { x: 1, y: 1 } }, { kind: "hole", hole: { x: 1, y: 1 } })).toBe(true);
    expect(sameTerminal({ kind: "hole", hole: { x: 1, y: 1 } }, { kind: "pin", partId: "p1", pinId: "1" })).toBe(false);
    expect(sameTerminal({ kind: "weird" } as any, { kind: "weird" } as any)).toBe(false);
  });

  it("applies inline placement for straight and diagonal pin pairs", () => {
    const base = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2, pinLabels: ["A", "B"] });
    const horiz = applyInline2Placement(base, { x: 1, y: 1 }, { x: 4, y: 1 });
    const left = applyInline2Placement(base, { x: 4, y: 1 }, { x: 1, y: 1 });
    const down = applyInline2Placement(base, { x: 2, y: 2 }, { x: 2, y: 5 });
    const up = applyInline2Placement(base, { x: 2, y: 5 }, { x: 2, y: 2 });
    const diag = applyInline2Placement(base, { x: 1, y: 1 }, { x: 3, y: 3 });

    expect(horiz?.placement.rotation).toBe(0);
    expect(left?.placement.rotation).toBe(180);
    expect(down?.placement.rotation).toBe(90);
    expect(up?.placement.rotation).toBe(270);
    expect(diag?.footprint).toEqual({ type: "free2", dx: 2, dy: 2, pinLabels: ["A", "B"] });
  });

  it("returns null for unsupported or degenerate placement", () => {
    const to92 = {
      ...makeInline2Part({ id: "p2", ref: "Q1", kind: "transistor" }),
      footprint: { type: "to92_inline3" as const },
    };
    expect(applyInline2Placement(to92, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
    expect(applyInline2Placement(makeInline2Part({ id: "p1", ref: "R1" }), { x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });

  it("creates inline2 parts from pin pairs", () => {
    const part = createInline2Part("resistor", { x: 1, y: 1 }, { x: 3, y: 1 });
    expect(part?.ref).toBe("R?");
    expect(part?.footprint).toEqual({ type: "inline2", span: 2, pinLabels: undefined });
    expect(createInline2Part("resistor", { x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
    expect(createInline2Part("transistor", { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
  });
});
