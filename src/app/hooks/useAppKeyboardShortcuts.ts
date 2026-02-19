import { useEffect, type Dispatch } from "react";
import type { Part } from "../../model";
import { rotatePart, type Action, type Selection, type TraceDraft } from "../store";

type UseAppKeyboardShortcutsParams = Readonly<{
  dispatch: Dispatch<Action>;
  selection: Selection;
  traceDraft: TraceDraft | null;
  parts: readonly Part[];
}>;

export function useAppKeyboardShortcuts({
  dispatch,
  selection,
  traceDraft,
  parts,
}: UseAppKeyboardShortcutsParams) {
  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      const target = ev.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        dispatch({ type: ev.shiftKey ? "REDO" : "UNDO" });
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (ev.key === "Escape") {
        if (traceDraft) {
          dispatch({ type: "CANCEL_TRACE" });
          return;
        }
        dispatch({ type: "SELECT", selection: { type: "none" } });
        dispatch({ type: "SET_TOOL", tool: { type: "select" } });
        return;
      }

      if (ev.key === "Enter") {
        if (traceDraft) {
          dispatch({ type: "FINISH_TRACE" });
        }
        return;
      }

      if (ev.key === "Backspace" || ev.key === "Delete") {
        if (traceDraft) {
          ev.preventDefault();
          dispatch({ type: "POP_TRACE_NODE" });
          return;
        }
        if (selection.type === "part") dispatch({ type: "DELETE_PART", id: selection.id });
        if (selection.type === "trace") dispatch({ type: "DELETE_TRACE", id: selection.id });
        if (selection.type === "netLabel") dispatch({ type: "DELETE_NETLABEL", id: selection.id });
        if (selection.type === "net") dispatch({ type: "DELETE_NET", id: selection.id });
        return;
      }

      if (ev.key.toLowerCase() === "r" && selection.type === "part") {
        const part = parts.find((entry) => entry.id === selection.id);
        if (part) dispatch({ type: "UPDATE_PART", part: rotatePart(part) });
        return;
      }

      switch (ev.key.toLowerCase()) {
        case "v":
          dispatch({ type: "SET_TOOL", tool: { type: "select" } });
          break;
        case "c":
          dispatch({ type: "SET_TOOL", tool: { type: "connect" } });
          break;
        case "f":
          dispatch({ type: "SET_TOOL", tool: { type: "fixedPoint" } });
          break;
        case "w":
          dispatch({ type: "SET_TOOL", tool: { type: "wire" } });
          break;
        case "j":
          dispatch({ type: "SET_TOOL", tool: { type: "jumper" } });
          break;
        case "l":
          dispatch({ type: "SET_TOOL", tool: { type: "label" } });
          break;
        case "e":
          dispatch({ type: "SET_TOOL", tool: { type: "erase" } });
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selection, parts, traceDraft]);
}
