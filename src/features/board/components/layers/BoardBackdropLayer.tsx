import { axisLabel, GUTTER_LEFT, GUTTER_TOP, holeCenterPx, PITCH_PX } from "../../boardGeometry";
import type { Board, Hole, NetIndex } from "../../../../model";
import * as styles from "../../BoardView.css";

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
              <circle
                key={`nh-${hole.x},${hole.y}`}
                cx={center.x}
                cy={center.y}
                r={6}
                fill={activeNetColor ?? "#fff"}
              />
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
                <line
                  x1={center.x - 4}
                  y1={center.y}
                  x2={center.x + 4}
                  y2={center.y}
                  className={styles.fixedHoleCross}
                />
                <line
                  x1={center.x}
                  y1={center.y - 4}
                  x2={center.x}
                  y2={center.y + 4}
                  className={styles.fixedHoleCross}
                />
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
