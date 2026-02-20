import { describe, expect, it } from "vitest";
import { autoLayout, tracesFromNetlist } from "./autoLayout";
import { makeProject } from "../test/fixtures";

describe("autoLayout barrel", () => {
  it("re-exports main auto-layout functions", () => {
    expect(typeof autoLayout).toBe("function");
    expect(typeof tracesFromNetlist).toBe("function");
    expect(tracesFromNetlist(makeProject())).toMatchObject({ traces: [] });
  });
});
