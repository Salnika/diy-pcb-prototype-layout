import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInline2Part, makeProject, makeTrace } from "../../../test/fixtures";
import type { NetIndex } from "../../../model";

const mocks = vi.hoisted(() => ({
  svgPointFromEvent: vi.fn(),
  holeFromWorld: vi.fn(),
}));

vi.mock("../boardGeometry", async () => {
  const actual = await vi.importActual<typeof import("../boardGeometry")>("../boardGeometry");
  return {
    ...actual,
    svgPointFromEvent: (...args: Parameters<typeof actual.svgPointFromEvent>) => mocks.svgPointFromEvent(...args),
    holeFromWorld: (...args: Parameters<typeof actual.holeFromWorld>) => mocks.holeFromWorld(...args),
  };
});

import { useBoardInteractions } from "./useBoardInteractions";

type BoardInteractionsParams = Parameters<typeof useBoardInteractions>[0];

function emptyNetIndex(): NetIndex {
  return {
    holeToNetId: new Map(),
    netIdToHoles: new Map(),
    netIdToName: new Map(),
    netIdToConflicts: new Map(),
  };
}

function fakeSvg() {
  return {
    setPointerCapture: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as SVGSVGElement;
}

describe("useBoardInteractions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.svgPointFromEvent.mockReturnValue({ x: 40, y: 50 });
    mocks.holeFromWorld.mockImplementation((world: { x: number; y: number }) => ({
      x: Math.floor(world.x / 10),
      y: Math.floor(world.y / 10),
    }));
    vi.spyOn(window, "prompt").mockReturnValue("GND");
  });

  function baseParams(): BoardInteractionsParams {
    const project = makeProject({ width: 12, height: 10 });
    return {
      board: project.board,
      viewport: { scale: 1, pan: { x: 0, y: 0 } },
      tool: { type: "select" },
      selection: { type: "none" },
      traceDraft: null,
      hoverHole: null,
      parts: [],
      traces: [],
      netLabels: [],
      fixedPartIds: new Set<string>(),
      netIndex: emptyNetIndex(),
      dispatch: vi.fn(),
    };
  }

  it("zooms with wheel and dispatches viewport updates", () => {
    const params = baseParams();
    const { result } = renderHook(() => useBoardInteractions(params));
    result.current.svgRef.current = fakeSvg();

    act(() => {
      result.current.onWheel({
        deltaY: -10,
        nativeEvent: {},
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any);
    });

    expect(params.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SET_VIEWPORT",
        viewport: expect.objectContaining({ scale: 1.1 }),
      }),
    );
  });

  it("supports middle-button panning", () => {
    const params = baseParams();
    const { result } = renderHook(() => useBoardInteractions(params));
    const svg = fakeSvg();
    result.current.svgRef.current = svg;

    mocks.svgPointFromEvent.mockReturnValueOnce({ x: 10, y: 10 }).mockReturnValueOnce({ x: 30, y: 45 });

    act(() => {
      result.current.onPointerDown({ button: 1, pointerId: 11 } as any);
    });
    act(() => {
      result.current.onPointerMove({ pointerId: 11 } as any);
    });

    expect(params.dispatch).toHaveBeenCalledWith({
      type: "SET_VIEWPORT",
      viewport: { scale: 1, pan: { x: 20, y: 35 } },
    });
    expect(svg.setPointerCapture).toHaveBeenCalledWith(11);
  });

  it("places non-inline part on pointer down in placePart mode", () => {
    const params = {
      ...baseParams(),
      tool: { type: "placePart" as const, kind: "transistor" as const, rotation: 180 as const },
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    result.current.svgRef.current = fakeSvg();
    mocks.holeFromWorld.mockReturnValue({ x: 2, y: 3 });

    act(() => {
      result.current.onPointerDown({ button: 0, pointerId: 1 } as any);
    });

    expect(params.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADD_PART",
        part: expect.objectContaining({ placement: expect.objectContaining({ rotation: 180 }) }),
      }),
    );
    expect(params.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SELECT", selection: expect.objectContaining({ type: "part" }) }),
    );
  });

  it("handles connect mode state machine", () => {
    const dispatch = vi.fn();
    const initial: BoardInteractionsParams = { ...baseParams(), tool: { type: "connect" }, dispatch };
    const { result, rerender } = renderHook((props: BoardInteractionsParams) => useBoardInteractions(props), {
      initialProps: initial,
    });
    result.current.svgRef.current = fakeSvg();

    mocks.holeFromWorld.mockReturnValueOnce({ x: 1, y: 1 });
    act(() => {
      result.current.onPointerDown({ button: 0, pointerId: 2 } as any);
    });
    expect(result.current.connectDraft).toEqual({ kind: "hole", hole: { x: 1, y: 1 } });

    rerender({ ...initial, selection: { type: "net", id: "n1" } });
    mocks.holeFromWorld.mockReturnValueOnce({ x: 2, y: 1 });
    act(() => {
      result.current.onPointerDown({ button: 0, pointerId: 3 } as any);
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_NET_TERMINAL", id: "n1", terminal: { kind: "hole", hole: { x: 1, y: 1 } } });
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_NET_TERMINAL", id: "n1", terminal: { kind: "hole", hole: { x: 2, y: 1 } } });
  });

  it("handles wire draft completion and double click", () => {
    const dispatch = vi.fn();
    const params = {
      ...baseParams(),
      tool: { type: "wire" as const },
      traceDraft: { kind: "wire" as const, layer: "bottom" as const, nodes: [{ x: 1, y: 1 }] },
      dispatch,
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    result.current.svgRef.current = fakeSvg();
    mocks.holeFromWorld.mockReturnValue({ x: 1, y: 1 });

    act(() => {
      result.current.onPointerDown({ button: 0, pointerId: 4 } as any);
    });
    act(() => {
      result.current.onDoubleClick();
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_TRACE_NODE", hole: { x: 1, y: 1 } });
    expect(dispatch).toHaveBeenCalledWith({ type: "FINISH_TRACE" });
  });

  it("creates and commits label drafts", () => {
    const dispatch = vi.fn();
    const params = {
      ...baseParams(),
      tool: { type: "label" as const },
      dispatch,
      netIndex: {
        ...emptyNetIndex(),
        holeToNetId: new Map([["1,1", "n1"]]),
        netIdToName: new Map([["n1", "GND"]]),
      },
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    result.current.svgRef.current = fakeSvg();
    mocks.holeFromWorld.mockReturnValue({ x: 1, y: 1 });

    act(() => {
      result.current.onPointerDown({ button: 0, pointerId: 7 } as any);
    });
    expect(result.current.labelDraftId).not.toBeNull();
    expect(result.current.labelsToRender.length).toBe(1);

    act(() => {
      result.current.onPointerUp({ pointerId: 7 } as any);
    });

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "ADD_NETLABEL" }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SELECT", selection: expect.objectContaining({ type: "netLabel" }) }),
    );
  });

  it("drags part and updates preview traces", () => {
    const dispatch = vi.fn();
    const part = makeInline2Part({ id: "p1", ref: "R1", origin: { x: 1, y: 1 }, span: 2 });
    const trace = makeTrace("t1", [{ x: 1, y: 1 }, { x: 3, y: 1 }]);
    const params = {
      ...baseParams(),
      dispatch,
      tool: { type: "select" as const },
      parts: [part],
      traces: [trace],
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    result.current.svgRef.current = fakeSvg();

    mocks.holeFromWorld.mockReturnValueOnce({ x: 1, y: 1 });
    act(() => {
      result.current.startPartDrag(part, { pointerId: 12 } as any);
    });

    mocks.holeFromWorld.mockReturnValueOnce({ x: 4, y: 2 });
    act(() => {
      result.current.onPointerMove({ pointerId: 12 } as any);
    });
    expect(result.current.partsToRender[0]?.placement.origin).toEqual({ x: 4, y: 2 });
    expect(result.current.tracesToRender[0]?.nodes[0]).toEqual({ x: 4, y: 2 });

    act(() => {
      result.current.onPointerUp({ pointerId: 12 } as any);
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "UPDATE_PART" }));
  });

  it("drags a trace segment from the middle and creates a natural dogleg", () => {
    const dispatch = vi.fn();
    const trace = makeTrace("t1", [{ x: 1, y: 1 }, { x: 4, y: 1 }]);
    const params = {
      ...baseParams(),
      dispatch,
      tool: { type: "select" as const },
      traces: [trace],
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    const svg = fakeSvg();
    result.current.svgRef.current = svg;

    act(() => {
      result.current.startTraceSegmentDrag(trace, 0, { pointerId: 21 } as any);
    });
    expect(svg.setPointerCapture).toHaveBeenCalledWith(21);

    mocks.holeFromWorld.mockReturnValueOnce({ x: 3, y: 3 });
    act(() => {
      result.current.onPointerMove({ pointerId: 21 } as any);
    });
    expect(result.current.tracesToRender[0]?.nodes).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 1 },
    ]);

    act(() => {
      result.current.onPointerUp({ pointerId: 21 } as any);
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_TRACE",
      id: "t1",
      nodes: [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 1 }],
    });
  });

  it("drags an internal trace node (angle/intersection point)", () => {
    const dispatch = vi.fn();
    const trace = makeTrace("t2", [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 4, y: 3 }]);
    const params = {
      ...baseParams(),
      dispatch,
      tool: { type: "select" as const },
      traces: [trace],
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    const svg = fakeSvg();
    result.current.svgRef.current = svg;

    act(() => {
      result.current.startTraceNodeDrag(trace, 1, { pointerId: 22 } as any);
    });
    expect(svg.setPointerCapture).toHaveBeenCalledWith(22);

    mocks.holeFromWorld.mockReturnValueOnce({ x: 2, y: 2 });
    act(() => {
      result.current.onPointerMove({ pointerId: 22 } as any);
    });
    expect(result.current.tracesToRender[0]?.nodes).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }]);

    act(() => {
      result.current.onPointerUp({ pointerId: 22 } as any);
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_TRACE",
      id: "t2",
      nodes: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }],
    });
  });

  it("computes ghost part for placePart tool with hover hole", () => {
    const params = {
      ...baseParams(),
      tool: { type: "placePart" as const, kind: "resistor" as const, rotation: 270 as const },
      hoverHole: { x: 2, y: 2 },
    };
    const { result } = renderHook(() => useBoardInteractions(params));
    expect(result.current.ghostPart).not.toBeNull();
    expect(result.current.ghostPart?.placement.rotation).toBe(270);
  });
});
