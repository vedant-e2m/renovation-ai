import { create } from 'zustand';
import type { Session, Component } from '../services/api';

interface SessionState {
  session: Session | null;
  setSession: (session: Session) => void;
  updateComponents: (components: Component[]) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  updateComponents: (components) =>
    set((state) => ({
      session: state.session ? { ...state.session, components } : null,
    })),
  clearSession: () => set({ session: null }),
}));
