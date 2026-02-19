import type { Placement } from "./types";

export const DEFAULT_ITERATIONS = 1800;
export const DEFAULT_RESTARTS = 5;
export const PIN_CLEARANCE = 1;
export const PART_MARGIN = 1;
export const ROTATIONS: readonly Placement["rotation"][] = [0, 90, 180, 270];

export const ROUTER_MAX_ITERATIONS = 28;
export const ROUTER_PRESENT_FACTOR_START = 0.7;
export const ROUTER_PRESENT_FACTOR_GROWTH = 1.35;
export const ROUTER_TURN_PENALTY = 0.45;
export const ROUTER_HISTORY_PENALTY = 1.1;
export const ROUTER_HISTORY_INCREMENT = 0.85;

export const ROUTER_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;
