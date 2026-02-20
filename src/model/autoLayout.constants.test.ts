import { describe, expect, it } from "vitest";
import {
  DEFAULT_ITERATIONS,
  DEFAULT_RESTARTS,
  PART_MARGIN,
  PIN_CLEARANCE,
  ROTATIONS,
  ROUTER_DIRECTIONS,
  ROUTER_HISTORY_INCREMENT,
  ROUTER_HISTORY_PENALTY,
  ROUTER_MAX_ITERATIONS,
  ROUTER_PRESENT_FACTOR_GROWTH,
  ROUTER_PRESENT_FACTOR_START,
  ROUTER_TURN_PENALTY,
} from "./autoLayout.constants";

describe("autoLayout constants", () => {
  it("exposes expected constants", () => {
    expect(DEFAULT_ITERATIONS).toBeGreaterThan(0);
    expect(DEFAULT_RESTARTS).toBeGreaterThan(0);
    expect(PIN_CLEARANCE).toBe(1);
    expect(PART_MARGIN).toBe(1);
    expect(ROTATIONS).toEqual([0, 90, 180, 270]);
    expect(ROUTER_MAX_ITERATIONS).toBeGreaterThan(0);
    expect(ROUTER_PRESENT_FACTOR_START).toBeGreaterThan(0);
    expect(ROUTER_PRESENT_FACTOR_GROWTH).toBeGreaterThan(1);
    expect(ROUTER_TURN_PENALTY).toBeGreaterThan(0);
    expect(ROUTER_HISTORY_PENALTY).toBeGreaterThan(0);
    expect(ROUTER_HISTORY_INCREMENT).toBeGreaterThan(0);
    expect(ROUTER_DIRECTIONS).toHaveLength(4);
  });
});
