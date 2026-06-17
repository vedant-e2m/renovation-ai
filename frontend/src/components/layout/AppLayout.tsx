import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../ui/Logo';
import type { WorkflowStep } from '../ui/StepProgress';
import { StepProgress } from '../ui/StepProgress';
import { useSessionStore } from '../../store/useSessionStore';
import { OriginalImagePanel } from './OriginalImagePanel';

interface AppLayoutProps {
  children: React.ReactNode;
  currentStep: WorkflowStep;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  sessionId?: string;
  sidebar?: React.ReactNode;
  showOriginalImage?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentStep,
  title,
  subtitle,
  actions,
  showBack = false,
  onBack,
  sessionId,
  sidebar,
  showOriginalImage = true,
}) => {
  const navigate = useNavigate();
  const { session } = useSessionStore();

  const sidebarContent =
    sidebar ??
    (showOriginalImage && session?.original_image_base64 ? (
      <OriginalImagePanel
        imageUrl={session.original_image_base64}
        imageWidth={session.image_width}
        imageHeight={session.image_height}
      />
    ) : null);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="transition-opacity duration-200 hover:opacity-80"
            >
              <Logo size="sm" />
            </button>

            {currentStep !== 'upload' && (
              <div className="flex-1 max-w-md mx-4 sm:mx-8 hidden md:block">
                <StepProgress currentStep={currentStep} sessionId={sessionId} />
              </div>
            )}

            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted hover:text-charcoal rounded-lg hover:bg-surface-muted transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
            </div>
          </div>

          {currentStep !== 'upload' && (
            <div className="md:hidden pb-4">
              <StepProgress currentStep={currentStep} sessionId={sessionId} />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-muted text-sm sm:text-base max-w-xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>

        {sidebarContent ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,2fr)_3fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">{sidebarContent}</aside>
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};
