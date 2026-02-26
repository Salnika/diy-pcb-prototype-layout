import type { AppState } from "../../store";
import { replaceActiveTab } from "./tabsReducer";

export function applyUndo(state: AppState): AppState {
  return replaceActiveTab(state, (tab) => {
    const past = tab.history.past;
    if (past.length === 0) return tab;
    const previous = past[past.length - 1];
    return {
      ...tab,
      project: previous,
      history: { past: past.slice(0, -1), future: [tab.project, ...tab.history.future] },
      ui: { ...tab.ui, traceDraft: null, lastError: null },
    };
  });
}

export function applyRedo(state: AppState): AppState {
  return replaceActiveTab(state, (tab) => {
    const future = tab.history.future;
    if (future.length === 0) return tab;
    const next = future[0];
    return {
      ...tab,
      project: next,
      history: { past: [...tab.history.past, tab.project], future: future.slice(1) },
      ui: { ...tab.ui, traceDraft: null, lastError: null },
    };
  });
}
