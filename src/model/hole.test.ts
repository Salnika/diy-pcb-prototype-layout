import { describe, expect, it } from "vitest";
import { holeKey, isHole, isWithinBoard, parseHoleKey } from "./hole";

describe("hole", () => {
  it("validates hole shape", () => {
    expect(isHole({ x: 0, y: 1 })).toBe(true);
    expect(isHole({ x: 0.1, y: 1 })).toBe(false);
    expect(isHole(null)).toBe(false);
    expect(isHole("x,y")).toBe(false);
  });

  it("builds and parses hole keys", () => {
    expect(holeKey({ x: 4, y: 7 })).toBe("4,7");
    expect(parseHoleKey("4,7")).toEqual({ x: 4, y: 7 });
    expect(parseHoleKey("4,a")).toBeNull();
    expect(parseHoleKey("1")).toBeNull();
  });

  it("checks board bounds", () => {
    const board = {
      type: "perfboard" as const,
      width: 3,
      height: 2,
      labeling: { rows: "alpha" as const, cols: "numeric" as const },
    };
    expect(isWithinBoard(board, { x: 0, y: 0 })).toBe(true);
    expect(isWithinBoard(board, { x: 2, y: 1 })).toBe(true);
    expect(isWithinBoard(board, { x: -1, y: 0 })).toBe(false);
    expect(isWithinBoard(board, { x: 3, y: 0 })).toBe(false);
    expect(isWithinBoard(board, { x: 0, y: 2 })).toBe(false);
  });
});
