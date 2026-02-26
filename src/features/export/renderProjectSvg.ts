import {
  alphaLabel,
  computeNetIndex,
  getPartPins,
  holeKey,
  netColor,
  numericLabel,
} from "../../model";
import type { Hole, Part, Project, Trace } from "../../model";
import { buildSchematicSymbol } from "../render/schematicSymbols";

const PITCH_PX = 18;
const GUTTER_LEFT = 34;
const GUTTER_TOP = 26;
const LABEL_CHAR_WIDTH = 7;
const LABEL_HEIGHT = 18;
const LABEL_PADDING_X = 10;
const LABEL_TEXT_OFFSET_X = 5;
const LABEL_TEXT_OFFSET_Y = 13;
const LABEL_DEFAULT_OFFSET = { dx: 6, dy: -10 };

function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function holeCenterPx(hole: Hole): { x: number; y: number } {
  return {
    x: GUTTER_LEFT + (hole.x + 0.5) * PITCH_PX,
    y: GUTTER_TOP + (hole.y + 0.5) * PITCH_PX,
  };
}

function pointsAttr(nodes: readonly Hole[]): string {
  return nodes
    .map((h) => {
      const p = holeCenterPx(h);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

function labelWidth(name: string): number {
  return name.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X;
}

function labelRect(
  name: string,
  holeCenter: { x: number; y: number },
  offset?: { dx: number; dy: number },
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

function labelTextPos(rect: { x: number; y: number }): { x: number; y: number } {
  return { x: rect.x + LABEL_TEXT_OFFSET_X, y: rect.y + LABEL_TEXT_OFFSET_Y };
}

function labelLeaderTarget(rect: { x: number; y: number; width: number; height: number }): {
  x: number;
  y: number;
} {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function axisLabel(kind: "alpha" | "numeric", index: number): string {
  return kind === "alpha" ? alphaLabel(index) : numericLabel(index);
}

function renderTrace(trace: Trace, netIndex: ReturnType<typeof computeNetIndex>): string {
  const first = trace.nodes[0];
  const netId = first ? (netIndex.holeToNetId.get(holeKey(first)) ?? trace.id) : trace.id;
  const name = netIndex.netIdToName.get(netId);
  const color = trace.color ?? netColor(netId, name);

  return `<polyline points="${esc(pointsAttr(trace.nodes))}" style="fill:none;stroke:${color};stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;opacity:0.95" />`;
}

function renderPart(part: Part): string {
  const pins = getPartPins(part);
  const pinGeometries = pins.map((pin) => ({
    pinId: pin.pinId,
    pinLabel: pin.pinLabel,
    center: holeCenterPx(pin.hole),
  }));
  const fallbackLabelX =
    pinGeometries.reduce((s, p) => s + p.center.x, 0) / Math.max(1, pinGeometries.length);
  const fallbackLabelY =
    pinGeometries.reduce((s, p) => s + p.center.y, 0) / Math.max(1, pinGeometries.length) - 10;

  const symbol = buildSchematicSymbol(part, pinGeometries);
  const labelAnchor = symbol.refAnchor ?? { x: fallbackLabelX, y: fallbackLabelY };
  const partValue = part.value?.trim();
  const isDip = part.footprint.type === "dip";
  const refLabelY = isDip && partValue ? labelAnchor.y - 5 : labelAnchor.y;
  const valueLabelY = isDip ? labelAnchor.y + 5 : labelAnchor.y + 10;

  const bodyFillStyle =
    "fill:rgba(255,255,255,0.04);stroke:rgba(238,240,255,0.45);stroke-width:2;stroke-linejoin:round;stroke-linecap:round";
  const bodyStrokeStyle =
    "fill:none;stroke:rgba(238,240,255,0.45);stroke-width:2;stroke-linejoin:round;stroke-linecap:round";
  const pin1Style = "fill:#6ea8fe;stroke:rgba(17,18,24,0.8);stroke-width:1";
  const pinTextStyle =
    "fill:#aab0d6;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:8";

  const primitives = symbol.primitives
    .map((primitive) => {
      const style =
        primitive.role === "pin1"
          ? pin1Style
          : primitive.type === "line" || primitive.type === "polyline"
            ? bodyStrokeStyle
            : bodyFillStyle;
      switch (primitive.type) {
        case "line":
          return `<line x1="${primitive.x1}" y1="${primitive.y1}" x2="${primitive.x2}" y2="${primitive.y2}" style="${style}" />`;
        case "rect":
          return `<rect x="${primitive.x}" y="${primitive.y}" width="${primitive.width}" height="${primitive.height}" rx="${primitive.rx ?? 0}" style="${style}" />`;
        case "circle":
          return `<circle cx="${primitive.cx}" cy="${primitive.cy}" r="${primitive.r}" style="${style}" />`;
        case "polyline":
          return `<polyline points="${esc(primitive.points)}" style="${style}" />`;
        case "polygon":
          return `<polygon points="${esc(primitive.points)}" style="${style}" />`;
      }
    })
    .join("");

  const pinCircles = pins
    .map((pin) => {
      const c = holeCenterPx(pin.hole);
      return `<circle cx="${c.x}" cy="${c.y}" r="3" style="fill:rgba(238,240,255,0.9);stroke:rgba(17,18,24,0.8);stroke-width:1" />`;
    })
    .join("");

  const text = `<text x="${labelAnchor.x}" y="${refLabelY}" text-anchor="middle" style="fill:#eef0ff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:11">${esc(
    part.ref,
  )}</text>${
    partValue
      ? `<text x="${labelAnchor.x}" y="${
          valueLabelY
        }" text-anchor="middle" style="fill:#aab0d6;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:9">${esc(
          partValue,
        )}</text>`
      : ""
  }`;

  const pinTexts = symbol.texts
    .map(
      (t) =>
        `<text x="${t.x}" y="${t.y}" text-anchor="${t.textAnchor}" style="${pinTextStyle}">${esc(
          t.text,
        )}</text>`,
    )
    .join("");

  return `<g>${primitives}${text}${pinTexts}${pinCircles}</g>`;
}

export function renderProjectSvg(project: Project): { svg: string; width: number; height: number } {
  const { board } = project;
  const width = GUTTER_LEFT + board.width * PITCH_PX + 12;
  const height = GUTTER_TOP + board.height * PITCH_PX + 12;

  const netIndex = computeNetIndex(project);

  const labelsTop = Array.from({ length: board.width })
    .map((_, x) => {
      const cx = GUTTER_LEFT + (x + 0.5) * PITCH_PX;
      return `<text x="${cx}" y="16" text-anchor="middle" style="fill:#aab0d6;font-size:11;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${esc(
        axisLabel(board.labeling.cols, x),
      )}</text>`;
    })
    .join("");

  const labelsLeft = Array.from({ length: board.height })
    .map((_, y) => {
      const cy = GUTTER_TOP + (y + 0.5) * PITCH_PX + 4;
      return `<text x="16" y="${cy}" text-anchor="middle" style="fill:#aab0d6;font-size:11;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${esc(
        axisLabel(board.labeling.rows, y),
      )}</text>`;
    })
    .join("");

  const boardBg = `<rect x="${GUTTER_LEFT}" y="${GUTTER_TOP}" width="${board.width * PITCH_PX}" height="${
    board.height * PITCH_PX
  }" rx="10" style="fill:rgba(255,255,255,0.03);stroke:rgba(238,240,255,0.12)" />`;

  const traces = project.traces.map((t) => renderTrace(t, netIndex)).join("");
  const parts = project.parts.map(renderPart).join("");

  const netLabels = project.netLabels
    .map((nl) => {
      const c = holeCenterPx(nl.at);
      const rect = labelRect(nl.name, c, nl.offset);
      const textPos = labelTextPos(rect);
      const leaderTarget = labelLeaderTarget(rect);
      const netId = netIndex.holeToNetId.get(holeKey(nl.at)) ?? nl.id;
      const netName = netIndex.netIdToName.get(netId) ?? nl.name;
      const color = netColor(netId, netName);
      return `<g><line x1="${c.x}" y1="${c.y}" x2="${leaderTarget.x}" y2="${leaderTarget.y}" style="stroke:${color};stroke-width:1.4;stroke-dasharray:4 4;opacity:0.8" /><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="6" style="fill:rgba(255,255,255,0.05);stroke:rgba(238,240,255,0.12)" /><text x="${textPos.x}" y="${textPos.y}" style="fill:#eef0ff;font-size:11;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${esc(
        nl.name,
      )}</text></g>`;
    })
    .join("");

  const holes = (() => {
    let out = "";
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const cx = GUTTER_LEFT + (x + 0.5) * PITCH_PX;
        const cy = GUTTER_TOP + (y + 0.5) * PITCH_PX;
        out += `<circle cx="${cx}" cy="${cy}" r="1.8" style="fill:rgba(238,240,255,0.14)" />`;
      }
    }
    return out;
  })();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" style="fill:#0b0c10" />
  ${labelsTop}
  ${labelsLeft}
  ${boardBg}
  ${traces}
  ${parts}
  ${netLabels}
  ${holes}
</svg>`;

  return { svg, width, height };
}
