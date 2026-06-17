import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MousePointerClick,
  Save,
  Info,
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { PolygonEditorCanvas, COMPONENT_PALETTE } from '../components/PolygonEditorCanvas';
import { MaterialPicker } from '../components/MaterialPicker';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { useEditableComponents } from '../hooks/useEditableComponents';
import { isMaterialAllowed } from '../data/compatibility';
import { api } from '../services/api';

const normalizeMaterial = (mat: Record<string, any>) => ({
  ...mat,
  id: mat.id ?? mat.material_id,
  name: mat.name ?? mat.material_name,
});

const normalizeMaterials = (
  materials: Record<string, any>,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(materials ?? {}).map(([id, mat]) => [id, normalizeMaterial(mat)]),
  );

export const DesignPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, setSession } = useSessionStore();
  const { showToast } = useToast();
  const [materialsMapping, setMaterialsMapping] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const {
    components,
    selectedId,
    setSelectedId,
    dirty,
    saving: savingRegions,
    handleComponentsChange,
    saveComponents,
  } = useEditableComponents(session);

  useEffect(() => {
    if (!session && sessionId) {
      api.get(`/session/${sessionId}`).then((res) => {
        setSession(res.data);
        if (res.data.materials) setMaterialsMapping(normalizeMaterials(res.data.materials));
      });
    } else if (session?.materials) {
      setMaterialsMapping(normalizeMaterials(session.materials));
    }
  }, [session, sessionId, setSession]);

  // Auto-select the first component only on initial load, not after a user explicitly deselects.
  const autoSelectedRef = React.useRef(false);
  useEffect(() => {
    if (components.length > 0 && !selectedId && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(components[0].id);
    }
  }, [components, selectedId, setSelectedId]);

  const handleMaterialSelect = (material: any) => {
    if (!selectedId) {
      showToast('Select a component first.', 'info');
      return;
    }
    const component = components.find((c) => c.id === selectedId);
    if (component && !isMaterialAllowed(component.type, material)) {
      showToast(`${material.name} can't be applied to ${component.label}.`, 'error');
      return;
    }
    setMaterialsMapping((prev) => ({ ...prev, [selectedId]: material }));
    showToast(`${material.name} applied`, 'success');
  };

  const handleMaterialDeselect = () => {
    if (!selectedId) return;
    setMaterialsMapping((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
    showToast('Material removed', 'info');
  };

  const handleSaveRegions = async () => {
    if (!sessionId) return;
    const ok = await saveComponents(sessionId);
    showToast(ok ? 'Component regions saved.' : 'Failed to save regions.', ok ? 'success' : 'error');
  };

  const toMaterialSpec = (mat: Record<string, any>) => ({
    material_id: mat.id ?? mat.material_id,
    material_name: mat.name ?? mat.material_name,
    category: mat.category,
    color_hex: mat.color_hex,
    finish: mat.finish,
    cost_per_unit: mat.cost_per_unit,
    unit: mat.unit,
    coverage_per_unit: mat.coverage_per_unit,
    wastage_pct: mat.wastage_pct ?? 0.1,
  });

  const handleApplyMaterials = async () => {
    if (!sessionId) return;

    try {
      setSaving(true);

      if (dirty) {
        const saved = await saveComponents(sessionId);
        if (!saved) {
          showToast('Failed to save component regions.', 'error');
          return;
        }
      }

      const materials = Object.fromEntries(
        Object.entries(materialsMapping).map(([id, mat]) => [id, toMaterialSpec(mat)]),
      );
      await api.post(`/session/${sessionId}/materials`, { materials });
      try {
        await api.post(`/session/${sessionId}/visualize`, {});
      } catch (vizError) {
        console.warn('Visualization failed', vizError);
        showToast('Materials saved. Preview generation failed.', 'info');
      }
      const updatedSession = await api.get(`/session/${sessionId}`);
      setSession(updatedSession.data);
      showToast('Generating preview...', 'success');
      navigate(`/visualize/${sessionId}`);
    } catch (error) {
      showToast('Failed to save materials.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <AppLayout currentStep="design" title="Design & Materials" sessionId={sessionId}>
        <LoadingState message="Loading session..." />
      </AppLayout>
    );
  }

  const assignedCount = Object.keys(materialsMapping).length;
  const selectedComponent = components.find((c) => c.id === selectedId);

  return (
    <AppLayout
      currentStep="design"
      title="Design & Materials"
      subtitle="Adjust polygon regions, then choose materials for a precise preview"
      showBack
      onBack={() => navigate(`/detect/${sessionId}`)}
      sessionId={sessionId}
      actions={
        <Button onClick={handleApplyMaterials} loading={saving} icon={!saving ? <Sparkles className="w-4 h-4" /> : undefined}>
          {saving ? 'Saving...' : 'Apply & Visualize'}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-medium text-charcoal">Adjust polygon regions & assign materials</p>
              <p className="text-xs text-muted mt-0.5">
                Select a component, drag nodes to refine its shape, then pick a material
              </p>
            </div>
            {dirty && (
              <Button
                size="sm"
                variant="secondary"
                loading={savingRegions}
                onClick={handleSaveRegions}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary/80">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Drag</strong> a node to move it &nbsp;·&nbsp; <strong>Click</strong> a midpoint (small circle) to add a node &nbsp;·&nbsp; <strong>Double-click</strong> a node to delete it
            </span>
          </div>

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

          <div className="mt-4 flex flex-wrap gap-2">
            {components.map((comp, i) => {
              const hasMaterial = !!materialsMapping[comp.id];
              const isSelected = selectedId === comp.id;
              const color = COMPONENT_PALETTE[i % COMPONENT_PALETTE.length];
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedId(comp.id)}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
                    hover:scale-105 active:scale-95
                    ${isSelected
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-surface text-charcoal border-border hover:border-border/60'
                    }
                  `}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                  />
                  {comp.label}
                  {hasMaterial && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted mt-3">
            {assignedCount}/{components.length} materials assigned
          </p>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-charcoal">Choose Material</h2>
              {assignedCount > 0 && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {assignedCount} assigned
                </span>
              )}
            </div>

            {selectedId ? (
              <div className="animate-fade-in">
                <div className="mb-4 p-3 rounded-xl bg-accent-muted border border-accent/20">
                  <p className="text-xs text-muted">Working on</p>
                  <p className="font-semibold text-primary">{selectedComponent?.label}</p>
                  <p className="text-xs text-muted mt-1">
                    {selectedComponent?.polygon.length ?? 0} nodes &nbsp;·&nbsp; pick a material below
                  </p>
                </div>
                <MaterialPicker
                  onSelect={handleMaterialSelect}
                  onDeselect={handleMaterialDeselect}
                  selectedId={materialsMapping[selectedId]?.id}
                  componentType={selectedComponent?.type}
                />
              </div>
            ) : (
              <div className="p-10 text-center border-2 border-dashed border-border rounded-2xl bg-surface group hover:border-primary/30 transition-colors duration-300">
                <MousePointerClick className="w-9 h-9 text-slate-300 mx-auto mb-3 group-hover:text-primary transition-colors" />
                <p className="text-muted text-sm">
                  Select a component above to adjust its polygon and assign a material
                </p>
              </div>
            )}
        </div>
      </div>
    </AppLayout>
  );
};
