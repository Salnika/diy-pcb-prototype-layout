import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppKeyboardShortcuts } from "./useAppKeyboardShortcuts";
import { makeInline2Part } from "../../test/fixtures";

function dispatchKey(
  key: string,
  opts: Partial<KeyboardEventInit> & { target?: EventTarget | null } = {},
): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts });
  if (opts.target) {
    Object.defineProperty(ev, "target", { value: opts.target, configurable: true });
  }
  window.dispatchEvent(ev);
  return ev;
}

describe("useAppKeyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores typing targets", () => {
    const dispatch = vi.fn();
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "none" },
        traceDraft: null,
        parts: [],
      }),
    );

    const input = document.createElement("input");
    dispatchKey("v", { target: input });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("handles undo/redo shortcuts", () => {
    const dispatch = vi.fn();
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "none" },
        traceDraft: null,
        parts: [],
      }),
    );

    const ev1 = dispatchKey("z", { ctrlKey: true });
    const ev2 = dispatchKey("z", { metaKey: true, shiftKey: true });
    const ev3 = dispatchKey("y", { ctrlKey: true });
    expect(ev1.defaultPrevented).toBe(true);
    expect(ev2.defaultPrevented).toBe(true);
    expect(ev3.defaultPrevented).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "UNDO" });
    expect(dispatch).toHaveBeenCalledWith({ type: "REDO" });
  });

  it("handles escape and enter with trace draft", () => {
    const dispatch = vi.fn();
    const traceDraft = { kind: "wire" as const, layer: "bottom" as const, nodes: [{ x: 0, y: 0 }] };
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "none" },
        traceDraft,
        parts: [],
      }),
    );

    dispatchKey("Escape");
    dispatchKey("Enter");
    expect(dispatch).toHaveBeenCalledWith({ type: "CANCEL_TRACE" });
    expect(dispatch).toHaveBeenCalledWith({ type: "FINISH_TRACE" });
  });

  it("handles escape without trace draft", () => {
    const dispatch = vi.fn();
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "part", id: "p1" },
        traceDraft: null,
        parts: [],
      }),
    );

    dispatchKey("Escape");
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT", selection: { type: "none" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "SET_TOOL", tool: { type: "select" } });
  });

  it("handles deletion and trace pop", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      (props: { selection: any; traceDraft: any }) =>
        useAppKeyboardShortcuts({
          dispatch,
          selection: props.selection,
          traceDraft: props.traceDraft,
          parts: [],
        }),
      {
        initialProps: { selection: { type: "none" }, traceDraft: { kind: "wire", layer: "bottom", nodes: [{ x: 0, y: 0 }] } },
      },
    );

    const ev = dispatchKey("Delete");
    expect(ev.defaultPrevented).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "POP_TRACE_NODE" });

    rerender({ selection: { type: "part", id: "p1" }, traceDraft: null });
    dispatchKey("Delete");
    rerender({ selection: { type: "trace", id: "t1" }, traceDraft: null });
    dispatchKey("Delete");
    rerender({ selection: { type: "netLabel", id: "nl1" }, traceDraft: null });
    dispatchKey("Backspace");
    rerender({ selection: { type: "net", id: "n1" }, traceDraft: null });
    dispatchKey("Delete");

    expect(dispatch).toHaveBeenCalledWith({ type: "DELETE_PART", id: "p1" });
    expect(dispatch).toHaveBeenCalledWith({ type: "DELETE_TRACE", id: "t1" });
    expect(dispatch).toHaveBeenCalledWith({ type: "DELETE_NETLABEL", id: "nl1" });
    expect(dispatch).toHaveBeenCalledWith({ type: "DELETE_NET", id: "n1" });
  });

  it("rotates selected part on R", () => {
    const dispatch = vi.fn();
    const part = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, rotation: 0 });
    const { rerender } = renderHook(
      (props: { selection: any; parts: any[] }) =>
        useAppKeyboardShortcuts({
          dispatch,
          selection: props.selection,
          traceDraft: null,
          parts: props.parts,
        }),
      { initialProps: { selection: { type: "part", id: "p1" }, parts: [part] } },
    );
    dispatchKey("r");
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UPDATE_PART",
        part: expect.objectContaining({ placement: expect.objectContaining({ rotation: 90 }) }),
      }),
    );

    rerender({ selection: { type: "part", id: "missing" }, parts: [part] });
    dispatchKey("r");
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("switches tool with one-key shortcuts", () => {
    const dispatch = vi.fn();
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "none" },
        traceDraft: null,
        parts: [],
      }),
    );

    for (const [key, tool] of [
      ["v", "select"],
      ["c", "connect"],
      ["f", "fixedPoint"],
      ["w", "wire"],
      ["j", "jumper"],
      ["l", "label"],
      ["e", "erase"],
    ] as const) {
      dispatchKey(key);
      expect(dispatch).toHaveBeenCalledWith({ type: "SET_TOOL", tool: { type: tool } });
    }
  });

  it("ignores Enter when no trace draft exists", () => {
    const dispatch = vi.fn();
    renderHook(() =>
      useAppKeyboardShortcuts({
        dispatch,
        selection: { type: "none" },
        traceDraft: null,
        parts: [],
      }),
    );
    dispatchKey("Enter");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
