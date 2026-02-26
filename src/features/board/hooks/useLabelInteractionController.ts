import { useRef, useState } from "react";
import type { NetLabel } from "../../../model";

export function useLabelInteractionController() {
  const labelDragRef = useRef<{
    pointerId: number;
    labelId: string;
    grabOffset: { x: number; y: number };
  } | null>(null);
  const labelDraftRef = useRef<{
    pointerId: number;
    grabOffset: { x: number; y: number };
  } | null>(null);

  const [labelDragPreview, setLabelDragPreview] = useState<NetLabel | null>(null);
  const [labelDraft, setLabelDraft] = useState<NetLabel | null>(null);

  return {
    labelDragRef,
    labelDraftRef,
    labelDragPreview,
    setLabelDragPreview,
    labelDraft,
    setLabelDraft,
  };
}
