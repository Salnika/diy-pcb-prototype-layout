import { useRef } from "react";
import * as styles from "../App.css";

type AppHeaderProps = Readonly<{
  canUndo: boolean;
  canRedo: boolean;
  showAutoLayout: boolean;
  lastError: string | null;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRunAutoLayout: () => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => Promise<void>;
  onExportSvg: () => void;
  onExportPng: () => Promise<void>;
}>;

export function AppHeader({
  canUndo,
  canRedo,
  showAutoLayout,
  lastError,
  onNewProject,
  onUndo,
  onRedo,
  onRunAutoLayout,
  onExportJson,
  onImportJsonFile,
  onExportSvg,
  onExportPng,
}: AppHeaderProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>DiyPCBPrototype</div>
      <div className={styles.topHint}>Perfboard (A–X) × 18 — MVP placement + wires/jumpers</div>
      <div className={styles.topActions}>
        <button type="button" className={styles.smallButton} onClick={onNewProject}>
          New
        </button>
        <button type="button" className={styles.smallButton} disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" className={styles.smallButton} disabled={!canRedo} onClick={onRedo}>
          Redo
        </button>
        {showAutoLayout ? (
          <button type="button" className={styles.smallButton} onClick={onRunAutoLayout}>
            Auto-Layout
          </button>
        ) : null}

        <button type="button" className={styles.smallButton} onClick={onExportJson}>
          Export JSON
        </button>

        <button type="button" className={styles.smallButton} onClick={() => importInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void onImportJsonFile(file);
            event.target.value = "";
          }}
        />

        <button type="button" className={styles.smallButton} onClick={onExportSvg}>
          Export SVG
        </button>
        <button type="button" className={styles.smallButton} onClick={() => void onExportPng()}>
          Export PNG
        </button>

        {lastError ? <div className={styles.errorBar}>{lastError}</div> : null}
      </div>
    </header>
  );
}
