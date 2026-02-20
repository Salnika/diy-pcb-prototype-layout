import { describe, expect, it, vi } from "vitest";
import { createId } from "./ids";

describe("createId", () => {
  it("uses crypto.randomUUID when available", () => {
    const randomUUID = vi.fn(() => "uuid-1");
    vi.stubGlobal("crypto", { randomUUID });
    expect(createId("p")).toBe("p_uuid-1");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("falls back to time and random", () => {
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Date, "now").mockReturnValue(255);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(createId("x")).toMatch(/^x_ff_/);
  });
});
