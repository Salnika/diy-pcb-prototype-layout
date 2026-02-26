import type { PointerEvent as ReactPointerEvent } from "react";
import type { Selection, Tool } from "../../../../app/store";
import { holeKey, netColor, type NetIndex, type NetLabel } from "../../../../model";
import { holeCenterPx, labelLeaderTarget, labelRect, labelTextPos } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

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
