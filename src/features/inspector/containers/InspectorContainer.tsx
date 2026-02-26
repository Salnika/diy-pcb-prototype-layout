import { useMemo, useState } from "react";
import { clampBoardSize, toggleBoardLabeling } from "../../../app/appUtils";
import { useProjectIO } from "../../../app/hooks/useProjectIO";
import { useAppDispatch, useAppSelector } from "../../../app/store";
import {
  selectBomRows,
  selectFixedConstraintCounts,
  selectNetIndex,
  selectSelectedNet,
  selectSelectedNetLabel,
  selectSelectedPart,
  selectSelectedPartFixed,
  selectSelectedTrace,
  selectSelectedTraceNetData,
} from "../../../app/state/selectors";
import { InspectorPanelView } from "../ui/InspectorPanelView";

type InspectorContainerProps = Readonly<{
  collapsed: boolean;
  onToggleCollapsed: () => void;
}>;

export function InspectorContainer({ collapsed, onToggleCollapsed }: InspectorContainerProps) {
  const state = useAppSelector((s) => s);
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<"inspector" | "bom">("inspector");

  const selectedPart = useMemo(() => selectSelectedPart(state), [state]);
  const selectedTrace = useMemo(() => selectSelectedTrace(state), [state]);
  const selectedNetLabel = useMemo(() => selectSelectedNetLabel(state), [state]);
  const selectedNet = useMemo(() => selectSelectedNet(state), [state]);
  const selectedPartFixed = useMemo(
    () => selectSelectedPartFixed(state, selectedPart),
    [selectedPart, state],
  );
  const netIndex = useMemo(() => selectNetIndex(state), [state]);
  const selectedTraceNetData = useMemo(
    () => selectSelectedTraceNetData(selectedTrace, netIndex),
    [netIndex, selectedTrace],
  );
  const fixedCounts = useMemo(() => selectFixedConstraintCounts(state), [state]);
  const bomRows = useMemo(() => selectBomRows(state.project.parts), [state.project.parts]);

  const { exportBomCsv } = useProjectIO({
    project: state.project,
    dispatch,
  });

  return (
    <InspectorPanelView
      collapsed={collapsed}
      activeTab={activeTab}
      board={state.project.board}
      selection={state.ui.selection}
      selectedPart={selectedPart}
      selectedTrace={selectedTrace}
      selectedNetLabel={selectedNetLabel}
      selectedNet={selectedNet}
      selectedPartFixed={selectedPartFixed}
      selectedTraceNetId={selectedTraceNetData.netId}
      selectedTraceNetName={selectedTraceNetData.netName}
      selectedTraceDisplayColor={selectedTraceNetData.displayColor}
      projectParts={state.project.parts}
      projectNets={state.project.netlist}
      fixedPartCount={fixedCounts.fixedPartCount}
      fixedHoleCount={fixedCounts.fixedHoleCount}
      bomRows={bomRows}
      onAction={dispatch}
      onToggleCollapsed={onToggleCollapsed}
      onChangeTab={setActiveTab}
      onUpdateBoardSize={(nextWidth, nextHeight) =>
        dispatch({
          type: "UPDATE_BOARD",
          width: clampBoardSize(nextWidth),
          height: clampBoardSize(nextHeight),
        })
      }
      onToggleBoardLabeling={() =>
        dispatch({
          type: "UPDATE_BOARD_LABELING",
          labeling: toggleBoardLabeling(state.project.board.labeling),
        })
      }
      onExportBomCsv={exportBomCsv}
    />
  );
}
