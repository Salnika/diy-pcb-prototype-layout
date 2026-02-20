import { describe, expect, it } from "vitest";
import { PART_KIND_OPTIONS, PART_TOOLS, PRIMARY_TOOLS } from "./toolDefinitions";

describe("toolDefinitions", () => {
  it("defines primary tools with unique types", () => {
    expect(PRIMARY_TOOLS.length).toBeGreaterThan(0);
    const types = PRIMARY_TOOLS.map((t) => t.tool.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("defines all part tools and options consistently", () => {
    const toolKinds = PART_TOOLS.map((t) => t.kind).sort();
    const optionKinds = PART_KIND_OPTIONS.map((o) => o.value).sort();
    expect(toolKinds).toEqual(optionKinds);
    expect(PART_TOOLS.every((t) => t.label.length > 0 && t.title.length > 0)).toBe(true);
    expect(PART_KIND_OPTIONS.every((o) => o.label.length > 0)).toBe(true);
  });
});
