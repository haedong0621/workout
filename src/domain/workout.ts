// 운동(세션) 편집 로직 — 모두 "새 객체를 돌려주는" 순수 함수입니다.
// 저장은 store 쪽에서 합니다. 그래서 여기 로직은 단위 테스트로 검증할 수 있어요.
import { DEFAULT_REPS, DEFAULT_ROUTINE_EMOJI, DEFAULT_SET_COUNT } from './constants';
import { lastUsedOption, latestEntry, prefillSets } from './history';
import { TOGGLE_OPTIONS, kindFor, optionTitle } from './catalog.ts';
import type { Exercise, Routine, RoutineItem, Session, SessionItem, SetType, WorkoutSet } from './types';
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

/** 종목을 세션 항목으로. 지난 기록(같은 옵션, 같은 루틴 우선)이 있으면 그 세트를 그대로 불러와요. */
export function buildItem(ex: Exercise, sessions: readonly Session[], setCount = DEFAULT_SET_COUNT, beforeTs = Infinity, wantedOpt?: string, routineId: string | null = null): SessionItem {
  const opt = pickOption(ex, sessions, wantedOpt, beforeTs);
  const last = latestEntry(sessions, ex.id, { before: beforeTs, opt: { toggle: ex.toggle, value: opt }, routineId });
  const sets = last ? prefillSets(last) : Array.from({ length: Math.max(1, setCount || DEFAULT_SET_COUNT) }, () => newSet());
  return { exerciseId: ex.id, part: ex.part, equip: ex.equip, ...withOption(ex, opt), sets };
}

/** 운동 중 토글 바꾸기. 그 옵션의 지난 기록으로 세트를 다시 채움 (체크한 세트는 그대로, 아직 안 한 세트만. 기록이 없으면 그대로) */
export function setItemOption(s: Session, idx: number, ex: Exercise, opt: string, sessions: readonly Session[]): Session {
  return updateItem(s, idx, (it) => {
    if (it.opt === opt || !ex.toggle || !TOGGLE_OPTIONS[ex.toggle].includes(opt)) return it;
    const next = { ...it, ...withOption(ex, opt) };
    if (ex.toggle === 'body') return next;
    const last = latestEntry(sessions, ex.id, { before: s.startedAt, excludeId: s.id, opt: { toggle: ex.toggle, value: opt }, routineId: s.routineId });
    if (!last) return next;
    const fill = prefillSets(last);
    const done = it.sets.filter((x) => x.done);
    if (!done.length) return { ...next, sets: fill };
    // 체크한 세트 뒤로, 지난 기록의 남은 세트(없으면 지금 세트 수만큼 유지)
    const rest = it.sets.filter((x) => !x.done).map((x, i) => fill[done.length + i] ?? x);
    const extra = fill.slice(done.length + rest.length);
    return { ...next, sets: [...done, ...rest, ...extra] };
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
      if (ex) items.push(buildItem(ex, sessions, it.setCount, now, it.opt, routine.id));
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

/** 세트 유형 바꾸기. 실패(F)로 바꾸는 순간의 횟수를 목표로 저장 → 실제 한 횟수만 고치면 됨 */
export function setSetType(s: Session, idx: number, si: number, t: SetType): Session {
  return updateItem(s, idx, (it) => {
    const cur = it.sets[si];
    if (!cur || cur.t === t) return it;
    const { goal: _g, ...rest } = cur;
    const sets = it.sets.slice();
    sets[si] = t === 'F' ? { ...rest, t, goal: cur.r } : { ...rest, t };
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

/** 종료: 체크 안 한 세트는 빼고 저장. 세트를 하나도 안 한 운동은 지우지 않고 "미실시"로 남김 */
export function finalizeSession(s: Session, name: string | undefined, now: number): Session {
  const items = s.items.map((it): SessionItem => {
    const sets = it.sets.filter((x) => x.done);
    return sets.length ? { ...it, sets } : { ...it, sets: [], skipped: true, planned: it.sets.length };
  });
  const trimmed = name?.trim();
  return { ...s, items, name: trimmed || s.name, endedAt: now, status: 'done' };
}

/** 시작 시각을 옮기면 종료 시각도 같이 옮김(운동 시간 유지) */
export function shiftStart(s: Session, newStart: number): Session {
  const delta = newStart - s.startedAt;
  return { ...s, startedAt: newStart, endedAt: s.endedAt != null ? s.endedAt + delta : null };
}

// ---- 대체 운동 (오늘만 다른 운동으로, 루틴은 그대로) ----

/** idx 운동을 ex로 대신함. 원래 운동은 sub에 남김(이미 대체한 걸 또 바꿔도 처음 운동 유지) */
export function substituteItem(s: Session, idx: number, ex: Exercise, sessions: readonly Session[]): Session {
  return updateItem(s, idx, (it) => {
    const orig = it.sub ?? { exerciseId: it.exerciseId, name: it.name, ...(it.opt ? { opt: it.opt } : {}) };
    if (ex.id === orig.exerciseId) return { ...buildItem(ex, sessions, it.sets.length, s.startedAt, orig.opt, s.routineId) };
    return { ...buildItem(ex, sessions, it.sets.length, s.startedAt, undefined, s.routineId), sub: orig };
  });
}

/** 대체를 취소하고 원래 운동으로 */
export function revertSubstitute(s: Session, idx: number, orig: Exercise, sessions: readonly Session[]): Session {
  return updateItem(s, idx, (it) => (it.sub ? buildItem(orig, sessions, it.sets.length, s.startedAt, it.sub.opt, s.routineId) : it));
}

/** 루틴 기준으로 본 운동 id (대체한 운동은 원래 운동) */
export const routineIdOf = (it: Pick<SessionItem, 'exerciseId' | 'sub'>): string => it.sub?.exerciseId ?? it.exerciseId;

export interface RoutineDiff {
  /** 루틴에 없는데 이번에 한 운동 */
  added: SessionItem[];
  /** 루틴에 있는데 이번에 뺀 운동 */
  removed: RoutineItem[];
}

/** 이번 운동이 루틴과 달라진 점: 운동 추가·삭제만 봄(교체 = 삭제+추가). 순서·세트 수·옵션, 대체 운동, 미실시는 변경 아님 */
export function routineDiff(r: Routine, s: Session): RoutineDiff {
  const inRoutine = new Set(r.items.map((x) => x.exerciseId));
  const inSession = new Set(s.items.map(routineIdOf));
  const added: SessionItem[] = [];
  const seen = new Set<string>();
  for (const it of s.items) {
    const id = routineIdOf(it);
    if (!inRoutine.has(id) && !seen.has(id)) { added.push(it); seen.add(id); }
  }
  return { added, removed: r.items.filter((x) => !inSession.has(x.exerciseId)) };
}

/** 달라진 점을 루틴에 반영: 뺀 운동은 지우고, 추가한 운동은 이번 운동에서의 자리(앞 운동 다음)에 넣음 */
export function applyRoutineDiff(r: Routine, s: Session, diff: RoutineDiff): Routine {
  const removed = new Set(diff.removed.map((x) => x.exerciseId));
  const items: RoutineItem[] = r.items.filter((x) => !removed.has(x.exerciseId));
  const added = new Set(diff.added.map((x) => x.exerciseId));
  for (let i = 0; i < s.items.length; i++) {
    const it = s.items[i]!;
    if (!added.has(it.exerciseId) || it.sub) continue;
    added.delete(it.exerciseId);
    const ri: RoutineItem = { exerciseId: it.exerciseId, setCount: Math.max(1, it.skipped ? it.planned ?? 0 : it.sets.length), ...(it.opt ? { opt: it.opt } : {}) };
    // 바로 앞에 한 운동 중 루틴에 있는 것 뒤에 넣음 (없으면 맨 앞)
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = items.findIndex((x) => x.exerciseId === routineIdOf(s.items[j]!));
      if (k >= 0) { at = k + 1; break; }
    }
    items.splice(at, 0, ri);
  }
  return { ...r, items };
}

export function routineFromSession(s: Session, name: string, id: string, now: number): Routine {
  return {
    id, name: name || s.name, emoji: DEFAULT_ROUTINE_EMOJI, imageId: null, createdAt: now,
    items: s.items.map((it) => ({ exerciseId: it.exerciseId, setCount: Math.max(1, it.skipped ? it.planned ?? 0 : it.sets.length), ...(it.opt ? { opt: it.opt } : {}) })),
  };
}
