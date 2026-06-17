import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 animate-fade-in ${fullScreen ? 'min-h-screen' : 'py-16'}`}>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
      <p className="text-muted font-medium text-sm">{message}</p>
    </div>
  );
};
