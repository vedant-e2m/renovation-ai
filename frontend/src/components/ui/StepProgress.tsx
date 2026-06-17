import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Upload, Scan, Palette, Eye, Calculator } from 'lucide-react';

export type WorkflowStep = 'upload' | 'detect' | 'design' | 'visualize' | 'estimate';

const STEPS: { id: WorkflowStep; label: string; icon: React.ElementType }[] = [
  { id: 'upload',    label: 'Upload',   icon: Upload },
  { id: 'detect',    label: 'Detect',   icon: Scan },
  { id: 'design',    label: 'Design',   icon: Palette },
  { id: 'visualize', label: 'Preview',  icon: Eye },
  { id: 'estimate',  label: 'Estimate', icon: Calculator },
];

function stepPath(stepId: WorkflowStep, sessionId?: string): string | null {
  if (stepId === 'upload') return '/';
  if (!sessionId) return null;
  return `/${stepId}/${sessionId}`;
}

interface StepProgressProps {
  currentStep: WorkflowStep;
  sessionId?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep, sessionId }) => {
  const navigate = useNavigate();
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;
          const isClickable = (isComplete || isCurrent) && !isCurrent;
          const path = stepPath(step.id, sessionId);

          const inner = (
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full
                  transition-all duration-300
                  ${isComplete ? 'bg-gradient-primary text-white shadow-primary' : ''}
                  ${isCurrent ? 'bg-gradient-primary text-white ring-4 ring-primary/25 scale-110 shadow-primary' : ''}
                  ${isUpcoming ? 'bg-surface-muted text-slate-400 border border-border' : ''}
                `}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <span
                className={`
                  text-[9px] sm:text-[10px] font-medium truncate
                  ${isCurrent ? 'text-primary' : isComplete ? 'text-primary-light' : 'text-slate-400'}
                `}
              >
                {step.label}
              </span>
            </div>
          );

          return (
            <li key={step.id} className="flex flex-1 items-center">
              {isClickable && path ? (
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className="flex flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
                  aria-label={`Go to ${step.label}`}
                >
                  {inner}
                </button>
              ) : (
                <div className={`flex flex-1 min-w-0 ${isUpcoming ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {inner}
                </div>
              )}

              {index < STEPS.length - 1 && (
                <div
                  className={`hidden sm:block h-px flex-1 mx-0.5 transition-colors duration-500
                    ${index < currentIndex ? 'bg-primary/35' : 'bg-border'}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
