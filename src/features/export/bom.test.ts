import { describe, expect, it } from "vitest";
import type { Part } from "../../model";
import { bomRowsToCsv, buildBomRows, projectPartsToBomCsv } from "./bom";

function makePart(ref: string, kind: Part["kind"], value?: string): Part {
  return {
    id: ref,
    ref,
    kind,
    value,
    placement: { origin: { x: 1, y: 1 }, rotation: 0, flip: false },
    footprint: { type: "single" },
  };
}

describe("bom", () => {
  it("groups components by kind and value, and sorts refs naturally", () => {
    const rows = buildBomRows([
      makePart("C10", "capacitor", "100nF"),
      makePart("C2", "capacitor", "100nF"),
      makePart("C1", "capacitor", "100nF"),
    ]);

    expect(rows).toEqual([
      {
        key: "capacitor::100nf",
        kind: "capacitor",
        value: "100nF",
        refs: ["C1", "C2", "C10"],
        quantity: 3,
      },
    ]);
  });

  it("does not merge components with same value but different kind", () => {
    const rows = buildBomRows([
      makePart("R1", "resistor", "10k"),
      makePart("C1", "capacitor", "10k"),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ refs: ["C1"], kind: "capacitor", value: "10k" });
    expect(rows[1]).toMatchObject({ refs: ["R1"], kind: "resistor", value: "10k" });
  });

  it("exports CSV with escaped values", () => {
    const csv = projectPartsToBomCsv([
      makePart("C1", "capacitor", '10"uF'),
      makePart("C2", "capacitor", '10"uF'),
    ]);

    expect(csv).toBe('Refs,Qty,Value,Type\n"C1, C2",2,"10""uF",capacitor\n');
  });

  it("formats provided BOM rows as CSV", () => {
    const csv = bomRowsToCsv([
      {
        key: "k",
        kind: "resistor",
        value: "4.7k",
        refs: ["R1", "R2"],
        quantity: 2,
      },
    ]);

    expect(csv).toBe('Refs,Qty,Value,Type\n"R1, R2",2,4.7k,resistor\n');
  });
});
