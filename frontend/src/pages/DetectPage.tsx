import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scan, ArrowRight, Save, Info } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { PolygonEditorCanvas, COMPONENT_PALETTE } from '../components/PolygonEditorCanvas';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { useEditableComponents } from '../hooks/useEditableComponents';
import { api } from '../services/api';

export const DetectPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, setSession } = useSessionStore();
  const { showToast } = useToast();
  const [detecting, setDetecting] = useState(false);

  const {
    components,
    selectedId,
    setSelectedId,
    dirty,
    saving,
    handleComponentsChange,
    saveComponents,
  } = useEditableComponents(session);

  useEffect(() => {
    if (!session && sessionId) {
      api.get(`/session/${sessionId}`).then((res) => setSession(res.data));
    }
  }, [session, sessionId, setSession]);

  const handleDetect = async () => {
    if (!sessionId) return;
    try {
      setDetecting(true);
      const res = await api.post(`/session/${sessionId}/detect`, {});
      const updatedSession = await api.get(`/session/${sessionId}`);
      setSession(updatedSession.data);
      showToast(res.data.message || 'Detection complete! Adjust regions if needed.', 'success');
    } catch (error: unknown) {
      console.error('Detection failed', error);
      const detail =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (error as { response: { data: { detail: string } } }).response.data.detail
          : null;
      showToast(detail || 'Detection failed. Check that the backend is running and the photo shows a house exterior.', 'error');
    } finally {
      setDetecting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!sessionId) return;
    if (dirty) {
      const ok = await saveComponents(sessionId);
      if (!ok) {
        showToast('Failed to save regions.', 'error');
        return;
      }
      showToast('Regions saved.', 'success');
    }
    navigate(`/design/${sessionId}`);
  };

  if (!session) {
    return (
      <AppLayout currentStep="detect" title="Component Detection" subtitle="Analyzing your house..." sessionId={sessionId}>
        <LoadingState message="Loading session..." />
      </AppLayout>
    );
  }

  const componentCount = components.length;

  return (
    <AppLayout
      currentStep="detect"
      title="Component Detection"
      subtitle="Drag polygon nodes to refine detected regions, then continue to Design"
      sessionId={sessionId}
      actions={
        <Button onClick={handleDetect} loading={detecting} icon={!detecting ? <Scan className="w-4 h-4" /> : undefined}>
          {detecting ? 'Detecting...' : componentCount > 0 ? 'Re-run Detection' : 'Run Detection'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-shadow duration-300">
          {componentCount > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-charcoal">Review & adjust regions</p>
              <div className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary/80">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Click a region to select it, then <strong>drag</strong> a node to move it,{' '}
                  <strong>click</strong> a midpoint circle to add a node, or{' '}
                  <strong>double-click</strong> a node to delete it.
                </span>
              </div>
            </div>
          )}
          {session.original_image_base64 && (
            <PolygonEditorCanvas
              imageUrl={session.original_image_base64}
              components={components}
              imageWidth={session.image_width}
              imageHeight={session.image_height}
              selectedComponentId={selectedId}
              onSelectComponent={setSelectedId}
              onComponentsChange={handleComponentsChange}
            />
          )}
          {componentCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {components.map((comp, i) => {
                const color = COMPONENT_PALETTE[i % COMPONENT_PALETTE.length];
                const isSelected = selectedId === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedId(comp.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                      isSelected ? 'text-white border-transparent' : 'bg-surface text-charcoal border-border hover:border-border/60'
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                    />
                    {comp.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-card">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Status</p>
            <div className={`p-4 rounded-xl border transition-all duration-300 ${componentCount > 0 ? 'bg-primary/5 border-primary/25' : 'bg-surface-muted border-border'}`}>
              <p className="font-semibold text-charcoal">
                {componentCount > 0 ? `${componentCount} components found` : 'Ready to detect'}
              </p>
              <p className="text-xs text-muted mt-1">
                {componentCount > 0
                  ? 'Fine-tune boxes, then refine regions in Design if needed'
                  : 'Click Run Detection to start'}
              </p>
            </div>
          </div>

          {componentCount > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-border shadow-card animate-slide-up space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Next step</p>
              {dirty && (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={saving}
                  onClick={async () => {
                    if (!sessionId) return;
                    const ok = await saveComponents(sessionId);
                    showToast(ok ? 'Regions saved.' : 'Failed to save regions.', ok ? 'success' : 'error');
                  }}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save regions
                </Button>
              )}
              <Button
                className="w-full"
                onClick={handleSaveAndContinue}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Design
              </Button>
            </div>
          )}
      </div>
    </AppLayout>
  );
};
