import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ComponentBox } from './ComponentBox';
import { ComponentLabel, ComponentPolygonLayer } from './ComponentPolygonLayer';
import type { Component } from '../services/api';
import {
  moveBbox,
  resizeBbox,
  updateComponentBbox,
  type ResizeHandle,
} from '../utils/componentGeometry';

interface ImageCanvasProps {
  imageUrl: string;
  components: Component[];
  imageWidth?: number;
  imageHeight?: number;
  selectedComponentId?: string | null;
  onSelectComponent?: (id: string | null) => void;
  onComponentsChange?: (components: Component[]) => void;
  editable?: boolean;
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

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  components,
  imageWidth,
  imageHeight,
  selectedComponentId = null,
  onSelectComponent,
  onComponentsChange,
  editable = false,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef(components);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveComponents, setLiveComponents] = useState(components);

  const refWidth = imageWidth || naturalSize.width;
  const refHeight = imageHeight || naturalSize.height;

  useEffect(() => {
    if (!dragState) {
      setLiveComponents(components);
      liveRef.current = components;
    }
  }, [components, dragState]);

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

  const applyDrag = useCallback(
    (state: DragState, clientX: number, clientY: number) => {
      const { dx, dy } = toImageDelta(clientX, clientY, state.startMouseX, state.startMouseY);
      const updated = liveRef.current.map((comp) => {
        if (comp.id !== state.componentId) return comp;
        const nextBbox =
          state.mode === 'move'
            ? moveBbox(state.startBbox, dx, dy, refWidth, refHeight)
            : resizeBbox(
                state.startBbox,
                state.handle!,
                dx,
                dy,
                refWidth,
                refHeight,
              );
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

  const displayComponents = dragState ? liveComponents : components;

  return (
    <div className="relative border border-border rounded-xl overflow-hidden bg-surface-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted z-10 min-h-[240px]">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className={`relative w-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        <img
          src={imageUrl}
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
            className={`absolute inset-0 ${editable ? '' : 'pointer-events-none'}`}
            onMouseDown={() => editable && onSelectComponent?.(null)}
          >
            <ComponentPolygonLayer
              components={displayComponents}
              refWidth={refWidth}
              refHeight={refHeight}
              selectedComponentId={selectedComponentId}
              editable={editable}
              onSelect={(id) => onSelectComponent?.(id)}
            />
            {displayComponents.map((comp) => (
              <ComponentLabel
                key={`${comp.id}-label`}
                component={comp}
                refWidth={refWidth}
                refHeight={refHeight}
                selected={selectedComponentId === comp.id}
              />
            ))}
            {editable &&
              displayComponents
                .filter((comp) => selectedComponentId === comp.id)
                .map((comp) => (
                  <ComponentBox
                    key={comp.id}
                    component={comp}
                    refWidth={refWidth}
                    refHeight={refHeight}
                    selected
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
      </div>
    </div>
  );
};
