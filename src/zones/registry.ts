import { lazy, type ComponentType } from 'react';
import type { ZoneId } from '../types';

export interface ZoneModule {
  /** Main zone scene. Must render a "Back to island" button (data-testid="back-to-island"). */
  Zone: ComponentType;
  /** Challenge scene for the coupon. Same back-button rule. */
  Challenge: ComponentType;
}

/**
 * Each built zone exports { Zone, Challenge } from src/zones/<id>/index.ts and also calls
 * registerAutoPlay(id, fn) from src/test/hooks.ts in that index module.
 * Unbuilt zones are absent here; the hub shows "Coming soon!" for them.
 */
export const zoneModules: Partial<Record<ZoneId, { Zone: ComponentType; Challenge: ComponentType }>> = {
  story: {
    Zone: lazy(() => import('./story').then((m) => ({ default: m.Zone }))),
    Challenge: lazy(() => import('./story').then((m) => ({ default: m.Challenge }))),
  },
  woods: {
    Zone: lazy(() => import('./woods').then((m) => ({ default: m.Zone }))),
    Challenge: lazy(() => import('./woods').then((m) => ({ default: m.Challenge }))),
  },
};
