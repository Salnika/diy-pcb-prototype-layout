import { describe, expect, it, vi } from "vitest";
import {
  createDefaultIds,
  createNewProject,
  DEFAULT_BOARD,
  SCHEMA_VERSION,
  withUpdatedAt,
} from "./project";

describe("project", () => {
  it("creates a new project with defaults", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-20T12:00:00.000Z"));
    const project = createNewProject("Amp");
    expect(project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(project.meta.name).toBe("Amp");
    expect(project.board).toBe(DEFAULT_BOARD);
    expect(project.parts).toEqual([]);
    expect(project.netLabels).toEqual([]);
    expect(project.meta.createdAt).toBe("2026-02-20T12:00:00.000Z");
    expect(project.meta.updatedAt).toBe("2026-02-20T12:00:00.000Z");
    vi.useRealTimers();
  });

  it("uses Untitled when name is absent", () => {
    const project = createNewProject();
    expect(project.meta.name).toBe("Untitled");
  });

  it("updates updatedAt without losing existing meta", () => {
    const project = createNewProject("Pedal");
    const updated = withUpdatedAt(project, new Date("2026-02-20T13:15:00.000Z"));
    expect(updated.meta.name).toBe("Pedal");
    expect(updated.meta.updatedAt).toBe("2026-02-20T13:15:00.000Z");
  });

  it("creates missing ids for parts/traces/labels", () => {
    vi.spyOn(globalThis.Math, "random").mockReturnValue(0.1234);
    vi.spyOn(Date, "now").mockReturnValue(42);
    vi.stubGlobal("crypto", undefined);

    const project = createNewProject();
    const next = createDefaultIds({
      ...project,
      parts: [
        {
          id: "",
          ref: "R1",
          kind: "resistor",
          value: "",
          placement: { origin: { x: 1, y: 1 }, rotation: 0, flip: false },
          footprint: { type: "inline2", span: 2 },
          properties: {},
        },
      ],
      traces: [
        {
          id: "",
          kind: "wire",
          layer: "bottom",
          nodes: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ],
        },
      ],
      netLabels: [{ id: "", at: { x: 2, y: 2 }, name: "GND" }],
    });

    expect(next.parts[0].id).toMatch(/^p_/);
    expect(next.traces[0].id).toMatch(/^t_/);
    expect(next.netLabels[0].id).toMatch(/^nl_/);
  });
});
