import type { PointerEvent as ReactPointerEvent } from "react";
import type { Selection, Tool } from "../../../../app/store";
import { holeKey, netColor, type NetIndex, type Trace } from "../../../../model";
import { holeCenterPx, pointsAttr } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

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
  onStartTraceSegmentDrag: (
    trace: Trace,
    segmentIndex: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onStartTraceNodeDrag: (
    trace: Trace,
    nodeIndex: number,
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
  onStartTraceSegmentDrag,
  onStartTraceNodeDrag,
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
        const color = trace.color ?? netColor(netId ?? trace.id, name);
        const isHot = activeNetId && netId === activeNetId;
        const canHit = tool.type === "select" || tool.type === "erase";
        const showHandles = tool.type === "select" && isSelected && trace.nodes.length >= 2;
        const start = trace.nodes[0];
        const end = trace.nodes[trace.nodes.length - 1];
        const nodeHandles = showHandles
          ? trace.nodes.slice(1, -1).map((node, index) => ({
              index: index + 1,
              center: holeCenterPx(node),
            }))
          : [];
        const segmentHandles = showHandles
          ? trace.nodes.slice(0, -1).flatMap((from, index) => {
              const to = trace.nodes[index + 1];
              if (!to) return [];
              const isAxisAligned =
                (from.x === to.x || from.y === to.y) && (from.x !== to.x || from.y !== to.y);
              if (!isAxisAligned) return [];
              const a = holeCenterPx(from);
              const b = holeCenterPx(to);
              return [{ index, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];
            })
          : [];

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
                {segmentHandles.map((handle) => (
                  <circle
                    key={`seg-${trace.id}-${handle.index}`}
                    cx={handle.x}
                    cy={handle.y}
                    r={5}
                    className={styles.traceHandle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartTraceSegmentDrag(trace, handle.index, event);
                    }}
                  />
                ))}
                {nodeHandles.map((handle) => (
                  <circle
                    key={`node-${trace.id}-${handle.index}`}
                    cx={handle.center.x}
                    cy={handle.center.y}
                    r={5}
                    className={styles.traceHandle}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      onStartTraceNodeDrag(trace, handle.index, event);
                    }}
                  />
                ))}
              </>
            ) : null}
          </g>
        );
      })}
    </>
  );
}
