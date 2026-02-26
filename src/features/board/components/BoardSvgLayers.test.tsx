import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  BoardBackdropLayer,
  BoardHolesLayer,
  ConnectDraftMarker,
  NetLabelLayer,
  PartLayer,
  TraceDraftLayer,
  TraceLayer,
} from "./BoardSvgLayers";
import { makeInline2Part, makeLabel, makeProject, makeTrace } from "../../../test/fixtures";

function renderSvg(ui: ReactNode) {
  return render(
    <svg>
      <g>{ui}</g>
    </svg>,
  );
}

const board = makeProject({ width: 4, height: 3 }).board;
const emptyNetIndex = {
  holeToNetId: new Map<string, string>(),
  netIdToHoles: new Map<string, readonly { x: number; y: number }[]>(),
  netIdToName: new Map<string, string | undefined>(),
  netIdToConflicts: new Map<string, readonly string[]>(),
};

describe("BoardSvgLayers", () => {
  it("renders board backdrop layers and highlights", () => {
    const netIndex = {
      ...emptyNetIndex,
      netIdToHoles: new Map([["n1", [{ x: 1, y: 1 }]]]),
    };

    const { container } = renderSvg(
      <BoardBackdropLayer
        board={board}
        activeNetId="n1"
        activeNetColor="#f00"
        selectedNetHoles={[{ x: 2, y: 2 }]}
        selectedNetColor="#0f0"
        fixedHoles={[{ x: 0, y: 0 }]}
        netIndex={netIndex}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector("rect")).toBeInTheDocument();
  });

  it("renders board holes with different radii based on selection/hover", () => {
    const { container, rerender } = renderSvg(
      <BoardHolesLayer
        holes={[
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ]}
        hoverHole={{ x: 1, y: 0 }}
        selection={{ type: "none" }}
      />,
    );
    const circlesIdle = [...container.querySelectorAll("circle")];
    expect(circlesIdle.map((c) => c.getAttribute("r"))).toEqual(
      expect.arrayContaining(["1.6", "2.5"]),
    );

    rerender(
      <svg>
        <g>
          <BoardHolesLayer
            holes={[
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ]}
            hoverHole={{ x: 1, y: 0 }}
            selection={{ type: "part", id: "p1" }}
          />
        </g>
      </svg>,
    );
    const circlesActive = [...container.querySelectorAll("circle")];
    expect(circlesActive.map((c) => c.getAttribute("r"))).toEqual(
      expect.arrayContaining(["1.9", "2.8"]),
    );
  });

  it("handles trace selection, erase and drag handles", () => {
    const onDeleteTrace = vi.fn();
    const onSelectTrace = vi.fn();
    const onStartTraceDrag = vi.fn();
    const onStartTraceSegmentDrag = vi.fn();
    const onStartTraceNodeDrag = vi.fn();
    const trace = makeTrace("t1", [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    const netIndex = {
      ...emptyNetIndex,
      holeToNetId: new Map([["0,0", "n1"]]),
      netIdToName: new Map([["n1", "SIG"]]),
    };

    const { container, rerender } = renderSvg(
      <TraceLayer
        traces={[trace]}
        selection={{ type: "trace", id: "t1" }}
        tool={{ type: "select" }}
        activeNetId="n1"
        netIndex={netIndex}
        onDeleteTrace={onDeleteTrace}
        onSelectTrace={onSelectTrace}
        onStartTraceDrag={onStartTraceDrag}
        onStartTraceSegmentDrag={onStartTraceSegmentDrag}
        onStartTraceNodeDrag={onStartTraceNodeDrag}
      />,
    );

    const polyline = container.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    fireEvent.pointerDown(polyline!, { button: 0 });
    expect(onSelectTrace).toHaveBeenCalledWith("t1");

    const handles = container.querySelectorAll("circle");
    expect(handles.length).toBe(3);
    fireEvent.pointerDown(handles[0]!, { button: 0 });
    expect(onStartTraceDrag).toHaveBeenCalledWith(trace, "start", expect.anything());
    fireEvent.pointerDown(handles[2]!, { button: 0 });
    expect(onStartTraceSegmentDrag).toHaveBeenCalledWith(trace, 0, expect.anything());

    rerender(
      <svg>
        <g>
          <TraceLayer
            traces={[trace]}
            selection={{ type: "none" }}
            tool={{ type: "erase" }}
            activeNetId={null}
            netIndex={netIndex}
            onDeleteTrace={onDeleteTrace}
            onSelectTrace={onSelectTrace}
            onStartTraceDrag={onStartTraceDrag}
            onStartTraceSegmentDrag={onStartTraceSegmentDrag}
            onStartTraceNodeDrag={onStartTraceNodeDrag}
          />
        </g>
      </svg>,
    );
    fireEvent.pointerDown(container.querySelector("polyline")!, { button: 0 });
    expect(onDeleteTrace).toHaveBeenCalledWith("t1");
  });

  it("exposes internal node handles for selected traces", () => {
    const onStartTraceDrag = vi.fn();
    const onStartTraceSegmentDrag = vi.fn();
    const onStartTraceNodeDrag = vi.fn();
    const trace = makeTrace("t2", [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
    ]);

    const { container } = renderSvg(
      <TraceLayer
        traces={[trace]}
        selection={{ type: "trace", id: "t2" }}
        tool={{ type: "select" }}
        activeNetId={null}
        netIndex={emptyNetIndex}
        onDeleteTrace={vi.fn()}
        onSelectTrace={vi.fn()}
        onStartTraceDrag={onStartTraceDrag}
        onStartTraceSegmentDrag={onStartTraceSegmentDrag}
        onStartTraceNodeDrag={onStartTraceNodeDrag}
      />,
    );

    const handles = container.querySelectorAll("circle");
    fireEvent.pointerDown(handles[handles.length - 1]!, { button: 0 });
    expect(onStartTraceNodeDrag).toHaveBeenCalledWith(trace, 1, expect.anything());
  });

  it("renders trace draft with and without hover extension", () => {
    const draft = {
      kind: "wire" as const,
      layer: "bottom" as const,
      nodes: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    };
    const { container, rerender } = renderSvg(
      <TraceDraftLayer traceDraft={draft} hoverHole={{ x: 2, y: 0 }} tool={{ type: "wire" }} />,
    );
    expect(container.querySelector("polyline")?.getAttribute("points")?.split(" ").length).toBe(3);

    rerender(
      <svg>
        <g>
          <TraceDraftLayer
            traceDraft={draft}
            hoverHole={{ x: 2, y: 0 }}
            tool={{ type: "select" }}
          />
        </g>
      </svg>,
    );
    expect(container.querySelector("polyline")?.getAttribute("points")?.split(" ").length).toBe(2);
  });

  it("handles part interactions (select/erase/stretch) and labels", () => {
    const onDeletePart = vi.fn();
    const onSelectPart = vi.fn();
    const onStartPartDrag = vi.fn();
    const onStartInline2Stretch = vi.fn();
    const part = makeInline2Part({
      id: "p1",
      ref: "R1",
      value: "10k",
      origin: { x: 1, y: 1 },
      span: 2,
      pinLabels: ["A", "B"],
    });

    const { container, rerender } = renderSvg(
      <PartLayer
        parts={[part]}
        ghostPart={null}
        selection={{ type: "part", id: "p1" }}
        tool={{ type: "select" }}
        board={board}
        fixedPartIds={new Set(["p1"])}
        onDeletePart={onDeletePart}
        onSelectPart={onSelectPart}
        onStartPartDrag={onStartPartDrag}
        onStartInline2Stretch={onStartInline2Stretch}
      />,
    );

    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByText("10k")).toBeInTheDocument();
    const group = screen.getByText("R1").closest("g");
    fireEvent.pointerDown(group!, { button: 0 });
    expect(onSelectPart).toHaveBeenCalledWith("p1");

    const handles = container.querySelectorAll("circle");
    fireEvent.pointerDown(handles[handles.length - 1]!, { button: 0 });
    expect(onStartInline2Stretch).toHaveBeenCalled();

    rerender(
      <svg>
        <g>
          <PartLayer
            parts={[part]}
            ghostPart={null}
            selection={{ type: "none" }}
            tool={{ type: "erase" }}
            board={board}
            fixedPartIds={new Set()}
            onDeletePart={onDeletePart}
            onSelectPart={onSelectPart}
            onStartPartDrag={onStartPartDrag}
            onStartInline2Stretch={onStartInline2Stretch}
          />
        </g>
      </svg>,
    );
    fireEvent.pointerDown(screen.getByText("R1").closest("g")!, { button: 0 });
    expect(onDeletePart).toHaveBeenCalledWith("p1");
  });

  it("handles net label interactions and drafts", () => {
    const onDeleteNetLabel = vi.fn();
    const onSelectNetLabel = vi.fn();
    const onStartLabelDrag = vi.fn();
    const label = makeLabel("nl1", { x: 1, y: 1 }, "GND");
    const netIndex = {
      ...emptyNetIndex,
      holeToNetId: new Map([["1,1", "n1"]]),
      netIdToName: new Map([["n1", "GND"]]),
    };

    const { container: _container, rerender } = renderSvg(
      <NetLabelLayer
        labels={[label]}
        labelDraftId={null}
        selection={{ type: "none" }}
        tool={{ type: "select" }}
        netIndex={netIndex}
        onDeleteNetLabel={onDeleteNetLabel}
        onSelectNetLabel={onSelectNetLabel}
        onStartLabelDrag={onStartLabelDrag}
      />,
    );
    fireEvent.pointerDown(screen.getByText("GND").closest("g")!, { button: 0 });
    expect(onSelectNetLabel).toHaveBeenCalledWith("nl1");
    expect(onStartLabelDrag).toHaveBeenCalledWith(label, expect.anything());

    rerender(
      <svg>
        <g>
          <NetLabelLayer
            labels={[label]}
            labelDraftId={null}
            selection={{ type: "none" }}
            tool={{ type: "erase" }}
            netIndex={netIndex}
            onDeleteNetLabel={onDeleteNetLabel}
            onSelectNetLabel={onSelectNetLabel}
            onStartLabelDrag={onStartLabelDrag}
          />
        </g>
      </svg>,
    );
    fireEvent.pointerDown(screen.getByText("GND").closest("g")!, { button: 0 });
    expect(onDeleteNetLabel).toHaveBeenCalledWith("nl1");

    rerender(
      <svg>
        <g>
          <NetLabelLayer
            labels={[label]}
            labelDraftId="nl1"
            selection={{ type: "netLabel", id: "nl1" }}
            tool={{ type: "select" }}
            netIndex={netIndex}
            onDeleteNetLabel={onDeleteNetLabel}
            onSelectNetLabel={onSelectNetLabel}
            onStartLabelDrag={onStartLabelDrag}
          />
        </g>
      </svg>,
    );
    fireEvent.pointerDown(screen.getByText("GND").closest("g")!, { button: 0 });
    expect(onStartLabelDrag).toHaveBeenCalledTimes(1);
  });

  it("renders connect draft marker only when hole exists", () => {
    const { container, rerender } = renderSvg(<ConnectDraftMarker hole={null} />);
    expect(container.querySelector("circle")).toBeNull();
    rerender(
      <svg>
        <g>
          <ConnectDraftMarker hole={{ x: 1, y: 1 }} />
        </g>
      </svg>,
    );
    expect(container.querySelector("circle")).toBeInTheDocument();
  });
});
