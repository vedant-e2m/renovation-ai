import React from 'react';
import type { Component } from '../services/api';

interface ComponentPolygonLayerProps {
  components: Component[];
  refWidth: number;
  refHeight: number;
  selectedComponentId?: string | null;
  editable?: boolean;
  onSelect?: (id: string) => void;
}

export const ComponentPolygonLayer: React.FC<ComponentPolygonLayerProps> = ({
  components,
  refWidth,
  refHeight,
  selectedComponentId = null,
  editable = false,
  onSelect,
}) => {
  if (!refWidth || !refHeight) return null;

  return (
    <svg
      className={`absolute inset-0 h-full w-full ${editable ? 'pointer-events-auto' : 'pointer-events-none'}`}
      viewBox={`0 0 ${refWidth} ${refHeight}`}
      preserveAspectRatio="none"
    >
      {components.map((component) => {
        const selected = selectedComponentId === component.id;
        const points = component.polygon
          .map(([x, y]) => `${x},${y}`)
          .join(' ');

        return (
          <g key={component.id}>
            <polygon
              points={points}
              fill={selected ? 'rgba(13, 148, 136, 0.28)' : 'rgba(13, 92, 99, 0.18)'}
              stroke={selected ? '#0d9488' : '#0d5c63'}
              strokeWidth={selected ? 3 : 2}
              vectorEffect="non-scaling-stroke"
              className={editable ? 'cursor-pointer' : undefined}
              onMouseDown={(event) => {
                if (!editable) return;
                event.stopPropagation();
                onSelect?.(component.id);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
};

interface ComponentLabelProps {
  component: Component;
  refWidth: number;
  refHeight: number;
  selected: boolean;
}

export const ComponentLabel: React.FC<ComponentLabelProps> = ({
  component,
  refWidth,
  refHeight,
  selected,
}) => {
  const [x, y] = component.polygon[0] ?? component.bbox;

  return (
    <span
      className={`absolute whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-white pointer-events-none ${
        selected ? 'bg-accent' : 'bg-[#0d5c63]'
      }`}
      style={{
        left: `${(x / refWidth) * 100}%`,
        top: `${(y / refHeight) * 100}%`,
        transform: 'translateY(-120%)',
      }}
    >
      {component.label}
    </span>
  );
};
