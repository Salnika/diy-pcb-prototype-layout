import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../../app/store";
import { InspectorPanelView } from "./InspectorPanelView";

function baseProps() {
  return {
    collapsed: false,
    mobileOpen: false,
    activeTab: "inspector" as const,
    board: {
      type: "perfboard" as const,
      width: 18,
      height: 24,
      labeling: { rows: "alpha" as const, cols: "numeric" as const },
    },
    selection: { type: "none" as const },
    selectedPart: null,
    selectedTrace: null,
    selectedNetLabel: null,
    selectedNet: null,
    selectedPartFixed: false,
    selectedTraceNetId: null,
    selectedTraceNetName: null,
    selectedTraceDisplayColor: null,
    projectParts: [],
    projectNets: [],
    fixedPartCount: 0,
    fixedHoleCount: 0,
    bomRows: [],
    onAction: vi.fn<(action: Action) => void>(),
    onToggleCollapsed: vi.fn(),
    onRequestCloseMobile: vi.fn(),
    onUpdateBoardSize: vi.fn(),
    onToggleBoardLabeling: vi.fn(),
    onChangeTab: vi.fn(),
    onExportBomCsv: vi.fn(),
  };
}

describe("InspectorPanelView", () => {
  it("renders inspector tab content", () => {
    render(<InspectorPanelView {...baseProps()} />);

    expect(screen.getAllByText("Inspector").length).toBeGreaterThan(0);
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("No nets")).toBeInTheDocument();
  });

  it("renders BOM tab and triggers export", () => {
    const props = {
      ...baseProps(),
      activeTab: "bom" as const,
      projectParts: [
        {
          id: "r1",
          ref: "R1",
          kind: "resistor" as const,
          value: "10k",
          placement: { origin: { x: 0, y: 0 }, rotation: 0 as const, flip: false },
          footprint: { type: "single" as const },
        },
      ],
      bomRows: [
        {
          key: "resistor::10k",
          kind: "resistor" as const,
          value: "10k",
          refs: ["R1"],
          quantity: 1,
        },
      ],
    };

    render(<InspectorPanelView {...props} />);

    expect(screen.getByText("Bill of Materials")).toBeInTheDocument();
    expect(screen.getByText("R1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(props.onExportBomCsv).toHaveBeenCalledTimes(1);
  });

  it("changes active tab", () => {
    const props = baseProps();
    render(<InspectorPanelView {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "BOM" }));
    expect(props.onChangeTab).toHaveBeenCalledWith("bom");
  });
});
