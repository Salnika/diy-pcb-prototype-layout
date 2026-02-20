import { describe, expect, it } from "vitest";
import { autoLayout } from "./autoLayout.engine";
import { makeInline2Part, makeNet, makeProject } from "../test/fixtures";

describe("autoLayout.engine", () => {
  it("is deterministic with same seed and options", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 0, y: 0 }, span: 2 });
    const p2 = makeInline2Part({ id: "p2", ref: "R2", origin: { x: 2, y: 2 }, span: 2 });
    const project = makeProject({
      width: 8,
      height: 8,
      parts: [p1, p2],
      netlist: [makeNet("n1", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p2", pinId: "1" }])],
    });

    const a = autoLayout(project, { seed: 7, iterations: 50, restarts: 3, allowRotate: true });
    const b = autoLayout(project, { seed: 7, iterations: 50, restarts: 3, allowRotate: true });
    expect(a.project.parts).toEqual(b.project.parts);
    expect(a.warnings).toEqual(b.warnings);
  });

  it("reports warnings when no valid placement exists", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 0, y: 0 }, span: 2 });
    const project = makeProject({
      width: 1,
      height: 1,
      parts: [p1],
      fixedHoles: [{ x: 0, y: 0 }],
    });
    const result = autoLayout(project, { seed: 1, iterations: 0, restarts: 1 });
    expect(result.warnings.join(" ")).toContain("aucun placement valide");
  });

  it("keeps fixed parts unchanged and supports no-rotate mode", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, rotation: 90, span: 2 });
    const p2 = makeInline2Part({ id: "p2", ref: "R2", origin: { x: 4, y: 1 }, rotation: 0, span: 2 });
    const project = makeProject({
      width: 10,
      height: 5,
      parts: [p1, p2],
      fixedPartIds: ["p1"],
      netlist: [makeNet("n", [{ kind: "pin", partId: "p1", pinId: "1" }, { kind: "pin", partId: "p2", pinId: "1" }])],
    });

    const result = autoLayout(project, { seed: 11, iterations: 25, restarts: 2, allowRotate: false });
    const fixed = result.project.parts.find((p) => p.id === "p1");
    const moved = result.project.parts.find((p) => p.id === "p2");
    expect(fixed?.placement).toEqual(p1.placement);
    expect(moved?.placement.rotation).toBe(0);
  });

  it("works without explicit seed (derived project seed path)", () => {
    const p1 = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2 });
    const project = makeProject({ parts: [p1], width: 5, height: 5 });
    const result = autoLayout(project, { iterations: 1, restarts: 1 });
    expect(result.project.parts).toHaveLength(1);
  });
});
