import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Component } from '../services/api';
import {
  normalizeComponentCoordinates,
  polygonArea,
  polygonBbox,
} from '../utils/componentGeometry';

// Visually distinct colours — stroke, fill-alpha used separately
export const COMPONENT_PALETTE = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#84CC16', // lime
  '#6366F1', // indigo
];

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function withPolygon(comp: Component, polygon: number[][]): Component {
  return {
    ...comp,
    polygon,
    bbox: polygonBbox(polygon),
    area_pixels: polygonArea(polygon),
  };
}

interface PolygonEditorCanvasProps {
  imageUrl: string;
  components: Component[];
  imageWidth?: number;
  imageHeight?: number;
  selectedComponentId?: string | null;
  onSelectComponent?: (id: string | null) => void;
  onComponentsChange?: (components: Component[]) => void;
  /** Cap displayed height so tall photos don't dominate the page. */
  maxHeight?: string;
  className?: string;
}

const DEFAULT_MAX_HEIGHT = 'min(420px, 50vh)';

interface NodeDragState {
  componentId: string;
  nodeIndex: number;
}

export const PolygonEditorCanvas: React.FC<PolygonEditorCanvasProps> = ({
  imageUrl,
  components,
  imageWidth,
  imageHeight,
  selectedComponentId = null,
  onSelectComponent,
  onComponentsChange,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className = '',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(components);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [liveComponents, setLiveComponents] = useState(components);

  const refWidth = imageWidth || naturalSize.width;
  const refHeight = imageHeight || naturalSize.height;

  const displaySourceComponents = useMemo(
    () => normalizeComponentCoordinates(components, refWidth, refHeight),
    [components, refWidth, refHeight],
  );

  useEffect(() => {
    if (!nodeDrag) {
      setLiveComponents(displaySourceComponents);
      liveRef.current = displaySourceComponents;
    }
  }, [displaySourceComponents, nodeDrag]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect || !refWidth || !refHeight) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(refWidth, ((clientX - rect.left) / rect.width) * refWidth)),
        y: Math.max(0, Math.min(refHeight, ((clientY - rect.top) / rect.height) * refHeight)),
      };
    },
    [refWidth, refHeight],
  );

  const applyNodeDrag = useCallback(
    (state: NodeDragState, clientX: number, clientY: number) => {
      const { x, y } = toImageCoords(clientX, clientY);
      const updated = liveRef.current.map((comp) => {
        if (comp.id !== state.componentId) return comp;
        const newPolygon = comp.polygon.map((pt, i) =>
          i === state.nodeIndex ? [x, y] : pt,
        ) as number[][];
        return withPolygon(comp, newPolygon);
      });
      liveRef.current = updated;
      setLiveComponents(updated);
    },
    [toImageCoords],
  );

  useEffect(() => {
    if (!nodeDrag) return;
    const onMouseMove = (e: MouseEvent) => applyNodeDrag(nodeDrag, e.clientX, e.clientY);
    const onMouseUp = () => {
      setNodeDrag(null);
      onComponentsChange?.(liveRef.current);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [nodeDrag, applyNodeDrag, onComponentsChange]);

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent, componentId: string, nodeIndex: number) => {
      e.stopPropagation();
      const comp = liveRef.current.find((c) => c.id === componentId);
      if (!comp || comp.polygon.length <= 3) return;
      const newPolygon = comp.polygon.filter((_, i) => i !== nodeIndex);
      const updated = liveRef.current.map((c) =>
        c.id === componentId ? withPolygon(c, newPolygon) : c,
      );
      liveRef.current = updated;
      setLiveComponents(updated);
      onComponentsChange?.(updated);
    },
    [onComponentsChange],
  );

  const handleInsertNode = useCallback(
    (e: React.MouseEvent, componentId: string, afterIndex: number) => {
      e.stopPropagation();
      const comp = liveRef.current.find((c) => c.id === componentId);
      if (!comp) return;
      const n = comp.polygon.length;
      const nextIndex = (afterIndex + 1) % n;
      const [x1, y1] = comp.polygon[afterIndex];
      const [x2, y2] = comp.polygon[nextIndex];
      const midPt: [number, number] = [(x1 + x2) / 2, (y1 + y2) / 2];
      const newPolygon = [
        ...comp.polygon.slice(0, afterIndex + 1),
        midPt,
        ...comp.polygon.slice(afterIndex + 1),
      ];
      const updated = liveRef.current.map((c) =>
        c.id === componentId ? withPolygon(c, newPolygon) : c,
      );
      liveRef.current = updated;
      setLiveComponents(updated);
      onComponentsChange?.(updated);
    },
    [onComponentsChange],
  );

  // Stable colour assignment — keyed by component id so colours don't shift on re-renders
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    displaySourceComponents.forEach((c, i) => {
      map[c.id] = COMPONENT_PALETTE[i % COMPONENT_PALETTE.length];
    });
    return map;
  }, [displaySourceComponents]);

  const displayComponents = nodeDrag ? liveComponents : displaySourceComponents;
  const selectedComp = displayComponents.find((c) => c.id === selectedComponentId);

  // Compute zoom transform for the selected component's bounding box.
  const zoomStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), transform-origin 0.45s cubic-bezier(0.4,0,0.2,1)',
    };
    if (!selectedComponentId || !refWidth || !refHeight) {
      return { ...base, transform: 'scale(1)', transformOrigin: '50% 50%' };
    }
    const comp = displaySourceComponents.find((c) => c.id === selectedComponentId);
    if (!comp || comp.polygon.length === 0) {
      return { ...base, transform: 'scale(1)', transformOrigin: '50% 50%' };
    }
    const xs = comp.polygon.map(([x]) => x);
    const ys = comp.polygon.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Centre of the bbox as a fraction of image size
    const cx = (minX + maxX) / 2 / refWidth;
    const cy = (minY + maxY) / 2 / refHeight;

    // Only zoom into small regions — large selections (e.g. full roof) stay at 1x
    const PADDING = 1.4;
    const bw = Math.min(1, ((maxX - minX) / refWidth) * PADDING);
    const bh = Math.min(1, ((maxY - minY) / refHeight) * PADDING);
    if (bw > 0.45 || bh > 0.45) {
      return { ...base, transform: 'scale(1)', transformOrigin: '50% 50%' };
    }
    const scale = Math.min(Math.min(1 / bw, 1 / bh), 2.5);
    if (scale <= 1.05) {
      return { ...base, transform: 'scale(1)', transformOrigin: '50% 50%' };
    }

    return {
      ...base,
      transform: `scale(${scale})`,
      transformOrigin: `${cx * 100}% ${cy * 100}%`,
    };
  }, [selectedComponentId, displaySourceComponents, refWidth, refHeight]);

  return (
    <div
      className={`relative border border-border rounded-xl overflow-hidden bg-surface-muted mx-auto max-w-lg ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted z-10 min-h-[200px]">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="flex justify-center">
        <div
          className="relative overflow-hidden"
          style={{ maxHeight, maxWidth: '100%' }}
        >
          <div
            className={`relative transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={zoomStyle}
          >
            <img
              src={imageUrl}
              alt="House exterior"
              className="block max-w-full w-auto h-auto select-none"
              style={{ maxHeight }}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                setLoaded(true);
              }}
              onError={() => setLoaded(true)}
            />

            {refWidth > 0 && refHeight > 0 && (
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-default"
              >
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${refWidth} ${refHeight}`}
                  preserveAspectRatio="xMidYMid meet"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) onSelectComponent?.(null);
              }}
            >
              {/* Non-selected polygons — invisible hit-targets when something is selected, coloured outlines otherwise */}
              {displayComponents
                .filter((c) => c.id !== selectedComponentId)
                .map((comp) => {
                  const color = colorMap[comp.id] ?? COMPONENT_PALETTE[0];
                  return (
                    <polygon
                      key={comp.id}
                      points={comp.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill={selectedComponentId ? 'transparent' : hexToRgba(color, 0.18)}
                      stroke={selectedComponentId ? 'transparent' : color}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelectComponent?.(comp.id);
                      }}
                    />
                  );
                })}

              {/* Selected polygon with editable nodes */}
              {selectedComp && (() => {
                const color = colorMap[selectedComp.id] ?? COMPONENT_PALETTE[0];
                return (
                  <g>
                    {/* Filled polygon */}
                    <polygon
                      points={selectedComp.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill={hexToRgba(color, 0.25)}
                      stroke={color}
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Edge midpoint handles for inserting new nodes */}
                    {selectedComp.polygon.map((pt, i) => {
                      const n = selectedComp.polygon.length;
                      const next = selectedComp.polygon[(i + 1) % n];
                      const mx = (pt[0] + next[0]) / 2;
                      const my = (pt[1] + next[1]) / 2;
                      return (
                        <circle
                          key={`mid-${i}`}
                          cx={mx}
                          cy={my}
                          r={5}
                          fill="white"
                          stroke={color}
                          strokeWidth={1.5}
                          vectorEffect="non-scaling-stroke"
                          className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleInsertNode(e, selectedComp.id, i)}
                        />
                      );
                    })}

                    {/* Vertex nodes — drag to move, double-click to delete */}
                    {selectedComp.polygon.map((pt, i) => (
                      <circle
                        key={`node-${i}`}
                        cx={pt[0]}
                        cy={pt[1]}
                        r={7}
                        fill={color}
                        stroke="white"
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                        className="cursor-move"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setNodeDrag({ componentId: selectedComp.id, nodeIndex: i });
                        }}
                        onDoubleClick={(e) => handleDeleteNode(e, selectedComp.id, i)}
                      />
                    ))}
                  </g>
                );
              })()}
                </svg>

                {/* Labels — only show all when nothing is selected; when selected show only the active one */}
                {displayComponents
                  .filter((comp) => !selectedComponentId || comp.id === selectedComponentId)
                  .map((comp) => {
                    const [x, y] = comp.polygon[0] ?? comp.bbox;
                    const color = colorMap[comp.id] ?? COMPONENT_PALETTE[0];
                    return (
                      <span
                        key={`${comp.id}-label`}
                        className="absolute whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white pointer-events-none"
                        style={{
                          left: `${(x / refWidth) * 100}%`,
                          top: `${(y / refHeight) * 100}%`,
                          transform: 'translateY(-120%)',
                          backgroundColor: color,
                        }}
                      >
                        {comp.label}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolygonEditorCanvas;
