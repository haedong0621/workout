// 운동(세션) 편집 로직 — 모두 "새 객체를 돌려주는" 순수 함수입니다.
// 저장은 store 쪽에서 합니다. 그래서 여기 로직은 단위 테스트로 검증할 수 있어요.
import { DEFAULT_REPS, DEFAULT_ROUTINE_EMOJI, DEFAULT_SET_COUNT } from './constants';
import { exerciseHistory, prefillSets } from './history';
import type { Exercise, Routine, Session, SessionItem, SetType, WorkoutSet } from './types';
import { timeOfDayName } from '@/lib/format';

export const newSet = (w = 0, r = DEFAULT_REPS, t: SetType = 'N'): WorkoutSet => ({ w, r, t, done: false });

/** 종목을 세션 항목으로. 지난 기록이 있으면 그 세트를 그대로 불러와요. */
export function buildItem(ex: Exercise, sessions: readonly Session[], setCount = DEFAULT_SET_COUNT, beforeTs = Infinity): SessionItem {
  const hist = exerciseHistory(sessions, ex.id, { before: beforeTs });
  const last = hist[hist.length - 1];
  const sets = last ? prefillSets(last) : Array.from({ length: Math.max(1, setCount || DEFAULT_SET_COUNT) }, () => newSet());
  return { exerciseId: ex.id, name: ex.name, part: ex.part, equip: ex.equip, kind: ex.kind, sets };
}

export interface CreateSessionInput {
  id: string;
  now: number;
  bw: number;
  routine: Routine | null;
  exercises: readonly Exercise[];
  sessions: readonly Session[];
}

export function createSession({ id, now, bw, routine, exercises, sessions }: CreateSessionInput): Session {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const items: SessionItem[] = [];
  if (routine) {
    for (const it of routine.items) {
      const ex = byId.get(it.exerciseId);
      if (ex) items.push(buildItem(ex, sessions, it.setCount, now));
    }
  }
  return {
    id,
    name: routine ? routine.name : `${timeOfDayName(now)} 운동`,
    routineId: routine ? routine.id : null,
    startedAt: now, endedAt: null, status: 'active',
    bw, items,
  };
}

export function needsBodyweight(s: Session): boolean {
  return !s.bw && s.items.some((it) => it.kind === 'assist' || it.kind === 'bodyweight');
}

// ---- 항목/세트 단위 수정 ----
export function updateItem(s: Session, idx: number, fn: (it: SessionItem) => SessionItem): Session {
  const it = s.items[idx];
  if (!it) return s;
  const items = s.items.slice();
  items[idx] = fn(it);
  return { ...s, items };
}

export function updateSet(s: Session, idx: number, si: number, patch: Partial<WorkoutSet>): Session {
  return updateItem(s, idx, (it) => {
    const cur = it.sets[si];
    if (!cur) return it;
    const sets = it.sets.slice();
    sets[si] = { ...cur, ...patch };
    return { ...it, sets };
  });
}

/** 마지막 세트를 복사해서 추가 (웜업 다음엔 일반 세트) */
export function addSet(s: Session, idx: number): Session {
  return updateItem(s, idx, (it) => {
    const last = it.sets[it.sets.length - 1];
    const next = last ? newSet(last.w, last.r, last.t === 'W' ? 'N' : last.t) : newSet();
    return { ...it, sets: [...it.sets, next] };
  });
}

export function removeSet(s: Session, idx: number, si: number): Session {
  return updateItem(s, idx, (it) => ({ ...it, sets: it.sets.filter((_, i) => i !== si) }));
}

/** 이 세트의 무게·횟수를 같은 종목의 모든 세트에 */
export function applySetToAll(s: Session, idx: number, si: number): Session {
  return updateItem(s, idx, (it) => {
    const src = it.sets[si];
    if (!src) return it;
    return { ...it, sets: it.sets.map((x) => ({ ...x, w: src.w, r: src.r })) };
  });
}

export function addItems(s: Session, items: SessionItem[]): Session {
  return { ...s, items: [...s.items, ...items] };
}

export function removeItem(s: Session, idx: number): Session {
  return { ...s, items: s.items.filter((_, i) => i !== idx) };
}

export function replaceItem(s: Session, idx: number, item: SessionItem): Session {
  return updateItem(s, idx, () => item);
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list.slice();
  const out = list.slice();
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x as T);
  return out;
}

export function isAllDone(s: Session): boolean {
  return s.items.length > 0 && s.items.every((it) => it.sets.every((x) => x.done));
}

/** 종료: 체크 안 한 세트와 빈 종목은 빼고 저장 */
export function finalizeSession(s: Session, name: string | undefined, now: number): Session {
  const items = s.items
    .map((it) => ({ ...it, sets: it.sets.filter((x) => x.done) }))
    .filter((it) => it.sets.length);
  const trimmed = name?.trim();
  return { ...s, items, name: trimmed || s.name, endedAt: now, status: 'done' };
}

/** 시작 시각을 옮기면 종료 시각도 같이 옮김(운동 시간 유지) */
export function shiftStart(s: Session, newStart: number): Session {
  const delta = newStart - s.startedAt;
  return { ...s, startedAt: newStart, endedAt: s.endedAt != null ? s.endedAt + delta : null };
}

export function routineFromSession(s: Session, name: string, id: string, now: number): Routine {
  return {
    id, name: name || s.name, emoji: DEFAULT_ROUTINE_EMOJI, imageId: null, createdAt: now,
    items: s.items.map((it) => ({ exerciseId: it.exerciseId, setCount: Math.max(1, it.sets.length) })),
  };
}
