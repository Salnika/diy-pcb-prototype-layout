import { describe, expect, it, vi } from "vitest";
import {
  BOARD_MAX,
  BOARD_MIN,
  clampBoardSize,
  convertPartKind,
  formatTerminal,
  INSPECTOR_COLLAPSE_KEY,
  isToolActive,
  netDisplayName,
  safeFilename,
  toggleBoardLabeling,
} from "./appUtils";
import { makeInline2Part } from "../test/fixtures";

describe("appUtils", () => {
  it("exports constants", () => {
    expect(BOARD_MIN).toBeLessThan(BOARD_MAX);
    expect(INSPECTOR_COLLAPSE_KEY).toContain("inspectorCollapsed");
  });

  it("checks active tool state", () => {
    expect(isToolActive({ type: "select" }, { type: "select" })).toBe(true);
    expect(isToolActive({ type: "wire" }, { type: "jumper" })).toBe(false);
    expect(isToolActive({ type: "placePart", kind: "resistor" }, { type: "placePart", kind: "resistor" })).toBe(true);
    expect(isToolActive({ type: "placePart", kind: "resistor" }, { type: "placePart", kind: "diode" })).toBe(false);
  });

  it("converts part kind while preserving id/value/placement", () => {
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Date, "now").mockReturnValue(1);
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    const part = makeInline2Part({ id: "p1", ref: "R12", kind: "resistor", value: "10k", origin: { x: 2, y: 2 } });
    const next = convertPartKind(part, "capacitor");
    expect(next.id).toBe("p1");
    expect(next.value).toBe("10k");
    expect(next.placement).toEqual(part.placement);
    expect(next.ref).toBe("C12");

    const noMatch = convertPartKind({ ...part, ref: "X?" }, "diode");
    expect(noMatch.ref).toBe("X?");
  });

  it("maps reference prefixes for all part kinds", () => {
    const part = makeInline2Part({ id: "p1", ref: "R99", kind: "resistor", value: "10k", origin: { x: 2, y: 2 } });
    const expectations = {
      resistor: "R99",
      switch: "SW99",
      capacitor: "C99",
      capacitor_ceramic: "C99",
      capacitor_electrolytic: "C99",
      capacitor_film: "C99",
      diode: "D99",
      transistor: "Q99",
      potentiometer: "RV99",
      jack: "J99",
      power_pos: "PWR99",
      power_neg: "PWR99",
      power_gnd: "PWR99",
      dip: "U99",
    } as const;

    for (const [kind, expectedRef] of Object.entries(expectations) as [keyof typeof expectations, string][]) {
      const converted = convertPartKind(part, kind);
      expect(converted.ref).toBe(expectedRef);
    }
  });

  it("formats names and labels", () => {
    expect(safeFilename("  my project !! ")).toBe("my-project");
    expect(safeFilename("   ")).toBe("project");
    expect(safeFilename("///")).toBe("project");
    expect(netDisplayName({ id: "n1", name: "  VCC ", terminals: [] }, 0)).toBe("VCC");
    expect(netDisplayName({ id: "n2", terminals: [] }, 1)).toBe("Net 2");

    const part = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 } });
    expect(formatTerminal({ kind: "hole", hole: { x: 0, y: 0 } }, [part], { rows: "alpha", cols: "numeric" })).toEqual({
      title: "A1",
      meta: "hole",
    });
    expect(formatTerminal({ kind: "pin", partId: "missing", pinId: "1" }, [part], { rows: "alpha", cols: "numeric" })).toEqual({
      title: "pin 1",
      meta: "part manquant",
    });
    expect(formatTerminal({ kind: "pin", partId: "p1", pinId: "1" }, [part], { rows: "alpha", cols: "numeric" })).toEqual({
      title: "R1.1",
      meta: "resistor",
    });
  });

  it("clamps board size and toggles labeling", () => {
    expect(clampBoardSize(0)).toBe(BOARD_MIN);
    expect(clampBoardSize(999)).toBe(BOARD_MAX);
    expect(clampBoardSize(10.6)).toBe(11);
    expect(toggleBoardLabeling({ rows: "alpha", cols: "numeric" })).toEqual({ rows: "numeric", cols: "alpha" });
    expect(toggleBoardLabeling({ rows: "numeric", cols: "alpha" })).toEqual({ rows: "alpha", cols: "numeric" });
  });
});
