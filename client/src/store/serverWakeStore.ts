import { create } from 'zustand';

// Flipped on by the axios layer (lib/api.ts) when a request has been pending long enough
// to look like a Render free-tier cold start; read by <ColdStartNotice />.
interface ServerWakeState {
  waking: boolean;
  setWaking: (waking: boolean) => void;
}

export const useServerWake = create<ServerWakeState>((set) => ({
  waking: false,
  setWaking: (waking) => set({ waking }),
}));
