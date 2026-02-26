import { withUpdatedAt } from "../../../model";
import type { Project } from "../../../model";
import type { AppState } from "../../store";
import { replaceActiveTab } from "./tabsReducer";

export function commitProject(state: AppState, nextProject: Project): AppState {
  return replaceActiveTab(state, (active) => {
    if (nextProject === active.project) return active;
    const withMeta = withUpdatedAt(nextProject);
    return {
      ...active,
      project: withMeta,
      history: { past: [...active.history.past, active.project], future: [] },
      ui: { ...active.ui, lastError: null },
    };
  });
}
