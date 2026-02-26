import type { Hole, Placement, Project, Trace } from "./types";

export type AutoLayoutOptions = Readonly<{
  seed?: number;
  iterations?: number;
  allowRotate?: boolean;
  restarts?: number;
}>;

export type AutoLayoutResult = Readonly<{
  project: Project;
  warnings: readonly string[];
}>;

export type TraceBuildResult = Readonly<{
  traces: readonly Trace[];
  warnings: readonly string[];
  totalNetCount: number;
  routedNetCount: number;
  complete: boolean;
}>;

export type Candidate = Readonly<{
  placement: Placement;
  pins: readonly Hole[];
  center: Readonly<{ x: number; y: number }>;
}>;

export type NetTerminalPos = Readonly<{
  x: number;
  y: number;
}>;

export type PartBounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

export type RouteNet = Readonly<{
  id: string;
  name: string;
  terminals: readonly Hole[];
  terminalKeys: ReadonlySet<string>;
  blocked: ReadonlySet<string>;
}>;

export type RoutedNet = Readonly<{
  id: string;
  name: string;
  complete: boolean;
  paths: readonly (readonly Hole[])[];
}>;

export type RoutingIterationResult = Readonly<{
  routed: readonly RoutedNet[];
  occupancy: ReadonlyMap<string, number>;
  completeCount: number;
  overflow: number;
  totalLength: number;
}>;

export type RoutingSolution = Readonly<{
  routed: readonly RoutedNet[];
  completeCount: number;
  overflow: number;
  totalLength: number;
}>;

export type SearchNode = Readonly<{
  stateId: string;
  key: string;
  dir: number;
  g: number;
  f: number;
}>;
