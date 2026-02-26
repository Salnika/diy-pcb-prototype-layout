import type { Action, Selection } from "../../../app/store";
import type { Board, Net, NetLabel, Part, Trace } from "../../../model";
import * as styles from "../../../app/App.css";
import type { BomRow } from "../../export/bom";
import { BomView } from "./BomView";
import { InspectorDetailsView } from "./InspectorDetailsView";

type InspectorPanelViewProps = Readonly<{
  collapsed: boolean;
  activeTab: "inspector" | "bom";
  board: Board;
  selection: Selection;
  selectedPart: Part | null;
  selectedTrace: Trace | null;
  selectedNetLabel: NetLabel | null;
  selectedNet: Net | null;
  selectedPartFixed: boolean;
  selectedTraceNetId: string | null;
  selectedTraceNetName: string | null;
  selectedTraceDisplayColor: string | null;
  projectParts: readonly Part[];
  projectNets: readonly Net[];
  fixedPartCount: number;
  fixedHoleCount: number;
  bomRows: readonly BomRow[];
  onAction: (action: Action) => void;
  onToggleCollapsed: () => void;
  onUpdateBoardSize: (nextWidth: number, nextHeight: number) => void;
  onToggleBoardLabeling: () => void;
  onChangeTab: (tab: "inspector" | "bom") => void;
  onExportBomCsv: () => void;
}>;

export function InspectorPanelView({
  collapsed,
  activeTab,
  board,
  selection,
  selectedPart,
  selectedTrace,
  selectedNetLabel,
  selectedNet,
  selectedPartFixed,
  selectedTraceNetId,
  selectedTraceNetName,
  selectedTraceDisplayColor,
  projectParts,
  projectNets,
  fixedPartCount,
  fixedHoleCount,
  bomRows,
  onAction,
  onToggleCollapsed,
  onUpdateBoardSize,
  onToggleBoardLabeling,
  onChangeTab,
  onExportBomCsv,
}: InspectorPanelViewProps) {
  return (
    <aside className={`${styles.rightPane} ${collapsed ? styles.rightPaneCollapsed : ""}`}>
      <div className={styles.inspectorHeader}>
        {!collapsed ? <h2 className={styles.paneTitle}>Inspector</h2> : <span />}
        <button
          type="button"
          className={styles.inspectorToggle}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Open inspector" : "Collapse inspector"}
          title={collapsed ? "Open inspector" : "Collapse inspector"}
        >
          {collapsed ? "⟨" : "⟩"}
        </button>
      </div>

      {collapsed ? null : (
        <>
          <div className={styles.inspectorTabs}>
            <button
              type="button"
              className={
                activeTab === "inspector" ? styles.inspectorTabActive : styles.inspectorTab
              }
              onClick={() => onChangeTab("inspector")}
            >
              Inspector
            </button>
            <button
              type="button"
              className={activeTab === "bom" ? styles.inspectorTabActive : styles.inspectorTab}
              onClick={() => onChangeTab("bom")}
            >
              BOM
            </button>
          </div>

          {activeTab === "inspector" ? (
            <InspectorDetailsView
              board={board}
              selection={selection}
              selectedPart={selectedPart}
              selectedTrace={selectedTrace}
              selectedNetLabel={selectedNetLabel}
              selectedNet={selectedNet}
              selectedPartFixed={selectedPartFixed}
              selectedTraceNetId={selectedTraceNetId}
              selectedTraceNetName={selectedTraceNetName}
              selectedTraceDisplayColor={selectedTraceDisplayColor}
              projectParts={projectParts}
              projectNets={projectNets}
              fixedPartCount={fixedPartCount}
              fixedHoleCount={fixedHoleCount}
              onAction={onAction}
              onUpdateBoardSize={onUpdateBoardSize}
              onToggleBoardLabeling={onToggleBoardLabeling}
            />
          ) : (
            <BomView
              componentCount={projectParts.length}
              rows={bomRows}
              onExportCsv={onExportBomCsv}
            />
          )}
        </>
      )}
    </aside>
  );
}
