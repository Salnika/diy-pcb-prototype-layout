import { describe, expect, it } from "vitest";
import { buildPartEdges, buildPinNetMap, computeCost, computeNetCost } from "./autoLayout.scoring";
import { holeKey } from "./hole";
import { makeInline2Part, makeNet, makeProject } from "../test/fixtures";
import type { Part } from "./types";

function makeSinglePart(id: string, ref: string, origin: { x: number; y: number }, kind: Part["kind"]): Part {
  return {
    id,
    ref,
    kind,
    value: "",
    placement: { origin, rotation: 0, flip: false },
    footprint: { type: "single", pinLabel: "1" },
    properties: {},
  };
}

describe("autoLayout.scoring", () => {
  it("builds pin-to-net map", () => {
    const project = makeProject({
      netlist: [
        makeNet(
          "n1",
          [
            { kind: "pin", partId: "p1", pinId: "1" },
            { kind: "pin", partId: "p2", pinId: "1" },
            { kind: "hole", hole: { x: 1, y: 1 } },
          ],
          "SIG",
        ),
        makeNet("n2", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p3", pinId: "1" }], "ALT"),
      ],
    });
    const map = buildPinNetMap(project);
    expect([...map.get("p1:1") ?? []].sort()).toEqual(["n1", "n2"]);
    expect([...map.get("p2:1") ?? []]).toEqual(["n1"]);
    expect(map.has("hole:1,1")).toBe(false);
  });

  it("computes net cost and warns when pin terminals are missing", () => {
    const project = makeProject({
      netlist: [
        makeNet("n1", [{ kind: "hole", hole: { x: 0, y: 0 } }, { kind: "hole", hole: { x: 4, y: 2 } }]),
        makeNet("n2", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p2", pinId: "1" }]),
      ],
    });
    const warnings: string[] = [];
    const pinPositions = new Map<string, { x: number; y: number }>([["p1:1", { x: 1, y: 1 }]]);
    const metrics = computeNetCost(project, pinPositions, warnings);
    expect(metrics.cost).toBeGreaterThan(0);
    expect(metrics.span).toBeGreaterThan(0);
    expect(metrics.misalign).toBeGreaterThan(0);
    expect(warnings[0]).toContain("missing pin terminals");
  });

  it("builds weighted part-edge graph from netlist connectivity", () => {
    const project = makeProject({
      netlist: [
        makeNet("n1", [
          { kind: "pin", partId: "p1", pinId: "1" },
          { kind: "pin", partId: "p2", pinId: "1" },
          { kind: "pin", partId: "p3", pinId: "1" },
        ]),
        makeNet("n2", [
          { kind: "pin", partId: "p1", pinId: "2" },
          { kind: "pin", partId: "p2", pinId: "2" },
        ]),
      ],
    });
    const edges = buildPartEdges(project);
    expect(edges.get("p1|p2")).toBe(2);
    expect(edges.get("p1|p3")).toBe(1);
    expect(edges.get("p2|p3")).toBe(1);
  });

  it("computes full placement cost and applies penalties", () => {
    const p1 = makeSinglePart("p1", "P1", { x: 1, y: 1 }, "power_pos");
    const p2 = makeSinglePart("p2", "P2", { x: 1, y: 1 }, "power_neg");
    const baseProject = makeProject({
      parts: [p1, p2],
      netlist: [makeNet("n1", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p2", pinId: "1" }])],
      fixedHoles: [{ x: 1, y: 1 }],
    });

    const baselineRotations = new Map(baseProject.parts.map((part) => [part.id, part.placement.rotation]));
    const baselineOrigins = new Map(baseProject.parts.map((part) => [part.id, part.placement.origin]));
    const edges = buildPartEdges(baseProject);

    const linkedCost = computeCost(
      baseProject,
      baseProject.parts,
      new Set(baseProject.layoutConstraints.fixedHoles.map((h) => holeKey(h))),
      [],
      buildPinNetMap(baseProject),
      baselineRotations,
      edges,
      baselineOrigins,
    );

    const unlinkedProject = { ...baseProject, netlist: [] };
    const unlinkedCost = computeCost(
      unlinkedProject,
      unlinkedProject.parts,
      new Set(unlinkedProject.layoutConstraints.fixedHoles.map((h) => holeKey(h))),
      [],
      buildPinNetMap(unlinkedProject),
      baselineRotations,
      edges,
      baselineOrigins,
    );

    const movedParts = baseProject.parts.map((part, i) =>
      i === 0
        ? {
            ...part,
            placement: { ...part.placement, origin: { x: 2, y: 2 }, rotation: 90 as const },
          }
        : part,
    );
    const movedCost = computeCost(
      baseProject,
      movedParts,
      new Set(baseProject.layoutConstraints.fixedHoles.map((h) => holeKey(h))),
      [],
      buildPinNetMap(baseProject),
      baselineRotations,
      edges,
      baselineOrigins,
    );

    const emptyCost = computeCost(
      { ...baseProject, parts: [], netlist: [] },
      [],
      new Set(),
      [],
      new Map(),
      new Map(),
      new Map(),
      new Map(),
    );

    expect(linkedCost).not.toBe(unlinkedCost);
    expect(movedCost).toBeLessThan(linkedCost);
    expect(movedCost).not.toBe(unlinkedCost);
    expect(emptyCost).toBe(0);
  });

  it("ignores short nets in net cost", () => {
    const warnings: string[] = [];
    const metrics = computeNetCost(makeProject({ netlist: [makeNet("n", [{ kind: "hole", hole: { x: 1, y: 1 } }])] }), new Map(), warnings);
    expect(metrics).toEqual({ cost: 0, span: 0, misalign: 0 });
    expect(warnings).toEqual([]);
  });

  it("includes missing adjacency centers gracefully", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 } });
    const project = makeProject({ parts: [p1], netlist: [makeNet("n1", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "ghost", pinId: "1" }])] });
    const cost = computeCost(
      project,
      [p1],
      new Set(),
      [],
      buildPinNetMap(project),
      new Map([["p1", 0]]),
      buildPartEdges(project),
      new Map([["p1", { x: 1, y: 1 }]]),
    );
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});
