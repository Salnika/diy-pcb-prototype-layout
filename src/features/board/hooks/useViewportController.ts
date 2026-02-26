import { useRef } from "react";

export function useViewportController() {
  const panRef = useRef<{
    pointerId: number;
    start: { x: number; y: number };
    pan: { x: number; y: number };
  } | null>(null);

  return {
    panRef,
  };
}
