import { describe, expect, it, vi } from "vitest";
import {
  LABEL_DEFAULT_OFFSET,
  LABEL_HEIGHT,
  LABEL_TEXT_OFFSET_X,
  LABEL_TEXT_OFFSET_Y,
  PITCH_PX,
  axisLabel,
  clamp,
  createBoardHoles,
  createViewSize,
  holeCenterPx,
  holeFromWorld,
  labelLeaderTarget,
  labelRect,
  labelWidth,
  labelTextPos,
  pointsAttr,
  svgPointFromEvent,
} from "./boardGeometry";

describe("boardGeometry", () => {
  it("clamps values", () => {
    expect(clamp(10, 0, 5)).toBe(5);
    expect(clamp(-1, 0, 5)).toBe(0);
    expect(clamp(3, 0, 5)).toBe(3);
  });

  it("maps world to hole and handles boundaries", () => {
    const board = { type: "perfboard" as const, width: 2, height: 2, labeling: { rows: "alpha" as const, cols: "numeric" as const } };
    expect(holeFromWorld({ x: 34, y: 26 }, board)).toEqual({ x: 0, y: 0 });
    expect(holeFromWorld({ x: 34 + 2 * PITCH_PX - 0.001, y: 26 + 2 * PITCH_PX - 0.001 }, board)).toEqual({ x: 1, y: 1 });
    expect(holeFromWorld({ x: 33, y: 26 }, board)).toBeNull();
    expect(holeFromWorld({ x: 34 + 2 * PITCH_PX, y: 26 }, board)).toBeNull();
  });

  it("computes holes/labels/points helpers", () => {
    expect(holeCenterPx({ x: 1, y: 2 })).toEqual({ x: 34 + 1.5 * PITCH_PX, y: 26 + 2.5 * PITCH_PX });
    expect(labelWidth("GND")).toBe(3 * 7 + 10);
    const rect = labelRect("GND", { x: 50, y: 60 });
    expect(rect).toEqual({ x: 50 + LABEL_DEFAULT_OFFSET.dx, y: 60 + LABEL_DEFAULT_OFFSET.dy, width: labelWidth("GND"), height: LABEL_HEIGHT });
    expect(labelRect("GND", { x: 10, y: 20 }, { dx: 1, dy: 2 })).toEqual({
      x: 11,
      y: 22,
      width: labelWidth("GND"),
      height: LABEL_HEIGHT,
    });
    expect(labelTextPos({ x: 5, y: 7 })).toEqual({ x: 5 + LABEL_TEXT_OFFSET_X, y: 7 + LABEL_TEXT_OFFSET_Y });
    expect(labelLeaderTarget({ x: 10, y: 20, width: 30, height: 18 })).toEqual({ x: 25, y: 29 });
    expect(pointsAttr([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toContain(",");
    expect(axisLabel("alpha", 0)).toBe("A");
    expect(axisLabel("numeric", 0)).toBe("1");
    expect(createViewSize({ type: "perfboard", width: 2, height: 3, labeling: { rows: "alpha", cols: "numeric" } })).toEqual({
      w: 34 + 2 * PITCH_PX + 12,
      h: 26 + 3 * PITCH_PX + 12,
    });
    expect(createBoardHoles({ type: "perfboard", width: 2, height: 2, labeling: { rows: "alpha", cols: "numeric" } })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it("converts svg points with CTM when available", () => {
    class FakeDOMPoint {
      constructor(public x: number, public y: number) {}
      matrixTransform() {
        return { x: this.x + 1, y: this.y + 2 };
      }
    }
    vi.stubGlobal("DOMPoint", FakeDOMPoint as unknown as typeof DOMPoint);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svg, "getScreenCTM", {
      value: () => ({ inverse: () => ({}) }),
    });
    const point = svgPointFromEvent(svg as SVGSVGElement, { clientX: 10, clientY: 20 } as WheelEvent);
    expect(point).toEqual({ x: 11, y: 22 });
  });

  it("falls back to viewbox-based conversion without CTM", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svg, "getScreenCTM", { value: () => null });
    Object.defineProperty(svg, "getBoundingClientRect", {
      value: () => ({ left: 10, top: 20, width: 100, height: 50 }),
    });
    Object.defineProperty(svg, "viewBox", {
      value: { baseVal: { width: 200, height: 100 } },
    });
    const point = svgPointFromEvent(svg as SVGSVGElement, { clientX: 60, clientY: 45 } as WheelEvent);
    expect(point).toEqual({ x: 100, y: 50 });
  });

  it("uses unit scale when viewbox is missing dimensions", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    Object.defineProperty(svg, "getScreenCTM", { value: () => null });
    Object.defineProperty(svg, "getBoundingClientRect", {
      value: () => ({ left: 10, top: 20, width: 100, height: 50 }),
    });
    Object.defineProperty(svg, "viewBox", {
      value: { baseVal: { width: 0, height: 0 } },
    });
    const point = svgPointFromEvent(svg as SVGSVGElement, { clientX: 60, clientY: 45 } as WheelEvent);
    expect(point).toEqual({ x: 50, y: 25 });
  });

  it("hits defensive malformed-board guard in holeFromWorld", () => {
    let widthCalls = 0;
    let heightCalls = 0;
    const weirdBoard = {
      type: "perfboard",
      width: {
        valueOf() {
          widthCalls += 1;
          return widthCalls === 1 ? Number.NaN : 0;
        },
      },
      height: {
        valueOf() {
          heightCalls += 1;
          return heightCalls === 1 ? Number.NaN : 0;
        },
      },
      labeling: { rows: "alpha", cols: "numeric" },
    } as any;

    expect(holeFromWorld({ x: 35, y: 27 }, weirdBoard)).toBeNull();
  });
});
