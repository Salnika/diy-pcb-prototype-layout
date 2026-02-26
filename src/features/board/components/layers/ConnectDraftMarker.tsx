import type { Hole } from "../../../../model";
import { holeCenterPx } from "../../boardGeometry";
import * as styles from "../../BoardView.css";

type ConnectDraftMarkerProps = Readonly<{
  hole: Hole | null;
}>;

export function ConnectDraftMarker({ hole }: ConnectDraftMarkerProps) {
  if (!hole) return null;
  const center = holeCenterPx(hole);
  return <circle cx={center.x} cy={center.y} r={6} className={styles.connectDraft} />;
}
