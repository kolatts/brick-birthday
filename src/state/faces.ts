import type { Expression, PersonId } from '../types';

/**
 * Public cartoon face for (id, expression): `faces/<id>-<expression>.webp`, built by `npm run faces:build`
 * from the gitignored sources in private/portraits/. Safe to commit: they are generated art, not photos.
 */
export function faceUrl(id: PersonId, expression: Expression): string {
  return `${import.meta.env.BASE_URL}faces/${id}-${expression}.webp`;
}
