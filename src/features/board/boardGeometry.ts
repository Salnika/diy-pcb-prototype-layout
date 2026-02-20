import { alphaLabel } from "../../model";
import type { Board, Hole, NetLabel } from "../../model";
import type { PointerEvent as ReactPointerEvent } from "react";

export const PITCH_PX = 18;
export const GUTTER_LEFT = 34;
export const GUTTER_TOP = 26;
export const LABEL_CHAR_WIDTH = 7;
export const LABEL_HEIGHT = 18;
export const LABEL_PADDING_X = 10;
export const LABEL_TEXT_OFFSET_X = 5;
export const LABEL_TEXT_OFFSET_Y = 13;
export const LABEL_DEFAULT_OFFSET = { dx: 6, dy: -10 };

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function svgPointFromEvent(svg: SVGSVGElement, ev: ReactPointerEvent<SVGSVGElement> | WheelEvent) {
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scaleX = vb && vb.width ? vb.width / rect.width : 1;
  const scaleY = vb && vb.height ? vb.height / rect.height : 1;
  return { x: (ev.clientX - rect.left) * scaleX, y: (ev.clientY - rect.top) * scaleY };
}

export function holeFromWorld(world: { x: number; y: number }, board: Board): Hole | null {
  const localX = world.x - GUTTER_LEFT;
  const localY = world.y - GUTTER_TOP;
  if (localX < 0 || localY < 0) return null;
  const maxX = board.width * PITCH_PX;
  const maxY = board.height * PITCH_PX;
  if (localX >= maxX || localY >= maxY) return null;
  const x = Math.floor(localX / PITCH_PX);
  const y = Math.floor(localY / PITCH_PX);
  // Defensive guard kept for malformed board values; normal integer boards are filtered by bounds above.
  /* v8 ignore next */
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return { x, y };
}

export function holeCenterPx(hole: Hole): { x: number; y: number } {
  return {
    x: GUTTER_LEFT + (hole.x + 0.5) * PITCH_PX,
    y: GUTTER_TOP + (hole.y + 0.5) * PITCH_PX,
  };
}

export function labelWidth(name: string): number {
  return name.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X;
}

export function labelRect(
  name: string,
  holeCenter: { x: number; y: number },
  offset?: NetLabel["offset"],
): { x: number; y: number; width: number; height: number } {
  const dx = offset?.dx ?? LABEL_DEFAULT_OFFSET.dx;
  const dy = offset?.dy ?? LABEL_DEFAULT_OFFSET.dy;
  return {
    x: holeCenter.x + dx,
    y: holeCenter.y + dy,
    width: labelWidth(name),
    height: LABEL_HEIGHT,
  };
}

export function labelTextPos(rect: { x: number; y: number }): { x: number; y: number } {
  return { x: rect.x + LABEL_TEXT_OFFSET_X, y: rect.y + LABEL_TEXT_OFFSET_Y };
}

export function labelLeaderTarget(rect: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function pointsAttr(nodes: readonly Hole[]): string {
  return nodes
    .map((hole) => {
      const point = holeCenterPx(hole);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

export function axisLabel(kind: "alpha" | "numeric", index: number): string {
  return kind === "alpha" ? alphaLabel(index) : String(index + 1);
}

export function createViewSize(board: Board): { w: number; h: number } {
  const w = GUTTER_LEFT + board.width * PITCH_PX + 12;
  const h = GUTTER_TOP + board.height * PITCH_PX + 12;
  return { w, h };
}

export function createBoardHoles(board: Board): Hole[] {
  const all: Hole[] = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) all.push({ x, y });
  }
  return all;
}
