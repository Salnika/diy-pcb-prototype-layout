import type { AppEvent } from "./events";

export type InteractionMode =
  | "idle"
  | "panning"
  | "draggingPart"
  | "draggingTraceEndpoint"
  | "draggingTraceSegment"
  | "draggingTraceNode"
  | "draggingLabel"
  | "draftingLabel"
  | "draftingInline2"
  | "connectFirstTerminal";

export type InteractionState = Readonly<{
  mode: InteractionMode;
}>;

export const initialInteractionState: InteractionState = { mode: "idle" };

const EVENT_TO_MODE = new Map<string, InteractionMode>([
  ["interaction.panning.started", "panning"],
  ["interaction.part.drag.started", "draggingPart"],
  ["interaction.trace.endpoint.drag.started", "draggingTraceEndpoint"],
  ["interaction.trace.segment.drag.started", "draggingTraceSegment"],
  ["interaction.trace.node.drag.started", "draggingTraceNode"],
  ["interaction.label.drag.started", "draggingLabel"],
  ["interaction.label.draft.started", "draftingLabel"],
  ["interaction.inline2.draft.started", "draftingInline2"],
  ["interaction.connect.firstTerminal.selected", "connectFirstTerminal"],
]);

export function reduceInteractionState(
  current: InteractionState,
  event: AppEvent,
): InteractionState {
  if (event.type === "interaction.reset") return initialInteractionState;
  if (event.type === "interaction.traceDraft.started") return { mode: "draftingInline2" };
  if (event.type === "interaction.traceDraft.ended") return initialInteractionState;
  if (event.type === "ui.tool.changed" || event.type === "ui.selection.changed") {
    return current.mode === "idle" ? current : initialInteractionState;
  }

  if (event.type.endsWith(".ended") || event.type.endsWith(".cancelled")) {
    return initialInteractionState;
  }

  const nextMode = EVENT_TO_MODE.get(event.type);
  if (!nextMode || nextMode === current.mode) return current;
  return { mode: nextMode };
}
