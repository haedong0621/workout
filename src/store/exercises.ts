// 종목(운동) 관련 상태 변경
import type { Exercise } from '@/domain/types';
import { uuid } from '@/lib/id';
import { findById, patch, put, removeRecord, routines } from './core';
import { removeImage } from './images';

export function blankExercise(preset: Partial<Exercise> = {}): Exercise {
  return {
    id: uuid(), name: '', part: '가슴', equip: '머신', kind: 'normal', rest: null, imageId: null,
    memo: '', memoAt: null, fav: false, pinned: [], seed: false, createdAt: Date.now(),
    ...preset,
  };
}

export const saveExercise = (ex: Exercise): Exercise => put('exercises', ex);

export const updateExercise = (id: string, fn: (e: Exercise) => Exercise) => patch('exercises', id, fn);

/** 메모를 고치면 날짜가 자동으로 오늘로 바뀜. 내용이 같으면 아무것도 안 함 */
export function setMemo(id: string, memo: string): void {
  const next = memo.trim();
  updateExercise(id, (e) => (next === (e.memo || '') ? e : { ...e, memo: next, memoAt: next ? Date.now() : null }));
}

export const toggleFav = (id: string) => updateExercise(id, (e) => ({ ...e, fav: !e.fav }));

/** null이면 기본 휴식 시간 사용 */
export const setExerciseRest = (id: string, sec: number | null) =>
  updateExercise(id, (e) => ({ ...e, rest: sec && sec > 0 ? Math.round(sec) : null }));

export const togglePin = (id: string, sessionId: string) => updateExercise(id, (e) => {
  const set = new Set(e.pinned);
  if (set.has(sessionId)) set.delete(sessionId); else set.add(sessionId);
  return { ...e, pinned: [...set] };
});

/** 삭제: 루틴에서도 빠짐. 지난 운동 기록에는 이름이 그대로 남음 */
export function deleteExercise(id: string): void {
  const ex = findById('exercises', id);
  if (!ex) return;
  removeImage(ex.imageId);
  for (const r of routines.value) {
    const items = r.items.filter((i) => i.exerciseId !== id);
    if (items.length !== r.items.length) put('routines', { ...r, items });
  }
  removeRecord('exercises', id);
}
