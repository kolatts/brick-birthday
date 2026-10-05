import { create } from 'zustand';

const KEY = 'brick-birthday:settings';

interface SettingsData {
  muted: boolean;
  volume: number; // 0..1
}

function load(): SettingsData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SettingsData> | null;
    return {
      muted: typeof raw?.muted === 'boolean' ? raw.muted : false,
      volume: typeof raw?.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 0.8,
    };
  } catch {
    return { muted: false, volume: 0.8 };
  }
}

export const useSettings = create<SettingsData & { setMuted: (m: boolean) => void; setVolume: (v: number) => void }>((set) => ({
  ...load(),
  setMuted: (muted) => set({ muted }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
}));

useSettings.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: s.muted, volume: s.volume }));
  } catch {
    /* ignore */
  }
});
