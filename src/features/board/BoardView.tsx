import { useMemo } from "react";
import { computeNetIndex, getPartPins, holeKey, holeLabel, netColor, type Hole } from "../../model";
import { useAppDispatch, useAppState } from "../../app/store";
import {
  BoardBackdropLayer,
  BoardHolesLayer,
  ConnectDraftMarker,
  NetLabelLayer,
  PartLayer,
  TraceDraftLayer,
  TraceLayer,
} from "./components/BoardSvgLayers";
import { createBoardHoles, createViewSize } from "./boardGeometry";
import { useBoardInteractions } from "./hooks/useBoardInteractions";
import * as styles from "./BoardView.css";

export function BoardView() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const { board } = state.project;
  const { viewport, tool, selection, traceDraft } = state.ui;

  const netIndex = useMemo(() => computeNetIndex(state.project), [state.project]);
  const fixedPartIds = useMemo(
    () => new Set(state.project.layoutConstraints.fixedPartIds),
    [state.project.layoutConstraints.fixedPartIds],
  );
  const fixedHoles = state.project.layoutConstraints.fixedHoles;

  const hoverNetId = state.ui.hoverHole ? netIndex.holeToNetId.get(holeKey(state.ui.hoverHole)) ?? null : null;
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
  }, [netIndex.holeToNetId, selection, state.project.netLabels, state.project.parts, state.project.traces]);

  const activeNetId = hoverNetId ?? selectedNetId;
  const activeNetName = activeNetId ? netIndex.netIdToName.get(activeNetId) : undefined;
  const activeNetColor = activeNetId ? netColor(activeNetId, activeNetName) : null;

  const selectedNet = selection.type === "net" ? state.project.netlist.find((net) => net.id === selection.id) ?? null : null;
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
  });

  const hoverText = state.ui.hoverHole ? holeLabel(state.ui.hoverHole, board.labeling) : "—";
  const connectHint =
    tool.type === "connect"
      ? interactions.connectDraft
        ? "Connect: choisir le 2e terminal (Esc pour annuler)"
        : "Connect: choisir 2 terminaux"
      : null;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <span className={styles.title}>Board</span>
          <span className={styles.meta}>
            {board.height}×{board.width} ({hoverText})
          </span>
        </div>
        <span className={styles.meta}>
          {traceDraft
            ? `Trace: ${traceDraft.nodes.length} nodes (Enter=finish, Esc=cancel, Del=undo)`
            : connectHint
              ? connectHint
              : activeNetId
                ? `Net: ${activeNetName ?? "—"}`
                : " "}
          {"  "}·{"  "}Zoom: {Math.round(viewport.scale * 100)}%
        </span>
      </div>

      <div className={styles.viewport}>
        <svg
          ref={interactions.svgRef}
          className={styles.svg}
          viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
          onWheel={interactions.onWheel}
          onPointerDown={interactions.onPointerDown}
          onPointerMove={interactions.onPointerMove}
          onPointerUp={interactions.onPointerUp}
          onPointerCancel={interactions.onPointerUp}
          onDoubleClick={interactions.onDoubleClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.scale})`}>
            <BoardBackdropLayer
              board={board}
              activeNetId={activeNetId}
              activeNetColor={activeNetColor}
              selectedNetHoles={selectedNetHoles}
              selectedNetColor={selectedNetColor}
              fixedHoles={fixedHoles}
              netIndex={netIndex}
            />

            <TraceLayer
              traces={interactions.tracesToRender}
              selection={selection}
              tool={tool}
              activeNetId={activeNetId}
              netIndex={netIndex}
              onDeleteTrace={(id) => dispatch({ type: "DELETE_TRACE", id })}
              onSelectTrace={(id) => dispatch({ type: "SELECT", selection: { type: "trace", id } })}
              onStartTraceDrag={interactions.startTraceDrag}
            />

            <TraceDraftLayer traceDraft={traceDraft} hoverHole={state.ui.hoverHole} tool={tool} />

            <PartLayer
              parts={interactions.partsToRender}
              ghostPart={interactions.ghostPart}
              selection={selection}
              tool={tool}
              board={board}
              fixedPartIds={fixedPartIds}
              onDeletePart={(id) => dispatch({ type: "DELETE_PART", id })}
              onSelectPart={(id) => dispatch({ type: "SELECT", selection: { type: "part", id } })}
              onStartPartDrag={interactions.startPartDrag}
              onStartInline2Stretch={interactions.startInline2Stretch}
            />

            <NetLabelLayer
              labels={interactions.labelsToRender}
              labelDraftId={interactions.labelDraftId}
              selection={selection}
              tool={tool}
              netIndex={netIndex}
              onDeleteNetLabel={(id) => dispatch({ type: "DELETE_NETLABEL", id })}
              onSelectNetLabel={(id) => dispatch({ type: "SELECT", selection: { type: "netLabel", id } })}
              onStartLabelDrag={interactions.startLabelDrag}
            />

            <ConnectDraftMarker hole={interactions.connectDraftHole} />

            <BoardHolesLayer holes={holes} hoverHole={state.ui.hoverHole} selection={selection} />
          </g>
        </svg>
      </div>
    </div>
  );
}
