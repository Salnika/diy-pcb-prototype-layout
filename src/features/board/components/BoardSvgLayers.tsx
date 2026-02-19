import type { PointerEvent as ReactPointerEvent } from "react";
import type { Selection, Tool, TraceDraft } from "../../../app/store";
import {
  getPartPins,
  holeKey,
  isWithinBoard,
  netColor,
  type Board,
  type Hole,
  type NetIndex,
  type NetLabel,
  type Part,
  type Trace,
} from "../../../model";
import { buildSchematicSymbol } from "../../render/schematicSymbols";
import {
  GUTTER_LEFT,
  GUTTER_TOP,
  PITCH_PX,
  axisLabel,
  holeCenterPx,
  labelLeaderTarget,
  labelRect,
  labelTextPos,
  pointsAttr,
} from "../boardGeometry";
import * as styles from "../BoardView.css";

type BoardBackdropLayerProps = Readonly<{
  board: Board;
  activeNetId: string | null;
  activeNetColor: string | null;
  selectedNetHoles: readonly Hole[];
  selectedNetColor: string | null;
  fixedHoles: readonly Hole[];
  netIndex: NetIndex;
}>;

export function BoardBackdropLayer({
  board,
  activeNetId,
  activeNetColor,
  selectedNetHoles,
  selectedNetColor,
  fixedHoles,
  netIndex,
}: BoardBackdropLayerProps) {
  return (
    <>
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

      <rect
        x={GUTTER_LEFT}
        y={GUTTER_TOP}
        width={board.width * PITCH_PX}
        height={board.height * PITCH_PX}
        rx={10}
        className={styles.boardBg}
      />

      {activeNetId ? (
        <g opacity={0.25} pointerEvents="none">
          {(netIndex.netIdToHoles.get(activeNetId) ?? []).map((hole) => {
            const center = holeCenterPx(hole);
            return (
              <circle key={`nh-${hole.x},${hole.y}`} cx={center.x} cy={center.y} r={6} fill={activeNetColor ?? "#fff"} />
            );
          })}
        </g>
      ) : null}

      {fixedHoles.length > 0 ? (
        <g opacity={0.9} pointerEvents="none">
          {fixedHoles.map((hole) => {
            const center = holeCenterPx(hole);
            return (
              <g key={`fh-${hole.x},${hole.y}`}>
                <circle cx={center.x} cy={center.y} r={5} className={styles.fixedHole} />
                <line x1={center.x - 4} y1={center.y} x2={center.x + 4} y2={center.y} className={styles.fixedHoleCross} />
                <line x1={center.x} y1={center.y - 4} x2={center.x} y2={center.y + 4} className={styles.fixedHoleCross} />
              </g>
            );
          })}
        </g>
      ) : null}

      {selectedNetHoles.length > 0 ? (
        <g opacity={0.35} pointerEvents="none">
          {selectedNetHoles.map((hole, index) => {
            const center = holeCenterPx(hole);
            return (
              <circle
                key={`sn-${hole.x},${hole.y}-${index}`}
                cx={center.x}
                cy={center.y}
                r={7}
                fill={selectedNetColor ?? "#fff"}
              />
            );
          })}
        </g>
      ) : null}

    </>
  );
}

type BoardHolesLayerProps = Readonly<{
  holes: readonly Hole[];
  hoverHole: Hole | null;
}>;

export function BoardHolesLayer({ holes, hoverHole }: BoardHolesLayerProps) {
  return (
    <>
      {holes.map((hole) => {
        const center = holeCenterPx(hole);
        const isHover = hoverHole?.x === hole.x && hoverHole?.y === hole.y;
        return (
          <circle
            key={`${hole.x},${hole.y}`}
            cx={center.x}
            cy={center.y}
            r={isHover ? 3.2 : 2.2}
            className={isHover ? styles.holeHover : styles.hole}
            pointerEvents="none"
          />
        );
      })}
    </>
  );
}

type TraceLayerProps = Readonly<{
  traces: readonly Trace[];
  selection: Selection;
  tool: Tool;
  activeNetId: string | null;
  netIndex: NetIndex;
  onDeleteTrace: (id: string) => void;
  onSelectTrace: (id: string) => void;
  onStartTraceDrag: (
    trace: Trace,
    endpoint: "start" | "end",
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
}>;

export function TraceLayer({
  traces,
  selection,
  tool,
  activeNetId,
  netIndex,
  onDeleteTrace,
  onSelectTrace,
  onStartTraceDrag,
}: TraceLayerProps) {
  function traceNetId(trace: Trace): string | null {
    const first = trace.nodes[0];
    if (!first) return null;
    return netIndex.holeToNetId.get(holeKey(first)) ?? null;
  }

  return (
    <>
      {traces.map((trace) => {
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
              onPointerDown={(event) => {
                if (!canHit || event.button !== 0) return;
                event.stopPropagation();
                if (tool.type === "erase") {
                  onDeleteTrace(trace.id);
                  return;
                }
                onSelectTrace(trace.id);
              }}
            />
            {showHandles && start && end ? (
              <>
                <circle
                  cx={holeCenterPx(start).x}
                  cy={holeCenterPx(start).y}
                  r={6}
                  className={styles.traceHandle}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onStartTraceDrag(trace, "start", event);
                  }}
                />
                <circle
                  cx={holeCenterPx(end).x}
                  cy={holeCenterPx(end).y}
                  r={6}
                  className={styles.traceHandle}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onStartTraceDrag(trace, "end", event);
                  }}
                />
              </>
            ) : null}
          </g>
        );
      })}
    </>
  );
}

type TraceDraftLayerProps = Readonly<{
  traceDraft: TraceDraft | null;
  hoverHole: Hole | null;
  tool: Tool;
}>;

export function TraceDraftLayer({ traceDraft, hoverHole, tool }: TraceDraftLayerProps) {
  if (!traceDraft) return null;
  return (
    <polyline
      points={pointsAttr(
        hoverHole && (tool.type === "wire" || tool.type === "jumper")
          ? [...traceDraft.nodes, hoverHole]
          : traceDraft.nodes,
      )}
      className={styles.traceDraft}
      pointerEvents="none"
    />
  );
}

type PartLayerProps = Readonly<{
  parts: readonly Part[];
  ghostPart: Part | null;
  selection: Selection;
  tool: Tool;
  board: Board;
  fixedPartIds: ReadonlySet<string>;
  onDeletePart: (id: string) => void;
  onSelectPart: (id: string) => void;
  onStartPartDrag: (part: Part, event: ReactPointerEvent<SVGGElement>) => void;
  onStartInline2Stretch: (
    part: Part,
    movingPinId: "1" | "2",
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
}>;

export function PartLayer({
  parts,
  ghostPart,
  selection,
  tool,
  board,
  fixedPartIds,
  onDeletePart,
  onSelectPart,
  onStartPartDrag,
  onStartInline2Stretch,
}: PartLayerProps) {
  function validatePart(part: Part): boolean {
    for (const pin of getPartPins(part)) {
      if (!isWithinBoard(board, pin.hole)) return false;
    }
    return true;
  }

  function renderPart(part: Part, ghost: boolean) {
    const selected = selection.type === "part" && selection.id === part.id;
    const canHit = !ghost && (tool.type === "select" || tool.type === "erase");
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
    const fallbackLabelX = pinGeometries.reduce((sum, pin) => sum + pin.center.x, 0) / Math.max(1, pinGeometries.length);
    const fallbackLabelY =
      pinGeometries.reduce((sum, pin) => sum + pin.center.y, 0) / Math.max(1, pinGeometries.length) - 10;
    const labelAnchor = symbol.refAnchor ?? { x: fallbackLabelX, y: fallbackLabelY };
    const lockPos = { x: labelAnchor.x + 10, y: labelAnchor.y - 10 };

    return (
      <g
        key={part.id}
        opacity={ghost ? 0.55 : 1}
        pointerEvents={canHit ? "all" : "none"}
        onPointerDown={(event) => {
          if (!canHit || event.button !== 0) return;
          event.stopPropagation();
          if (tool.type === "erase") {
            onDeletePart(part.id);
            return;
          }
          onSelectPart(part.id);
          onStartPartDrag(part, event);
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
              return <circle key={`prim-${idx}`} cx={primitive.cx} cy={primitive.cy} r={primitive.r} className={className} />;
            case "polyline":
              return <polyline key={`prim-${idx}`} points={primitive.points} className={className} style={{ fill: "none" }} />;
            case "polygon":
              return <polygon key={`prim-${idx}`} points={primitive.points} className={className} />;
          }
        })}

        <text x={labelAnchor.x} y={labelAnchor.y} textAnchor="middle" className={styles.partLabel}>
          {part.ref}
        </text>
        {locked ? <circle cx={lockPos.x} cy={lockPos.y} r={3.5} className={styles.partLockMarker} /> : null}
        {symbol.texts.map((text, idx) => (
          <text
            key={`pt-${idx}`}
            x={text.x}
            y={text.y}
            textAnchor={text.textAnchor}
            className={styles.partPinLabel}
            pointerEvents="none"
          >
            {text.text}
          </text>
        ))}
        {pins.map((pin) => {
          const center = holeCenterPx(pin.hole);
          return <circle key={pin.pinId} cx={center.x} cy={center.y} r={3} className={styles.partPin} pointerEvents="none" />;
        })}
        {!ghost && (part.footprint.type === "inline2" || part.footprint.type === "free2") && tool.type === "select"
          ? (() => {
              const pin1 = pins.find((pin) => pin.pinId === "1") ?? pins[0];
              const pin2 = pins.find((pin) => pin.pinId === "2") ?? pins[1];
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
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartInline2Stretch(part, "1", event);
                    }}
                  />
                  <circle
                    cx={c2.x}
                    cy={c2.y}
                    r={6}
                    className={styles.partPinHandle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartInline2Stretch(part, "2", event);
                    }}
                  />
                </>
              );
            })()
          : null}
      </g>
    );
  }

  return (
    <>
      {parts.map((part) => renderPart(part, false))}
      {ghostPart ? renderPart(ghostPart, true) : null}
    </>
  );
}

type NetLabelLayerProps = Readonly<{
  labels: readonly NetLabel[];
  labelDraftId: string | null;
  selection: Selection;
  tool: Tool;
  netIndex: NetIndex;
  onDeleteNetLabel: (id: string) => void;
  onSelectNetLabel: (id: string) => void;
  onStartLabelDrag: (label: NetLabel, event: ReactPointerEvent<SVGGElement>) => void;
}>;

export function NetLabelLayer({
  labels,
  labelDraftId,
  selection,
  tool,
  netIndex,
  onDeleteNetLabel,
  onSelectNetLabel,
  onStartLabelDrag,
}: NetLabelLayerProps) {
  return (
    <>
      {labels.map((label) => {
        const center = holeCenterPx(label.at);
        const rect = labelRect(label.name, center, label.offset);
        const textPos = labelTextPos(rect);
        const leaderTarget = labelLeaderTarget(rect);
        const netId = netIndex.holeToNetId.get(holeKey(label.at));
        const netName = netId ? netIndex.netIdToName.get(netId) : label.name;
        const color = netColor(netId ?? label.id, netName);
        const ghost = labelDraftId === label.id;
        const canHit = !ghost && (tool.type === "select" || tool.type === "erase");
        const selected = selection.type === "netLabel" && selection.id === label.id;

        return (
          <g
            key={label.id}
            opacity={ghost ? 0.6 : 1}
            pointerEvents={canHit ? "all" : "none"}
            onPointerDown={(event) => {
              if (!canHit || event.button !== 0) return;
              event.stopPropagation();
              if (tool.type === "erase") {
                onDeleteNetLabel(label.id);
                return;
              }
              onSelectNetLabel(label.id);
              onStartLabelDrag(label, event);
            }}
          >
            <line
              x1={center.x}
              y1={center.y}
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
      })}
    </>
  );
}

type ConnectDraftMarkerProps = Readonly<{
  hole: Hole | null;
}>;

export function ConnectDraftMarker({ hole }: ConnectDraftMarkerProps) {
  if (!hole) return null;
  const center = holeCenterPx(hole);
  return <circle cx={center.x} cy={center.y} r={6} className={styles.connectDraft} />;
}
