import { describe, expect, it } from "vitest";
import { tracesFromNetlist } from "./autoLayout.routing";
import { makeNet, makeProject } from "../test/fixtures";

describe("autoLayout.routing", () => {
  it("returns empty result when no routable net exists", () => {
    const result = tracesFromNetlist(makeProject({ netlist: [] }));
    expect(result).toEqual({
      traces: [],
      warnings: [],
      totalNetCount: 0,
      routedNetCount: 0,
      complete: true,
    });
  });

  it("routes a simple two-hole net", () => {
    const project = makeProject({
      width: 5,
      height: 3,
      netlist: [makeNet("n1", [{ kind: "hole", hole: { x: 0, y: 1 } }, { kind: "hole", hole: { x: 4, y: 1 } }], "SIG")],
    });
    const result = tracesFromNetlist(project);
    expect(result.complete).toBe(true);
    expect(result.totalNetCount).toBe(1);
    expect(result.routedNetCount).toBe(1);
    expect(result.traces.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it("reports impossible routing when blocked by fixed holes", () => {
    const project = makeProject({
      width: 3,
      height: 1,
      fixedHoles: [{ x: 1, y: 0 }],
      netlist: [makeNet("n1", [{ kind: "hole", hole: { x: 0, y: 0 } }, { kind: "hole", hole: { x: 2, y: 0 } }], "A")],
    });
    const result = tracesFromNetlist(project);
    expect(result.complete).toBe(false);
    expect(result.traces).toEqual([]);
    expect(result.warnings.join(" ")).toContain("routing is impossible");
  });

  it("adds missing-pin warning and skips underspecified nets", () => {
    const project = makeProject({
      netlist: [makeNet("n1", [{ kind: "pin", partId: "missing", pinId: "1" }, { kind: "hole", hole: { x: 1, y: 1 } }], "MISSING")],
    });
    const result = tracesFromNetlist(project);
    expect(result.totalNetCount).toBe(0);
    expect(result.complete).toBe(true);
    expect(result.warnings.join(" ")).toContain("missing pin terminals");
  });

  it("can report remaining congestion", () => {
    const project = makeProject({
      width: 3,
      height: 1,
      netlist: [
        makeNet("n1", [{ kind: "hole", hole: { x: 0, y: 0 } }, { kind: "hole", hole: { x: 2, y: 0 } }], "A"),
        makeNet("n2", [{ kind: "hole", hole: { x: 0, y: 0 } }, { kind: "hole", hole: { x: 2, y: 0 } }], "B"),
      ],
    });
    const result = tracesFromNetlist(project);
    expect(result.routedNetCount).toBe(2);
    expect(result.warnings.some((w) => w.includes("congestion"))).toBe(true);
  });
});
