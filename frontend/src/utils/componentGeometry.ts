import type { Component } from '../services/api';

export function polygonArea(polygon: number[][]): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function detectCoordinateScale(
  components: Component[],
  imageWidth: number,
  imageHeight: number,
): { scaleX: number; scaleY: number } | null {
  let maxX = 0;
  let maxY = 0;
  for (const comp of components) {
    for (const [x, y] of comp.polygon) {
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX === 0 && maxY === 0) return null;

  if (maxX <= 1 && maxY <= 1) {
    return { scaleX: imageWidth, scaleY: imageHeight };
  }

  if (
    maxX <= 1000 &&
    maxY <= 1000 &&
    (imageWidth > 1000 || imageHeight > 1000) &&
    (maxX < imageWidth * 0.5 || maxY < imageHeight * 0.5)
  ) {
    return { scaleX: imageWidth / 1000, scaleY: imageHeight / 1000 };
  }

  return null;
}

/** Scale polygon coords when the model returned 0-1 or 0-1000 values instead of pixels. */
export function normalizeComponentCoordinates(
  components: Component[],
  imageWidth: number,
  imageHeight: number,
): Component[] {
  if (!components.length || !imageWidth || !imageHeight) return components;

  const scale = detectCoordinateScale(components, imageWidth, imageHeight);
  if (!scale) return components;

  return components.map((comp) => {
    const polygon = comp.polygon.map(([x, y]) => [
      x * scale.scaleX,
      y * scale.scaleY,
    ]);
    return {
      ...comp,
      polygon,
      bbox: polygonBbox(polygon),
      area_pixels: polygonArea(polygon),
    };
  });
}

export function polygonBbox(polygon: number[][]): number[] {
  if (polygon.length === 0) return [0, 0, 0, 0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX - minX, maxY - minY];
}

export function bboxToPolygon(bbox: number[]): number[][] {
  const [x, y, w, h] = bbox;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function updateComponentBbox(comp: Component, bbox: number[]): Component {
  const [x, y, w, h] = bbox;
  const bboxArea = w * h;
  return {
    ...comp,
    bbox: [x, y, w, h],
    polygon: bboxToPolygon(bbox),
    area_pixels: comp.mask_base64 ? comp.area_pixels : bboxArea,
  };
}

export function updateComponentMask(
  comp: Component,
  mask_base64: string,
  area_pixels: number,
): Component {
  return {
    ...comp,
    mask_base64,
    area_pixels,
  };
}

export function clampBbox(
  bbox: number[],
  refWidth: number,
  refHeight: number,
  minSize = 20,
): number[] {
  let [x, y, w, h] = bbox;
  w = Math.max(minSize, w);
  h = Math.max(minSize, h);
  x = Math.max(0, Math.min(x, refWidth - w));
  y = Math.max(0, Math.min(y, refHeight - h));
  return [x, y, w, h];
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function resizeBbox(
  startBbox: number[],
  handle: ResizeHandle,
  dx: number,
  dy: number,
  refWidth: number,
  refHeight: number,
): number[] {
  let [x, y, w, h] = startBbox;

  if (handle.includes('e')) w += dx;
  if (handle.includes('w')) {
    x += dx;
    w -= dx;
  }
  if (handle.includes('s')) h += dy;
  if (handle.includes('n')) {
    y += dy;
    h -= dy;
  }

  return clampBbox([x, y, w, h], refWidth, refHeight);
}

export function moveBbox(
  startBbox: number[],
  dx: number,
  dy: number,
  refWidth: number,
  refHeight: number,
): number[] {
  const [x, y, w, h] = startBbox;
  return clampBbox([x + dx, y + dy, w, h], refWidth, refHeight);
}
