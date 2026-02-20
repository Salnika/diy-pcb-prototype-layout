import { describe, expect, it } from "vitest";
import { isPlacementValid, placementsForPart } from "./autoLayout.placement";
import { holeKey } from "./hole";
import { makeInline2Part, makeProject } from "../test/fixtures";

describe("autoLayout.placement", () => {
  it("generates candidates with optional rotations", () => {
    const part = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 0, y: 0 }, span: 1 });
    const board = makeProject({ width: 3, height: 3 }).board;

    const withRot = placementsForPart(part, board, new Set(), true);
    const fixedRot = placementsForPart(part, board, new Set(), false);

    expect(withRot.length).toBeGreaterThan(fixedRot.length);
    expect(fixedRot.every((c) => c.placement.rotation === part.placement.rotation)).toBe(true);
  });

  it("filters placements on board bounds and fixed holes", () => {
    const part = makeInline2Part({ id: "p1", ref: "R1", span: 2 });
    const board = makeProject({ width: 3, height: 3 }).board;
    const fixedHoleSet = new Set([holeKey({ x: 1, y: 1 })]);

    const candidates = placementsForPart(part, board, fixedHoleSet, false);
    expect(candidates.every((c) => c.pins.every((p) => !(p.x === 1 && p.y === 1)))).toBe(true);
  });

  it("checks placement validity", () => {
    const part = makeInline2Part({ id: "p1", ref: "R1", span: 2 });
    const board = makeProject({ width: 4, height: 4 }).board;
    const fixed = new Set([holeKey({ x: 1, y: 1 })]);

    expect(
      isPlacementValid(board, fixed, part, {
        ...part.placement,
        origin: { x: 1, y: 1 },
      }),
    ).toBe(false);
    expect(
      isPlacementValid(board, new Set(), part, {
        ...part.placement,
        origin: { x: 3, y: 3 },
      }),
    ).toBe(false);
    expect(
      isPlacementValid(board, new Set(), part, {
        ...part.placement,
        origin: { x: 1, y: 1 },
      }),
    ).toBe(true);
  });
});
