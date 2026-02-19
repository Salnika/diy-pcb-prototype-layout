import { getPartPins } from "./footprints";
import { holeKey, isHole } from "./hole";
import type { Hole, NetLabel, Part, Project, Trace } from "./types";

type NetId = string;

export type NetIndex = Readonly<{
  holeToNetId: ReadonlyMap<string, NetId>;
  netIdToHoles: ReadonlyMap<NetId, readonly Hole[]>;
  netIdToName: ReadonlyMap<NetId, string | undefined>;
  netIdToConflicts: ReadonlyMap<NetId, readonly string[]>;
}>;

class UnionFind {
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();

  add(key: string) {
    if (this.parent.has(key)) return;
    this.parent.set(key, key);
    this.rank.set(key, 0);
  }

  find(key: string): string {
    const parent = this.parent.get(key);
    if (parent === undefined) {
      this.add(key);
      return key;
    }
    if (parent === key) return key;
    const root = this.find(parent);
    this.parent.set(key, root);
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;

    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
      return;
    }
    if (rankA > rankB) {
      this.parent.set(rb, ra);
      return;
    }
    this.parent.set(rb, ra);
    this.rank.set(ra, rankA + 1);
  }

  keys(): readonly string[] {
    return [...this.parent.keys()];
  }
}

function ensureTraceNodes(uf: UnionFind, trace: Trace) {
  for (const hole of trace.nodes) {
    uf.add(holeKey(hole));
  }
  for (let i = 0; i < trace.nodes.length - 1; i += 1) {
    const a = trace.nodes[i];
    const b = trace.nodes[i + 1];
    if (!isHole(a) || !isHole(b)) continue;
    uf.union(holeKey(a), holeKey(b));
  }
}

function ensureLabelHole(uf: UnionFind, label: NetLabel) {
  uf.add(holeKey(label.at));
}

function stableNetIdFromHoles(holes: readonly Hole[]): NetId {
  let best: string | null = null;
  for (const h of holes) {
    const k = holeKey(h);
    if (best === null || k < best) best = k;
  }
  return `net:${best ?? "empty"}`;
}

export function movedPartPinMap(previous: Part, next: Part): ReadonlyMap<string, Hole> {
  if (previous.id !== next.id) return new Map<string, Hole>();

  const nextPins = new Map(getPartPins(next).map((pin) => [pin.pinId, pin.hole]));
  const moved = new Map<string, Hole>();

  for (const pin of getPartPins(previous)) {
    const nextHole = nextPins.get(pin.pinId);
    if (!nextHole) continue;
    if (nextHole.x === pin.hole.x && nextHole.y === pin.hole.y) continue;
    moved.set(holeKey(pin.hole), nextHole);
  }

  return moved;
}

export function moveConnectedTraceEndpoints(
  traces: readonly Trace[],
  movedPinsByHole: ReadonlyMap<string, Hole>,
): readonly Trace[] {
  if (movedPinsByHole.size === 0) return traces;

  let changed = false;
  const updated = traces.map((trace) => {
    if (trace.nodes.length === 0) return trace;
    const nodes = [...trace.nodes];
    let traceChanged = false;

    const startIndex = 0;
    const endIndex = nodes.length - 1;
    const nextStart = movedPinsByHole.get(holeKey(nodes[startIndex]));
    if (nextStart && (nextStart.x !== nodes[startIndex].x || nextStart.y !== nodes[startIndex].y)) {
      nodes[startIndex] = nextStart;
      traceChanged = true;
    }

    const nextEnd = movedPinsByHole.get(holeKey(nodes[endIndex]));
    if (nextEnd && (nextEnd.x !== nodes[endIndex].x || nextEnd.y !== nodes[endIndex].y)) {
      nodes[endIndex] = nextEnd;
      traceChanged = true;
    }

    if (!traceChanged) return trace;
    changed = true;
    return { ...trace, nodes };
  });

  return changed ? updated : traces;
}

export function computeNetIndex(project: Project): NetIndex {
  const uf = new UnionFind();

  for (const trace of project.traces) ensureTraceNodes(uf, trace);
  for (const label of project.netLabels) ensureLabelHole(uf, label);
  for (const part of project.parts) {
    for (const pin of getPartPins(part)) uf.add(holeKey(pin.hole));
  }

  const rootToHoles = new Map<string, Hole[]>();
  for (const key of uf.keys()) {
    const root = uf.find(key);
    const [xStr, yStr] = key.split(",");
    const x = Number(xStr);
    const y = Number(yStr);
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
    const holes = rootToHoles.get(root) ?? [];
    holes.push({ x, y });
    rootToHoles.set(root, holes);
  }

  const holeToNetId = new Map<string, NetId>();
  const netIdToHoles = new Map<NetId, readonly Hole[]>();
  const rootToNetId = new Map<string, NetId>();

  for (const [root, holes] of rootToHoles.entries()) {
    const netId = stableNetIdFromHoles(holes);
    rootToNetId.set(root, netId);
    netIdToHoles.set(netId, holes);
    for (const hole of holes) holeToNetId.set(holeKey(hole), netId);
  }

  const netIdToNames = new Map<NetId, Set<string>>();
  for (const label of project.netLabels) {
    const netId = holeToNetId.get(holeKey(label.at));
    if (!netId) continue;
    const set = netIdToNames.get(netId) ?? new Set<string>();
    set.add(label.name);
    netIdToNames.set(netId, set);
  }

  const netIdToName = new Map<NetId, string | undefined>();
  const netIdToConflicts = new Map<NetId, readonly string[]>();
  for (const netId of netIdToHoles.keys()) {
    const names = netIdToNames.get(netId);
    if (!names || names.size === 0) {
      netIdToName.set(netId, undefined);
      netIdToConflicts.set(netId, []);
      continue;
    }
    const unique = [...names];
    unique.sort((a, b) => a.localeCompare(b));
    if (unique.length === 1) {
      netIdToName.set(netId, unique[0]);
      netIdToConflicts.set(netId, []);
      continue;
    }
    netIdToName.set(netId, unique[0]);
    netIdToConflicts.set(netId, unique);
  }

  return {
    holeToNetId,
    netIdToHoles,
    netIdToName,
    netIdToConflicts,
  };
}

function hashStringToHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function netColor(netId: string, name?: string): string {
  const key = name && name.length > 0 ? name : netId;
  const hue = hashStringToHue(key);
  return `hsl(${hue} 85% 65%)`;
}
