import { useEffect, useState } from "react";
import { BoardView } from "../features/board/BoardView";
import { featureFlags } from "./featureFlags";
import { AppHeader } from "./components/AppHeader";
import { InspectorPanel } from "./components/InspectorPanel";
import { TabsBar } from "./components/TabsBar";
import { ToolPalette } from "./components/ToolPalette";
import { INSPECTOR_COLLAPSE_KEY, clampBoardSize, toggleBoardLabeling } from "./appUtils";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { useProjectIO } from "./hooks/useProjectIO";
import { useAppDispatch, useAppState } from "./store";
import * as styles from "./App.css";

export function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => {
    try {
      return localStorage.getItem(INSPECTOR_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const { tool, selection, traceDraft } = state.ui;

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const showAutoLayout = featureFlags.autoLayout;

  const { importJsonFile, exportJson, exportSvg, exportPng } = useProjectIO({
    project: state.project,
    dispatch,
  });

  useAppKeyboardShortcuts({
    dispatch,
    tool,
    selection,
    traceDraft,
    parts: state.project.parts,
  });

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_COLLAPSE_KEY, inspectorCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [inspectorCollapsed]);

  const selectedPart =
    selection.type === "part" ? state.project.parts.find((part) => part.id === selection.id) ?? null : null;
  const selectedTrace =
    selection.type === "trace" ? state.project.traces.find((trace) => trace.id === selection.id) ?? null : null;
  const selectedNetLabel =
    selection.type === "netLabel"
      ? state.project.netLabels.find((label) => label.id === selection.id) ?? null
      : null;
  const selectedNet =
    selection.type === "net" ? state.project.netlist.find((net) => net.id === selection.id) ?? null : null;
  const selectedPartFixed =
    !!selectedPart && state.project.layoutConstraints.fixedPartIds.includes(selectedPart.id);
  const board = state.project.board;

  function updateBoardSize(nextWidth: number, nextHeight: number) {
    dispatch({
      type: "UPDATE_BOARD",
      width: clampBoardSize(nextWidth),
      height: clampBoardSize(nextHeight),
    });
  }

  function handleNewProject() {
    const ok = window.confirm("Créer un nouveau projet ? (le projet actuel restera en autosave)");
    if (!ok) return;
    dispatch({ type: "NEW_PROJECT" });
  }

  function handleRunAutoLayout() {
    const ok = window.confirm(
      "Auto-layout: optimisation du placement et régénération des traces à partir des connexions. Continuer ?",
    );
    if (!ok) return;
    dispatch({ type: "RUN_AUTO_LAYOUT" });
  }

  return (
    <div className={styles.app}>
      <AppHeader
        canUndo={canUndo}
        canRedo={canRedo}
        showAutoLayout={showAutoLayout}
        lastError={state.ui.lastError}
        onNewProject={handleNewProject}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onRunAutoLayout={handleRunAutoLayout}
        onExportJson={exportJson}
        onImportJsonFile={importJsonFile}
        onExportSvg={exportSvg}
        onExportPng={exportPng}
      />

      <TabsBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        onSelectTab={(id) => dispatch({ type: "SET_ACTIVE_TAB", id })}
        onAddTab={() => dispatch({ type: "ADD_TAB" })}
      />

      <div
        className={styles.main}
        style={{ gridTemplateColumns: `max-content 1fr ${inspectorCollapsed ? "44px" : "300px"}` }}
      >
        <ToolPalette tool={tool} onSetTool={(nextTool) => dispatch({ type: "SET_TOOL", tool: nextTool })} />

        <main className={styles.centerPane}>
          <BoardView />
        </main>

        <InspectorPanel
          collapsed={inspectorCollapsed}
          board={board}
          selection={selection}
          selectedPart={selectedPart}
          selectedTrace={selectedTrace}
          selectedNetLabel={selectedNetLabel}
          selectedNet={selectedNet}
          selectedPartFixed={selectedPartFixed}
          projectParts={state.project.parts}
          projectNets={state.project.netlist}
          fixedPartCount={state.project.layoutConstraints.fixedPartIds.length}
          fixedHoleCount={state.project.layoutConstraints.fixedHoles.length}
          dispatch={dispatch}
          onToggleCollapsed={() => setInspectorCollapsed((prev) => !prev)}
          onUpdateBoardSize={updateBoardSize}
          onToggleBoardLabeling={() =>
            dispatch({ type: "UPDATE_BOARD_LABELING", labeling: toggleBoardLabeling(board.labeling) })
          }
        />
      </div>
    </div>
  );
}
