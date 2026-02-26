import { describe, expect, it } from "vitest";
import {
  buildPinIndex,
  chooseSeedTerminal,
  compressPath,
  createRng,
  holeFromKey,
  pinCenter,
  traceLength,
  uniqueHoles,
} from "./autoLayout.common";
import { makeInline2Part } from "../test/fixtures";

describe("autoLayout.common", () => {
  it("creates deterministic RNG for same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(a()).toBeCloseTo(b(), 10);
    expect(a()).toBeCloseTo(b(), 10);
  });

  it("creates RNG without explicit seed", () => {
    const rng = createRng();
    const value = rng();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it("computes pin center", () => {
    expect(pinCenter([])).toEqual({ x: 0, y: 0 });
    expect(
      pinCenter([
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ]),
    ).toEqual({ x: 1, y: 1 });
  });

  it("builds pin index", () => {
    const part = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2 });
    const map = buildPinIndex([part]);
    expect(map.get("p1:1")).toEqual({ x: 1, y: 1 });
    expect(map.get("p1:2")).toEqual({ x: 3, y: 1 });
  });

  it("keeps unique holes and parses keys", () => {
    expect(
      uniqueHoles([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]),
    ).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(holeFromKey("4,5")).toEqual({ x: 4, y: 5 });
    expect(holeFromKey("a,5")).toBeNull();
  });

  it("compresses paths and computes length", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];
    expect(compressPath(path)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ]);
    expect(
      compressPath([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(traceLength(path)).toBe(4);
    expect(traceLength([{ x: 0, y: 0 }])).toBe(0);
  });

  it("chooses a central seed terminal", () => {
    expect(chooseSeedTerminal([])).toBe("");
    const key = chooseSeedTerminal([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(key).toBe("1,0");
  });
});
