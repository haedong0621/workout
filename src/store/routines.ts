import { DEFAULT_ROUTINE_EMOJI } from '@/domain/constants';
import type { Routine } from '@/domain/types';
import { routineFromSession } from '@/domain/workout';
import { uuid } from '@/lib/id';
import { findById, put, removeRecord } from './core';
import { removeImage } from './images';

export const blankRoutine = (): Routine => ({ id: uuid(), name: '', emoji: DEFAULT_ROUTINE_EMOJI, imageId: null, items: [], createdAt: Date.now() });

export const saveRoutine = (r: Routine): Routine => put('routines', r);

export function deleteRoutine(id: string): void {
  const r = findById('routines', id);
  if (!r) return;
  removeImage(r.imageId);
  removeRecord('routines', id);
}

export function saveSessionAsRoutine(sessionId: string, name: string): Routine | undefined {
  const s = findById('sessions', sessionId);
  if (!s) return undefined;
  return put('routines', routineFromSession(s, name, uuid(), Date.now()));
}
