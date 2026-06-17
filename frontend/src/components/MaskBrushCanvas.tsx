import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { ComponentBox } from './ComponentBox';
import type { Component } from '../services/api';
import {
  moveBbox,
  resizeBbox,
  updateComponentBbox,
  type ResizeHandle,
} from '../utils/componentGeometry';
import {
  clearMaskCanvas,
  compositeMaterialPreview,
  createEmptyMaskCanvas,
  drawBrushLine,
  exportCroppedMaskFromCanvas,
  fillBboxOnMask,
  loadMaskOntoCanvas,
} from '../utils/maskUtils';

export type CanvasMode = 'adjust' | 'paint';
export type PaintTool = 'brush' | 'eraser';

export interface MaskBrushCanvasHandle {
  flushAndGetComponents: () => Component[];
}

interface MaskBrushCanvasProps {
  imageUrl: string;
  components: Component[];
  imageWidth?: number;
  imageHeight?: number;
  selectedComponentId?: string | null;
  onSelectComponent?: (id: string | null) => void;
  onComponentsChange?: (components: Component[]) => void;
  mode: CanvasMode;
  brushSize?: number;
  paintTool?: PaintTool;
  materialsMapping?: Record<string, { color_hex?: string }>;
  showPreview?: boolean;
}

type DragMode = 'move' | 'resize';

interface DragState {
  componentId: string;
  mode: DragMode;
  handle?: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startBbox: number[];
}

interface PaintState {
  lastX: number;
  lastY: number;
}

export const MaskBrushCanvas = forwardRef<MaskBrushCanvasHandle, MaskBrushCanvasProps>(
function MaskBrushCanvas(
  {
    imageUrl,
    components,
    imageWidth,
    imageHeight,
    selectedComponentId = null,
    onSelectComponent,
    onComponentsChange,
    mode,
    brushSize = 24,
    paintTool = 'brush',
    materialsMapping = {},
    showPreview = false,
  },
  ref,
) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayMaskRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef(components);
  const prevSelectedRef = useRef<string | null>(null);
  const paintStateRef = useRef<PaintState | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveComponents, setLiveComponents] = useState(components);
  const [isPainting, setIsPainting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const refWidth = imageWidth || naturalSize.width;
  const refHeight = imageHeight || naturalSize.height;

  const selectedComponent = components.find((c) => c.id === selectedComponentId);

  const applyMaskToComponent = useCallback(
    (bbox: number[]): { mask_base64: string; area_pixels: number } | null => {
      if (!maskCanvasRef.current) return null;
      return exportCroppedMaskFromCanvas(maskCanvasRef.current, bbox);
    },
    [],
  );

  const flushAndGetComponents = useCallback((): Component[] => {
    if (selectedComponentId && maskCanvasRef.current) {
      const comp = liveRef.current.find((c) => c.id === selectedComponentId);
      if (comp) {
        const exported = applyMaskToComponent(comp.bbox);
        if (exported) {
          const updated = liveRef.current.map((c) =>
            c.id === selectedComponentId
              ? { ...c, mask_base64: exported.mask_base64, area_pixels: exported.area_pixels }
              : c,
          );
          liveRef.current = updated;
          return updated;
        }
      }
    }
    return liveRef.current;
  }, [selectedComponentId, applyMaskToComponent]);

  useImperativeHandle(ref, () => ({ flushAndGetComponents }), [flushAndGetComponents]);

  useEffect(() => {
    if (!dragState) {
      setLiveComponents(components);
      liveRef.current = components;
    }
  }, [components, dragState]);

  useEffect(() => {
    if (!refWidth || !refHeight) return;
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = createEmptyMaskCanvas(refWidth, refHeight);
    } else if (
      maskCanvasRef.current.width !== refWidth ||
      maskCanvasRef.current.height !== refHeight
    ) {
      maskCanvasRef.current = createEmptyMaskCanvas(refWidth, refHeight);
    }
  }, [refWidth, refHeight]);

  const syncDisplayMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const displayCanvas = displayMaskRef.current;
    if (!maskCanvas || !displayCanvas || !refWidth || !refHeight) return;

    displayCanvas.width = refWidth;
    displayCanvas.height = refHeight;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, refWidth, refHeight);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#c4774a';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillRect(0, 0, refWidth, refHeight);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }, [refWidth, refHeight]);

  useEffect(() => {
    if (!maskCanvasRef.current || !refWidth || !refHeight) return;

    const prevId = prevSelectedRef.current;
    if (prevId && prevId !== selectedComponentId) {
      const prevComp = liveRef.current.find((c) => c.id === prevId);
      if (prevComp) {
        const exported = applyMaskToComponent(prevComp.bbox);
        if (exported) {
          const updated = liveRef.current.map((comp) =>
            comp.id === prevId
              ? { ...comp, mask_base64: exported.mask_base64, area_pixels: exported.area_pixels }
              : comp,
          );
          liveRef.current = updated;
          onComponentsChange?.(updated);
        }
      }
    }
    prevSelectedRef.current = selectedComponentId ?? null;

    if (!selectedComponentId) {
      clearMaskCanvas(maskCanvasRef.current);
      syncDisplayMask();
      return;
    }

    const comp = liveRef.current.find((c) => c.id === selectedComponentId);
    loadMaskOntoCanvas(
      maskCanvasRef.current,
      comp?.mask_base64,
      refWidth,
      refHeight,
      comp?.bbox,
    ).then(() => {
      syncDisplayMask();
    });
  }, [selectedComponentId, refWidth, refHeight, onComponentsChange, syncDisplayMask, applyMaskToComponent]);

  useEffect(() => {
    if (!showPreview || !refWidth || !refHeight) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    compositeMaterialPreview(imageUrl, components, materialsMapping, refWidth, refHeight).then(
      (url) => {
        if (!cancelled) setPreviewUrl(url);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [showPreview, imageUrl, components, materialsMapping, refWidth, refHeight]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect || !refWidth || !refHeight) return { x: 0, y: 0 };
      return {
        x: ((clientX - rect.left) / rect.width) * refWidth,
        y: ((clientY - rect.top) / rect.height) * refHeight,
      };
    },
    [refWidth, refHeight],
  );

  const toImageDelta = useCallback(
    (clientX: number, clientY: number, startX: number, startY: number) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect || !refWidth || !refHeight) return { dx: 0, dy: 0 };
      return {
        dx: ((clientX - startX) / rect.width) * refWidth,
        dy: ((clientY - startY) / rect.height) * refHeight,
      };
    },
    [refWidth, refHeight],
  );

  const commitMask = useCallback(() => {
    if (!selectedComponentId || !maskCanvasRef.current) return;
    const comp = liveRef.current.find((c) => c.id === selectedComponentId);
    if (!comp) return;
    const exported = exportCroppedMaskFromCanvas(maskCanvasRef.current, comp.bbox);
    const updated = liveRef.current.map((c) =>
      c.id === selectedComponentId
        ? { ...c, mask_base64: exported.mask_base64, area_pixels: exported.area_pixels }
        : c,
    );
    liveRef.current = updated;
    setLiveComponents(updated);
    onComponentsChange?.(updated);
    syncDisplayMask();
  }, [selectedComponentId, onComponentsChange, syncDisplayMask]);

  const applyDrag = useCallback(
    (state: DragState, clientX: number, clientY: number) => {
      const { dx, dy } = toImageDelta(clientX, clientY, state.startMouseX, state.startMouseY);
      const updated = liveRef.current.map((comp) => {
        if (comp.id !== state.componentId) return comp;
        const nextBbox =
          state.mode === 'move'
            ? moveBbox(state.startBbox, dx, dy, refWidth, refHeight)
            : resizeBbox(state.startBbox, state.handle!, dx, dy, refWidth, refHeight);
        return updateComponentBbox(comp, nextBbox);
      });
      liveRef.current = updated;
      setLiveComponents(updated);
    },
    [refWidth, refHeight, toImageDelta],
  );

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event: MouseEvent) => applyDrag(dragState, event.clientX, event.clientY);
    const onMouseUp = () => {
      setDragState(null);
      onComponentsChange?.(liveRef.current);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, applyDrag, onComponentsChange]);

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas || !selectedComponent) return;

      const { x, y } = toImageCoords(clientX, clientY);
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const [bx, by, bw, bh] = selectedComponent.bbox;
      if (x < bx || y < by || x > bx + bw || y > by + bh) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw, bh);
      ctx.clip();

      const eraser = paintTool === 'eraser';
      const prev = paintStateRef.current;
      if (prev) {
        drawBrushLine(ctx, prev.lastX, prev.lastY, x, y, brushSize, eraser);
      } else {
        drawBrushLine(ctx, x, y, x, y, brushSize, eraser);
      }
      ctx.restore();

      paintStateRef.current = { lastX: x, lastY: y };
      syncDisplayMask();
    },
    [selectedComponent, toImageCoords, paintTool, brushSize, syncDisplayMask],
  );

  useEffect(() => {
    if (!isPainting) return;

    const onMouseMove = (event: MouseEvent) => paintAt(event.clientX, event.clientY);
    const onMouseUp = () => {
      setIsPainting(false);
      paintStateRef.current = null;
      commitMask();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPainting, paintAt, commitMask]);

  const displayComponents = dragState ? liveComponents : components;

  const handleClearMask = () => {
    if (!maskCanvasRef.current || !selectedComponentId) return;
    clearMaskCanvas(maskCanvasRef.current);
    syncDisplayMask();
    commitMask();
  };

  const handleFillBbox = () => {
    if (!maskCanvasRef.current || !selectedComponent) return;
    clearMaskCanvas(maskCanvasRef.current);
    fillBboxOnMask(maskCanvasRef.current, selectedComponent.bbox);
    syncDisplayMask();
    commitMask();
  };

  return (
    <div className="space-y-3">
      {mode === 'paint' && selectedComponentId && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFillBbox}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white hover:bg-surface-muted transition-colors"
          >
            Fill box
          </button>
          <button
            type="button"
            onClick={handleClearMask}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-white hover:bg-surface-muted transition-colors text-red-600"
          >
            Clear mask
          </button>
          {selectedComponent?.mask_base64 ? (
            <span className="text-xs text-primary font-medium ml-auto">
              Mask painted ({Math.round(selectedComponent.area_pixels).toLocaleString()} px)
            </span>
          ) : (
            <span className="text-xs text-muted ml-auto">Paint inside the highlighted box</span>
          )}
        </div>
      )}

      <div className="relative border border-border rounded-xl overflow-hidden bg-surface-muted">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-muted z-10 min-h-[240px]">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className={`relative w-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <img
            src={showPreview && previewUrl ? previewUrl : imageUrl}
            alt="House exterior"
            className="block w-full h-auto select-none"
            draggable={false}
            onLoad={(event) => {
              const img = event.currentTarget;
              setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
              setLoaded(true);
            }}
            onError={() => setLoaded(true)}
          />

          {refWidth > 0 && refHeight > 0 && (
            <div
              ref={overlayRef}
              className={`absolute inset-0 ${mode === 'adjust' ? '' : mode === 'paint' && selectedComponentId ? 'cursor-crosshair' : ''}`}
              onMouseDown={() => mode === 'adjust' && onSelectComponent?.(null)}
            >
              {mode === 'paint' && selectedComponent && (
                <>
                  <div
                    className="absolute border-2 border-dashed border-accent/60 pointer-events-none"
                    style={{
                      left: `${(selectedComponent.bbox[0] / refWidth) * 100}%`,
                      top: `${(selectedComponent.bbox[1] / refHeight) * 100}%`,
                      width: `${(selectedComponent.bbox[2] / refWidth) * 100}%`,
                      height: `${(selectedComponent.bbox[3] / refHeight) * 100}%`,
                    }}
                  />
                  <canvas
                    ref={displayMaskRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                </>
              )}

              {mode === 'paint' && selectedComponentId && (
                <div
                  className="absolute inset-0"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setIsPainting(true);
                    paintStateRef.current = null;
                    paintAt(event.clientX, event.clientY);
                  }}
                />
              )}

              {mode === 'adjust' &&
                displayComponents.map((comp) => (
                  <ComponentBox
                    key={comp.id}
                    component={comp}
                    refWidth={refWidth}
                    refHeight={refHeight}
                    selected={selectedComponentId === comp.id}
                    editable
                    hasMask={!!comp.mask_base64}
                    onSelect={(id) => onSelectComponent?.(id)}
                    onMoveStart={(id, clientX, clientY) => {
                      const target = liveRef.current.find((c) => c.id === id);
                      if (!target) return;
                      setDragState({
                        componentId: id,
                        mode: 'move',
                        startMouseX: clientX,
                        startMouseY: clientY,
                        startBbox: [...target.bbox],
                      });
                    }}
                    onResizeStart={(id, handle, clientX, clientY) => {
                      const target = liveRef.current.find((c) => c.id === id);
                      if (!target) return;
                      setDragState({
                        componentId: id,
                        mode: 'resize',
                        handle,
                        startMouseX: clientX,
                        startMouseY: clientY,
                        startBbox: [...target.bbox],
                      });
                    }}
                  />
                ))}
            </div>
          )}

          <canvas ref={previewCanvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
});

export default MaskBrushCanvas;
