import { create } from 'zustand';
import type { Expression, PersonId } from '../types';
import { PERSON_IDS } from '../types';

type ExprMap = Record<PersonId, Expression>;

const initial = (): ExprMap => Object.fromEntries(PERSON_IDS.map((id) => [id, 'happy'])) as ExprMap;

interface ExpressionState {
  map: ExprMap;
  /** Shows `expr` on `id` for `ms`, then reverts to happy. ms <= 0 keeps it. */
  setExpression: (id: PersonId, expr: Expression, ms?: number) => void;
}

const timers = new Map<PersonId, ReturnType<typeof setTimeout>>();

export const useExpressions = create<ExpressionState>((set) => ({
  map: initial(),
  setExpression: (id, expr, ms = 1500) => {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    set((s) => ({ map: { ...s.map, [id]: expr } }));
    if (expr !== 'happy' && ms > 0) {
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          set((s) => ({ map: { ...s.map, [id]: 'happy' } }));
        }, ms),
      );
    }
  },
}));

export const setExpression = (id: PersonId, expr: Expression, ms = 1500): void =>
  useExpressions.getState().setExpression(id, expr, ms);

/** Current expression of a person (auto-reverts to happy). */
export function useAvatarExpression(id: PersonId): Expression {
  return useExpressions((s) => s.map[id]);
}
