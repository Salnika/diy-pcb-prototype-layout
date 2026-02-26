import { describe, expect, it, vi } from "vitest";

const { downloadBlob } = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
}));
vi.mock("./download", () => ({ downloadBlob }));

import { downloadPng, svgStringToPngBlob } from "./exportPng";

describe("exportPng", () => {
  it("converts svg string to png blob", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL: vi.fn(),
    });

    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);

    const scale = vi.fn();
    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: BlobCallback) => cb(new Blob(["png"], { type: "image/png" })));
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({ scale, drawImage })),
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    const blob = await svgStringToPngBlob("<svg/>", { width: 10, height: 20, scale: 3 });
    expect(blob).toBeInstanceOf(Blob);
    expect(scale).toHaveBeenCalledWith(3, 3);
    expect(drawImage).toHaveBeenCalled();
  });

  it("throws when image loading fails", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL: vi.fn(),
    });

    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);

    await expect(svgStringToPngBlob("<svg/>", { width: 10, height: 20 })).rejects.toThrow(
      "Failed to load SVG for PNG export",
    );
  });

  it("throws when 2d context is unavailable", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL: vi.fn(),
    });
    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => null),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    await expect(svgStringToPngBlob("<svg/>", { width: 10, height: 20 })).rejects.toThrow(
      "Canvas 2D context unavailable",
    );
  });

  it("throws when toBlob returns null", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL: vi.fn(),
    });
    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({ scale: vi.fn(), drawImage: vi.fn() })),
          toBlob: (cb: BlobCallback) => cb(null),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    await expect(svgStringToPngBlob("<svg/>", { width: 10, height: 20 })).rejects.toThrow(
      "PNG export failed",
    );
  });

  it("downloads png through downloadBlob", async () => {
    vi.spyOn(globalThis, "Blob");
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:svg"),
      revokeObjectURL: vi.fn(),
    });
    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({ scale: vi.fn(), drawImage: vi.fn() })),
          toBlob: (cb: BlobCallback) => cb(new Blob(["png"], { type: "image/png" })),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    await downloadPng("file.png", "<svg/>", 20, 10);
    expect(downloadBlob).toHaveBeenCalledWith("file.png", expect.any(Blob));
  });
});
