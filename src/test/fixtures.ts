import {
  createNewProject,
  type Hole,
  type Net,
  type NetLabel,
  type Part,
  type Project,
  type Trace,
} from "../model";

export function makeInline2Part(
  args: Readonly<{
    id: string;
    ref: string;
    kind?: Part["kind"];
    origin?: Hole;
    rotation?: 0 | 90 | 180 | 270;
    span?: number;
    pinLabels?: readonly [string, string];
    value?: string;
  }>,
): Part {
  return {
    id: args.id,
    ref: args.ref,
    kind: args.kind ?? "resistor",
    value: args.value ?? "",
    placement: {
      origin: args.origin ?? { x: 1, y: 1 },
      rotation: args.rotation ?? 0,
      flip: false,
    },
    footprint: {
      type: "inline2",
      span: args.span ?? 2,
      pinLabels: args.pinLabels,
    },
    properties: {},
  };
}

export function makeTo92Part(
  args: Readonly<{
    id: string;
    ref: string;
    kind: "transistor" | "potentiometer" | "jack";
    origin?: Hole;
    pinNames?: readonly [string, string, string];
    value?: string;
  }>,
): Part {
  return {
    id: args.id,
    ref: args.ref,
    kind: args.kind,
    value: args.value ?? "",
    placement: {
      origin: args.origin ?? { x: 2, y: 2 },
      rotation: 0,
      flip: false,
    },
    footprint: {
      type: "to92_inline3",
      pinNames: args.pinNames,
    },
    properties: {},
  };
}

export function makeTrace(
  id: string,
  nodes: readonly Hole[],
  kind: "wire" | "jumper" = "wire",
  color?: string,
): Trace {
  return {
    id,
    kind,
    layer: "bottom",
    nodes,
    color,
  };
}

export function makeNet(id: string, terminals: Net["terminals"], name?: string): Net {
  return {
    id,
    name,
    terminals,
  };
}

export function makeLabel(
  id: string,
  at: Hole,
  name: string,
  offset?: { dx: number; dy: number },
): NetLabel {
  return { id, at, name, offset };
}

export function makeProject(
  args: Readonly<{
    name?: string;
    width?: number;
    height?: number;
    parts?: readonly Part[];
    traces?: readonly Trace[];
    netlist?: readonly Net[];
    netLabels?: readonly NetLabel[];
    fixedPartIds?: readonly string[];
    fixedHoles?: readonly Hole[];
  }> = {},
): Project {
  const base = createNewProject(args.name ?? "Test");
  return {
    ...base,
    board: {
      ...base.board,
      width: args.width ?? base.board.width,
      height: args.height ?? base.board.height,
    },
    parts: args.parts ?? [],
    traces: args.traces ?? [],
    netlist: args.netlist ?? [],
    netLabels: args.netLabels ?? [],
    layoutConstraints: {
      fixedPartIds: args.fixedPartIds ?? [],
      fixedHoles: args.fixedHoles ?? [],
    },
  };
}
