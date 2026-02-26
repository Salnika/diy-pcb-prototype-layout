import type { Tool, TraceDraft } from "../../../../app/store";
import type { Hole } from "../../../../model";
import { pointsAttr } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

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
