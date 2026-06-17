import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSize = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-base';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${iconSize} rounded-lg bg-gradient-primary flex items-center justify-center shadow-primary`}>
        <span className="font-serif font-bold text-white leading-none">R</span>
      </div>
      {showText && (
        <span className={`${textSize} font-semibold text-charcoal tracking-tight`}>
          RenovateAI
        </span>
      )}
    </div>
  );
};
