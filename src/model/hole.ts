import type { Board, Hole } from "./types";

export function isHole(value: unknown): value is Hole {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { x?: unknown; y?: unknown };
  return Number.isInteger(v.x) && Number.isInteger(v.y);
}

export function holeKey(hole: Hole): string {
  return `${hole.x},${hole.y}`;
}

export function parseHoleKey(key: string): Hole | null {
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

export function isWithinBoard(board: Board, hole: Hole): boolean {
  return hole.x >= 0 && hole.y >= 0 && hole.x < board.width && hole.y < board.height;
}
