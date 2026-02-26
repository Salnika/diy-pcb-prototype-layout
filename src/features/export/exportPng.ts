import { downloadBlob } from "./download";

export async function svgStringToPngBlob(
  svg: string,
  opts: Readonly<{ width: number; height: number; scale?: number }>,
): Promise<Blob> {
  const scale = opts.scale ?? 2;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG for PNG export"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(opts.width * scale);
    canvas.height = Math.round(opts.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(filename: string, svg: string, width: number, height: number) {
  const blob = await svgStringToPngBlob(svg, { width, height, scale: 2 });
  downloadBlob(filename, blob);
}
