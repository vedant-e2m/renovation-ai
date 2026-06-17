import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, MoveHorizontal } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { ComparisonSlider } from '../components/ComparisonSlider';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

export const VisualizePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, setSession } = useSessionStore();
  const { showToast } = useToast();
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!session && sessionId) {
      api.get(`/session/${sessionId}`).then((res) => setSession(res.data));
    }
  }, [session, sessionId, setSession]);

  const handleEstimate = async () => {
    if (!sessionId) return;
    try {
      setEstimating(true);
      await api.get(`/session/${sessionId}/estimate`);
      const updatedSession = await api.get(`/session/${sessionId}`);
      setSession(updatedSession.data);
      showToast('Estimate ready!', 'success');
      navigate(`/estimate/${sessionId}`);
    } catch (error) {
      showToast('Failed to generate estimate.', 'error');
    } finally {
      setEstimating(false);
    }
  };

  if (!session) {
    return (
      <AppLayout currentStep="visualize" title="Renovation Preview" sessionId={sessionId}>
        <LoadingState message="Loading visualization..." />
      </AppLayout>
    );
  }

  const hasVisualization = session.original_image_base64 && session.visualization_base64;

  return (
    <AppLayout
      currentStep="visualize"
      title="Renovation Preview"
      subtitle="Drag the slider to compare before and after"
      showBack
      onBack={() => navigate(`/design/${sessionId}`)}
      sessionId={sessionId}
      actions={
        <Button onClick={handleEstimate} loading={estimating} icon={!estimating ? <Calculator className="w-4 h-4" /> : undefined}>
          {estimating ? 'Calculating...' : 'View Cost Estimate'}
        </Button>
      }
    >
      {hasVisualization && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted mb-4">
          <MoveHorizontal className="w-4 h-4 text-primary" />
          <span>Drag the handle to compare original vs redesigned</span>
        </div>
      )}

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-card">
        {hasVisualization ? (
          <ComparisonSlider
            originalImage={session.original_image_base64!}
            newImage={session.visualization_base64!}
            imageWidth={session.image_width}
            imageHeight={session.image_height}
          />
        ) : (
          <div className="p-16 text-center border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted font-medium">Visualization not available</p>
            <p className="text-slate-400 text-sm mt-1">Complete the design phase first</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(`/design/${sessionId}`)}>
              Go to Design
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
