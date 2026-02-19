import { getPartPins } from "./footprints";
import { holeKey } from "./hole";
import type { Hole, Part } from "./types";

export function createRng(seed?: number): () => number {
  let s = (seed ?? Date.now()) >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

export function pinCenter(pins: readonly Hole[]): { x: number; y: number } {
  if (pins.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const pin of pins) {
    sx += pin.x;
    sy += pin.y;
  }
  return { x: sx / pins.length, y: sy / pins.length };
}

export function buildPinIndex(parts: readonly Part[]): ReadonlyMap<string, Hole> {
  const map = new Map<string, Hole>();
  for (const part of parts) {
    for (const pin of getPartPins(part)) {
      map.set(`${part.id}:${pin.pinId}`, pin.hole);
    }
  }
  return map;
}

export function uniqueHoles(holes: readonly Hole[]): readonly Hole[] {
  const map = new Map<string, Hole>();
  for (const hole of holes) {
    map.set(holeKey(hole), hole);
  }
  return [...map.values()];
}

export function holeFromKey(key: string): Hole | null {
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

export function compressPath(path: readonly Hole[]): readonly Hole[] {
  if (path.length <= 2) return path;
  const result: Hole[] = [path[0]];
  let prev = path[0];

  for (let i = 1; i < path.length - 1; i += 1) {
    const curr = path[i];
    const next = path[i + 1];
    const currDir = { dx: curr.x - prev.x, dy: curr.y - prev.y };
    const nextDir = { dx: next.x - curr.x, dy: next.y - curr.y };
    if (currDir.dx !== nextDir.dx || currDir.dy !== nextDir.dy) {
      result.push(curr);
    }
    prev = curr;
  }

  result.push(path[path.length - 1]);
  return result;
}

export function traceLength(nodes: readonly Hole[]): number {
  if (nodes.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < nodes.length; i += 1) {
    length += Math.abs(nodes[i].x - nodes[i - 1].x) + Math.abs(nodes[i].y - nodes[i - 1].y);
  }
  return length;
}

export function chooseSeedTerminal(terminals: readonly Hole[]): string {
  if (terminals.length === 0) return "";
  let best = terminals[0];
  let bestScore = Infinity;
  for (const candidate of terminals) {
    let score = 0;
    for (const other of terminals) {
      score += Math.abs(candidate.x - other.x) + Math.abs(candidate.y - other.y);
    }
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return holeKey(best);
}
