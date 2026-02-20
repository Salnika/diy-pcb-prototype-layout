import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import { makeDefaultPart, type Action, type Selection, type Tool, type TraceDraft, type Viewport } from "../../../app/store";
import {
  createId,
  getPartPins,
  holeKey,
  isWithinBoard,
  moveConnectedTraceEndpoints,
  movedPartPinMap,
  type Board,
  type Hole,
  type NetIndex,
  type NetLabel,
  type NetTerminal,
  type Part,
  type PartKind,
  type Trace,
} from "../../../model";
import {
  LABEL_DEFAULT_OFFSET,
  LABEL_HEIGHT,
  clamp,
  holeCenterPx,
  holeFromWorld,
  labelRect,
  labelWidth,
  svgPointFromEvent,
} from "../boardGeometry";
import { applyInline2Placement, createInline2Part, isInline2Kind, sameTerminal } from "../boardPlacement";

type UseBoardInteractionsParams = Readonly<{
  board: Board;
  viewport: Viewport;
  tool: Tool;
  selection: Selection;
  traceDraft: TraceDraft | null;
  hoverHole: Hole | null;
  parts: readonly Part[];
  traces: readonly Trace[];
  netLabels: readonly NetLabel[];
  fixedPartIds: ReadonlySet<string>;
  netIndex: NetIndex;
  dispatch: Dispatch<Action>;
}>;

export function useBoardInteractions({
  board,
  viewport,
  tool,
  selection,
  traceDraft,
  hoverHole,
  parts,
  traces,
  netLabels,
  fixedPartIds,
  netIndex,
  dispatch,
}: UseBoardInteractionsParams) {
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
  const traceSegmentDragRef = useRef<{
    pointerId: number;
    traceId: string;
    segmentIndex: number;
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

  const pinAtHole = useMemo(() => {
    const map = new Map<string, { partId: string; pinId: string }>();
    for (const part of parts) {
      for (const pin of getPartPins(part)) {
        map.set(holeKey(pin.hole), { partId: part.id, pinId: pin.pinId });
      }
    }
    return map;
  }, [parts]);

  function terminalFromHole(hole: Hole): NetTerminal {
    const pin = pinAtHole.get(holeKey(hole));
    if (pin) return { kind: "pin", partId: pin.partId, pinId: pin.pinId };
    return { kind: "hole", hole };
  }

  function holeFromTerminal(terminal: NetTerminal): Hole | null {
    if (terminal.kind === "hole") return terminal.hole;
    const part = parts.find((entry) => entry.id === terminal.partId);
    if (!part) return null;
    const pin = getPartPins(part).find((entry) => entry.pinId === terminal.pinId);
    return pin?.hole ?? null;
  }

  function resetInline2Draft() {
    inline2DraftRef.current = null;
    setInline2DraftStart(null);
  }

  function worldFromPointerEvent(event: ReactPointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svgPointFromEvent(svg, event);
    return {
      x: (point.x - viewport.pan.x) / viewport.scale,
      y: (point.y - viewport.pan.y) / viewport.scale,
    };
  }

  function holeFromPointerEvent(event: ReactPointerEvent<SVGSVGElement>): Hole | null {
    const world = worldFromPointerEvent(event);
    if (!world) return null;
    return holeFromWorld(world, board);
  }

  function setHoverFromPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const hole = holeFromPointerEvent(event);
    dispatch({ type: "SET_HOVER_HOLE", hole });
  }

  function startInline2Stretch(part: Part, movingPinId: "1" | "2", event: ReactPointerEvent<SVGCircleElement>) {
    if (tool.type !== "select") return;
    if (fixedPartIds.has(part.id)) return;
    const pins = getPartPins(part);
    const pin1 = pins.find((pin) => pin.pinId === "1") ?? pins[0];
    const pin2 = pins.find((pin) => pin.pinId === "2") ?? pins[1];
    if (!pin1 || !pin2) return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(event.pointerId);
    stretchRef.current = {
      pointerId: event.pointerId,
      partId: part.id,
      movingPinId,
      fixedHole: movingPinId === "1" ? pin2.hole : pin1.hole,
    };
    dispatch({ type: "SELECT", selection: { type: "part", id: part.id } });
    setDragPreview(part);
  }

  function startTraceDrag(trace: Trace, endpoint: "start" | "end", event: ReactPointerEvent<SVGCircleElement>) {
    if (tool.type !== "select") return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(event.pointerId);
    traceDragRef.current = { pointerId: event.pointerId, traceId: trace.id, endpoint };
    setTraceDragPreview(trace);
    dispatch({ type: "SELECT", selection: { type: "trace", id: trace.id } });
  }

  function segmentAxis(a: Hole, b: Hole): "horizontal" | "vertical" | null {
    if (a.x === b.x && a.y !== b.y) return "vertical";
    if (a.y === b.y && a.x !== b.x) return "horizontal";
    return null;
  }

  function compactTraceNodes(nodes: readonly Hole[]): readonly Hole[] {
    const compacted: Hole[] = [];
    for (const node of nodes) {
      const last = compacted[compacted.length - 1];
      if (last && last.x === node.x && last.y === node.y) continue;
      compacted.push(node);
    }
    return compacted.length >= 2 ? compacted : nodes;
  }

  function allNodesWithinBoard(nodes: readonly Hole[]): boolean {
    return nodes.every((node) => isWithinBoard(board, node));
  }

  function moveTraceSegment(trace: Trace, segmentIndex: number, targetHole: Hole): Trace | null {
    const nodes = trace.nodes;
    if (segmentIndex < 0 || segmentIndex >= nodes.length - 1) return null;

    const a = nodes[segmentIndex];
    const b = nodes[segmentIndex + 1];
    if (!a || !b) return null;

    const axis = segmentAxis(a, b);
    if (!axis) return null;

    // Single straight trace: dragging the middle creates a natural dogleg while keeping endpoints fixed.
    if (nodes.length === 2) {
      const nextNodes =
        axis === "horizontal"
          ? compactTraceNodes([a, { x: a.x, y: targetHole.y }, { x: b.x, y: targetHole.y }, b])
          : compactTraceNodes([a, { x: targetHole.x, y: a.y }, { x: targetHole.x, y: b.y }, b]);
      if (!allNodesWithinBoard(nextNodes)) return null;
      return { ...trace, nodes: nextNodes };
    }

    const isFirst = segmentIndex === 0;
    const isLast = segmentIndex === nodes.length - 2;

    if (!isFirst && !isLast) {
      const nextNodes = [...nodes];
      if (axis === "horizontal") {
        nextNodes[segmentIndex] = { ...nextNodes[segmentIndex], y: targetHole.y };
        nextNodes[segmentIndex + 1] = { ...nextNodes[segmentIndex + 1], y: targetHole.y };
      } else {
        nextNodes[segmentIndex] = { ...nextNodes[segmentIndex], x: targetHole.x };
        nextNodes[segmentIndex + 1] = { ...nextNodes[segmentIndex + 1], x: targetHole.x };
      }
      const compacted = compactTraceNodes(nextNodes);
      if (!allNodesWithinBoard(compacted)) return null;
      return { ...trace, nodes: compacted };
    }

    if (isFirst) {
      const start = nodes[0];
      const moved = axis === "horizontal" ? { ...nodes[1], y: targetHole.y } : { ...nodes[1], x: targetHole.x };
      const bridge = axis === "horizontal" ? { x: start.x, y: moved.y } : { x: moved.x, y: start.y };
      const nextNodes = compactTraceNodes([start, bridge, moved, ...nodes.slice(2)]);
      if (!allNodesWithinBoard(nextNodes)) return null;
      return { ...trace, nodes: nextNodes };
    }

    const end = nodes[nodes.length - 1];
    const moved = axis === "horizontal"
      ? { ...nodes[nodes.length - 2], y: targetHole.y }
      : { ...nodes[nodes.length - 2], x: targetHole.x };
    const bridge = axis === "horizontal" ? { x: end.x, y: moved.y } : { x: moved.x, y: end.y };
    const nextNodes = compactTraceNodes([...nodes.slice(0, -2), moved, bridge, end]);
    if (!allNodesWithinBoard(nextNodes)) return null;
    return { ...trace, nodes: nextNodes };
  }

  function startTraceSegmentDrag(trace: Trace, segmentIndex: number, event: ReactPointerEvent<SVGCircleElement>) {
    if (tool.type !== "select") return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(event.pointerId);
    traceSegmentDragRef.current = { pointerId: event.pointerId, traceId: trace.id, segmentIndex };
    setTraceDragPreview(trace);
    dispatch({ type: "SELECT", selection: { type: "trace", id: trace.id } });
  }

  function startLabelDrag(label: NetLabel, event: ReactPointerEvent<SVGGElement>) {
    if (tool.type !== "select") return;
    const world = worldFromPointerEvent(event as unknown as ReactPointerEvent<SVGSVGElement>);
    if (!world) return;
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(event.pointerId);
    const center = holeCenterPx(label.at);
    const rect = labelRect(label.name, center, label.offset);
    labelDragRef.current = {
      pointerId: event.pointerId,
      labelId: label.id,
      grabOffset: { x: world.x - rect.x, y: world.y - rect.y },
    };
    setLabelDragPreview(label);
  }

  function startPartDrag(part: Part, event: ReactPointerEvent<SVGGElement>) {
    if (tool.type !== "select") return;
    if (fixedPartIds.has(part.id)) return;
    const hole = holeFromPointerEvent(event as unknown as ReactPointerEvent<SVGSVGElement>);
    if (!hole) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      partId: part.id,
      startPointerHole: hole,
      startOrigin: part.placement.origin,
    };
    setDragPreview(part);
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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const preventWheelDefault = (event: WheelEvent) => {
      event.preventDefault();
    };
    const preventGestureDefault = (event: Event) => {
      event.preventDefault();
    };

    svg.addEventListener("wheel", preventWheelDefault, { passive: false });
    svg.addEventListener("gesturestart", preventGestureDefault, { passive: false });
    svg.addEventListener("gesturechange", preventGestureDefault, { passive: false });
    svg.addEventListener("gestureend", preventGestureDefault, { passive: false });

    return () => {
      svg.removeEventListener("wheel", preventWheelDefault);
      svg.removeEventListener("gesturestart", preventGestureDefault);
      svg.removeEventListener("gesturechange", preventGestureDefault);
      svg.removeEventListener("gestureend", preventGestureDefault);
    };
  }, []);

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    event.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const point = svgPointFromEvent(svg, event.nativeEvent);

    const scale = viewport.scale;
    const worldX = (point.x - viewport.pan.x) / scale;
    const worldY = (point.y - viewport.pan.y) / scale;

    const delta = -event.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const newScale = clamp(scale * factor, 0.35, 6);
    const newPan = { x: point.x - worldX * newScale, y: point.y - worldY * newScale };
    dispatch({ type: "SET_VIEWPORT", viewport: { scale: newScale, pan: newPan } });
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button === 1 || event.button === 2) {
      const svg = svgRef.current;
      if (!svg) return;
      svg.setPointerCapture(event.pointerId);
      const start = svgPointFromEvent(svg, event);
      panRef.current = {
        pointerId: event.pointerId,
        start,
        pan: { ...viewport.pan },
      };
      return;
    }

    if (event.button !== 0) return;

    const hole = holeFromPointerEvent(event);
    if (!hole) {
      if (tool.type === "select") dispatch({ type: "SELECT", selection: { type: "none" } });
      return;
    }

    if (tool.type === "placePart") {
      if (isInline2Kind(tool.kind)) {
        if (!inline2DraftStart) {
          const svg = svgRef.current;
          if (svg) svg.setPointerCapture(event.pointerId);
          inline2DraftRef.current = { pointerId: event.pointerId, moved: false };
          setInline2DraftStart(hole);
          return;
        }
        const placed = placeInline2FromPins(tool.kind, inline2DraftStart, hole);
        if (placed) resetInline2Draft();
        return;
      }
      const part = makeDefaultPart(tool.kind, hole, tool.rotation ?? 0);
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
        dispatch({ type: "ADD_NET", net: { id: netId, terminals: [connectDraft, terminal] } });
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
        const last = traceDraft.nodes[traceDraft.nodes.length - 1];
        const closingZeroLength =
          traceDraft.nodes.length === 1 && !!last && last.x === hole.x && last.y === hole.y;
        dispatch({ type: "ADD_TRACE_NODE", hole });
        if (closingZeroLength) dispatch({ type: "FINISH_TRACE" });
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
      if (svg) svg.setPointerCapture(event.pointerId);
      const label: NetLabel = { id: createId("nl"), at: hole, name: trimmed, offset: { ...LABEL_DEFAULT_OFFSET } };
      const world = worldFromPointerEvent(event);
      if (world) {
        const center = holeCenterPx(hole);
        const rect = labelRect(label.name, center, label.offset);
        labelDraftRef.current = {
          pointerId: event.pointerId,
          grabOffset: { x: world.x - rect.x, y: world.y - rect.y },
        };
      } else {
        labelDraftRef.current = {
          pointerId: event.pointerId,
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

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) {
      const svg = svgRef.current;
      if (!svg) return;
      const point = svgPointFromEvent(svg, event);
      const dx = point.x - pan.start.x;
      const dy = point.y - pan.start.y;
      dispatch({
        type: "SET_VIEWPORT",
        viewport: { ...viewport, pan: { x: pan.pan.x + dx, y: pan.pan.y + dy } },
      });
      return;
    }

    const stretch = stretchRef.current;
    if (stretch && stretch.pointerId === event.pointerId) {
      const hole = holeFromPointerEvent(event);
      if (hole) {
        const part = parts.find((entry) => entry.id === stretch.partId);
        if (part && (part.footprint.type === "inline2" || part.footprint.type === "free2")) {
          const pin1Hole = stretch.movingPinId === "1" ? hole : stretch.fixedHole;
          const pin2Hole = stretch.movingPinId === "1" ? stretch.fixedHole : hole;
          const next = applyInline2Placement(part, pin1Hole, pin2Hole);
          if (next) setDragPreview(next);
        }
      }
      setHoverFromPointer(event);
      return;
    }

    const traceDrag = traceDragRef.current;
    if (traceDrag && traceDrag.pointerId === event.pointerId) {
      const hole = holeFromPointerEvent(event);
      if (hole) {
        const trace = traces.find((entry) => entry.id === traceDrag.traceId);
        if (trace) {
          const nodes = [...trace.nodes];
          if (traceDrag.endpoint === "start") nodes[0] = hole;
          else nodes[nodes.length - 1] = hole;
          setTraceDragPreview({ ...trace, nodes });
        }
      }
      setHoverFromPointer(event);
      return;
    }

    const traceSegmentDrag = traceSegmentDragRef.current;
    if (traceSegmentDrag && traceSegmentDrag.pointerId === event.pointerId) {
      const hole = holeFromPointerEvent(event);
      if (hole) {
        const source =
          traceDragPreview?.id === traceSegmentDrag.traceId
            ? traceDragPreview
            : traces.find((entry) => entry.id === traceSegmentDrag.traceId);
        if (source) {
          const next = moveTraceSegment(source, traceSegmentDrag.segmentIndex, hole);
          if (next) setTraceDragPreview(next);
        }
      }
      setHoverFromPointer(event);
      return;
    }

    const labelDrag = labelDragRef.current;
    if (labelDrag && labelDrag.pointerId === event.pointerId) {
      const world = worldFromPointerEvent(event);
      if (world) {
        const label =
          labelDragPreview?.id === labelDrag.labelId
            ? labelDragPreview
            : netLabels.find((entry) => entry.id === labelDrag.labelId);
        if (label) {
          const center = holeCenterPx(label.at);
          const rectX = world.x - labelDrag.grabOffset.x;
          const rectY = world.y - labelDrag.grabOffset.y;
          setLabelDragPreview({ ...label, offset: { dx: rectX - center.x, dy: rectY - center.y } });
        }
      }
      setHoverFromPointer(event);
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const hole = holeFromPointerEvent(event);
      if (hole) {
        const part = parts.find((entry) => entry.id === drag.partId);
        if (part) {
          const dx = drag.startPointerHole.x - drag.startOrigin.x;
          const dy = drag.startPointerHole.y - drag.startOrigin.y;
          setDragPreview({
            ...part,
            placement: { ...part.placement, origin: { x: hole.x - dx, y: hole.y - dy } },
          });
        }
      }
      setHoverFromPointer(event);
      return;
    }

    const labelDraftState = labelDraftRef.current;
    if (labelDraftState && labelDraftState.pointerId === event.pointerId && labelDraft) {
      const world = worldFromPointerEvent(event);
      if (world) {
        const center = holeCenterPx(labelDraft.at);
        const rectX = world.x - labelDraftState.grabOffset.x;
        const rectY = world.y - labelDraftState.grabOffset.y;
        setLabelDraft({ ...labelDraft, offset: { dx: rectX - center.x, dy: rectY - center.y } });
      }
      setHoverFromPointer(event);
      return;
    }

    const inline2Draft = inline2DraftRef.current;
    if (inline2Draft && inline2Draft.pointerId === event.pointerId && inline2DraftStart) {
      const hole = holeFromPointerEvent(event);
      if (hole && (hole.x !== inline2DraftStart.x || hole.y !== inline2DraftStart.y)) {
        inline2Draft.moved = true;
      }
      setHoverFromPointer(event);
      return;
    }

    setHoverFromPointer(event);
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (pan && pan.pointerId === event.pointerId) panRef.current = null;

    const stretch = stretchRef.current;
    if (stretch && stretch.pointerId === event.pointerId) {
      if (dragPreview && dragPreview.id === stretch.partId) {
        dispatch({ type: "UPDATE_PART", part: dragPreview });
      }
      stretchRef.current = null;
      setDragPreview(null);
      return;
    }

    const traceDrag = traceDragRef.current;
    if (traceDrag && traceDrag.pointerId === event.pointerId) {
      if (traceDragPreview && traceDragPreview.id === traceDrag.traceId) {
        dispatch({ type: "UPDATE_TRACE", id: traceDrag.traceId, nodes: traceDragPreview.nodes });
      }
      traceDragRef.current = null;
      setTraceDragPreview(null);
      return;
    }

    const traceSegmentDrag = traceSegmentDragRef.current;
    if (traceSegmentDrag && traceSegmentDrag.pointerId === event.pointerId) {
      if (traceDragPreview && traceDragPreview.id === traceSegmentDrag.traceId) {
        dispatch({ type: "UPDATE_TRACE", id: traceSegmentDrag.traceId, nodes: traceDragPreview.nodes });
      }
      traceSegmentDragRef.current = null;
      setTraceDragPreview(null);
      return;
    }

    const labelDrag = labelDragRef.current;
    if (labelDrag && labelDrag.pointerId === event.pointerId) {
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
    if (drag && drag.pointerId === event.pointerId) {
      if (dragPreview && dragPreview.id === drag.partId) {
        dispatch({ type: "UPDATE_PART", part: dragPreview });
      }
      dragRef.current = null;
      setDragPreview(null);
    }

    const labelDraftState = labelDraftRef.current;
    if (labelDraftState && labelDraftState.pointerId === event.pointerId) {
      labelDraftRef.current = null;
      if (labelDraft) {
        dispatch({ type: "ADD_NETLABEL", label: labelDraft });
        dispatch({ type: "SELECT", selection: { type: "netLabel", id: labelDraft.id } });
      }
      setLabelDraft(null);
      return;
    }

    const inline2Draft = inline2DraftRef.current;
    if (inline2Draft && inline2Draft.pointerId === event.pointerId) {
      inline2DraftRef.current = null;
      const hole = holeFromPointerEvent(event);
      if (inline2DraftStart && inline2Draft.moved && hole && tool.type === "placePart" && isInline2Kind(tool.kind)) {
        const placed = placeInline2FromPins(tool.kind, inline2DraftStart, hole);
        if (placed) resetInline2Draft();
      }
      return;
    }
  }

  const connectDraftHole = connectDraft ? holeFromTerminal(connectDraft) : null;

  const ghostPart = (() => {
    if (tool.type !== "placePart" || !hoverHole) return null;
    if (isInline2Kind(tool.kind) && inline2DraftStart) {
      return createInline2Part(tool.kind, inline2DraftStart, hoverHole);
    }
    return makeDefaultPart(tool.kind, hoverHole, tool.rotation ?? 0);
  })();

  const tracesToRender = useMemo(() => {
    let preview = traces;

    if (dragPreview) {
      const current = parts.find((part) => part.id === dragPreview.id);
      if (current) {
        const movedPins = movedPartPinMap(current, dragPreview);
        preview = moveConnectedTraceEndpoints(preview, movedPins);
      }
    }

    if (traceDragPreview) {
      preview = preview.map((trace) => (trace.id === traceDragPreview.id ? traceDragPreview : trace));
    }

    return preview;
  }, [dragPreview, parts, traceDragPreview, traces]);

  const partsToRender = useMemo(() => {
    if (!dragPreview) return parts;
    return parts.map((part) => (part.id === dragPreview.id ? dragPreview : part));
  }, [dragPreview, parts]);

  const labelsToRender = useMemo(() => {
    let labels = netLabels;
    if (labelDragPreview) {
      labels = labels.map((label) => (label.id === labelDragPreview.id ? labelDragPreview : label));
    }
    if (labelDraft) {
      labels = [...labels, labelDraft];
    }
    return labels;
  }, [labelDragPreview, labelDraft, netLabels]);

  return {
    svgRef,
    connectDraft,
    connectDraftHole,
    tracesToRender,
    partsToRender,
    labelsToRender,
    ghostPart,
    labelDraftId: labelDraft?.id ?? null,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    startInline2Stretch,
    startTraceDrag,
    startTraceSegmentDrag,
    startLabelDrag,
    startPartDrag,
  };
}
