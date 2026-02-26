import { createId } from "./ids";
import { holeKey } from "./hole";
import {
  ROUTER_DIRECTIONS,
  ROUTER_HISTORY_INCREMENT,
  ROUTER_HISTORY_PENALTY,
  ROUTER_MAX_ITERATIONS,
  ROUTER_PRESENT_FACTOR_GROWTH,
  ROUTER_PRESENT_FACTOR_START,
  ROUTER_TURN_PENALTY,
} from "./autoLayout.constants";
import {
  buildPinIndex,
  chooseSeedTerminal,
  compressPath,
  holeFromKey,
  traceLength,
  uniqueHoles,
} from "./autoLayout.common";
import type {
  RouteNet,
  RoutedNet,
  RoutingIterationResult,
  RoutingSolution,
  SearchNode,
  TraceBuildResult,
} from "./autoLayout.types";
import type { Hole, Project, Trace } from "./types";

function heuristicToTargets(key: string, targets: readonly Hole[]): number {
  const hole = holeFromKey(key);
  if (!hole) return 0;
  let best = Infinity;
  for (const target of targets) {
    const d = Math.abs(hole.x - target.x) + Math.abs(hole.y - target.y);
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : 0;
}

function reconstructStatePath(
  stateId: string,
  prevState: ReadonlyMap<string, string | null>,
): readonly Hole[] {
  const path: Hole[] = [];
  let current: string | null = stateId;
  while (current) {
    const sep = current.lastIndexOf("|");
    const key = sep >= 0 ? current.slice(0, sep) : current;
    const hole = holeFromKey(key);
    if (hole) path.push(hole);
    current = prevState.get(current) ?? null;
  }
  path.reverse();
  return path;
}

function findPathAStar(
  board: Project["board"],
  starts: ReadonlySet<string>,
  targets: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
  occupancy: ReadonlyMap<string, number>,
  historyCost: ReadonlyMap<string, number>,
  presentFactor: number,
  ownCells: ReadonlySet<string>,
): readonly Hole[] | null {
  if (starts.size === 0 || targets.size === 0) return null;

  const targetHoles: Hole[] = [];
  for (const key of targets) {
    const hole = holeFromKey(key);
    if (hole) targetHoles.push(hole);
  }
  if (targetHoles.length === 0) return null;

  const open: SearchNode[] = [];
  const prevState = new Map<string, string | null>();
  const bestG = new Map<string, number>();

  for (const key of starts) {
    const stateId = `${key}|-1`;
    const h = heuristicToTargets(key, targetHoles);
    open.push({ stateId, key, dir: -1, g: 0, f: h });
    prevState.set(stateId, null);
    bestG.set(stateId, 0);
  }

  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    if (targets.has(current.key) && !starts.has(current.key)) {
      return reconstructStatePath(current.stateId, prevState);
    }

    const hole = holeFromKey(current.key);
    if (!hole) continue;

    for (let dirIdx = 0; dirIdx < ROUTER_DIRECTIONS.length; dirIdx += 1) {
      const dir = ROUTER_DIRECTIONS[dirIdx];
      const next = { x: hole.x + dir.dx, y: hole.y + dir.dy };
      if (next.x < 0 || next.y < 0 || next.x >= board.width || next.y >= board.height) continue;
      const nextKey = holeKey(next);

      const isSpecial = ownCells.has(nextKey) || starts.has(nextKey) || targets.has(nextKey);
      if (blocked.has(nextKey) && !isSpecial) continue;

      const ownCount = ownCells.has(nextKey) ? 1 : 0;
      const presentOcc = Math.max(0, (occupancy.get(nextKey) ?? 0) - ownCount);
      const presentPenalty = presentOcc > 0 ? presentOcc * presentFactor : 0;
      const historyPenalty = (historyCost.get(nextKey) ?? 0) * ROUTER_HISTORY_PENALTY;
      const turnPenalty = current.dir >= 0 && current.dir !== dirIdx ? ROUTER_TURN_PENALTY : 0;

      const stepCost = 1 + presentPenalty + historyPenalty + turnPenalty;
      const tentativeG = current.g + stepCost;
      const nextStateId = `${nextKey}|${dirIdx}`;
      const knownG = bestG.get(nextStateId);
      if (knownG !== undefined && tentativeG >= knownG) continue;

      bestG.set(nextStateId, tentativeG);
      prevState.set(nextStateId, current.stateId);
      const h = heuristicToTargets(nextKey, targetHoles);
      open.push({
        stateId: nextStateId,
        key: nextKey,
        dir: dirIdx,
        g: tentativeG,
        f: tentativeG + h,
      });
    }
  }

  return null;
}

function computeOverflow(occupancy: ReadonlyMap<string, number>): number {
  let overflow = 0;
  for (const count of occupancy.values()) {
    if (count > 1) overflow += count - 1;
  }
  return overflow;
}

function routeSingleNet(
  board: Project["board"],
  net: RouteNet,
  occupancy: Map<string, number>,
  historyCost: ReadonlyMap<string, number>,
  presentFactor: number,
): RoutedNet {
  const seed = chooseSeedTerminal(net.terminals);
  if (!seed) {
    return { id: net.id, name: net.name, complete: true, paths: [] };
  }

  const tree = new Set<string>([seed]);
  const remaining = new Set(net.terminalKeys);
  remaining.delete(seed);
  const ownCells = new Set<string>([seed]);
  const addedCells: string[] = [];
  const paths: Hole[][] = [];

  while (remaining.size > 0) {
    const path = findPathAStar(
      board,
      tree,
      remaining,
      net.blocked,
      occupancy,
      historyCost,
      presentFactor,
      ownCells,
    );
    if (!path) break;

    const pathKeys = path.map((hole) => holeKey(hole));
    for (const key of pathKeys) {
      tree.add(key);
      if (remaining.has(key)) remaining.delete(key);
      if (!ownCells.has(key)) {
        ownCells.add(key);
        occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
        addedCells.push(key);
      }
    }

    const compressed = compressPath(path);
    if (compressed.length >= 2) paths.push([...compressed]);
  }

  const complete = remaining.size === 0;
  if (!complete) {
    for (const key of addedCells) {
      const next = (occupancy.get(key) ?? 0) - 1;
      if (next <= 0) occupancy.delete(key);
      else occupancy.set(key, next);
    }
    return { id: net.id, name: net.name, complete: false, paths: [] };
  }

  return { id: net.id, name: net.name, complete: true, paths };
}

function isBetterRoutingSolution(next: RoutingSolution, best: RoutingSolution | null): boolean {
  if (!best) return true;
  if (next.completeCount !== best.completeCount) return next.completeCount > best.completeCount;
  if (next.overflow !== best.overflow) return next.overflow < best.overflow;
  return next.totalLength < best.totalLength;
}

function runRoutingIteration(
  project: Project,
  nets: readonly RouteNet[],
  historyCost: ReadonlyMap<string, number>,
  presentFactor: number,
): RoutingIterationResult {
  const occupancy = new Map<string, number>();
  const routed: RoutedNet[] = [];
  let completeCount = 0;
  let totalLength = 0;

  for (const net of nets) {
    const result = routeSingleNet(project.board, net, occupancy, historyCost, presentFactor);
    routed.push(result);
    if (!result.complete) continue;
    completeCount += 1;
    for (const path of result.paths) totalLength += traceLength(path);
  }

  const overflow = computeOverflow(occupancy);
  return { routed, occupancy, completeCount, overflow, totalLength };
}

function buildRouteNets(
  project: Project,
  pinIndex: ReadonlyMap<string, Hole>,
  warnings: string[],
): readonly RouteNet[] {
  const pinHoleSet = new Set<string>();
  for (const hole of pinIndex.values()) pinHoleSet.add(holeKey(hole));
  const fixedHoleSet = new Set(project.layoutConstraints.fixedHoles.map((hole) => holeKey(hole)));

  const resolved = project.netlist.map((net) => {
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
    if (missing > 0) warnings.push(`Net ${net.name ?? net.id}: ${missing} missing pin terminals.`);
    const terminals = uniqueHoles(holes);
    return {
      id: net.id,
      name: net.name ?? net.id,
      terminals,
      terminalKeys: new Set(terminals.map((hole) => holeKey(hole))),
    };
  });

  const allTerminalKeys = new Set<string>();
  for (const net of resolved) {
    for (const key of net.terminalKeys) allTerminalKeys.add(key);
  }

  const routable = resolved
    .filter((net) => net.terminals.length >= 2)
    .map((net) => {
      const blocked = new Set<string>();
      for (const key of pinHoleSet) {
        if (!net.terminalKeys.has(key)) blocked.add(key);
      }
      for (const key of fixedHoleSet) {
        if (!net.terminalKeys.has(key)) blocked.add(key);
      }
      for (const key of allTerminalKeys) {
        if (!net.terminalKeys.has(key)) blocked.add(key);
      }
      return {
        id: net.id,
        name: net.name,
        terminals: net.terminals,
        terminalKeys: net.terminalKeys,
        blocked,
      };
    })
    .sort((a, b) => b.terminals.length - a.terminals.length);

  return routable;
}

function cloneRoutedNets(routed: readonly RoutedNet[]): readonly RoutedNet[] {
  return routed.map((net) => ({
    id: net.id,
    name: net.name,
    complete: net.complete,
    paths: net.paths.map((path) => [...path]),
  }));
}

export function tracesFromNetlist(project: Project): TraceBuildResult {
  const warnings: string[] = [];
  const pinIndex = buildPinIndex(project.parts);
  const nets = buildRouteNets(project, pinIndex, warnings);
  if (nets.length === 0) {
    return {
      traces: [],
      warnings,
      totalNetCount: 0,
      routedNetCount: 0,
      complete: true,
    };
  }

  const historyCost = new Map<string, number>();
  let presentFactor = ROUTER_PRESENT_FACTOR_START;
  let best: RoutingSolution | null = null;

  for (let iter = 0; iter < ROUTER_MAX_ITERATIONS; iter += 1) {
    const result = runRoutingIteration(project, nets, historyCost, presentFactor);
    const candidate: RoutingSolution = {
      routed: cloneRoutedNets(result.routed),
      completeCount: result.completeCount,
      overflow: result.overflow,
      totalLength: result.totalLength,
    };
    if (isBetterRoutingSolution(candidate, best)) best = candidate;

    if (result.completeCount === nets.length && result.overflow === 0) break;

    for (const [key, count] of result.occupancy.entries()) {
      if (count <= 1) continue;
      const prev = historyCost.get(key) ?? 0;
      historyCost.set(key, prev + (count - 1) * ROUTER_HISTORY_INCREMENT);
    }
    presentFactor *= ROUTER_PRESENT_FACTOR_GROWTH;
  }

  if (!best) {
    return {
      traces: [],
      warnings,
      totalNetCount: nets.length,
      routedNetCount: 0,
      complete: false,
    };
  }

  const traces: Trace[] = [];
  for (const net of best.routed) {
    for (const path of net.paths) {
      if (path.length < 2) continue;
      traces.push({
        id: createId("t"),
        kind: "wire",
        layer: "bottom",
        nodes: path,
      });
    }
  }

  if (best.completeCount < nets.length) {
    for (const net of best.routed) {
      if (!net.complete)
        warnings.push(`Net ${net.name}: routing is impossible with current constraints.`);
    }
  }
  if (best.overflow > 0) {
    warnings.push(`Routing with remaining congestion (${best.overflow}).`);
  }

  return {
    traces,
    warnings,
    totalNetCount: nets.length,
    routedNetCount: best.completeCount,
    complete: best.completeCount === nets.length && best.overflow === 0,
  };
}
