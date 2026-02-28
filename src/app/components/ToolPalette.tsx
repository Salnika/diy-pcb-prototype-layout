import { isToolActive } from "../appUtils";
import type { Tool } from "../store";
import * as styles from "../App.css";
import { ToolIcon } from "./ToolIcon";
import { PART_TOOLS, PRIMARY_TOOLS } from "./toolDefinitions";

type ToolPaletteProps = Readonly<{
  tool: Tool;
  onSetTool: (tool: Tool) => void;
  mobileOpen: boolean;
  onRequestCloseMobile: () => void;
}>;

export function ToolPalette({
  tool,
  onSetTool,
  mobileOpen,
  onRequestCloseMobile,
}: ToolPaletteProps) {
  function setTool(nextTool: Tool) {
    onSetTool(nextTool);
    if (mobileOpen) onRequestCloseMobile();
  }

  return (
    <aside
      className={`${styles.leftPane} ${mobileOpen ? styles.leftPaneMobileOpen : ""}`}
      data-mobile-open={mobileOpen ? "true" : "false"}
    >
      <div className={styles.paneHead}>
        <div className={styles.paneTitleGroup}>
          <h2 className={styles.paneTitle}>Tools</h2>
          <p className={styles.paneSubtitle}>Routing and components palette</p>
        </div>
        <button
          type="button"
          className={styles.drawerClose}
          onClick={onRequestCloseMobile}
          aria-label="Close tools panel"
          title="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.paneSection}>
        <div>
          <h3 className={styles.toolSectionTitle}>Routing</h3>
          <div className={styles.toolGroup}>
            {PRIMARY_TOOLS.map((entry) => (
              <button
                key={entry.title}
                type="button"
                className={
                  isToolActive(tool, entry.tool) ? styles.toolButtonActive : styles.toolButton
                }
                onClick={() => setTool(entry.tool)}
                aria-label={entry.label}
                data-tooltip={entry.label}
                title={entry.title}
              >
                <ToolIcon name={entry.icon} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.divider} />

        <div>
          <h3 className={styles.toolSectionTitle}>Components</h3>
          <div className={styles.toolGroup}>
            {PART_TOOLS.map((entry) => {
              const partTool: Tool = { type: "placePart", kind: entry.kind };
              return (
                <button
                  key={entry.kind}
                  type="button"
                  className={
                    isToolActive(tool, partTool) ? styles.toolButtonActive : styles.toolButton
                  }
                  onClick={() => setTool(partTool)}
                  aria-label={entry.label}
                  data-tooltip={entry.label}
                  title={entry.title}
                >
                  <ToolIcon name={entry.icon} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
