import { getPartPins } from "./footprints";
import { holeKey } from "./hole";
import { PART_MARGIN, PIN_CLEARANCE } from "./autoLayout.constants";
import { pinCenter } from "./autoLayout.common";
import type { NetTerminalPos, PartBounds } from "./autoLayout.types";
import type { Hole, Part, Project } from "./types";

type PinMeta = Readonly<{
  key: string;
  hole: Hole;
}>;

type RoutingProxyMetrics = Readonly<{
  length: number;
  bends: number;
  congestion: number;
}>;

export function buildPinNetMap(project: Project): ReadonlyMap<string, ReadonlySet<string>> {
  const pinToNets = new Map<string, Set<string>>();

  for (const net of project.netlist) {
    for (const terminal of net.terminals) {
      if (terminal.kind !== "pin") continue;
      const pinKey = `${terminal.partId}:${terminal.pinId}`;
      const nets = pinToNets.get(pinKey) ?? new Set<string>();
      nets.add(net.id);
      pinToNets.set(pinKey, nets);
    }
  }

  const readonlyMap = new Map<string, ReadonlySet<string>>();
  for (const [pinKey, nets] of pinToNets.entries()) {
    readonlyMap.set(pinKey, new Set<string>(nets));
  }
  return readonlyMap;
}

function pinsShareAnyNet(
  pinA: string,
  pinB: string,
  pinNetMap: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  if (pinA === pinB) return true;
  const netsA = pinNetMap.get(pinA);
  const netsB = pinNetMap.get(pinB);
  if (!netsA || !netsB || netsA.size === 0 || netsB.size === 0) return false;

  const [small, large] = netsA.size <= netsB.size ? [netsA, netsB] : [netsB, netsA];
  for (const netId of small) {
    if (large.has(netId)) return true;
  }
  return false;
}

export function computeNetCost(
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
    for (const terminal of terminals) {
      cost += Math.abs(terminal.x - mx) + Math.abs(terminal.y - my);
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
    warnings.push(`Netlist: ${missingPins.size} missing pin terminals were ignored.`);
  }

  return { cost, span, misalign };
}

function boundsFromPins(pins: readonly Hole[], margin: number): PartBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pin of pins) {
    minX = Math.min(minX, pin.x);
    minY = Math.min(minY, pin.y);
    maxX = Math.max(maxX, pin.x);
    maxY = Math.max(maxY, pin.y);
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

function computeSpacingPenalty(
  parts: readonly Part[],
  pinNetMap: ReadonlyMap<string, ReadonlySet<string>>,
): { overlap: number; clearance: number } {
  const partPins = new Map<string, readonly PinMeta[]>();
  const partBounds = new Map<string, PartBounds>();
  for (const part of parts) {
    const pins: PinMeta[] = getPartPins(part).map((pin) => ({
      key: `${part.id}:${pin.pinId}`,
      hole: pin.hole,
    }));
    partPins.set(part.id, pins);
    partBounds.set(
      part.id,
      boundsFromPins(
        pins.map((pin) => pin.hole),
        PART_MARGIN,
      ),
    );
  }

  const ids = parts.map((part) => part.id);
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
      for (const pinA of pinsA) {
        for (const pinB of pinsB) {
          if (pinsShareAnyNet(pinA.key, pinB.key, pinNetMap)) continue;
          const dist = Math.abs(pinA.hole.x - pinB.hole.x) + Math.abs(pinA.hole.y - pinB.hole.y);
          if (dist <= PIN_CLEARANCE) {
            clearance += (PIN_CLEARANCE + 1 - dist) ** 2;
          }
        }
      }
    }
  }

  return { overlap, clearance };
}

export function buildPartEdges(project: Project): ReadonlyMap<string, number> {
  const edges = new Map<string, number>();
  for (const net of project.netlist) {
    const partIds = Array.from(
      new Set(
        net.terminals
          .filter((terminal) => terminal.kind === "pin")
          .map((terminal) => (terminal as { kind: "pin"; partId: string }).partId),
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
    const centerA = partCenters.get(a);
    const centerB = partCenters.get(b);
    if (!centerA || !centerB) continue;
    cost += (Math.abs(centerA.x - centerB.x) + Math.abs(centerA.y - centerB.y)) * weight;
  }
  return cost;
}

function pathKeysToAnchor(
  start: NetTerminalPos,
  anchor: NetTerminalPos,
  firstAxis: "horizontal" | "vertical",
): readonly string[] {
  const keys: string[] = [];
  let x = start.x;
  let y = start.y;

  if (firstAxis === "horizontal") {
    while (x !== anchor.x) {
      x += x < anchor.x ? 1 : -1;
      keys.push(holeKey({ x, y }));
    }
    while (y !== anchor.y) {
      y += y < anchor.y ? 1 : -1;
      keys.push(holeKey({ x, y }));
    }
    return keys;
  }

  while (y !== anchor.y) {
    y += y < anchor.y ? 1 : -1;
    keys.push(holeKey({ x, y }));
  }
  while (x !== anchor.x) {
    x += x < anchor.x ? 1 : -1;
    keys.push(holeKey({ x, y }));
  }
  return keys;
}

function pathScoreForNet(
  pathKeys: readonly string[],
  netId: string,
  cellNets: ReadonlyMap<string, ReadonlySet<string>>,
): number {
  let overlap = 0;
  for (const key of pathKeys) {
    const nets = cellNets.get(key);
    if (!nets || nets.size === 0) continue;
    overlap += nets.has(netId) ? Math.max(0, nets.size - 1) : nets.size;
  }
  return pathKeys.length + overlap * 0.75;
}

function computeRoutingProxyCost(
  project: Project,
  pinPositions: ReadonlyMap<string, Hole>,
): RoutingProxyMetrics {
  let length = 0;
  let bends = 0;
  const cellNets = new Map<string, Set<string>>();

  for (const net of project.netlist) {
    const terminals: NetTerminalPos[] = [];
    for (const terminal of net.terminals) {
      if (terminal.kind === "hole") {
        terminals.push({ x: terminal.hole.x, y: terminal.hole.y });
        continue;
      }
      const key = `${terminal.partId}:${terminal.pinId}`;
      const hole = pinPositions.get(key);
      if (!hole) continue;
      terminals.push({ x: hole.x, y: hole.y });
    }
    if (terminals.length < 2) continue;

    const xs = terminals.map((t) => t.x).sort((a, b) => a - b);
    const ys = terminals.map((t) => t.y).sort((a, b) => a - b);
    const mid = Math.floor(terminals.length / 2);
    const anchor = { x: xs[mid], y: ys[mid] };

    for (const terminal of terminals) {
      const dx = Math.abs(terminal.x - anchor.x);
      const dy = Math.abs(terminal.y - anchor.y);
      if (dx === 0 && dy === 0) continue;

      const horizontalFirst = pathKeysToAnchor(terminal, anchor, "horizontal");
      const verticalFirst = pathKeysToAnchor(terminal, anchor, "vertical");
      const bendCost = dx !== 0 && dy !== 0 ? 0.8 : 0;
      const hScore = pathScoreForNet(horizontalFirst, net.id, cellNets) + bendCost;
      const vScore = pathScoreForNet(verticalFirst, net.id, cellNets) + bendCost;
      const bestPath = hScore <= vScore ? horizontalFirst : verticalFirst;

      length += bestPath.length;
      if (dx !== 0 && dy !== 0) bends += 1;

      for (const key of bestPath) {
        const nets = cellNets.get(key) ?? new Set<string>();
        nets.add(net.id);
        cellNets.set(key, nets);
      }
    }
  }

  let congestion = 0;
  for (const nets of cellNets.values()) {
    if (nets.size > 1) congestion += (nets.size - 1) ** 2;
  }

  return { length, bends, congestion };
}

export function computeCost(
  project: Project,
  parts: readonly Part[],
  fixedHoleSet: ReadonlySet<string>,
  warnings: string[],
  pinNetMap: ReadonlyMap<string, ReadonlySet<string>>,
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

  const pinOccupancy = new Map<string, string[]>();
  const pinIndex = new Map<string, Hole>();
  const partCenters = new Map<string, { x: number; y: number }>();
  let rotationPenalty = 0;

  for (const part of parts) {
    const pins = getPartPins(part);
    for (const pin of pins) {
      const key = holeKey(pin.hole);
      const pinKey = `${part.id}:${pin.pinId}`;
      const list = pinOccupancy.get(key) ?? [];
      list.push(pinKey);
      pinOccupancy.set(key, list);
      if (fixedHoleSet.has(key)) fixedHolePenalty += 1;
      minX = Math.min(minX, pin.hole.x);
      minY = Math.min(minY, pin.hole.y);
      maxX = Math.max(maxX, pin.hole.x);
      maxY = Math.max(maxY, pin.hole.y);
      pinIndex.set(pinKey, pin.hole);
    }
    partCenters.set(part.id, pinCenter(pins.map((pin) => pin.hole)));
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

  for (const pinKeys of pinOccupancy.values()) {
    if (pinKeys.length < 2) continue;
    for (let i = 0; i < pinKeys.length; i += 1) {
      for (let j = i + 1; j < pinKeys.length; j += 1) {
        if (!pinsShareAnyNet(pinKeys[i], pinKeys[j], pinNetMap)) collision += 1;
      }
    }
  }

  const area =
    Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)
      ? (maxX - minX + 1) * (maxY - minY + 1)
      : 0;

  const netMetrics = computeNetCost(project, pinIndex, warnings);
  const adjacencyCost = computeAdjacencyCost(partCenters, edges);
  const spacing = computeSpacingPenalty(parts, pinNetMap);
  const routingProxy = computeRoutingProxyCost(project, pinIndex);

  return (
    netMetrics.cost * 0.9 +
    netMetrics.span * 0.75 +
    netMetrics.misalign * 4.5 +
    adjacencyCost * 0.2 +
    routingProxy.length * 0.55 +
    routingProxy.bends * 1.8 +
    routingProxy.congestion * 42 +
    area * 0.02 +
    rotationPenalty * 0.6 +
    movementPenalty * 0.45 +
    spacing.overlap * 9000 +
    spacing.clearance * 60 +
    collision * 7000 +
    fixedHolePenalty * 5000
  );
}
