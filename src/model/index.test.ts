import { describe, expect, it } from "vitest";
import * as model from "./index";

describe("model index", () => {
  it("re-exports public APIs", () => {
    expect(typeof model.createId).toBe("function");
    expect(typeof model.alphaLabel).toBe("function");
    expect(typeof model.holeKey).toBe("function");
    expect(typeof model.createNewProject).toBe("function");
    expect(typeof model.getPartPins).toBe("function");
    expect(typeof model.computeNetIndex).toBe("function");
    expect(typeof model.parseProject).toBe("function");
    expect(typeof model.autoLayout).toBe("function");
  });
});
