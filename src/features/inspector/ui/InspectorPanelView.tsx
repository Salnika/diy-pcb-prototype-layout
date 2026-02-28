import type { Action, Selection } from "../../../app/store";
import type { Board, Net, NetLabel, Part, Trace } from "../../../model";
import * as styles from "../../../app/App.css";
import type { BomRow } from "../../export/bom";
import { BomView } from "./BomView";
import { InspectorDetailsView } from "./InspectorDetailsView";

type InspectorPanelViewProps = Readonly<{
  collapsed: boolean;
  mobileOpen: boolean;
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
  onRequestCloseMobile: () => void;
  onUpdateBoardSize: (nextWidth: number, nextHeight: number) => void;
  onToggleBoardLabeling: () => void;
  onChangeTab: (tab: "inspector" | "bom") => void;
  onExportBomCsv: () => void;
}>;

export function InspectorPanelView({
  collapsed,
  mobileOpen,
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
  onRequestCloseMobile,
  onUpdateBoardSize,
  onToggleBoardLabeling,
  onChangeTab,
  onExportBomCsv,
}: InspectorPanelViewProps) {
  const effectiveCollapsed = collapsed && !mobileOpen;

  return (
    <aside
      className={`${styles.rightPane} ${effectiveCollapsed ? styles.rightPaneCollapsed : ""} ${mobileOpen ? styles.rightPaneMobileOpen : ""}`}
      data-mobile-open={mobileOpen ? "true" : "false"}
    >
      <div className={styles.inspectorHeader}>
        {effectiveCollapsed ? null : (
          <div className={styles.paneTitleGroup}>
            <h2 className={styles.paneTitle}>Inspector</h2>
            <p className={styles.paneSubtitle}>Selection and project details</p>
          </div>
        )}

        <div className={styles.inspectorHeaderActions}>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onRequestCloseMobile}
            aria-label="Close inspector panel"
            title="Close"
          >
            ×
          </button>
          <button
            type="button"
            className={styles.inspectorToggle}
            onClick={onToggleCollapsed}
            aria-label={effectiveCollapsed ? "Open inspector" : "Collapse inspector"}
            title={effectiveCollapsed ? "Open inspector" : "Collapse inspector"}
          >
            <svg viewBox="0 0 24 24" className={styles.inspectorToggleIcon} aria-hidden="true">
              {effectiveCollapsed ? (
                <polyline points="9 6 15 12 9 18" />
              ) : (
                <polyline points="15 6 9 12 15 18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {effectiveCollapsed ? null : (
        <div className={styles.inspectorBody}>
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

          <div className={styles.inspectorContent}>
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
          </div>
        </div>
      )}
    </aside>
  );
}
