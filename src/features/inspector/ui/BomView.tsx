import type { Part } from "../../../model";
import type { BomRow } from "../../export/bom";
import { PART_KIND_OPTIONS } from "../../../app/components/toolDefinitions";
import * as styles from "../../../app/App.css";

const PART_KIND_LABELS = new Map(
  PART_KIND_OPTIONS.map((option) => [option.value, option.label] as const),
);

function partKindLabel(kind: Part["kind"]): string {
  return PART_KIND_LABELS.get(kind) ?? kind;
}

type BomViewProps = Readonly<{
  componentCount: number;
  rows: readonly BomRow[];
  onExportCsv: () => void;
}>;

export function BomView({ componentCount, rows, onExportCsv }: BomViewProps) {
  return (
    <div className={styles.paneSection}>
      <div className={styles.inspectorRow}>
        <div className={styles.label}>Bill of Materials</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={styles.smallButton} onClick={onExportCsv}>
            Export CSV
          </button>
          <span className={styles.chip}>
            {componentCount} components · {rows.length} rows
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <span className={styles.chip}>No components</span>
      ) : (
        <div className={styles.bomTableWrap}>
          <table className={styles.bomTable}>
            <thead>
              <tr>
                <th className={styles.bomHeadCell}>Refs</th>
                <th className={styles.bomHeadCell}>Type</th>
                <th className={styles.bomHeadCell}>Value</th>
                <th className={styles.bomHeadCell}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className={styles.bomRefCell}>{row.refs.join(", ")}</td>
                  <td className={styles.bomCell}>{partKindLabel(row.kind)}</td>
                  <td className={styles.bomCell}>{row.value}</td>
                  <td className={styles.bomCell}>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
