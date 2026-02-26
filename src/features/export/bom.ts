import type { Part } from "../../model";

export type BomRow = Readonly<{
  key: string;
  kind: Part["kind"];
  value: string;
  refs: readonly string[];
  quantity: number;
}>;

const NO_VALUE = "—";
const REF_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function normalizeValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : NO_VALUE;
}

function csvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildBomRows(parts: readonly Part[]): readonly BomRow[] {
  const groups = new Map<string, { kind: Part["kind"]; value: string; refs: string[] }>();

  for (const part of parts) {
    const value = normalizeValue(part.value);
    const key = `${part.kind}::${value.toLowerCase()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.refs.push(part.ref);
      continue;
    }
    groups.set(key, { kind: part.kind, value, refs: [part.ref] });
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const refs = [...group.refs].sort((a, b) => REF_COLLATOR.compare(a, b));
      return {
        key,
        kind: group.kind,
        value: group.value,
        refs,
        quantity: refs.length,
      };
    })
    .sort((a, b) => {
      const firstRefCompare = REF_COLLATOR.compare(a.refs[0] ?? "", b.refs[0] ?? "");
      if (firstRefCompare !== 0) return firstRefCompare;
      const kindCompare = REF_COLLATOR.compare(a.kind, b.kind);
      if (kindCompare !== 0) return kindCompare;
      return REF_COLLATOR.compare(a.value, b.value);
    });
}

export function bomRowsToCsv(rows: readonly BomRow[]): string {
  const lines = ["Refs,Qty,Value,Type"];
  for (const row of rows) {
    lines.push(
      [row.refs.join(", "), String(row.quantity), row.value, row.kind]
        .map((cell) => csvCell(cell))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function projectPartsToBomCsv(parts: readonly Part[]): string {
  return bomRowsToCsv(buildBomRows(parts));
}
