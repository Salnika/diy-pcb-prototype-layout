import { useRef } from "react";
import * as styles from "../App.css";

type AppHeaderProps = Readonly<{
  canUndo: boolean;
  canRedo: boolean;
  showAutoLayout: boolean;
  lastError: string | null;
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
  onUndo,
  onRedo,
  onRunAutoLayout,
  onExportJson,
  onImportJsonFile,
  onExportSvg,
  onExportPng,
}: AppHeaderProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDetailsElement | null>(null);

  function closeExportMenu() {
    if (exportMenuRef.current) exportMenuRef.current.open = false;
  }

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>DiyPCBPrototype</div>
      <div className={styles.topActions}>
        <button type="button" className={styles.iconButton} disabled={!canUndo} onClick={onUndo} title="Undo" aria-label="Undo">
          <svg viewBox="0 0 24 24" className={styles.topActionIcon} aria-hidden="true">
            <path d="M9 7H4v5" />
            <path d="M4 12c1.6-3.4 4.7-5 8-5 4.4 0 8 3.6 8 8" />
          </svg>
        </button>
        <button type="button" className={styles.iconButton} disabled={!canRedo} onClick={onRedo} title="Redo" aria-label="Redo">
          <svg viewBox="0 0 24 24" className={styles.topActionIcon} aria-hidden="true">
            <path d="M15 7h5v5" />
            <path d="M20 12c-1.6-3.4-4.7-5-8-5-4.4 0-8 3.6-8 8" />
          </svg>
        </button>
        {showAutoLayout ? (
          <button type="button" className={styles.smallButton} onClick={onRunAutoLayout}>
            Auto-Layout
          </button>
        ) : null}

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

        <details ref={exportMenuRef} className={styles.dropdownRoot}>
          <summary className={styles.dropdownTrigger}>
            Export
            <span className={styles.dropdownChevron}>▾</span>
          </summary>
          <div className={styles.dropdownMenu}>
            <button
              type="button"
              className={styles.dropdownItem}
              onClick={() => {
                closeExportMenu();
                onExportJson();
              }}
            >
              JSON
            </button>
            <button
              type="button"
              className={styles.dropdownItem}
              onClick={() => {
                closeExportMenu();
                onExportSvg();
              }}
            >
              SVG
            </button>
            <button
              type="button"
              className={styles.dropdownItem}
              onClick={() => {
                closeExportMenu();
                void onExportPng();
              }}
            >
              PNG
            </button>
          </div>
        </details>

        {lastError ? <div className={styles.errorBar}>{lastError}</div> : null}
      </div>
    </header>
  );
}
