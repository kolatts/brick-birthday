import type { Expression, PersonId } from '../types';

/**
 * Public cartoon face for (id, expression): `faces/<id>-<expression>.webp`, built by `npm run faces:build`
 * from the gitignored sources in private/portraits/. Safe to commit: they are generated art, not photos.
 */
export function faceUrl(id: PersonId, expression: Expression): string {
  // Also evaluated by Node scripts (voices:extract imports the story options), where import.meta.env is undefined.
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base}faces/${id}-${expression}.webp`;
}
