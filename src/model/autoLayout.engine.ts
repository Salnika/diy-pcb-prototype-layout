import { getPartPins } from "./footprints";
import { holeKey } from "./hole";
import { DEFAULT_ITERATIONS, DEFAULT_RESTARTS } from "./autoLayout.constants";
import { buildPinIndex, createRng, pinCenter } from "./autoLayout.common";
import { placementsForPart, isPlacementValid } from "./autoLayout.placement";
import { buildPartEdges, buildPinNetMap, computeCost } from "./autoLayout.scoring";
import type {
  AutoLayoutOptions,
  AutoLayoutResult,
  Candidate,
  NetTerminalPos,
} from "./autoLayout.types";
import type { Part, Project } from "./types";

function hashStringToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = hash >>> 0;
  return seed === 0 ? 1 : seed;
}

function deriveProjectSeed(project: Project): number {
  const boardSig = `${project.board.width}x${project.board.height}`;
  const partSig = project.parts
    .map((part) => {
      const { origin, rotation, flip } = part.placement;
      return `${part.id}:${part.ref}:${origin.x},${origin.y}:${rotation}:${flip ? 1 : 0}`;
    })
    .join("|");
  const netSig = project.netlist
    .map((net) => {
      const terminals = net.terminals
        .map((terminal) =>
          terminal.kind === "pin"
            ? `p:${terminal.partId}:${terminal.pinId}`
            : `h:${terminal.hole.x},${terminal.hole.y}`,
        )
        .sort()
        .join(",");
      return `${net.id}:${terminals}`;
    })
    .sort()
    .join("|");
  const fixedPartSig = project.layoutConstraints.fixedPartIds.slice().sort().join(",");
  const fixedHoleSig = project.layoutConstraints.fixedHoles
    .map((hole) => holeKey(hole))
    .sort()
    .join(",");
  return hashStringToSeed(`${boardSig}#${partSig}#${netSig}#${fixedPartSig}#${fixedHoleSig}`);
}

export function autoLayout(project: Project, options: AutoLayoutOptions = {}): AutoLayoutResult {
  const warnings: string[] = [];
  const allowRotate = options.allowRotate ?? true;
  const rng = createRng(options.seed ?? deriveProjectSeed(project));
  const iterations = Math.max(0, Math.floor(options.iterations ?? DEFAULT_ITERATIONS));
  const restarts = Math.max(1, Math.floor(options.restarts ?? DEFAULT_RESTARTS));

  const fixedPartIds = new Set(project.layoutConstraints.fixedPartIds);
  const fixedHoleSet = new Set(project.layoutConstraints.fixedHoles.map((hole) => holeKey(hole)));
  const baselineRotations = new Map(
    project.parts.map((part) => [part.id, part.placement.rotation]),
  );
  const baselineOrigins = new Map(project.parts.map((part) => [part.id, part.placement.origin]));
  const edges = buildPartEdges(project);
  const pinNetMap = buildPinNetMap(project);

  const fixedParts = project.parts.filter((part) => fixedPartIds.has(part.id));
  const movableParts = project.parts.filter((part) => !fixedPartIds.has(part.id));

  const candidatesById = new Map<string, readonly Candidate[]>();
  const preferredCandidatesById = new Map<string, readonly Candidate[]>();
  for (const part of movableParts) {
    const candidates = placementsForPart(part, project.board, fixedHoleSet, allowRotate);
    if (candidates.length === 0) {
      warnings.push(`Auto-layout: no valid placement for ${part.ref}.`);
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
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
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
    const points = netIds.map((id) => netCentroids.get(id)).filter(Boolean) as {
      x: number;
      y: number;
    }[];
    if (points.length === 0) {
      const pins = getPartPins(part).map((pin) => pin.hole);
      partTargets.set(part.id, pinCenter(pins));
      continue;
    }
    const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
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

  function normalizeInitialParts(parts: readonly Part[]): Part[] {
    return parts.map((part) => {
      if (fixedPartIds.has(part.id)) return part;
      if (isPlacementValid(project.board, fixedHoleSet, part, part.placement)) return part;
      const candidates = candidatesById.get(part.id) ?? [];
      if (candidates.length === 0) return part;
      const target = partTargets.get(part.id);
      if (!target) return { ...part, placement: candidates[0].placement };
      let best = candidates[0];
      let bestDist = Infinity;
      for (const candidate of candidates) {
        const dist =
          Math.abs(candidate.center.x - target.x) + Math.abs(candidate.center.y - target.y);
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
          pinNetMap,
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
    const parts: Part[] = [...fixedParts];
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
    pinNetMap,
    baselineRotations,
    edges,
    baselineOrigins,
  );

  const startPlacements: Part[][] = [globalBestParts, greedyPlacement()];
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
      pinNetMap,
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
        const placementA =
          currentParts.find((part) => part.id === partA.id)?.placement ?? partA.placement;
        const placementB =
          currentParts.find((part) => part.id === partB.id)?.placement ?? partB.placement;
        if (
          isPlacementValid(project.board, fixedHoleSet, partA, placementB) &&
          isPlacementValid(project.board, fixedHoleSet, partB, placementA)
        ) {
          nextParts = currentParts.map((part) => {
            if (part.id === partA.id) return { ...part, placement: placementB };
            if (part.id === partB.id) return { ...part, placement: placementA };
            return part;
          });
        }
      }

      if (!nextParts) {
        const target = movableParts[Math.floor(rng() * movableParts.length)];
        const prefer = rng() < 0.75;
        const candidates = prefer
          ? (preferredCandidatesById.get(target.id) ?? candidatesById.get(target.id))
          : candidatesById.get(target.id);
        if (!candidates || candidates.length === 0) continue;
        const candidate = candidates[Math.floor(rng() * candidates.length)];
        nextParts = currentParts.map((part) =>
          part.id === target.id ? { ...part, placement: candidate.placement } : part,
        );
      }

      const cost = computeCost(
        project,
        nextParts,
        fixedHoleSet,
        [],
        pinNetMap,
        baselineRotations,
        edges,
        baselineOrigins,
      );
      const accept =
        cost <= currentCost || Math.exp((currentCost - cost) / Math.max(0.05, temp)) > rng();
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

  const partsById = new Map(globalBestParts.map((part) => [part.id, part]));
  const finalParts = project.parts.map((part) => partsById.get(part.id) ?? part);

  return {
    project: { ...project, parts: finalParts },
    warnings,
  };
}
