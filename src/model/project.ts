import { createId } from "./ids";
import type { Project, SchemaVersion } from "./types";

export const SCHEMA_VERSION: SchemaVersion = "1.1";

export const DEFAULT_BOARD = {
  type: "perfboard" as const,
  width: 18,
  height: 24,
  labeling: { rows: "alpha" as const, cols: "numeric" as const },
};

export function createNewProject(name?: string): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { name: name ?? "Untitled", createdAt: now, updatedAt: now },
    board: DEFAULT_BOARD,
    parts: [],
    traces: [],
    netlist: [],
    layoutConstraints: { fixedPartIds: [], fixedHoles: [] },
    netLabels: [],
  };
}

export function withUpdatedAt(project: Project, date = new Date()): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: date.toISOString() },
  };
}

export function createDefaultIds(project: Project): Project {
  return {
    ...project,
    parts: project.parts.map((p) => ({ ...p, id: p.id || createId("p") })),
    traces: project.traces.map((t) => ({ ...t, id: t.id || createId("t") })),
    netLabels: project.netLabels.map((l) => ({ ...l, id: l.id || createId("nl") })),
  };
}
