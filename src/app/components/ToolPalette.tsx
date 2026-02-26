import { isToolActive } from "../appUtils";
import type { Tool } from "../store";
import * as styles from "../App.css";
import { ToolIcon } from "./ToolIcon";
import { PART_TOOLS, PRIMARY_TOOLS } from "./toolDefinitions";

type ToolPaletteProps = Readonly<{
  tool: Tool;
  onSetTool: (tool: Tool) => void;
}>;

export function ToolPalette({ tool, onSetTool }: ToolPaletteProps) {
  return (
    <aside className={styles.leftPane}>
      <h2 className={styles.paneTitle}>Tools</h2>
      <div className={styles.paneSection}>
        <div className={styles.toolGroup}>
          {PRIMARY_TOOLS.map((entry) => (
            <button
              key={entry.title}
              type="button"
              className={isToolActive(tool, entry.tool) ? styles.toolButtonActive : styles.toolButton}
              onClick={() => onSetTool(entry.tool)}
              aria-label={entry.label}
              title={entry.title}
            >
              <ToolIcon name={entry.icon} />
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        <div className={styles.toolGroup}>
          {PART_TOOLS.map((entry) => {
            const partTool: Tool = { type: "placePart", kind: entry.kind };
            return (
              <button
                key={entry.kind}
                type="button"
                className={isToolActive(tool, partTool) ? styles.toolButtonActive : styles.toolButton}
                onClick={() => onSetTool(partTool)}
                aria-label={entry.label}
                title={entry.title}
              >
                <ToolIcon name={entry.icon} />
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
