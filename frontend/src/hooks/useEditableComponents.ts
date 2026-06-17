import { useCallback, useEffect, useRef, useState } from 'react';
import type { Component, Session } from '../services/api';
import { api } from '../services/api';
import { normalizeComponentCoordinates } from '../utils/componentGeometry';
import { useSessionStore } from '../store/useSessionStore';

export function useEditableComponents(session: Session | null) {
  const { setSession } = useSessionStore();
  const [components, setComponents] = useState<Component[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const componentsRef = useRef<Component[]>([]);

  componentsRef.current = components;

  useEffect(() => {
    if (!session) {
      setComponents([]);
      componentsRef.current = [];
      setDirty(false);
      return;
    }

    const width = session.image_width ?? 0;
    const height = session.image_height ?? 0;
    const normalized = normalizeComponentCoordinates(session.components ?? [], width, height);

    setComponents(normalized);
    componentsRef.current = normalized;
    setDirty(false);
  }, [session?.session_id, session?.components, session?.image_width, session?.image_height]);

  const handleComponentsChange = useCallback((updated: Component[]) => {
    setComponents(updated);
    componentsRef.current = updated;
    setDirty(true);
  }, []);

  const saveComponents = useCallback(
    async (sessionId: string, override?: Component[]) => {
      const payload = override ?? componentsRef.current;
      try {
        setSaving(true);
        await api.patch(`/session/${sessionId}/components`, { components: payload });
        const res = await api.get(`/session/${sessionId}`);
        setSession(res.data);
        setComponents(res.data.components ?? payload);
        componentsRef.current = res.data.components ?? payload;
        setDirty(false);
        return true;
      } catch (error) {
        console.error('Save components failed:', error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSession],
  );

  return {
    components,
    selectedId,
    setSelectedId,
    dirty,
    saving,
    handleComponentsChange,
    saveComponents,
  };
}
