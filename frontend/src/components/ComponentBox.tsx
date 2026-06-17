import React from 'react';
import type { Component } from '../services/api';
import type { ResizeHandle } from '../utils/componentGeometry';

const HANDLES: ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];

const HANDLE_POSITION: Record<ResizeHandle, string> = {
  nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
  ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
  sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
};

interface ComponentBoxProps {
  component: Component;
  refWidth: number;
  refHeight: number;
  selected: boolean;
  editable: boolean;
  hasMask?: boolean;
  onSelect: (id: string) => void;
  onMoveStart: (id: string, clientX: number, clientY: number) => void;
  onResizeStart: (id: string, handle: ResizeHandle, clientX: number, clientY: number) => void;
}

export const ComponentBox: React.FC<ComponentBoxProps> = ({
  component,
  refWidth,
  refHeight,
  selected,
  editable,
  hasMask = false,
  onSelect,
  onMoveStart,
  onResizeStart,
}) => {
  const [x, y, w, h] = component.bbox;

  return (
    <div
      className={`absolute ${editable ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        left: `${(x / refWidth) * 100}%`,
        top: `${(y / refHeight) * 100}%`,
        width: `${(w / refWidth) * 100}%`,
        height: `${(h / refHeight) * 100}%`,
      }}
      onMouseDown={(event) => {
        if (!editable) return;
        event.stopPropagation();
        onSelect(component.id);
        onMoveStart(component.id, event.clientX, event.clientY);
      }}
    >
      <div
        className={`absolute inset-0 border-2 transition-colors ${
          selected
            ? 'border-accent bg-accent/20 ring-2 ring-accent/40'
            : 'border-[#0d5c63] bg-[rgba(13,92,99,0.18)] hover:border-accent/70'
        } ${editable ? 'cursor-move' : ''}`}
      />
      <span
        className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white ${
          selected ? 'bg-accent' : 'bg-[#0d5c63]'
        }`}
      >
        {component.label}
        {hasMask && <span className="ml-1 opacity-80">✓</span>}
      </span>
      {editable && selected && (
        <>
          {HANDLES.map((handle) => (
            <div
              key={handle}
              className={`absolute z-10 h-3 w-3 rounded-full border-2 border-white bg-accent shadow ${HANDLE_POSITION[handle]}`}
              onMouseDown={(event) => {
                event.stopPropagation();
                onResizeStart(component.id, handle, event.clientX, event.clientY);
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};
