import React from 'react';

interface OriginalImagePanelProps {
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  label?: string;
}

export const OriginalImagePanel: React.FC<OriginalImagePanelProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  label = 'Original',
}) => {
  const style: React.CSSProperties =
    imageWidth && imageHeight ? { aspectRatio: `${imageWidth} / ${imageHeight}` } : {};

  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-border shadow-card">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{label}</p>
      <div className="relative w-full overflow-hidden rounded-xl bg-surface-muted" style={style}>
        <img
          src={imageUrl}
          alt="Original house photo"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
};
