import { useProgress } from './progress';
import { useCoupons } from './coupons';
import { useCloset } from './closet';

/** Clears progress, coupons and the closet. */
export function resetEverything(): void {
  useProgress.getState().reset();
  useCoupons.getState().reset();
  useCloset.getState().reset();
}

/** `?reset=1` resets this device without any UI, then strips the param from the URL. */
export function applyResetParam(): void {
  if (typeof location === 'undefined') return;
  const params = new URLSearchParams(location.search);
  if (params.get('reset') !== '1') return;
  resetEverything();
  params.delete('reset');
  const q = params.toString();
  history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
}
