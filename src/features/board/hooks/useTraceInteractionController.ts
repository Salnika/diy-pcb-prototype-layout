import { useRef, useState } from "react";
import type { Trace } from "../../../model";

export function useTraceInteractionController() {
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
  const traceNodeDragRef = useRef<{
    pointerId: number;
    traceId: string;
    nodeIndex: number;
  } | null>(null);

  const [traceDragPreview, setTraceDragPreview] = useState<Trace | null>(null);

  return {
    traceDragRef,
    traceSegmentDragRef,
    traceNodeDragRef,
    traceDragPreview,
    setTraceDragPreview,
  };
}
