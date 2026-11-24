// 운동(세션) 편집 로직 — 모두 "새 객체를 돌려주는" 순수 함수입니다.
// 저장은 store 쪽에서 합니다. 그래서 여기 로직은 단위 테스트로 검증할 수 있어요.
import { DEFAULT_REPS, DEFAULT_ROUTINE_EMOJI, DEFAULT_SET_COUNT } from './constants';
import { exerciseHistory, lastUsedOption, prefillSets } from './history';
import { TOGGLE_OPTIONS, kindFor, optionTitle } from './catalog.ts';
import type { Exercise, Routine, Session, SessionItem, SetType, WorkoutSet } from './types';
import { timeOfDayName } from '@/lib/format';

export const newSet = (w = 0, r = DEFAULT_REPS, t: SetType = 'N'): WorkoutSet => ({ w, r, t, done: false });

/** 토글 운동의 옵션 정하기: 정해 준 값 → 마지막에 쓴 옵션 → 첫 옵션 */
export function pickOption(ex: Pick<Exercise, 'id' | 'toggle'>, sessions: readonly Session[], wanted?: string, beforeTs = Infinity): string | undefined {
  if (!ex.toggle) return undefined;
  const allowed = TOGGLE_OPTIONS[ex.toggle];
  for (const o of [wanted, lastUsedOption(sessions, ex.id, beforeTs)]) if (o && allowed.includes(o)) return o;
  return allowed[0];
}

/** 옵션에 맞춘 항목 이름·무게 방식 */
function withOption(ex: Exercise, opt: string | undefined): Pick<SessionItem, 'name' | 'kind' | 'opt'> {
  return {
    name: optionTitle(ex.name, ex.toggle, opt),
    kind: ex.toggle === 'body' ? kindFor('body', opt) : ex.kind,
    ...(opt ? { opt } : {}),
  };
}

/** 종목을 세션 항목으로. 지난 기록(같은 옵션)이 있으면 그 세트를 그대로 불러와요. */
export function buildItem(ex: Exercise, sessions: readonly Session[], setCount = DEFAULT_SET_COUNT, beforeTs = Infinity, wantedOpt?: string): SessionItem {
  const opt = pickOption(ex, sessions, wantedOpt, beforeTs);
  const hist = exerciseHistory(sessions, ex.id, { before: beforeTs, opt: { toggle: ex.toggle, value: opt } });
  const last = hist[hist.length - 1];
  const sets = last ? prefillSets(last) : Array.from({ length: Math.max(1, setCount || DEFAULT_SET_COUNT) }, () => newSet());
  return { exerciseId: ex.id, part: ex.part, equip: ex.equip, ...withOption(ex, opt), sets };
}

/** 운동 중 토글 바꾸기. 아직 끝낸 세트가 없으면 그 옵션의 지난 기록으로 세트를 다시 채움 */
export function setItemOption(s: Session, idx: number, ex: Exercise, opt: string, sessions: readonly Session[]): Session {
  return updateItem(s, idx, (it) => {
    if (it.opt === opt || !ex.toggle || !TOGGLE_OPTIONS[ex.toggle].includes(opt)) return it;
    const next = { ...it, ...withOption(ex, opt) };
    if (ex.toggle === 'body' || it.sets.some((x) => x.done)) return next;
    const hist = exerciseHistory(sessions, ex.id, { before: s.startedAt, excludeId: s.id, opt: { toggle: ex.toggle, value: opt } });
    const last = hist[hist.length - 1];
    return last ? { ...next, sets: prefillSets(last) } : next;
  });
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
      if (ex) items.push(buildItem(ex, sessions, it.setCount, now, it.opt));
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
    items: s.items.map((it) => ({ exerciseId: it.exerciseId, setCount: Math.max(1, it.sets.length), ...(it.opt ? { opt: it.opt } : {}) })),
  };
}
