import { act, render, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import React from "react";
import { AppStoreProvider, makeDefaultPart, rotatePart, useAppDispatch, useAppState } from "./store";

function setupStore() {
  let latestState: ReturnType<typeof useAppState> | null = null;
  let latestDispatch: ReturnType<typeof useAppDispatch> | null = null;

  function Probe() {
    latestState = useAppState();
    latestDispatch = useAppDispatch();
    return null;
  }

  const view = render(
    <AppStoreProvider>
      <Probe />
    </AppStoreProvider>,
  );

  function state() {
    if (!latestState) throw new Error("state unavailable");
    return latestState;
  }

  function dispatch() {
    if (!latestDispatch) throw new Error("dispatch unavailable");
    return latestDispatch;
  }

  return { ...view, state, dispatch };
}

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enforces hook usage within provider", () => {
    expect(() => renderHook(() => useAppState())).toThrow("useAppState must be used within AppStoreProvider");
    expect(() => renderHook(() => useAppDispatch())).toThrow("useAppDispatch must be used within AppStoreProvider");
  });

  it("initializes with one active tab and default UI state", () => {
    const { state } = setupStore();
    expect(state().tabs.length).toBe(1);
    expect(state().activeTabId).toBe(state().tabs[0]?.id);
    expect(state().ui.tool).toEqual({ type: "select" });
    expect(state().ui.selection).toEqual({ type: "none" });
  });

  it("keeps placePart rotation while switching part kinds", () => {
    const { state, dispatch } = setupStore();
    act(() => {
      dispatch()({ type: "SET_TOOL", tool: { type: "placePart", kind: "resistor", rotation: 90 } });
    });
    expect(state().ui.tool).toEqual({ type: "placePart", kind: "resistor", rotation: 90 });

    act(() => {
      dispatch()({ type: "SET_TOOL", tool: { type: "placePart", kind: "diode" } });
    });
    expect(state().ui.tool).toEqual({ type: "placePart", kind: "diode", rotation: 90 });

    act(() => {
      dispatch()({ type: "SET_TOOL", tool: { type: "select" } });
      dispatch()({ type: "SET_TOOL", tool: { type: "placePart", kind: "capacitor" } });
    });
    expect(state().ui.tool).toEqual({ type: "placePart", kind: "capacitor" });
  });

  it("adds parts, auto-numbers refs and supports undo/redo", () => {
    const { state, dispatch } = setupStore();
    act(() => {
      dispatch()({ type: "ADD_PART", part: makeDefaultPart("resistor", { x: 1, y: 1 }) });
      dispatch()({ type: "ADD_PART", part: makeDefaultPart("resistor", { x: 3, y: 1 }) });
    });

    expect(state().project.parts.map((p) => p.ref)).toEqual(["R1", "R2"]);
    expect(state().history.past.length).toBeGreaterThan(0);

    act(() => {
      dispatch()({ type: "UNDO" });
    });
    expect(state().project.parts.map((p) => p.ref)).toEqual(["R1"]);

    act(() => {
      dispatch()({ type: "REDO" });
    });
    expect(state().project.parts.map((p) => p.ref)).toEqual(["R1", "R2"]);
  });

  it("manages trace workflow and viewport updates", () => {
    const { state, dispatch } = setupStore();
    act(() => {
      dispatch()({ type: "START_TRACE", kind: "wire", start: { x: 1, y: 1 } });
      dispatch()({ type: "ADD_TRACE_NODE", hole: { x: 2, y: 1 } });
      dispatch()({ type: "FINISH_TRACE" });
    });
    const traceId = state().project.traces[0]?.id;
    act(() => {
      if (traceId) dispatch()({ type: "UPDATE_TRACE_COLOR", id: traceId, color: "#ff5500" });
      dispatch()({ type: "SET_VIEWPORT", viewport: { scale: 2, pan: { x: 10, y: 20 } } });
    });

    expect(state().project.traces.length).toBe(1);
    expect(state().project.traces[0]?.nodes).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }]);
    expect(state().project.traces[0]?.color).toBe("#ff5500");
    expect(state().ui.viewport).toEqual({ scale: 2, pan: { x: 10, y: 20 } });
  });

  it("handles errors and board constraints", () => {
    const { state, dispatch } = setupStore();
    act(() => {
      dispatch()({ type: "UPDATE_BOARD", width: 0, height: 0 });
    });
    expect(state().ui.lastError).toContain("Dimensions de board invalides");

    act(() => {
      dispatch()({ type: "SET_ERROR", message: "boom" });
    });
    expect(state().ui.lastError).toBe("boom");

    act(() => {
      dispatch()({ type: "CLEAR_ERROR" });
    });
    expect(state().ui.lastError).toBeNull();
  });

  it("runs auto-layout and surfaces errors when netlist is not routable", () => {
    const { state, dispatch } = setupStore();

    act(() => {
      dispatch()({ type: "RUN_AUTO_LAYOUT" });
    });
    expect(state().ui.lastError).toContain("Auto-layout");
  });

  it("supports tabs and active tab switching", () => {
    const { state, dispatch } = setupStore();
    const firstId = state().activeTabId;
    act(() => {
      dispatch()({ type: "ADD_TAB", name: "Second" });
    });
    const secondId = state().activeTabId;
    expect(secondId).not.toBe(firstId);
    expect(state().tabs.length).toBe(2);

    act(() => {
      dispatch()({ type: "SET_ACTIVE_TAB", id: firstId });
    });
    expect(state().activeTabId).toBe(firstId);
  });

  it("can rotate parts through utility function", () => {
    const part = makeDefaultPart("resistor", { x: 1, y: 1 });
    const r1 = rotatePart(part);
    const r2 = rotatePart(r1);
    const r3 = rotatePart(r2);
    const r4 = rotatePart(r3);
    expect([r1.placement.rotation, r2.placement.rotation, r3.placement.rotation, r4.placement.rotation]).toEqual([
      90,
      180,
      270,
      0,
    ]);
  });
});
