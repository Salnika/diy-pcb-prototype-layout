import { getPartPins } from "./footprints";
import { holeKey, isWithinBoard } from "./hole";
import { createId } from "./ids";
import type { Hole, Part, Placement, Project, Trace } from "./types";

export type AutoLayoutOptions = Readonly<{
  seed?: number;
  iterations?: number;
  allowRotate?: boolean;
  restarts?: number;
}>;

export type AutoLayoutResult = Readonly<{
  project: Project;
  warnings: readonly string[];
}>;

export type TraceBuildResult = Readonly<{
  traces: readonly Trace[];
  warnings: readonly string[];
}>;

type Candidate = Readonly<{
  placement: Placement;
  pins: readonly Hole[];
  center: Readonly<{ x: number; y: number }>;
}>;

type NetTerminalPos = Readonly<{
  x: number;
  y: number;
}>;

const DEFAULT_ITERATIONS = 1800;
const DEFAULT_RESTARTS = 3;
const PIN_CLEARANCE = 3;
const PART_MARGIN = 1;
const ROTATIONS: readonly Placement["rotation"][] = [0, 90, 180, 270];

type PartBounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

function createRng(seed?: number): () => number {
  let s = (seed ?? Date.now()) >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function placementsForPart(
  part: Part,
  board: Project["board"],
  fixedHoleSet: ReadonlySet<string>,
  allowRotate: boolean,
): readonly Candidate[] {
  const rotations = allowRotate ? ROTATIONS : [part.placement.rotation];
  const candidates: Candidate[] = [];
  const flip = part.placement.flip;

  for (const rotation of rotations) {
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const placement: Placement = { origin: { x, y }, rotation, flip };
        const nextPart: Part = { ...part, placement };
        const pins = getPartPins(nextPart).map((p) => p.hole);
        let ok = true;
        for (const hole of pins) {
          if (!isWithinBoard(board, hole)) {
            ok = false;
            break;
          }
          if (fixedHoleSet.has(holeKey(hole))) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const center = pinCenter(pins);
        candidates.push({ placement, pins, center });
      }
    }
  }
  return candidates;
}

function pinCenter(pins: readonly Hole[]): { x: number; y: number } {
  if (pins.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of pins) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pins.length, y: sy / pins.length };
}

function computeNetCost(
  project: Project,
  pinPositions: ReadonlyMap<string, Hole>,
  warnings: string[],
): { cost: number; span: number; misalign: number } {
  let cost = 0;
  let span = 0;
  let misalign = 0;
  const missingPins = new Set<string>();

  for (const net of project.netlist) {
    const terminals: NetTerminalPos[] = [];
    for (const terminal of net.terminals) {
      if (terminal.kind === "hole") {
        terminals.push({ x: terminal.hole.x, y: terminal.hole.y });
        continue;
      }
      const key = `${terminal.partId}:${terminal.pinId}`;
      const hole = pinPositions.get(key);
      if (!hole) {
        missingPins.add(key);
        continue;
      }
      terminals.push({ x: hole.x, y: hole.y });
    }
    if (terminals.length < 2) continue;

    const xs = terminals.map((t) => t.x).sort((a, b) => a - b);
    const ys = terminals.map((t) => t.y).sort((a, b) => a - b);
    const mid = Math.floor(terminals.length / 2);
    const mx = xs[mid];
    const my = ys[mid];
    for (const t of terminals) {
      cost += Math.abs(t.x - mx) + Math.abs(t.y - my);
    }
    span += (xs[xs.length - 1] - xs[0]) + (ys[ys.length - 1] - ys[0]);

    if (terminals.length === 2) {
      const dx = Math.abs(terminals[0].x - terminals[1].x);
      const dy = Math.abs(terminals[0].y - terminals[1].y);
      if (dx !== 0 && dy !== 0) {
        misalign += Math.min(dx, dy);
      }
    }
  }

  if (missingPins.size > 0) {
    warnings.push(`Netlist: ${missingPins.size} terminaux pin manquants ont été ignorés.`);
  }

  return { cost, span, misalign };
}

function buildPinIndex(parts: readonly Part[]): ReadonlyMap<string, Hole> {
  const map = new Map<string, Hole>();
  for (const part of parts) {
    for (const pin of getPartPins(part)) {
      map.set(`${part.id}:${pin.pinId}`, pin.hole);
    }
  }
  return map;
}

function uniqueHoles(holes: readonly Hole[]): readonly Hole[] {
  const map = new Map<string, Hole>();
  for (const hole of holes) {
    map.set(holeKey(hole), hole);
  }
  return [...map.values()];
}

function holeFromKey(key: string): Hole | null {
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

function compressPath(path: readonly Hole[]): readonly Hole[] {
  if (path.length <= 2) return path;
  const result: Hole[] = [path[0]];
  let prev = path[0];
  let dir: { dx: number; dy: number } | null = null;

  for (let i = 1; i < path.length - 1; i += 1) {
    const curr = path[i];
    const next = path[i + 1];
    const currDir = { dx: curr.x - prev.x, dy: curr.y - prev.y };
    const nextDir = { dx: next.x - curr.x, dy: next.y - curr.y };
    if (!dir) dir = currDir;
    if (currDir.dx !== nextDir.dx || currDir.dy !== nextDir.dy) {
      result.push(curr);
      dir = nextDir;
    }
    prev = curr;
  }

  result.push(path[path.length - 1]);
  return result;
}

function findPath(
  board: Project["board"],
  starts: ReadonlySet<string>,
  targets: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
): readonly Hole[] | null {
  const queue: string[] = [];
  const prev = new Map<string, string | null>();

  for (const key of starts) {
    queue.push(key);
    prev.set(key, null);
  }

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (targets.has(key) && !starts.has(key)) {
      const path: Hole[] = [];
      let cur: string | null = key;
      while (cur) {
        const hole = holeFromKey(cur);
        if (hole) path.push(hole);
        cur = prev.get(cur) ?? null;
      }
      path.reverse();
      return path;
    }

    const hole = holeFromKey(key);
    if (!hole) continue;
    const neighbors = [
      { x: hole.x + 1, y: hole.y },
      { x: hole.x - 1, y: hole.y },
      { x: hole.x, y: hole.y + 1 },
      { x: hole.x, y: hole.y - 1 },
    ];
    for (const n of neighbors) {
      if (n.x < 0 || n.y < 0 || n.x >= board.width || n.y >= board.height) continue;
      const nKey = holeKey(n);
      if (blocked.has(nKey)) continue;
      if (prev.has(nKey)) continue;
      prev.set(nKey, key);
      queue.push(nKey);
    }
  }

  return null;
}

export function tracesFromNetlist(project: Project): TraceBuildResult {
  const warnings: string[] = [];
  const pinIndex = buildPinIndex(project.parts);
  const pinHoleSet = new Set<string>();
  for (const hole of pinIndex.values()) pinHoleSet.add(holeKey(hole));
  const fixedHoleSet = new Set(project.layoutConstraints.fixedHoles.map((h) => holeKey(h)));
  const traces: Trace[] = [];
  const globalTraceHoles = new Set<string>();

  const nets = [...project.netlist].sort((a, b) => b.terminals.length - a.terminals.length);

  for (const net of nets) {
    const holes: Hole[] = [];
    let missing = 0;

    for (const terminal of net.terminals) {
      if (terminal.kind === "hole") {
        holes.push(terminal.hole);
        continue;
      }
      const key = `${terminal.partId}:${terminal.pinId}`;
      const hole = pinIndex.get(key);
      if (!hole) {
        missing += 1;
        continue;
      }
      holes.push(hole);
    }

    const terminals = uniqueHoles(holes);
    if (terminals.length < 2) continue;
    if (missing > 0) warnings.push(`Net ${net.name ?? net.id}: ${missing} terminaux pin manquants.`);

    const netHoleSet = new Set(terminals.map((h) => holeKey(h)));
    const blocked = new Set<string>();
    for (const key of pinHoleSet) {
      if (!netHoleSet.has(key)) blocked.add(key);
    }
    for (const key of fixedHoleSet) {
      if (!netHoleSet.has(key)) blocked.add(key);
    }
    for (const key of globalTraceHoles) {
      if (!netHoleSet.has(key)) blocked.add(key);
    }

    const netOccupied = new Set<string>(netHoleSet);
    const remaining = new Set<string>(netHoleSet);
    const first = terminals[0];
    remaining.delete(holeKey(first));
    const tree = new Set<string>([holeKey(first)]);

    while (remaining.size > 0) {
      const path = findPath(project.board, tree, remaining, blocked);
      if (!path) {
        warnings.push(`Net ${net.name ?? net.id}: routage impossible avec obstacles.`);
        break;
      }
      const pathKeys = path.map((h) => holeKey(h));
      for (const key of pathKeys) {
        tree.add(key);
        netOccupied.add(key);
        if (remaining.has(key)) remaining.delete(key);
      }
      for (const key of pathKeys) globalTraceHoles.add(key);

      const compressed = compressPath(path);
      if (compressed.length >= 2) {
        traces.push({
          id: createId("t"),
          kind: "wire",
          layer: "bottom",
          nodes: compressed,
        });
      }
    }
  }

  return { traces, warnings };
}

function buildPartCenters(parts: readonly Part[]): ReadonlyMap<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  for (const part of parts) {
    const pins = getPartPins(part).map((p) => p.hole);
    map.set(part.id, pinCenter(pins));
  }
  return map;
}

function boundsFromPins(pins: readonly Hole[], margin: number): PartBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pins) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return {
    minX: minX - margin,
    minY: minY - margin,
    maxX: maxX + margin,
    maxY: maxY + margin,
  };
}

// keepout intentionally omitted in routing: only pins/fixed holes are blocked.

function computeSpacingPenalty(parts: readonly Part[]): { overlap: number; clearance: number } {
  const partPins = new Map<string, readonly Hole[]>();
  const partBounds = new Map<string, PartBounds>();
  for (const part of parts) {
    const pins = getPartPins(part).map((p) => p.hole);
    partPins.set(part.id, pins);
    partBounds.set(part.id, boundsFromPins(pins, PART_MARGIN));
  }

  const ids = parts.map((p) => p.id);
  let overlap = 0;
  let clearance = 0;

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = partBounds.get(ids[i]);
      const b = partBounds.get(ids[j]);
      if (!a || !b) continue;
      const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
      const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
      if (ox >= 0 && oy >= 0) {
        overlap += (ox + 1) * (oy + 1);
      }

      const pinsA = partPins.get(ids[i]) ?? [];
      const pinsB = partPins.get(ids[j]) ?? [];
      for (const pa of pinsA) {
        for (const pb of pinsB) {
          const dist = Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
          if (dist <= PIN_CLEARANCE) {
            clearance += (PIN_CLEARANCE + 1 - dist) ** 2;
          }
        }
      }
    }
  }

  return { overlap, clearance };
}

function buildPartEdges(project: Project): ReadonlyMap<string, number> {
  const edges = new Map<string, number>();
  for (const net of project.netlist) {
    const partIds = Array.from(
      new Set(
        net.terminals
          .filter((t) => t.kind === "pin")
          .map((t) => (t as { kind: "pin"; partId: string }).partId),
      ),
    );
    for (let i = 0; i < partIds.length; i += 1) {
      for (let j = i + 1; j < partIds.length; j += 1) {
        const a = partIds[i];
        const b = partIds[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
  }
  return edges;
}

function computeAdjacencyCost(
  partCenters: ReadonlyMap<string, { x: number; y: number }>,
  edges: ReadonlyMap<string, number>,
): number {
  let cost = 0;
  for (const [key, weight] of edges.entries()) {
    const [a, b] = key.split("|");
    const ca = partCenters.get(a);
    const cb = partCenters.get(b);
    if (!ca || !cb) continue;
    cost += (Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y)) * weight;
  }
  return cost;
}

function computeCost(
  project: Project,
  parts: readonly Part[],
  fixedHoleSet: ReadonlySet<string>,
  warnings: string[],
  baselineRotations: ReadonlyMap<string, number>,
  edges: ReadonlyMap<string, number>,
  baselineOrigins: ReadonlyMap<string, Hole>,
): number {
  let collision = 0;
  let fixedHolePenalty = 0;
  let movementPenalty = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const occupancy = new Map<string, number>();
  const pinIndex = new Map<string, Hole>();
  const partCenters = new Map<string, { x: number; y: number }>();
  let rotationPenalty = 0;

  for (const part of parts) {
    const pins = getPartPins(part);
    for (const pin of pins) {
      const key = holeKey(pin.hole);
      occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
      if (fixedHoleSet.has(key)) fixedHolePenalty += 1;
      minX = Math.min(minX, pin.hole.x);
      minY = Math.min(minY, pin.hole.y);
      maxX = Math.max(maxX, pin.hole.x);
      maxY = Math.max(maxY, pin.hole.y);
      pinIndex.set(`${part.id}:${pin.pinId}`, pin.hole);
    }
    partCenters.set(part.id, pinCenter(pins.map((p) => p.hole)));
    const baselineRotation = baselineRotations.get(part.id);
    if (baselineRotation !== undefined && baselineRotation !== part.placement.rotation) {
      rotationPenalty += 1;
    }
    const baselineOrigin = baselineOrigins.get(part.id);
    if (baselineOrigin) {
      movementPenalty +=
        Math.abs(part.placement.origin.x - baselineOrigin.x) +
        Math.abs(part.placement.origin.y - baselineOrigin.y);
    }
  }

  for (const count of occupancy.values()) {
    if (count > 1) collision += count - 1;
  }

  const area =
    Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)
      ? (maxX - minX + 1) * (maxY - minY + 1)
      : 0;

  const netMetrics = computeNetCost(project, pinIndex, warnings);
  const adjacencyCost = computeAdjacencyCost(partCenters, edges);
  const spacing = computeSpacingPenalty(parts);

  // Weights tuned for strong validity preference + routing friendliness.
  return (
    netMetrics.cost * 1.0 +
    netMetrics.span * 0.9 +
    netMetrics.misalign * 6.0 +
    adjacencyCost * 0.25 +
    area * 0.02 +
    rotationPenalty * 0.6 +
    movementPenalty * 0.8 +
    spacing.overlap * 9000 +
    spacing.clearance * 1500 +
    collision * 8000 +
    fixedHolePenalty * 5000
  );
}

export function autoLayout(project: Project, options: AutoLayoutOptions = {}): AutoLayoutResult {
  const warnings: string[] = [];
  const allowRotate = options.allowRotate ?? true;
  const rng = createRng(options.seed);
  const iterations = Math.max(0, Math.floor(options.iterations ?? DEFAULT_ITERATIONS));
  const restarts = Math.max(1, Math.floor(options.restarts ?? DEFAULT_RESTARTS));

  const fixedPartIds = new Set(project.layoutConstraints.fixedPartIds);
  const fixedHoleSet = new Set(project.layoutConstraints.fixedHoles.map((h) => holeKey(h)));
  const baselineRotations = new Map(project.parts.map((p) => [p.id, p.placement.rotation]));
  const baselineOrigins = new Map(project.parts.map((p) => [p.id, p.placement.origin]));
  const edges = buildPartEdges(project);

  const fixedParts = project.parts.filter((p) => fixedPartIds.has(p.id));
  const movableParts = project.parts.filter((p) => !fixedPartIds.has(p.id));

  const candidatesById = new Map<string, readonly Candidate[]>();
  const preferredCandidatesById = new Map<string, readonly Candidate[]>();
  for (const part of movableParts) {
    const candidates = placementsForPart(part, project.board, fixedHoleSet, allowRotate);
    if (candidates.length === 0) {
      warnings.push(`Auto‑layout: aucun placement valide pour ${part.ref}.`);
    }
    candidatesById.set(part.id, candidates);
  }

  const baselineParts = project.parts;
  const baselinePinIndex = buildPinIndex(baselineParts);

  const netCentroids = new Map<string, { x: number; y: number }>();
  for (const net of project.netlist) {
    const points: NetTerminalPos[] = [];
    for (const terminal of net.terminals) {
      if (terminal.kind === "hole") {
        points.push({ x: terminal.hole.x, y: terminal.hole.y });
        continue;
      }
      const key = `${terminal.partId}:${terminal.pinId}`;
      const hole = baselinePinIndex.get(key);
      if (hole) points.push({ x: hole.x, y: hole.y });
    }
    if (points.length === 0) continue;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    netCentroids.set(net.id, { x: cx, y: cy });
  }

  const partTargets = new Map<string, { x: number; y: number }>();
  const partToNetIds = new Map<string, string[]>();
  for (const net of project.netlist) {
    for (const terminal of net.terminals) {
      if (terminal.kind !== "pin") continue;
      const list = partToNetIds.get(terminal.partId) ?? [];
      list.push(net.id);
      partToNetIds.set(terminal.partId, list);
    }
  }

  for (const part of movableParts) {
    const netIds = partToNetIds.get(part.id) ?? [];
    const points = netIds.map((id) => netCentroids.get(id)).filter(Boolean) as { x: number; y: number }[];
    if (points.length === 0) {
      const pins = getPartPins(part).map((p) => p.hole);
      partTargets.set(part.id, pinCenter(pins));
      continue;
    }
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    partTargets.set(part.id, { x: cx, y: cy });
  }

  for (const part of movableParts) {
    const candidates = candidatesById.get(part.id) ?? [];
    const target = partTargets.get(part.id);
    if (!target) {
      preferredCandidatesById.set(part.id, candidates);
      continue;
    }
    const sorted = [...candidates].sort((a, b) => {
      const da = Math.abs(a.center.x - target.x) + Math.abs(a.center.y - target.y);
      const db = Math.abs(b.center.x - target.x) + Math.abs(b.center.y - target.y);
      return da - db;
    });
    preferredCandidatesById.set(part.id, sorted.slice(0, Math.min(80, sorted.length)));
  }

  function isPlacementValid(part: Part, placement: Placement): boolean {
    const next = { ...part, placement };
    for (const pin of getPartPins(next)) {
      if (!isWithinBoard(project.board, pin.hole)) return false;
      if (fixedHoleSet.has(holeKey(pin.hole))) return false;
    }
    return true;
  }

  function normalizeInitialParts(parts: readonly Part[]): Part[] {
    return parts.map((part) => {
      if (fixedPartIds.has(part.id)) return part;
      if (isPlacementValid(part, part.placement)) return part;
      const candidates = candidatesById.get(part.id) ?? [];
      if (candidates.length === 0) return part;
      const target = partTargets.get(part.id);
      if (!target) return { ...part, placement: candidates[0].placement };
      let best = candidates[0];
      let bestDist = Infinity;
      for (const candidate of candidates) {
        const dist = Math.abs(candidate.center.x - target.x) + Math.abs(candidate.center.y - target.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
      return { ...part, placement: best.placement };
    });
  }

  function greedyPlacement(): Part[] {
    const order = [...movableParts].sort((a, b) => getPartPins(b).length - getPartPins(a).length);
    const placed: Part[] = [...fixedParts];

    for (const part of order) {
      const candidates = preferredCandidatesById.get(part.id) ?? candidatesById.get(part.id) ?? [];
      if (candidates.length === 0) {
        placed.push(part);
        continue;
      }
      let best = candidates[0];
      let bestCost = Infinity;
      for (const candidate of candidates) {
        const nextPart: Part = { ...part, placement: candidate.placement };
        const cost = computeCost(
          project,
          [...placed, nextPart],
          fixedHoleSet,
          [],
          baselineRotations,
          edges,
          baselineOrigins,
        );
        if (cost < bestCost) {
          bestCost = cost;
          best = candidate;
        }
      }
      placed.push({ ...part, placement: best.placement });
    }
    return placed;
  }

  function randomPlacement(): Part[] {
    const parts = [...fixedParts];
    for (const part of movableParts) {
      const candidates = candidatesById.get(part.id) ?? [];
      if (candidates.length === 0) {
        parts.push(part);
        continue;
      }
      const candidate = candidates[Math.floor(rng() * candidates.length)];
      parts.push({ ...part, placement: candidate.placement });
    }
    return parts;
  }

  let globalBestParts = normalizeInitialParts(baselineParts);
  let globalBestCost = computeCost(
    project,
    globalBestParts,
    fixedHoleSet,
    warnings,
    baselineRotations,
    edges,
    baselineOrigins,
  );

  const startPlacements: Part[][] = [
    globalBestParts,
    greedyPlacement(),
  ];
  for (let i = 0; i < restarts - 2; i += 1) {
    startPlacements.push(randomPlacement());
  }

  for (const start of startPlacements) {
    let currentParts = start;
    let currentCost = computeCost(
      project,
      currentParts,
      fixedHoleSet,
      [],
      baselineRotations,
      edges,
      baselineOrigins,
    );
    let bestParts = currentParts;
    let bestCost = currentCost;

    for (let i = 0; i < iterations; i += 1) {
      if (movableParts.length === 0) break;
      const temp = 1 - i / Math.max(1, iterations);
      const chooseSwap = rng() < 0.18;
      let nextParts: Part[] | null = null;

      if (chooseSwap && movableParts.length >= 2) {
        const idxA = Math.floor(rng() * movableParts.length);
        let idxB = Math.floor(rng() * movableParts.length);
        if (idxA === idxB) idxB = (idxB + 1) % movableParts.length;
        const partA = movableParts[idxA];
        const partB = movableParts[idxB];
        const placementA = currentParts.find((p) => p.id === partA.id)?.placement ?? partA.placement;
        const placementB = currentParts.find((p) => p.id === partB.id)?.placement ?? partB.placement;
        if (isPlacementValid(partA, placementB) && isPlacementValid(partB, placementA)) {
          nextParts = currentParts.map((p) => {
            if (p.id === partA.id) return { ...p, placement: placementB };
            if (p.id === partB.id) return { ...p, placement: placementA };
            return p;
          });
        }
      }

      if (!nextParts) {
        const target = movableParts[Math.floor(rng() * movableParts.length)];
        const prefer = rng() < 0.75;
        const candidates = prefer
          ? preferredCandidatesById.get(target.id) ?? candidatesById.get(target.id)
          : candidatesById.get(target.id);
        if (!candidates || candidates.length === 0) continue;
        const candidate = candidates[Math.floor(rng() * candidates.length)];
        nextParts = currentParts.map((p) =>
          p.id === target.id ? { ...p, placement: candidate.placement } : p,
        );
      }

      const cost = computeCost(
        project,
        nextParts,
        fixedHoleSet,
        [],
        baselineRotations,
        edges,
        baselineOrigins,
      );
      const accept = cost <= currentCost || Math.exp((currentCost - cost) / Math.max(0.05, temp)) > rng();
      if (accept) {
        currentParts = nextParts;
        currentCost = cost;
        if (cost < bestCost) {
          bestCost = cost;
          bestParts = nextParts;
        }
      }
    }

    if (bestCost < globalBestCost) {
      globalBestCost = bestCost;
      globalBestParts = bestParts;
    }
  }

  const partsById = new Map(globalBestParts.map((p) => [p.id, p]));
  const finalParts = project.parts.map((p) => partsById.get(p.id) ?? p);

  return {
    project: { ...project, parts: finalParts },
    warnings,
  };
}
