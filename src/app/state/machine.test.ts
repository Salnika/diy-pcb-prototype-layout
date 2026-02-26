import { describe, expect, it } from "vitest";
import { initialInteractionState, reduceInteractionState } from "./machine";

describe("interaction machine", () => {
  it("starts in idle", () => {
    expect(initialInteractionState).toEqual({ mode: "idle" });
  });

  it("moves to requested interaction mode", () => {
    const next = reduceInteractionState(initialInteractionState, {
      type: "interaction.trace.segment.drag.started",
    });
    expect(next).toEqual({ mode: "draggingTraceSegment" });
  });

  it("returns to idle on ended or cancelled events", () => {
    const dragging = { mode: "draggingPart" } as const;
    expect(reduceInteractionState(dragging, { type: "interaction.part.drag.ended" })).toEqual({
      mode: "idle",
    });
    expect(reduceInteractionState(dragging, { type: "interaction.connect.cancelled" })).toEqual({
      mode: "idle",
    });
  });

  it("resets non-idle mode when tool or selection changes", () => {
    const current = { mode: "draggingLabel" } as const;
    expect(reduceInteractionState(current, { type: "ui.tool.changed" })).toEqual({ mode: "idle" });
    expect(reduceInteractionState(current, { type: "ui.selection.changed" })).toEqual({
      mode: "idle",
    });
  });

  it("handles trace draft lifecycle", () => {
    const draft = reduceInteractionState(initialInteractionState, {
      type: "interaction.traceDraft.started",
    });
    expect(draft).toEqual({ mode: "draftingInline2" });
    expect(reduceInteractionState(draft, { type: "interaction.traceDraft.ended" })).toEqual({
      mode: "idle",
    });
  });
});
