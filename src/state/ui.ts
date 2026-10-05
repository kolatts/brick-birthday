import { create } from 'zustand';
import type { Screen } from '../types';

export type Orientation = 'landscape' | 'portrait';

export function currentOrientation(): Orientation {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

interface UiState {
  screen: Screen;
  orientation: Orientation;
  setScreen: (s: Screen) => void;
  setOrientation: (o: Orientation) => void;
}

export const useUi = create<UiState>((set) => ({
  screen: { kind: 'title' },
  orientation: currentOrientation(),
  setScreen: (screen) => set({ screen }),
  setOrientation: (orientation) => set({ orientation }),
}));
