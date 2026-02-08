export function alphaLabel(index0: number): string {
  if (!Number.isInteger(index0) || index0 < 0) return "?";

  let index = index0;
  let label = "";
  while (index >= 0) {
    const remainder = index % 26;
    label = String.fromCharCode(65 + remainder) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

export function numericLabel(index0: number): string {
  if (!Number.isInteger(index0) || index0 < 0) return "?";
  return String(index0 + 1);
}

export function holeLabel(
  hole: { x: number; y: number },
  labeling: { rows: "alpha" | "numeric"; cols: "alpha" | "numeric" } = {
    rows: "alpha",
    cols: "numeric",
  },
): string {
  const row = labeling.rows === "alpha" ? alphaLabel(hole.y) : numericLabel(hole.y);
  const col = labeling.cols === "alpha" ? alphaLabel(hole.x) : numericLabel(hole.x);
  return `${row}${col}`;
}
