import { useMemo } from "react";
import { computeNetIndex, getPartPins, holeKey, holeLabel, netColor, type Hole } from "../../model";
import { useAppDispatch, useAppState } from "../../app/store";
import { useDialogGateway } from "../../app/effects/dialogGateway";
import { createBoardHoles, createViewSize } from "./boardGeometry";
import { useBoardInteractions } from "./hooks/useBoardInteractions";
import { BoardViewUi } from "./ui/BoardView";

export function BoardView() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const dialogs = useDialogGateway();

  const { board } = state.project;
  const { viewport, tool, selection, traceDraft } = state.ui;

  const netIndex = useMemo(() => computeNetIndex(state.project), [state.project]);
  const fixedPartIds = useMemo(
    () => new Set(state.project.layoutConstraints.fixedPartIds),
    [state.project.layoutConstraints.fixedPartIds],
  );
  const fixedHoles = state.project.layoutConstraints.fixedHoles;

  const hoverNetId = state.ui.hoverHole
    ? (netIndex.holeToNetId.get(holeKey(state.ui.hoverHole)) ?? null)
    : null;
  const selectedNetId = useMemo(() => {
    if (selection.type === "trace") {
      const trace = state.project.traces.find((entry) => entry.id === selection.id);
      const first = trace?.nodes[0];
      if (first) return netIndex.holeToNetId.get(holeKey(first)) ?? null;
    }
    if (selection.type === "netLabel") {
      const label = state.project.netLabels.find((entry) => entry.id === selection.id);
      if (label) return netIndex.holeToNetId.get(holeKey(label.at)) ?? null;
    }
    if (selection.type === "part") {
      const part = state.project.parts.find((entry) => entry.id === selection.id);
      const pin = part ? getPartPins(part)[0] : undefined;
      if (pin) return netIndex.holeToNetId.get(holeKey(pin.hole)) ?? null;
    }
    return null;
  }, [
    netIndex.holeToNetId,
    selection,
    state.project.netLabels,
    state.project.parts,
    state.project.traces,
  ]);

  const activeNetId = hoverNetId ?? selectedNetId;
  const activeNetName = activeNetId ? netIndex.netIdToName.get(activeNetId) : undefined;
  const activeNetColor = activeNetId ? netColor(activeNetId, activeNetName) : null;

  const selectedNet =
    selection.type === "net"
      ? (state.project.netlist.find((net) => net.id === selection.id) ?? null)
      : null;
  const selectedNetColor = selectedNet ? netColor(selectedNet.id, selectedNet.name) : null;
  const selectedNetHoles = useMemo(() => {
    if (!selectedNet) return [];
    const holes: Hole[] = [];
    for (const terminal of selectedNet.terminals) {
      if (terminal.kind === "hole") {
        holes.push(terminal.hole);
        continue;
      }
      const part = state.project.parts.find((entry) => entry.id === terminal.partId);
      if (!part) continue;
      const pin = getPartPins(part).find((entry) => entry.pinId === terminal.pinId);
      if (pin) holes.push(pin.hole);
    }
    return holes;
  }, [selectedNet, state.project.parts]);

  const viewSize = useMemo(() => createViewSize(board), [board.height, board.width]);
  const holes = useMemo(() => createBoardHoles(board), [board.height, board.width]);

  const interactions = useBoardInteractions({
    board,
    viewport,
    tool,
    selection,
    traceDraft,
    hoverHole: state.ui.hoverHole,
    parts: state.project.parts,
    traces: state.project.traces,
    netLabels: state.project.netLabels,
    fixedPartIds,
    netIndex,
    dispatch,
    dialog: dialogs,
  });

  const hoverText = state.ui.hoverHole ? holeLabel(state.ui.hoverHole, board.labeling) : "-";
  const connectHint =
    tool.type === "connect"
      ? interactions.connectDraft
        ? "Connect: choose the 2nd terminal (Esc to cancel)"
        : "Connect: choose 2 terminals"
      : null;

  return (
    <BoardViewUi
      board={board}
      viewport={viewport}
      viewSize={viewSize}
      holes={holes}
      fixedHoles={fixedHoles}
      fixedPartIds={fixedPartIds}
      netIndex={netIndex}
      selection={selection}
      tool={tool}
      hoverHole={state.ui.hoverHole}
      traceDraft={traceDraft}
      hoverText={hoverText}
      connectHint={connectHint}
      activeNetId={activeNetId}
      activeNetName={activeNetName}
      activeNetColor={activeNetColor}
      selectedNetHoles={selectedNetHoles}
      selectedNetColor={selectedNetColor}
      tracesToRender={interactions.tracesToRender}
      partsToRender={interactions.partsToRender}
      labelsToRender={interactions.labelsToRender}
      ghostPart={interactions.ghostPart}
      labelDraftId={interactions.labelDraftId}
      connectDraftHole={interactions.connectDraftHole}
      svgRef={interactions.svgRef}
      onWheel={interactions.onWheel}
      onPointerDown={interactions.onPointerDown}
      onPointerMove={interactions.onPointerMove}
      onPointerUp={interactions.onPointerUp}
      onDoubleClick={interactions.onDoubleClick}
      onDeleteTrace={(id) => dispatch({ type: "DELETE_TRACE", id })}
      onSelectTrace={(id) => dispatch({ type: "SELECT", selection: { type: "trace", id } })}
      onStartTraceDrag={interactions.startTraceDrag}
      onStartTraceSegmentDrag={interactions.startTraceSegmentDrag}
      onStartTraceNodeDrag={interactions.startTraceNodeDrag}
      onDeletePart={(id) => dispatch({ type: "DELETE_PART", id })}
      onSelectPart={(id) => dispatch({ type: "SELECT", selection: { type: "part", id } })}
      onStartPartDrag={interactions.startPartDrag}
      onStartInline2Stretch={interactions.startInline2Stretch}
      onDeleteNetLabel={(id) => dispatch({ type: "DELETE_NETLABEL", id })}
      onSelectNetLabel={(id) => dispatch({ type: "SELECT", selection: { type: "netLabel", id } })}
      onStartLabelDrag={interactions.startLabelDrag}
    />
  );
}
