import { SCHEMA_VERSION } from "./project";
import { isHole } from "./hole";
import type {
  Board,
  Footprint,
  LayoutConstraints,
  NetLabel,
  Net,
  NetTerminal,
  Part,
  PartKind,
  Placement,
  Project,
  Rotation,
  Trace,
} from "./types";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new Error(`${path} must be a string`);
  return value;
}

function expectOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${path} must be a string`);
  return value;
}

function expectInt(value: unknown, path: string): number {
  if (!Number.isInteger(value)) throw new Error(`${path} must be an integer`);
  return value as number;
}

function expectNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number`);
  }
  return value;
}

function expectBool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

function expectOneOf<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${path} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function parseBoard(value: unknown): Board {
  if (!isObject(value)) throw new Error("board must be an object");
  const type = expectOneOf(value.type, ["perfboard"] as const, "board.type");
  const width = expectInt(value.width, "board.width");
  const height = expectInt(value.height, "board.height");
  const labelingRaw = value.labeling;
  if (!isObject(labelingRaw)) throw new Error("board.labeling must be an object");
  const rows = expectOneOf(labelingRaw.rows, ["alpha", "numeric"] as const, "board.labeling.rows");
  const cols = expectOneOf(labelingRaw.cols, ["alpha", "numeric"] as const, "board.labeling.cols");
  return { type, width, height, labeling: { rows, cols } };
}

function parsePlacement(value: unknown, path: string): Placement {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const origin = value.origin;
  if (!isObject(origin) || !isHole(origin)) throw new Error(`${path}.origin must be a hole`);
  const rotation = expectOneOf(value.rotation, [0, 90, 180, 270] as const, `${path}.rotation`);
  const flip = expectBool(value.flip, `${path}.flip`);
  return { origin, rotation: rotation as Rotation, flip };
}

function parseFootprint(value: unknown, path: string): Footprint {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const type = expectString(value.type, `${path}.type`);
  switch (type) {
    case "inline2": {
      const span = expectInt(value.span, `${path}.span`);
      const pinLabelsRaw = value.pinLabels;
      if (pinLabelsRaw === undefined) return { type: "inline2", span };
      if (!Array.isArray(pinLabelsRaw) || pinLabelsRaw.length !== 2) {
        throw new Error(`${path}.pinLabels must be a tuple of 2 strings`);
      }
      const a = expectString(pinLabelsRaw[0], `${path}.pinLabels[0]`);
      const b = expectString(pinLabelsRaw[1], `${path}.pinLabels[1]`);
      return { type: "inline2", span, pinLabels: [a, b] };
    }
    case "to92_inline3": {
      const pinNames = value.pinNames;
      if (pinNames === undefined) return { type: "to92_inline3" };
      if (!Array.isArray(pinNames) || pinNames.length !== 3) {
        throw new Error(`${path}.pinNames must be a tuple of 3 strings`);
      }
      const a = expectString(pinNames[0], `${path}.pinNames[0]`);
      const b = expectString(pinNames[1], `${path}.pinNames[1]`);
      const c = expectString(pinNames[2], `${path}.pinNames[2]`);
      return { type: "to92_inline3", pinNames: [a, b, c] };
    }
    case "free2": {
      const dx = expectInt(value.dx, `${path}.dx`);
      const dy = expectInt(value.dy, `${path}.dy`);
      const pinLabelsRaw = value.pinLabels;
      if (pinLabelsRaw === undefined) return { type: "free2", dx, dy };
      if (!Array.isArray(pinLabelsRaw) || pinLabelsRaw.length !== 2) {
        throw new Error(`${path}.pinLabels must be a tuple of 2 strings`);
      }
      const a = expectString(pinLabelsRaw[0], `${path}.pinLabels[0]`);
      const b = expectString(pinLabelsRaw[1], `${path}.pinLabels[1]`);
      return { type: "free2", dx, dy, pinLabels: [a, b] };
    }
    case "single": {
      const pinLabel = expectOptionalString(value.pinLabel, `${path}.pinLabel`);
      return { type: "single", pinLabel };
    }
    case "dip": {
      const pins = expectInt(value.pins, `${path}.pins`);
      const rowSpan = value.rowSpan ?? 3;
      if (rowSpan !== 3) throw new Error(`${path}.rowSpan must be 3 in schema v${SCHEMA_VERSION}`);
      return { type: "dip", pins, rowSpan: 3 };
    }
    default:
      throw new Error(`${path}.type unsupported: ${type}`);
  }
}

function parsePart(value: unknown, index: number): Part {
  const path = `parts[${index}]`;
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const id = expectString(value.id, `${path}.id`);
  const ref = expectString(value.ref, `${path}.ref`);
  const kind = expectOneOf(
    value.kind,
    [
      "resistor",
      "switch",
      "diode",
      "capacitor",
      "capacitor_ceramic",
      "capacitor_electrolytic",
      "capacitor_film",
      "transistor",
      "potentiometer",
      "jack",
      "power_pos",
      "power_neg",
      "power_gnd",
      "dip",
    ] as const,
    `${path}.kind`,
  ) as PartKind;
  const partValue = expectOptionalString(value.value, `${path}.value`);
  const placement = parsePlacement(value.placement, `${path}.placement`);
  const footprint = parseFootprint(value.footprint, `${path}.footprint`);
  const properties = isObject(value.properties) ? value.properties : undefined;
  return { id, ref, kind, value: partValue, placement, footprint, properties };
}

function parseTrace(value: unknown, index: number): Trace {
  const path = `traces[${index}]`;
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const id = expectString(value.id, `${path}.id`);
  const kind = expectOneOf(value.kind, ["wire", "jumper"] as const, `${path}.kind`);
  const layer = expectOneOf(value.layer, ["top", "bottom"] as const, `${path}.layer`);
  const color = expectOptionalString(value.color, `${path}.color`);
  const nodesRaw = value.nodes;
  if (!Array.isArray(nodesRaw)) throw new Error(`${path}.nodes must be an array`);
  const nodes = nodesRaw.map((n, i) => {
    if (!isObject(n) || !isHole(n)) throw new Error(`${path}.nodes[${i}] must be a hole`);
    return n;
  });
  return { id, kind, layer, nodes, color };
}

function parseNetLabel(value: unknown, index: number): NetLabel {
  const path = `netLabels[${index}]`;
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const id = expectString(value.id, `${path}.id`);
  const at = value.at;
  if (!isObject(at) || !isHole(at)) throw new Error(`${path}.at must be a hole`);
  const name = expectString(value.name, `${path}.name`);
  const offsetRaw = value.offset;
  if (offsetRaw === undefined) return { id, at, name };
  if (!isObject(offsetRaw)) throw new Error(`${path}.offset must be an object`);
  const dx = expectNumber(offsetRaw.dx, `${path}.offset.dx`);
  const dy = expectNumber(offsetRaw.dy, `${path}.offset.dy`);
  return { id, at, name, offset: { dx, dy } };
}

function parseNetTerminal(value: unknown, path: string): NetTerminal {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const kind = expectOneOf(value.kind, ["pin", "hole"] as const, `${path}.kind`);
  if (kind === "pin") {
    const partId = expectString(value.partId, `${path}.partId`);
    const pinId = expectString(value.pinId, `${path}.pinId`);
    return { kind, partId, pinId };
  }
  const hole = value.hole;
  if (!isObject(hole) || !isHole(hole)) throw new Error(`${path}.hole must be a hole`);
  return { kind, hole };
}

function parseNet(value: unknown, index: number): Net {
  const path = `netlist[${index}]`;
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  const id = expectString(value.id, `${path}.id`);
  const name = expectOptionalString(value.name, `${path}.name`);
  const terminalsRaw = value.terminals;
  if (!Array.isArray(terminalsRaw)) throw new Error(`${path}.terminals must be an array`);
  const terminals = terminalsRaw.map((t, i) => parseNetTerminal(t, `${path}.terminals[${i}]`));
  return { id, name, terminals };
}

function parseNetlist(value: unknown): readonly Net[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("netlist must be an array");
  return value.map(parseNet);
}

function parseLayoutConstraints(value: unknown): LayoutConstraints {
  if (value === undefined) return { fixedPartIds: [], fixedHoles: [] };
  if (!isObject(value)) throw new Error("layoutConstraints must be an object");
  const fixedPartIdsRaw = value.fixedPartIds;
  const fixedHolesRaw = value.fixedHoles;
  const fixedPartIds = Array.isArray(fixedPartIdsRaw)
    ? fixedPartIdsRaw.map((id, i) => expectString(id, `layoutConstraints.fixedPartIds[${i}]`))
    : [];
  const fixedHoles = Array.isArray(fixedHolesRaw)
    ? fixedHolesRaw.map((h, i) => {
        if (!isObject(h) || !isHole(h)) {
          throw new Error(`layoutConstraints.fixedHoles[${i}] must be a hole`);
        }
        return h;
      })
    : [];
  return { fixedPartIds, fixedHoles };
}

export function parseProject(json: string): Project {
  const data = JSON.parse(json) as unknown;
  if (!isObject(data)) throw new Error("Project must be a JSON object");

  const schemaVersion = expectOneOf(data.schemaVersion, ["1.0", "1.1"] as const, "schemaVersion");

  const metaRaw = data.meta;
  const meta = isObject(metaRaw)
    ? {
        name: expectOptionalString(metaRaw.name, "meta.name"),
        createdAt: expectOptionalString(metaRaw.createdAt, "meta.createdAt"),
        updatedAt: expectOptionalString(metaRaw.updatedAt, "meta.updatedAt"),
      }
    : {};

  const board = parseBoard(data.board);

  const partsRaw = data.parts;
  if (!Array.isArray(partsRaw)) throw new Error("parts must be an array");
  const parts = partsRaw.map(parsePart);

  const tracesRaw = data.traces;
  if (!Array.isArray(tracesRaw)) throw new Error("traces must be an array");
  const traces = tracesRaw.map(parseTrace);

  const labelsRaw = data.netLabels;
  if (!Array.isArray(labelsRaw)) throw new Error("netLabels must be an array");
  const netLabels = labelsRaw.map(parseNetLabel);

  const netlist = schemaVersion === "1.1" ? parseNetlist((data as any).netlist) : [];
  const layoutConstraints =
    schemaVersion === "1.1"
      ? parseLayoutConstraints((data as any).layoutConstraints)
      : { fixedPartIds: [], fixedHoles: [] };

  return {
    schemaVersion: SCHEMA_VERSION,
    meta,
    board,
    parts,
    traces,
    netlist,
    layoutConstraints,
    netLabels,
  };
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}
