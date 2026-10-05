import { create } from 'zustand';
import type { CouponId } from '../types';

interface DigState {
  /** The dig spot the pets are currently running to / digging at (world x,z). */
  spot: { id: CouponId; x: number; z: number } | null;
  setSpot: (spot: DigState['spot']) => void;
}

export const useDig = create<DigState>((set) => ({
  spot: null,
  setSpot: (spot) => set({ spot }),
}));
