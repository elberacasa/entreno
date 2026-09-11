import { routineDraftSchema } from '@/lib/validation';
import type { Routine } from '@/lib/types';

const key = (id: string) => `wk.draft.${id}`;
export function readDraft(id: string): Routine | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const parsed = routineDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function saveDraft(id: string, routine: Routine): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key(id), JSON.stringify(routine));
    return true;
  } catch {
    return false;
  }
}
export function clearDraft(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key(id));
  } catch {
    /* The saved routine is still safe. */
  }
}
