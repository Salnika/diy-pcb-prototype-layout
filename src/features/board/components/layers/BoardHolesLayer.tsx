import type { Selection } from "../../../../app/store";
import type { Hole } from "../../../../model";
import { holeCenterPx } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

type BoardHolesLayerProps = Readonly<{
  holes: readonly Hole[];
  hoverHole: Hole | null;
  selection: Selection;
}>;

export function BoardHolesLayer({ holes, hoverHole, selection }: BoardHolesLayerProps) {
  const idle = selection.type === "none";
  const holeRadius = idle ? 1.6 : 1.9;
  const hoverRadius = idle ? 2.5 : 2.8;

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
            r={isHover ? hoverRadius : holeRadius}
            className={isHover ? styles.holeHover : styles.hole}
            pointerEvents="none"
          />
        );
      })}
    </>
  );
}
