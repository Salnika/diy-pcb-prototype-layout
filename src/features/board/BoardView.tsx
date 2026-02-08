import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  alphaLabel,
  computeNetIndex,
  createId,
  getPartPins,
  holeKey,
  holeLabel,
  isWithinBoard,
  netColor,
} from "../../model";
import type { Hole, NetLabel, NetTerminal, Part, PartKind, Rotation, Trace } from "../../model";
import { makeDefaultPart, useAppDispatch, useAppState } from "../../app/store";
import * as styles from "./BoardView.css";
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isInline2Kind(kind: PartKind): boolean {
  return (
    kind === "resistor" ||
    kind === "diode" ||
    kind === "capacitor" ||
    kind === "capacitor_ceramic" ||
    kind === "capacitor_electrolytic" ||
    kind === "capacitor_film"
  );
}

function sameTerminal(a: NetTerminal, b: NetTerminal): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "pin" && b.kind === "pin") {
    return a.partId === b.partId && a.pinId === b.pinId;
  }
  if (a.kind === "hole" && b.kind === "hole") {
    return a.hole.x === b.hole.x && a.hole.y === b.hole.y;
  }
  return false;
}

function twoPinPlacementFromPins(
  pin1: Hole,
  pin2: Hole,
  pinLabels?: readonly [string, string],
): { origin: Hole; rotation: Rotation; footprint: { type: "inline2"; span: number; pinLabels?: readonly [string, string] } | { type: "free2"; dx: number; dy: number; pinLabels?: readonly [string, string] } } | null {
  const dx = pin2.x - pin1.x;
  const dy = pin2.y - pin1.y;
  if (dx === 0 && dy === 0) return null;
  if (dx === 0 || dy === 0) {
    if (dx > 0) {
      return { origin: pin1, rotation: 0, footprint: { type: "inline2", span: dx, pinLabels } };
    }
    if (dx < 0) {
      return { origin: pin1, rotation: 180, footprint: { type: "inline2", span: Math.abs(dx), pinLabels } };
    }
    if (dy > 0) {
      return { origin: pin1, rotation: 90, footprint: { type: "inline2", span: dy, pinLabels } };
    }
    return { origin: pin1, rotation: 270, footprint: { type: "inline2", span: Math.abs(dy), pinLabels } };
  }
  return { origin: pin1, rotation: 0, footprint: { type: "free2", dx, dy, pinLabels } };
}

function applyInline2Placement(part: Part, pin1: Hole, pin2: Hole): Part | null {
  if (part.footprint.type !== "inline2" && part.footprint.type !== "free2") return null;
  const pinLabels = part.footprint.pinLabels;
  const placement = twoPinPlacementFromPins(pin1, pin2, pinLabels);
  if (!placement) return null;
  return {
    ...part,
    placement: { ...part.placement, origin: placement.origin, rotation: placement.rotation },
    footprint: placement.footprint,
  };
}

function createInline2Part(kind: PartKind, pin1: Hole, pin2: Hole): Part | null {
  const part = makeDefaultPart(kind, pin1);
  if (part.footprint.type !== "inline2") return null;
  const placement = twoPinPlacementFromPins(pin1, pin2, part.footprint.pinLabels);
  if (!placement) return null;
  return {
    ...part,
    placement: { ...part.placement, origin: placement.origin, rotation: placement.rotation },
    footprint: placement.footprint,
  };
}

function svgPointFromEvent(svg: SVGSVGElement, ev: ReactPointerEvent<SVGSVGElement> | WheelEvent) {
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

function holeFromWorld(world: { x: number; y: number }, board: { width: number; height: number }): Hole | null {
  const localX = world.x - GUTTER_LEFT;
  const localY = world.y - GUTTER_TOP;
  if (localX < 0 || localY < 0) return null;
  const maxX = board.width * PITCH_PX;
  const maxY = board.height * PITCH_PX;
  if (localX >= maxX || localY >= maxY) return null;
  const x = Math.floor(localX / PITCH_PX);
  const y = Math.floor(localY / PITCH_PX);
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return { x, y };
}

function holeCenterPx(hole: Hole): { x: number; y: number } {
  return {
    x: GUTTER_LEFT + (hole.x + 0.5) * PITCH_PX,
    y: GUTTER_TOP + (hole.y + 0.5) * PITCH_PX,
  };
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

function labelLeaderTarget(rect: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function pointsAttr(nodes: readonly Hole[]): string {
  return nodes
    .map((h) => {
      const p = holeCenterPx(h);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

function axisLabel(kind: "alpha" | "numeric", index: number): string {
  return kind === "alpha" ? alphaLabel(index) : String(index + 1);
}

export function BoardView() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{
    pointerId: number;
    start: { x: number; y: number };
    pan: { x: number; y: number };
  } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    partId: string;
    startPointerHole: Hole;
    startOrigin: Hole;
  } | null>(null);
  const stretchRef = useRef<{
    pointerId: number;
    partId: string;
    movingPinId: "1" | "2";
    fixedHole: Hole;
  } | null>(null);
  const traceDragRef = useRef<{
    pointerId: number;
    traceId: string;
    endpoint: "start" | "end";
  } | null>(null);
  const labelDragRef = useRef<{
    pointerId: number;
    labelId: string;
    grabOffset: { x: number; y: number };
  } | null>(null);
  const labelDraftRef = useRef<{
    pointerId: number;
    grabOffset: { x: number; y: number };
  } | null>(null);
  const inline2DraftRef = useRef<{
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<Part | null>(null);
  const [traceDragPreview, setTraceDragPreview] = useState<Trace | null>(null);
  const [labelDragPreview, setLabelDragPreview] = useState<NetLabel | null>(null);
  const [labelDraft, setLabelDraft] = useState<NetLabel | null>(null);
  const [inline2DraftStart, setInline2DraftStart] = useState<Hole | null>(null);
  const [connectDraft, setConnectDraft] = useState<NetTerminal | null>(null);

  const { board } = state.project;
  const { viewport, tool, selection, traceDraft } = state.ui;

  const netIndex = useMemo(() => computeNetIndex(state.project), [state.project]);
  const fixedPartIds = useMemo(
    () => new Set(state.project.layoutConstraints.fixedPartIds),
    [state.project.layoutConstraints.fixedPartIds],
  );
  const fixedHoles = state.project.layoutConstraints.fixedHoles;
  const hoverNetId = state.ui.hoverHole
    ? netIndex.holeToNetId.get(holeKey(state.ui.hoverHole)) ?? null
    : null;
  const selectedNetId = useMemo(() => {
    if (selection.type === "trace") {
      const tr = state.project.traces.find((t) => t.id === selection.id);
      const first = tr?.nodes[0];
      if (first) return netIndex.holeToNetId.get(holeKey(first)) ?? null;
    }
    if (selection.type === "netLabel") {
      const l = state.project.netLabels.find((nl) => nl.id === selection.id);
      if (l) return netIndex.holeToNetId.get(holeKey(l.at)) ?? null;
    }
    if (selection.type === "part") {
      const p = state.project.parts.find((pt) => pt.id === selection.id);
      const pin = p ? getPartPins(p)[0] : undefined;
      if (pin) return netIndex.holeToNetId.get(holeKey(pin.hole)) ?? null;
    }
    return null;
  }, [netIndex.holeToNetId, selection, state.project.netLabels, state.project.parts, state.project.traces]);
  const activeNetId = hoverNetId ?? selectedNetId;
  const selectedNet = selection.type === "net" ? state.project.netlist.find((n) => n.id === selection.id) : null;

  const viewSize = useMemo(() => {
    const w = GUTTER_LEFT + board.width * PITCH_PX + 12;
    const h = GUTTER_TOP + board.height * PITCH_PX + 12;
    return { w, h };
  }, [board.height, board.width]);

  const holes = useMemo(() => {
    const all: Hole[] = [];
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) all.push({ x, y });
    }
    return all;
  }, [board.height, board.width]);

  const pinAtHole = useMemo(() => {
    const map = new Map<string, { partId: string; pinId: string }>();
    for (const part of state.project.parts) {
      for (const pin of getPartPins(part)) {
        map.set(holeKey(pin.hole), { partId: part.id, pinId: pin.pinId });
      }
    }
    return map;
  }, [state.project.parts]);

  function terminalFromHole(hole: Hole): NetTerminal {
    const pin = pinAtHole.get(holeKey(hole));
    if (pin) return { kind: "pin", partId: pin.partId, pinId: pin.pinId };
    return { kind: "hole", hole };
  }

  function holeFromTerminal(terminal: NetTerminal): Hole | null {
    if (terminal.kind === "hole") return terminal.hole;
    const part = state.project.parts.find((p) => p.id === terminal.partId);
    if (!part) return null;
    const pin = getPartPins(part).find((p) => p.pinId === terminal.pinId);
    return pin?.hole ?? null;
  }

  function resetInline2Draft() {
    inline2DraftRef.current = null;
    setInline2DraftStart(null);
  }

  function startInline2Stretch(part: Part, movingPinId: "1" | "2", ev: React.PointerEvent<SVGCircleElement>) {
    if (tool.type !== "select") return;
    if (fixedPartIds.has(part.id)) return;
    const pins = getPartPins(part);
    const pin1 = pins.find((p) => p.pinId === "1") ?? pins[0];
    const pin2 = pins.find((p) => p.pinId === "2") ?? pins[1];
    if (!pin1 || !pin2) return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(ev.pointerId);
    stretchRef.current = {
      pointerId: ev.pointerId,
      partId: part.id,
      movingPinId,
      fixedHole: movingPinId === "1" ? pin2.hole : pin1.hole,
    };
    dispatch({ type: "SELECT", selection: { type: "part", id: part.id } });
    setDragPreview(part);
  }

  function startTraceDrag(trace: Trace, endpoint: "start" | "end", ev: React.PointerEvent<SVGCircleElement>) {
    if (tool.type !== "select") return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(ev.pointerId);
    traceDragRef.current = { pointerId: ev.pointerId, traceId: trace.id, endpoint };
    setTraceDragPreview(trace);
    dispatch({ type: "SELECT", selection: { type: "trace", id: trace.id } });
  }

  function startLabelDrag(label: NetLabel, ev: React.PointerEvent<SVGGElement>) {
    if (tool.type !== "select") return;
    const world = worldFromPointerEvent(ev as unknown as React.PointerEvent<SVGSVGElement>);
    if (!world) return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(ev.pointerId);
    const c = holeCenterPx(label.at);
    const rect = labelRect(label.name, c, label.offset);
    labelDragRef.current = {
      pointerId: ev.pointerId,
      labelId: label.id,
      grabOffset: { x: world.x - rect.x, y: world.y - rect.y },
    };
    setLabelDragPreview(label);
  }

  function placeInline2FromPins(kind: PartKind, pin1: Hole, pin2: Hole) {
    const part = createInline2Part(kind, pin1, pin2);
    if (!part) return false;
    dispatch({ type: "ADD_PART", part });
    dispatch({ type: "SELECT", selection: { type: "part", id: part.id } });
    return true;
  }

  useEffect(() => {
    if (tool.type !== "placePart" || !isInline2Kind(tool.kind)) {
      resetInline2Draft();
    }
  }, [tool]);

  useEffect(() => {
    if (tool.type !== "connect" && connectDraft) {
      setConnectDraft(null);
    }
  }, [connectDraft, tool.type]);

  function worldFromPointerEvent(ev: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const s = svgPointFromEvent(svg, ev);
    return { x: (s.x - viewport.pan.x) / viewport.scale, y: (s.y - viewport.pan.y) / viewport.scale };
  }

  function holeFromPointerEvent(ev: React.PointerEvent<SVGSVGElement>): Hole | null {
    const world = worldFromPointerEvent(ev);
    if (!world) return null;
    return holeFromWorld(world, board);
  }

  function setHoverFromPointer(ev: React.PointerEvent<SVGSVGElement>) {
    const hole = holeFromPointerEvent(ev);
    dispatch({ type: "SET_HOVER_HOLE", hole });
  }

  function onWheel(ev: React.WheelEvent<SVGSVGElement>) {
    ev.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const p = svgPointFromEvent(svg, ev.nativeEvent);

    const scale = viewport.scale;
    const worldX = (p.x - viewport.pan.x) / scale;
    const worldY = (p.y - viewport.pan.y) / scale;

    const delta = -ev.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const newScale = clamp(scale * factor, 0.35, 6);
    const newPan = { x: p.x - worldX * newScale, y: p.y - worldY * newScale };
    dispatch({ type: "SET_VIEWPORT", viewport: { scale: newScale, pan: newPan } });
  }

  function onPointerDown(ev: React.PointerEvent<SVGSVGElement>) {
    if (ev.button === 1 || ev.button === 2) {
      const svg = svgRef.current;
      if (!svg) return;
      svg.setPointerCapture(ev.pointerId);
      const start = svgPointFromEvent(svg, ev);
      panRef.current = {
        pointerId: ev.pointerId,
        start,
        pan: { ...viewport.pan },
      };
      return;
    }

    if (ev.button !== 0) return;

    const hole = holeFromPointerEvent(ev);
    if (!hole) {
      if (tool.type === "select") dispatch({ type: "SELECT", selection: { type: "none" } });
      return;
    }

    if (tool.type === "placePart") {
      if (isInline2Kind(tool.kind)) {
        if (!inline2DraftStart) {
          const svg = svgRef.current;
          if (svg) svg.setPointerCapture(ev.pointerId);
          inline2DraftRef.current = { pointerId: ev.pointerId, moved: false };
          setInline2DraftStart(hole);
          return;
        }
        const placed = placeInline2FromPins(tool.kind, inline2DraftStart, hole);
        if (placed) resetInline2Draft();
        return;
      }
      const part = makeDefaultPart(tool.kind, hole);
      dispatch({ type: "ADD_PART", part });
      dispatch({ type: "SELECT", selection: { type: "part", id: part.id } });
      return;
    }

    if (tool.type === "connect") {
      const terminal = terminalFromHole(hole);
      if (connectDraft && sameTerminal(connectDraft, terminal)) {
        setConnectDraft(null);
        return;
      }

      if (connectDraft) {
        if (selection.type === "net") {
          dispatch({ type: "ADD_NET_TERMINAL", id: selection.id, terminal: connectDraft });
          dispatch({ type: "ADD_NET_TERMINAL", id: selection.id, terminal });
          setConnectDraft(null);
          return;
        }
        const netId = createId("net");
        dispatch({
          type: "ADD_NET",
          net: { id: netId, terminals: [connectDraft, terminal] },
        });
        dispatch({ type: "SELECT", selection: { type: "net", id: netId } });
        setConnectDraft(null);
        return;
      }

      if (selection.type === "net") {
        dispatch({ type: "ADD_NET_TERMINAL", id: selection.id, terminal });
        return;
      }

      setConnectDraft(terminal);
      return;
    }

    if (tool.type === "fixedPoint") {
      dispatch({ type: "TOGGLE_FIXED_HOLE", hole });
      return;
    }

    if (tool.type === "wire" || tool.type === "jumper") {
      const kind = tool.type === "wire" ? "wire" : "jumper";
      if (!traceDraft) {
        dispatch({ type: "START_TRACE", kind, start: hole });
      } else {
        dispatch({ type: "ADD_TRACE_NODE", hole });
      }
      return;
    }

    if (tool.type === "label") {
      if (labelDraft) return;
      const netId = netIndex.holeToNetId.get(holeKey(hole));
      const suggested = netId ? netIndex.netIdToName.get(netId) ?? "" : "";
      const name = window.prompt("Nom du net (ex: GND, VCC)", suggested) ?? "";
      const trimmed = name.trim();
      if (!trimmed) return;
      const svg = svgRef.current;
      if (svg) svg.setPointerCapture(ev.pointerId);
      const label: NetLabel = { id: createId("nl"), at: hole, name: trimmed, offset: { ...LABEL_DEFAULT_OFFSET } };
      const world = worldFromPointerEvent(ev);
      if (world) {
        const c = holeCenterPx(hole);
        const rect = labelRect(label.name, c, label.offset);
        labelDraftRef.current = {
          pointerId: ev.pointerId,
          grabOffset: { x: world.x - rect.x, y: world.y - rect.y },
        };
      } else {
        labelDraftRef.current = {
          pointerId: ev.pointerId,
          grabOffset: { x: labelWidth(label.name) / 2, y: LABEL_HEIGHT / 2 },
        };
      }
      setLabelDraft(label);
      return;
    }

    if (tool.type === "select") {
      dispatch({ type: "SELECT", selection: { type: "none" } });
    }
  }

  function onDoubleClick() {
    if (traceDraft) dispatch({ type: "FINISH_TRACE" });
  }

  function startPartDrag(part: Part, ev: React.PointerEvent<SVGGElement>) {
    if (tool.type !== "select") return;
    if (fixedPartIds.has(part.id)) return;
    const hole = holeFromPointerEvent(ev as unknown as React.PointerEvent<SVGSVGElement>);
    if (!hole) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(ev.pointerId);
    dragRef.current = {
      pointerId: ev.pointerId,
      partId: part.id,
      startPointerHole: hole,
      startOrigin: part.placement.origin,
    };
    setDragPreview(part);
  }

  function validatePart(part: Part): boolean {
    for (const pin of getPartPins(part)) {
      if (!isWithinBoard(board, pin.hole)) return false;
    }
    return true;
  }

  function traceNetId(trace: Trace): string | null {
    const first = trace.nodes[0];
    if (!first) return null;
    return netIndex.holeToNetId.get(holeKey(first)) ?? null;
  }

  function renderTrace(trace: Trace) {
    const isSelected = selection.type === "trace" && selection.id === trace.id;
    const netId = traceNetId(trace);
    const name = netId ? netIndex.netIdToName.get(netId) : undefined;
    const color = netColor(netId ?? trace.id, name);
    const isHot = activeNetId && netId === activeNetId;
    const canHit = tool.type === "select" || tool.type === "erase";
    const showHandles = tool.type === "select" && isSelected && trace.nodes.length >= 2;
    const start = trace.nodes[0];
    const end = trace.nodes[trace.nodes.length - 1];

    return (
      <g key={trace.id}>
        <polyline
          points={pointsAttr(trace.nodes)}
          className={isSelected ? styles.traceSelected : isHot ? styles.traceHot : styles.trace}
          style={{ stroke: color }}
          pointerEvents={canHit ? "stroke" : "none"}
          onPointerDown={(ev) => {
            if (!canHit || ev.button !== 0) return;
            ev.stopPropagation();
            if (tool.type === "erase") {
              dispatch({ type: "DELETE_TRACE", id: trace.id });
              return;
            }
            dispatch({ type: "SELECT", selection: { type: "trace", id: trace.id } });
          }}
        />
        {showHandles && start && end ? (
          <>
            <circle
              cx={holeCenterPx(start).x}
              cy={holeCenterPx(start).y}
              r={6}
              className={styles.traceHandle}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                startTraceDrag(trace, "start", ev);
              }}
            />
            <circle
              cx={holeCenterPx(end).x}
              cy={holeCenterPx(end).y}
              r={6}
              className={styles.traceHandle}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                startTraceDrag(trace, "end", ev);
              }}
            />
          </>
        ) : null}
      </g>
    );
  }

  function renderPart(part: Part, opts: { ghost?: boolean }) {
    const selected = selection.type === "part" && selection.id === part.id;
    const canHit = !opts.ghost && (tool.type === "select" || tool.type === "erase");
    const locked = fixedPartIds.has(part.id);

    const pins = getPartPins(part);
    const pinGeometries = pins.map((pin) => ({
      pinId: pin.pinId,
      pinLabel: pin.pinLabel,
      center: holeCenterPx(pin.hole),
    }));
    const valid = validatePart(part);

    const bodyClass = selected ? styles.partBodySelected : valid ? styles.partBody : styles.partBodyInvalid;
    const symbol = buildSchematicSymbol(part, pinGeometries);
    const fallbackLabelX =
      pinGeometries.reduce((s, p) => s + p.center.x, 0) / Math.max(1, pinGeometries.length);
    const fallbackLabelY =
      pinGeometries.reduce((s, p) => s + p.center.y, 0) / Math.max(1, pinGeometries.length) - 10;
    const labelAnchor = symbol.refAnchor ?? { x: fallbackLabelX, y: fallbackLabelY };
    const lockPos = { x: labelAnchor.x + 10, y: labelAnchor.y - 10 };

    return (
      <g
        key={part.id}
        opacity={opts.ghost ? 0.55 : 1}
        pointerEvents={canHit ? "all" : "none"}
        onPointerDown={(ev) => {
          if (!canHit || ev.button !== 0) return;
          ev.stopPropagation();
          if (tool.type === "erase") {
            dispatch({ type: "DELETE_PART", id: part.id });
            return;
          }
          dispatch({ type: "SELECT", selection: { type: "part", id: part.id } });
          startPartDrag(part, ev);
        }}
      >
        {symbol.primitives.map((primitive, idx) => {
          const className = primitive.role === "pin1" ? styles.partPin1Marker : bodyClass;
          switch (primitive.type) {
            case "line":
              return (
                <line
                  key={`prim-${idx}`}
                  x1={primitive.x1}
                  y1={primitive.y1}
                  x2={primitive.x2}
                  y2={primitive.y2}
                  className={className}
                />
              );
            case "rect":
              return (
                <rect
                  key={`prim-${idx}`}
                  x={primitive.x}
                  y={primitive.y}
                  width={primitive.width}
                  height={primitive.height}
                  rx={primitive.rx ?? 0}
                  className={className}
                />
              );
            case "circle":
              return (
                <circle
                  key={`prim-${idx}`}
                  cx={primitive.cx}
                  cy={primitive.cy}
                  r={primitive.r}
                  className={className}
                />
              );
            case "polyline":
              return (
                <polyline
                  key={`prim-${idx}`}
                  points={primitive.points}
                  className={className}
                  style={{ fill: "none" }}
                />
              );
            case "polygon":
              return <polygon key={`prim-${idx}`} points={primitive.points} className={className} />;
          }
        })}

        <text x={labelAnchor.x} y={labelAnchor.y} textAnchor="middle" className={styles.partLabel}>
          {part.ref}
        </text>
        {locked ? (
          <circle cx={lockPos.x} cy={lockPos.y} r={3.5} className={styles.partLockMarker} />
        ) : null}
        {symbol.texts.map((t, idx) => (
          <text
            key={`pt-${idx}`}
            x={t.x}
            y={t.y}
            textAnchor={t.textAnchor}
            className={styles.partPinLabel}
            pointerEvents="none"
          >
            {t.text}
          </text>
        ))}
        {pins.map((pin) => {
          const c = holeCenterPx(pin.hole);
          return (
            <circle key={pin.pinId} cx={c.x} cy={c.y} r={3} className={styles.partPin} pointerEvents="none" />
          );
        })}
        {!opts.ghost &&
        (part.footprint.type === "inline2" || part.footprint.type === "free2") &&
        tool.type === "select"
          ? (() => {
              const pin1 = pins.find((p) => p.pinId === "1") ?? pins[0];
              const pin2 = pins.find((p) => p.pinId === "2") ?? pins[1];
              if (!pin1 || !pin2) return null;
              const c1 = holeCenterPx(pin1.hole);
              const c2 = holeCenterPx(pin2.hole);
              return (
                <>
                  <circle
                    cx={c1.x}
                    cy={c1.y}
                    r={6}
                    className={styles.partPinHandle}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      startInline2Stretch(part, "1", ev);
                    }}
                  />
                  <circle
                    cx={c2.x}
                    cy={c2.y}
                    r={6}
                    className={styles.partPinHandle}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      startInline2Stretch(part, "2", ev);
                    }}
                  />
                </>
              );
            })()
          : null}
      </g>
    );
  }

  function renderNetLabel(label: NetLabel, opts: { ghost?: boolean }) {
    const c = holeCenterPx(label.at);
    const rect = labelRect(label.name, c, label.offset);
    const textPos = labelTextPos(rect);
    const leaderTarget = labelLeaderTarget(rect);
    const netId = netIndex.holeToNetId.get(holeKey(label.at));
    const netName = netId ? netIndex.netIdToName.get(netId) : label.name;
    const color = netColor(netId ?? label.id, netName);
    const canHit = !opts.ghost && (tool.type === "select" || tool.type === "erase");
    const selected = selection.type === "netLabel" && selection.id === label.id;

    return (
      <g
        key={label.id}
        opacity={opts.ghost ? 0.6 : 1}
        pointerEvents={canHit ? "all" : "none"}
        onPointerDown={(ev) => {
          if (!canHit || ev.button !== 0) return;
          ev.stopPropagation();
          if (tool.type === "erase") {
            dispatch({ type: "DELETE_NETLABEL", id: label.id });
            return;
          }
          dispatch({ type: "SELECT", selection: { type: "netLabel", id: label.id } });
          startLabelDrag(label, ev);
        }}
      >
        <line
          x1={c.x}
          y1={c.y}
          x2={leaderTarget.x}
          y2={leaderTarget.y}
          className={styles.netLabelLeader}
          style={{ stroke: color }}
        />
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={6}
          className={selected ? styles.netLabelBgSelected : styles.netLabelBg}
        />
        <text x={textPos.x} y={textPos.y} className={styles.netLabelText}>
          {label.name}
        </text>
      </g>
    );
  }

  function onPointerMove(ev: React.PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (pan && pan.pointerId === ev.pointerId) {
      const svg = svgRef.current;
      if (!svg) return;
      const p = svgPointFromEvent(svg, ev);
      const dx = p.x - pan.start.x;
      const dy = p.y - pan.start.y;
      dispatch({
        type: "SET_VIEWPORT",
        viewport: { ...viewport, pan: { x: pan.pan.x + dx, y: pan.pan.y + dy } },
      });
      return;
    }

    const stretch = stretchRef.current;
    if (stretch && stretch.pointerId === ev.pointerId) {
      const hole = holeFromPointerEvent(ev);
      if (hole) {
        const part = state.project.parts.find((p) => p.id === stretch.partId);
        if (part && (part.footprint.type === "inline2" || part.footprint.type === "free2")) {
          const pin1Hole = stretch.movingPinId === "1" ? hole : stretch.fixedHole;
          const pin2Hole = stretch.movingPinId === "1" ? stretch.fixedHole : hole;
          const next = applyInline2Placement(part, pin1Hole, pin2Hole);
          if (next) setDragPreview(next);
        }
      }
      setHoverFromPointer(ev);
      return;
    }

    const traceDrag = traceDragRef.current;
    if (traceDrag && traceDrag.pointerId === ev.pointerId) {
      const hole = holeFromPointerEvent(ev);
      if (hole) {
        const trace = state.project.traces.find((t) => t.id === traceDrag.traceId);
        if (trace) {
          const nodes = [...trace.nodes];
          if (traceDrag.endpoint === "start") nodes[0] = hole;
          else nodes[nodes.length - 1] = hole;
          setTraceDragPreview({ ...trace, nodes });
        }
      }
      setHoverFromPointer(ev);
      return;
    }

    const labelDrag = labelDragRef.current;
    if (labelDrag && labelDrag.pointerId === ev.pointerId) {
      const world = worldFromPointerEvent(ev);
      if (world) {
        const label = labelDragPreview?.id === labelDrag.labelId
          ? labelDragPreview
          : state.project.netLabels.find((l) => l.id === labelDrag.labelId);
        if (label) {
          const c = holeCenterPx(label.at);
          const rectX = world.x - labelDrag.grabOffset.x;
          const rectY = world.y - labelDrag.grabOffset.y;
          setLabelDragPreview({ ...label, offset: { dx: rectX - c.x, dy: rectY - c.y } });
        }
      }
      setHoverFromPointer(ev);
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === ev.pointerId) {
      const hole = holeFromPointerEvent(ev);
      if (hole) {
        const part = state.project.parts.find((p) => p.id === drag.partId);
        if (part) {
          const dx = drag.startPointerHole.x - drag.startOrigin.x;
          const dy = drag.startPointerHole.y - drag.startOrigin.y;
          setDragPreview({
            ...part,
            placement: { ...part.placement, origin: { x: hole.x - dx, y: hole.y - dy } },
          });
        }
      }
      setHoverFromPointer(ev);
      return;
    }

    const labelDraftState = labelDraftRef.current;
    if (labelDraftState && labelDraftState.pointerId === ev.pointerId && labelDraft) {
      const world = worldFromPointerEvent(ev);
      if (world) {
        const c = holeCenterPx(labelDraft.at);
        const rectX = world.x - labelDraftState.grabOffset.x;
        const rectY = world.y - labelDraftState.grabOffset.y;
        setLabelDraft({ ...labelDraft, offset: { dx: rectX - c.x, dy: rectY - c.y } });
      }
      setHoverFromPointer(ev);
      return;
    }

    const inline2Draft = inline2DraftRef.current;
    if (inline2Draft && inline2Draft.pointerId === ev.pointerId && inline2DraftStart) {
      const hole = holeFromPointerEvent(ev);
      if (hole && (hole.x !== inline2DraftStart.x || hole.y !== inline2DraftStart.y)) {
        inline2Draft.moved = true;
      }
      setHoverFromPointer(ev);
      return;
    }
    setHoverFromPointer(ev);
  }

  function onPointerUp(ev: React.PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (pan && pan.pointerId === ev.pointerId) panRef.current = null;

    const stretch = stretchRef.current;
    if (stretch && stretch.pointerId === ev.pointerId) {
      if (dragPreview && dragPreview.id === stretch.partId) {
        dispatch({ type: "UPDATE_PART", part: dragPreview });
      }
      stretchRef.current = null;
      setDragPreview(null);
      return;
    }

    const traceDrag = traceDragRef.current;
    if (traceDrag && traceDrag.pointerId === ev.pointerId) {
      if (traceDragPreview && traceDragPreview.id === traceDrag.traceId) {
        dispatch({ type: "UPDATE_TRACE", id: traceDrag.traceId, nodes: traceDragPreview.nodes });
      }
      traceDragRef.current = null;
      setTraceDragPreview(null);
      return;
    }

    const labelDrag = labelDragRef.current;
    if (labelDrag && labelDrag.pointerId === ev.pointerId) {
      if (labelDragPreview && labelDragPreview.id === labelDrag.labelId) {
        dispatch({
          type: "UPDATE_NETLABEL_POSITION",
          id: labelDragPreview.id,
          offset: labelDragPreview.offset,
        });
      }
      labelDragRef.current = null;
      setLabelDragPreview(null);
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === ev.pointerId) {
      if (dragPreview && dragPreview.id === drag.partId) {
        dispatch({ type: "UPDATE_PART", part: dragPreview });
      }
      dragRef.current = null;
      setDragPreview(null);
    }

    const labelDraftState = labelDraftRef.current;
    if (labelDraftState && labelDraftState.pointerId === ev.pointerId) {
      labelDraftRef.current = null;
      if (labelDraft) {
        dispatch({ type: "ADD_NETLABEL", label: labelDraft });
        dispatch({ type: "SELECT", selection: { type: "netLabel", id: labelDraft.id } });
      }
      setLabelDraft(null);
      return;
    }

    const inline2Draft = inline2DraftRef.current;
    if (inline2Draft && inline2Draft.pointerId === ev.pointerId) {
      inline2DraftRef.current = null;
      const hole = holeFromPointerEvent(ev);
      if (inline2DraftStart && inline2Draft.moved && hole && tool.type === "placePart" && isInline2Kind(tool.kind)) {
        const placed = placeInline2FromPins(tool.kind, inline2DraftStart, hole);
        if (placed) resetInline2Draft();
      }
      return;
    }
  }

  const hoverText = state.ui.hoverHole ? holeLabel(state.ui.hoverHole, board.labeling) : "—";
  const activeNetName = activeNetId ? netIndex.netIdToName.get(activeNetId) : undefined;
  const activeNetColor = activeNetId ? netColor(activeNetId, activeNetName) : null;
  const connectHint =
    tool.type === "connect"
      ? connectDraft
        ? "Connect: choisir le 2e terminal (Esc pour annuler)"
        : "Connect: choisir 2 terminaux"
      : null;
  const connectDraftHole = connectDraft ? holeFromTerminal(connectDraft) : null;
  const selectedNetColor = selectedNet ? netColor(selectedNet.id, selectedNet.name) : null;
  const selectedNetHoles = useMemo(() => {
    if (!selectedNet) return [];
    const holes: Hole[] = [];
    for (const terminal of selectedNet.terminals) {
      const hole = holeFromTerminal(terminal);
      if (hole) holes.push(hole);
    }
    return holes;
  }, [selectedNet, state.project.parts]);

  const ghostPart = (() => {
    if (tool.type !== "placePart" || !state.ui.hoverHole) return null;
    if (isInline2Kind(tool.kind) && inline2DraftStart) {
      return createInline2Part(tool.kind, inline2DraftStart, state.ui.hoverHole);
    }
    return makeDefaultPart(tool.kind, state.ui.hoverHole);
  })();

  const tracesToRender = useMemo(() => {
    if (!traceDragPreview) return state.project.traces;
    return state.project.traces.map((t) => (t.id === traceDragPreview.id ? traceDragPreview : t));
  }, [traceDragPreview, state.project.traces]);

  const partsToRender = useMemo(() => {
    if (!dragPreview) return state.project.parts;
    return state.project.parts.map((p) => (p.id === dragPreview.id ? dragPreview : p));
  }, [dragPreview, state.project.parts]);

  const labelsToRender = useMemo(() => {
    let labels = state.project.netLabels;
    if (labelDragPreview) {
      labels = labels.map((l) => (l.id === labelDragPreview.id ? labelDragPreview : l));
    }
    if (labelDraft) {
      labels = [...labels, labelDraft];
    }
    return labels;
  }, [labelDragPreview, labelDraft, state.project.netLabels]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <span className={styles.title}>Board</span>
          <span className={styles.meta}>
            {board.height}×{board.width} ({hoverText})
          </span>
        </div>
        <span className={styles.meta}>
          {traceDraft
            ? `Trace: ${traceDraft.nodes.length} nodes (Enter=finish, Esc=cancel, Del=undo)`
            : connectHint
              ? connectHint
              : activeNetId
                ? `Net: ${activeNetName ?? "—"}`
                : " "}
          {"  "}·{"  "}Zoom: {Math.round(viewport.scale * 100)}%
        </span>
      </div>
      <div className={styles.viewport}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onContextMenu={(e) => e.preventDefault()}
        >
          <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.scale})`}>
            {/* labels */}
            {Array.from({ length: board.width }).map((_, x) => (
              <text
                key={`col-${x}`}
                x={GUTTER_LEFT + (x + 0.5) * PITCH_PX}
                y={16}
                textAnchor="middle"
                className={styles.label}
              >
                {axisLabel(board.labeling.cols, x)}
              </text>
            ))}
            {Array.from({ length: board.height }).map((_, y) => (
              <text
                key={`row-${y}`}
                x={16}
                y={GUTTER_TOP + (y + 0.5) * PITCH_PX + 4}
                textAnchor="middle"
                className={styles.label}
              >
                {axisLabel(board.labeling.rows, y)}
              </text>
            ))}

            {/* board background */}
            <rect
              x={GUTTER_LEFT}
              y={GUTTER_TOP}
              width={board.width * PITCH_PX}
              height={board.height * PITCH_PX}
              rx={10}
              className={styles.boardBg}
            />

            {/* active net highlight */}
            {activeNetId ? (
              <g opacity={0.25} pointerEvents="none">
                {(netIndex.netIdToHoles.get(activeNetId) ?? []).map((h) => {
                  const c = holeCenterPx(h);
                  return (
                    <circle
                      key={`nh-${h.x},${h.y}`}
                      cx={c.x}
                      cy={c.y}
                      r={6}
                      fill={activeNetColor ?? "#fff"}
                    />
                  );
                })}
              </g>
            ) : null}

            {/* fixed holes */}
            {fixedHoles.length > 0 ? (
              <g opacity={0.9} pointerEvents="none">
                {fixedHoles.map((h) => {
                  const c = holeCenterPx(h);
                  return (
                    <g key={`fh-${h.x},${h.y}`}>
                      <circle cx={c.x} cy={c.y} r={5} className={styles.fixedHole} />
                      <line x1={c.x - 4} y1={c.y} x2={c.x + 4} y2={c.y} className={styles.fixedHoleCross} />
                      <line x1={c.x} y1={c.y - 4} x2={c.x} y2={c.y + 4} className={styles.fixedHoleCross} />
                    </g>
                  );
                })}
              </g>
            ) : null}

            {/* selected net (netlist) highlight */}
            {selectedNet && selectedNetHoles.length > 0 ? (
              <g opacity={0.35} pointerEvents="none">
                {selectedNetHoles.map((h, idx) => {
                  const c = holeCenterPx(h);
                  return (
                    <circle
                      key={`sn-${h.x},${h.y}-${idx}`}
                      cx={c.x}
                      cy={c.y}
                      r={7}
                      fill={selectedNetColor ?? "#fff"}
                    />
                  );
                })}
              </g>
            ) : null}

            {/* traces */}
            {tracesToRender.map(renderTrace)}

            {/* draft trace */}
            {traceDraft ? (
              <polyline
                points={pointsAttr(
                  state.ui.hoverHole && (tool.type === "wire" || tool.type === "jumper")
                    ? [...traceDraft.nodes, state.ui.hoverHole]
                    : traceDraft.nodes,
                )}
                className={styles.traceDraft}
                pointerEvents="none"
              />
            ) : null}

            {/* parts */}
            {partsToRender.map((p) => renderPart(p, { ghost: false }))}
            {ghostPart ? renderPart(ghostPart, { ghost: true }) : null}

            {/* net labels */}
            {labelsToRender.map((nl) => renderNetLabel(nl, { ghost: labelDraft?.id === nl.id }))}

            {connectDraftHole ? (
              <circle
                cx={holeCenterPx(connectDraftHole).x}
                cy={holeCenterPx(connectDraftHole).y}
                r={6}
                className={styles.connectDraft}
              />
            ) : null}

            {/* holes */}
            {holes.map((h) => {
              const cx = GUTTER_LEFT + (h.x + 0.5) * PITCH_PX;
              const cy = GUTTER_TOP + (h.y + 0.5) * PITCH_PX;
              const isHover =
                state.ui.hoverHole?.x === h.x && state.ui.hoverHole?.y === h.y;
              return (
                <circle
                  key={`${h.x},${h.y}`}
                  cx={cx}
                  cy={cy}
                  r={isHover ? 3.2 : 2.2}
                  className={isHover ? styles.holeHover : styles.hole}
                  pointerEvents="none"
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
