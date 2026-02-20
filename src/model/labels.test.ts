import { describe, expect, it } from "vitest";
import { alphaLabel, holeLabel, numericLabel } from "./labels";

describe("labels", () => {
  it("formats alpha labels", () => {
    expect(alphaLabel(0)).toBe("A");
    expect(alphaLabel(25)).toBe("Z");
    expect(alphaLabel(26)).toBe("AA");
    expect(alphaLabel(27)).toBe("AB");
  });

  it("returns ? for invalid alpha/numeric labels", () => {
    expect(alphaLabel(-1)).toBe("?");
    expect(alphaLabel(1.2)).toBe("?");
    expect(numericLabel(-1)).toBe("?");
    expect(numericLabel(2.4)).toBe("?");
  });

  it("formats numeric labels", () => {
    expect(numericLabel(0)).toBe("1");
    expect(numericLabel(9)).toBe("10");
  });

  it("formats hole labels with default and custom axis formats", () => {
    expect(holeLabel({ x: 0, y: 0 })).toBe("A1");
    expect(holeLabel({ x: 1, y: 2 }, { rows: "numeric", cols: "alpha" })).toBe("3B");
  });
});
