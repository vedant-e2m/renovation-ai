import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

interface ComparisonSliderProps {
  originalImage: string;
  newImage: string;
  imageWidth?: number;
  imageHeight?: number;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  originalImage,
  newImage,
  imageWidth,
  imageHeight,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refWidth = imageWidth || naturalSize?.width;
  const refHeight = imageHeight || naturalSize?.height;

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [isDragging]);

  const containerStyle: React.CSSProperties =
    refWidth && refHeight
      ? { aspectRatio: `${refWidth} / ${refHeight}` }
      : { minHeight: 280 };

  const imageClass = 'absolute inset-0 h-full w-full object-contain object-center select-none pointer-events-none';

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-h-[75vh] overflow-hidden rounded-xl select-none border border-border bg-surface-muted ${
        isDragging ? 'cursor-ew-resize' : 'cursor-pointer'
      }`}
      style={containerStyle}
      onMouseDown={() => setIsDragging(true)}
      onMouseMove={handleMouseMove}
      onTouchMove={(e) => updatePosition(e.touches[0].clientX)}
    >
      <img
        src={originalImage}
        alt="Original house"
        className={imageClass}
        draggable={false}
        onLoad={(event) => {
          if (imageWidth && imageHeight) return;
          const img = event.currentTarget;
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        }}
      />
      <img
        src={newImage}
        alt="Redesigned house"
        className={imageClass}
        draggable={false}
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      />

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)] pointer-events-none"
        style={{ left: `calc(${sliderPosition}% - 1px)` }}
      >
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary/30 transition-transform duration-200 ${
            isDragging ? 'scale-110' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-primary" />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-charcoal/70 text-white px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm pointer-events-none">
        Redesigned
      </div>
      <div className="absolute top-4 right-4 bg-charcoal/70 text-white px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm pointer-events-none">
        Original
      </div>
    </div>
  );
};
