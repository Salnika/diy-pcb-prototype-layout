import { useRef, useState } from "react";
import type { Hole, Part } from "../../../model";

export function usePartInteractionController() {
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
  const inline2DraftRef = useRef<{
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const [dragPreview, setDragPreview] = useState<Part | null>(null);
  const [inline2DraftStart, setInline2DraftStart] = useState<Hole | null>(null);

  function resetInline2Draft() {
    inline2DraftRef.current = null;
    setInline2DraftStart(null);
  }

  return {
    dragRef,
    stretchRef,
    inline2DraftRef,
    dragPreview,
    setDragPreview,
    inline2DraftStart,
    setInline2DraftStart,
    resetInline2Draft,
  };
}
