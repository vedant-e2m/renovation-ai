import type { Component } from '../services/api';

export function stripDataUrlPrefix(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    const idx = dataUrl.indexOf(',');
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  }
  return dataUrl;
}

export function ensureDataUrl(base64: string, mime = 'image/png'): string {
  if (base64.startsWith('data:')) return base64;
  return `data:${mime};base64,${base64}`;
}

export function countMaskPixels(imageData: ImageData): number {
  const { data } = imageData;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 128 || data[i + 3] > 128) count += 1;
  }
  return count;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createEmptyMaskCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function loadMaskOntoCanvas(
  canvas: HTMLCanvasElement,
  maskBase64: string | undefined,
  width: number,
  height: number,
  bbox?: number[],
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve();

  ctx.clearRect(0, 0, width, height);
  if (!maskBase64) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      if (img.width === width && img.height === height) {
        ctx.drawImage(img, 0, 0, width, height);
      } else if (bbox) {
        const [x, y, w, h] = bbox;
        ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = ensureDataUrl(maskBase64);
  });
}

export function exportMaskFromCanvas(canvas: HTMLCanvasElement): {
  mask_base64: string;
  area_pixels: number;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { mask_base64: '', area_pixels: 0 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const area_pixels = countMaskPixels(imageData);
  return {
    mask_base64: canvas.toDataURL('image/png'),
    area_pixels,
  };
}

/** Export only the bbox region — much smaller payload for API/Redis storage. */
export function exportCroppedMaskFromCanvas(
  canvas: HTMLCanvasElement,
  bbox: number[],
): { mask_base64: string; area_pixels: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { mask_base64: '', area_pixels: 0 };

  const [x, y, w, h] = bbox;
  const cropW = Math.max(1, Math.round(w));
  const cropH = Math.max(1, Math.round(h));
  const cropX = Math.round(x);
  const cropY = Math.round(y);

  const crop = createEmptyMaskCanvas(cropW, cropH);
  const cropCtx = crop.getContext('2d');
  if (!cropCtx) return { mask_base64: '', area_pixels: 0 };

  cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const imageData = cropCtx.getImageData(0, 0, cropW, cropH);
  return {
    mask_base64: crop.toDataURL('image/png'),
    area_pixels: countMaskPixels(imageData),
  };
}

export async function buildFullMaskFromComponent(
  comp: Component,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const maskCanvas = createEmptyMaskCanvas(width, height);
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return maskCanvas;

  if (comp.mask_base64) {
    const maskImg = await loadImage(ensureDataUrl(comp.mask_base64));
    if (maskImg.width === width && maskImg.height === height) {
      maskCtx.drawImage(maskImg, 0, 0, width, height);
    } else {
      const [x, y, w, h] = comp.bbox;
      maskCtx.drawImage(maskImg, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
  } else {
    const [x, y, w, h] = comp.bbox;
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(x, y, w, h);
  }

  return maskCanvas;
}

export function fillBboxOnMask(
  canvas: HTMLCanvasElement,
  bbox: number[],
): { mask_base64: string; area_pixels: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { mask_base64: '', area_pixels: 0 };

  const [x, y, w, h] = bbox;
  ctx.fillStyle = 'white';
  ctx.fillRect(x, y, w, h);

  return exportCroppedMaskFromCanvas(canvas, bbox);
}

export function clearMaskCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brushSize: number,
  eraser: boolean,
): void {
  ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBrushLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brushSize: number,
  eraser: boolean,
): void {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / (brushSize * 0.25)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    drawBrushStroke(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, brushSize, eraser);
  }
}

export async function compositeMaterialPreview(
  imageUrl: string,
  components: Component[],
  materialsMapping: Record<string, { color_hex?: string }>,
  width: number,
  height: number,
): Promise<string | null> {
  const assigned = components.filter((c) => materialsMapping[c.id]?.color_hex);
  if (assigned.length === 0) return null;

  try {
    const baseImage = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(baseImage, 0, 0, width, height);

    for (const comp of assigned) {
      const color = materialsMapping[comp.id]?.color_hex;
      if (!color) continue;

      const maskCanvas = await buildFullMaskFromComponent(comp, width, height);

      const colorCanvas = createEmptyMaskCanvas(width, height);
      const colorCtx = colorCanvas.getContext('2d');
      if (!colorCtx) continue;

      colorCtx.fillStyle = color;
      colorCtx.fillRect(0, 0, width, height);
      colorCtx.globalCompositeOperation = 'destination-in';
      colorCtx.drawImage(maskCanvas, 0, 0);

      ctx.globalAlpha = 0.72;
      ctx.drawImage(colorCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}
