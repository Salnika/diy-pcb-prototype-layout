import { describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadText } from "./download";

describe("download", () => {
  it("downloads blob through temporary anchor", () => {
    const createObjectURL = vi.fn(() => "blob:abc");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.spyOn(document.body, "append");
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click, remove } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    const blob = new Blob(["x"], { type: "text/plain" });
    downloadBlob("file.txt", blob);

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(append).toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:abc");
  });

  it("wraps text payload as blob with given mime", () => {
    const createObjectURL = vi.fn(() => "blob:text");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const remove = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click, remove } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    downloadText("a.txt", "hello", "text/custom");
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/custom");
  });
});
