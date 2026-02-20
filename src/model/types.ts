export type SchemaVersion = "1.0" | "1.1";

export type Hole = Readonly<{
  x: number;
  y: number;
}>;

export type BoardLabeling = Readonly<{
  rows: "alpha" | "numeric";
  cols: "alpha" | "numeric";
}>;

export type Board = Readonly<{
  type: "perfboard";
  width: number;
  height: number;
  labeling: BoardLabeling;
}>;

export type Rotation = 0 | 90 | 180 | 270;

export type Placement = Readonly<{
  origin: Hole;
  rotation: Rotation;
  flip: boolean;
}>;

export type Inline2Footprint = Readonly<{
  type: "inline2";
  span: number;
  pinLabels?: readonly [string, string];
}>;

export type To92Inline3Footprint = Readonly<{
  type: "to92_inline3";
  pinNames?: readonly [string, string, string];
}>;

export type Free2Footprint = Readonly<{
  type: "free2";
  dx: number;
  dy: number;
  pinLabels?: readonly [string, string];
}>;

export type SingleFootprint = Readonly<{
  type: "single";
  pinLabel?: string;
}>;

export type DipFootprint = Readonly<{
  type: "dip";
  pins: number;
  rowSpan: 3;
}>;

export type Footprint =
  | Inline2Footprint
  | To92Inline3Footprint
  | Free2Footprint
  | SingleFootprint
  | DipFootprint;

export type PartKind =
  | "resistor"
  | "switch"
  | "diode"
  | "capacitor"
  | "capacitor_ceramic"
  | "capacitor_electrolytic"
  | "capacitor_film"
  | "transistor"
  | "potentiometer"
  | "jack"
  | "power_pos"
  | "power_neg"
  | "power_gnd"
  | "dip";

export type Part = Readonly<{
  id: string;
  ref: string;
  kind: PartKind;
  value?: string;
  placement: Placement;
  footprint: Footprint;
  properties?: Record<string, unknown>;
}>;

export type TraceKind = "wire" | "jumper";
export type Layer = "top" | "bottom";

export type Trace = Readonly<{
  id: string;
  kind: TraceKind;
  layer: Layer;
  nodes: readonly Hole[];
  color?: string;
}>;

export type NetTerminalPin = Readonly<{
  kind: "pin";
  partId: string;
  pinId: string;
}>;

export type NetTerminalHole = Readonly<{
  kind: "hole";
  hole: Hole;
}>;

export type NetTerminal = NetTerminalPin | NetTerminalHole;

export type Net = Readonly<{
  id: string;
  name?: string;
  terminals: readonly NetTerminal[];
}>;

export type LayoutConstraints = Readonly<{
  fixedPartIds: readonly string[];
  fixedHoles: readonly Hole[];
}>;

export type NetLabel = Readonly<{
  id: string;
  at: Hole;
  name: string;
  offset?: Readonly<{ dx: number; dy: number }>;
}>;

export type ProjectMeta = Readonly<{
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}>;

export type Project = Readonly<{
  schemaVersion: SchemaVersion;
  meta: ProjectMeta;
  board: Board;
  parts: readonly Part[];
  traces: readonly Trace[];
  netlist: readonly Net[];
  layoutConstraints: LayoutConstraints;
  netLabels: readonly NetLabel[];
}>;

export type PinRef = Readonly<{
  partId: string;
  ref: string;
  pinId: string;
  pinLabel: string;
  hole: Hole;
}>;
