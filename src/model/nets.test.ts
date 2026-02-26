import { describe, expect, it } from "vitest";
import { computeNetIndex, moveConnectedTraceEndpoints, movedPartPinMap, netColor } from "./nets";
import { makeInline2Part, makeLabel, makeProject, makeTrace } from "../test/fixtures";

describe("nets", () => {
  it("builds moved pin map only when holes changed", () => {
    const prev = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2 });
    const next = { ...prev, placement: { ...prev.placement, origin: { x: 2, y: 1 } } };
    const moved = movedPartPinMap(prev, next);
    expect([...moved.keys()]).toEqual(["1,1", "3,1"]);
    expect(moved.get("1,1")).toEqual({ x: 2, y: 1 });
    expect(movedPartPinMap(prev, { ...next, id: "other" })).toEqual(new Map());
  });

  it("moves connected trace endpoints", () => {
    const traces = [
      makeTrace("t1", [
        { x: 1, y: 1 },
        { x: 1, y: 3 },
      ]),
      makeTrace("t2", [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ]),
      { id: "t3", kind: "wire" as const, layer: "bottom" as const, nodes: [] },
    ];
    const moved = new Map([
      ["1,1", { x: 2, y: 1 }],
      ["1,3", { x: 2, y: 3 }],
    ]);
    const updated = moveConnectedTraceEndpoints(traces, moved);
    expect(updated[0].nodes).toEqual([
      { x: 2, y: 1 },
      { x: 2, y: 3 },
    ]);
    expect(updated[1]).toBe(traces[1]);
    expect(moveConnectedTraceEndpoints(traces, new Map())).toBe(traces);
  });

  it("computes net index and resolves label conflicts", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2 });
    const p2 = makeInline2Part({ id: "p2", ref: "R2", origin: { x: 1, y: 3 }, span: 2 });
    const project = makeProject({
      parts: [p1, p2],
      traces: [
        makeTrace("t1", [
          { x: 1, y: 1 },
          { x: 1, y: 3 },
        ]),
      ],
      netLabels: [makeLabel("l1", { x: 1, y: 1 }, "VCC"), makeLabel("l2", { x: 1, y: 3 }, "POWER")],
    });

    const index = computeNetIndex(project);
    const netId = index.holeToNetId.get("1,1");
    expect(netId).toBeDefined();
    expect(index.holeToNetId.get("1,3")).toBe(netId);
    expect(index.netIdToName.get(netId!)).toBe("POWER");
    expect(index.netIdToConflicts.get(netId!)).toEqual(["POWER", "VCC"]);
  });

  it("returns deterministic net colors", () => {
    const a = netColor("net:a", "GND");
    const b = netColor("net:a", "GND");
    const c = netColor("net:a");
    expect(a).toBe(b);
    expect(c).toMatch(/^hsl\(/);
  });
});
