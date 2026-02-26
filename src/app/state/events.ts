export type AppEvent = Readonly<{
  type: string;
  payload?: unknown;
}>;

type LegacyLikeAction = Readonly<{
  type: string;
  [key: string]: unknown;
}>;

export function actionToAppEvent(action: LegacyLikeAction): AppEvent {
  if (
    action.type === "INTERACTION_EVENT" &&
    typeof action.event === "object" &&
    action.event !== null
  ) {
    const interactionEvent = action.event as { type?: unknown; payload?: unknown };
    if (typeof interactionEvent.type === "string") {
      return {
        type: interactionEvent.type,
        payload: interactionEvent.payload,
      };
    }
  }

  switch (action.type) {
    case "START_TRACE":
      return { type: "interaction.traceDraft.started", payload: action };
    case "ADD_TRACE_NODE":
      return { type: "interaction.traceDraft.updated", payload: action };
    case "FINISH_TRACE":
    case "CANCEL_TRACE":
      return { type: "interaction.traceDraft.ended", payload: action };
    case "SET_TOOL":
      return { type: "ui.tool.changed", payload: action };
    case "SELECT":
      return { type: "ui.selection.changed", payload: action };
    case "SET_VIEWPORT":
      return { type: "interaction.viewport.changed", payload: action };
    default:
      return { type: `action.${action.type.toLowerCase()}`, payload: action };
  }
}
