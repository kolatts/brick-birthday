import { create } from 'zustand';

const KEY = 'brick-birthday:closet';

function load(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) return raw as string[];
  } catch {
    /* fall through */
  }
  return [];
}

interface ClosetState {
  /** Item ids Luna is currently wearing. */
  equipped: string[];
  toggle: (id: string) => void;
  reset: () => void;
}

export const useCloset = create<ClosetState>((set) => ({
  equipped: load(),
  toggle: (id) => set((s) => ({ equipped: s.equipped.includes(id) ? s.equipped.filter((x) => x !== id) : [...s.equipped, id] })),
  reset: () => set({ equipped: [] }),
}));

useCloset.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s.equipped));
  } catch {
    /* ignore */
  }
});
