import { describe, expect, it } from "vitest";
import { parseProject, serializeProject } from "./serialization";

function baseProjectObject() {
  return {
    schemaVersion: "1.1",
    meta: {
      name: "Proj",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    },
    board: {
      type: "perfboard",
      width: 10,
      height: 8,
      labeling: { rows: "alpha", cols: "numeric" },
    },
    parts: [
      {
        id: "p1",
        ref: "R1",
        kind: "resistor",
        value: "10k",
        placement: { origin: { x: 1, y: 1 }, rotation: 0, flip: false },
        footprint: { type: "inline2", span: 3, pinLabels: ["1", "2"] },
        properties: { tol: "1%" },
      },
      {
        id: "p2",
        ref: "Q1",
        kind: "transistor",
        placement: { origin: { x: 2, y: 2 }, rotation: 90, flip: false },
        footprint: { type: "to92_inline3", pinNames: ["E", "B", "C"] },
      },
      {
        id: "p3",
        ref: "C1",
        kind: "capacitor",
        placement: { origin: { x: 3, y: 3 }, rotation: 180, flip: false },
        footprint: { type: "free2", dx: 1, dy: -1, pinLabels: ["+", "-"] },
      },
      {
        id: "p4",
        ref: "PWR1",
        kind: "power_pos",
        placement: { origin: { x: 4, y: 4 }, rotation: 270, flip: false },
        footprint: { type: "single", pinLabel: "V+" },
      },
      {
        id: "p5",
        ref: "U1",
        kind: "dip",
        placement: { origin: { x: 5, y: 5 }, rotation: 0, flip: false },
        footprint: { type: "dip", pins: 8, rowSpan: 3 },
      },
    ],
    traces: [
      {
        id: "t1",
        kind: "wire",
        layer: "bottom",
        nodes: [
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ],
        color: "#55ccaa",
      },
    ],
    netLabels: [{ id: "nl1", at: { x: 1, y: 1 }, name: "GND", offset: { dx: 1, dy: 2 } }],
    netlist: [
      {
        id: "n1",
        name: "VCC",
        terminals: [
          { kind: "pin", partId: "p1", pinId: "1" },
          { kind: "hole", hole: { x: 1, y: 1 } },
        ],
      },
    ],
    layoutConstraints: { fixedPartIds: ["p1"], fixedHoles: [{ x: 0, y: 0 }] },
  } as const;
}

function parse(obj: unknown) {
  return parseProject(JSON.stringify(obj));
}

describe("serialization", () => {
  it("parses and serializes schema 1.1 payload", () => {
    const project = parse(baseProjectObject());
    expect(project.schemaVersion).toBe("1.1");
    expect(project.parts).toHaveLength(5);
    expect(project.netlist).toHaveLength(1);
    expect(project.layoutConstraints.fixedPartIds).toEqual(["p1"]);
    expect(project.layoutConstraints.fixedHoles).toEqual([{ x: 0, y: 0 }]);

    const serialized = serializeProject(project);
    expect(parseProject(serialized)).toEqual(project);
  });

  it("supports schema 1.0 and forces empty netlist/layoutConstraints", () => {
    const v10 = { ...baseProjectObject(), schemaVersion: "1.0" };
    const project = parse(v10);
    expect(project.netlist).toEqual([]);
    expect(project.layoutConstraints).toEqual({ fixedPartIds: [], fixedHoles: [] });
  });

  it("accepts omitted optional netlist/layoutConstraints in schema 1.1", () => {
    const src = baseProjectObject();
    const { netlist, layoutConstraints, ...rest } = src;
    expect(netlist).toBeDefined();
    expect(layoutConstraints).toBeDefined();
    const project = parse(rest);
    expect(project.netlist).toEqual([]);
    expect(project.layoutConstraints).toEqual({ fixedPartIds: [], fixedHoles: [] });
  });

  it("throws explicit validation errors on malformed payloads", () => {
    expect(() => parseProject("[]")).toThrow("Project must be a JSON object");
    expect(() => parse({ ...baseProjectObject(), schemaVersion: "2.0" })).toThrow(
      "schemaVersion must be one of",
    );
    expect(() => parse({ ...baseProjectObject(), board: 12 })).toThrow("board must be an object");
    expect(() =>
      parse({ ...baseProjectObject(), board: { ...baseProjectObject().board, width: 1.2 } }),
    ).toThrow("board.width must be an integer");
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [
          {
            ...baseProjectObject().parts[0],
            placement: { origin: { x: 0, y: 0 }, rotation: 45, flip: false },
          },
        ],
      }),
    ).toThrow("parts[0].placement.rotation must be one of");
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [{ ...baseProjectObject().parts[0], footprint: { type: "unknown" } }],
      }),
    ).toThrow("footprint.type unsupported");
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [
          { ...baseProjectObject().parts[0], footprint: { type: "dip", pins: 8, rowSpan: 4 } },
        ],
      }),
    ).toThrow("rowSpan must be 3");
    expect(() =>
      parse({
        ...baseProjectObject(),
        traces: [{ id: "t", kind: "wire", layer: "bottom", nodes: [{}] }],
      }),
    ).toThrow("traces[0].nodes[0] must be a hole");
    expect(() =>
      parse({
        ...baseProjectObject(),
        netLabels: [{ id: "n", at: { x: 1, y: 1 }, name: "A", offset: 1 }],
      }),
    ).toThrow("netLabels[0].offset must be an object");
    expect(() =>
      parse({ ...baseProjectObject(), netlist: [{ id: "n", terminals: [{}] }] }),
    ).toThrow("netlist[0].terminals[0].kind must be one of");
    expect(() => parse({ ...baseProjectObject(), layoutConstraints: 1 })).toThrow(
      "layoutConstraints must be an object",
    );
  });

  it("validates tuple lengths and optional string fields", () => {
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [
          {
            ...baseProjectObject().parts[0],
            footprint: { type: "inline2", span: 1, pinLabels: ["1"] },
          },
        ],
      }),
    ).toThrow("pinLabels must be a tuple of 2 strings");
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [
          {
            ...baseProjectObject().parts[1],
            footprint: { type: "to92_inline3", pinNames: ["A", "B"] },
          },
        ],
      }),
    ).toThrow("pinNames must be a tuple of 3 strings");
    expect(() =>
      parse({
        ...baseProjectObject(),
        parts: [
          {
            ...baseProjectObject().parts[2],
            footprint: { type: "free2", dx: 1, dy: 1, pinLabels: ["+"] },
          },
        ],
      }),
    ).toThrow("pinLabels must be a tuple of 2 strings");
    expect(() =>
      parse({
        ...baseProjectObject(),
        meta: { ...baseProjectObject().meta, name: 123 },
      }),
    ).toThrow("meta.name must be a string");
  });
});
