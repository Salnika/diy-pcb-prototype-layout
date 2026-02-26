import type { AppState, TabState } from "../../store";
import { replaceActiveTab } from "./tabsReducer";

function setActiveTabUi(
  state: AppState,
  updateUi: (ui: TabState["ui"]) => TabState["ui"],
): AppState {
  return replaceActiveTab(state, (tab) => ({ ...tab, ui: updateUi(tab.ui) }));
}

export function setActiveTabError(state: AppState, message: string): AppState {
  return setActiveTabUi(state, (ui) => ({ ...ui, traceDraft: null, lastError: message }));
}
