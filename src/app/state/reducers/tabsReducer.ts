import type { AppState, TabState } from "../../store";

function findActiveTabIndex(state: AppState): number {
  return state.tabs.findIndex((tab) => tab.id === state.activeTabId);
}

function replaceTabAt(state: AppState, index: number, tab: TabState): AppState {
  if (index < 0 || index >= state.tabs.length) return state;
  const tabs = [...state.tabs];
  tabs[index] = tab;
  return { ...state, tabs };
}

export function replaceActiveTab(
  state: AppState,
  update: (tab: TabState, index: number) => TabState,
): AppState {
  const index = findActiveTabIndex(state);
  if (index < 0) return state;
  const nextTab = update(state.tabs[index], index);
  if (nextTab === state.tabs[index]) return state;
  return replaceTabAt(state, index, nextTab);
}
