// 저장소·백업 파일에서 읽은 값을 앱이 믿고 쓸 수 있는 모양으로 정리합니다.
// 빠진 필드는 기본값으로 채우고, 형식이 깨진 항목은 버립니다(null 반환).
// 원본에 있던 "모르는 필드"는 지우지 않고 그대로 둡니다(앞으로 추가될 기능과의 호환).
import { DEFAULT_ROUTINE_EMOJI, DEFAULT_SETTINGS } from './constants';
import type { BodyEntry, Exercise, ExerciseKind, Routine, RoutineGroup, Session, SessionItem, SetType, Settings, WorkoutSet } from './types';
import { toNum } from '@/lib/num';

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : v == null ? fb : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const numOrNull = (v: unknown): number | null => { const n = toNum(v, NaN); return Number.isFinite(n) ? n : null; };
const KINDS: readonly ExerciseKind[] = ['normal', 'assist', 'bodyweight'];
const SET_TYPES: readonly SetType[] = ['N', 'W', 'F', 'D'];
const kindOf = (v: unknown): ExerciseKind => (KINDS.includes(v as ExerciseKind) ? (v as ExerciseKind) : 'normal');

export function normalizeExercise(v: unknown): Exercise | null {
  if (!isObj(v) || !v.id) return null;
  const rest = numOrNull(v.rest);
  return {
    ...v,
    id: str(v.id),
    name: str(v.name, '이름 없음').trim() || '이름 없음',
    part: str(v.part, '기타') || '기타',
    equip: str(v.equip, '기타') || '기타',
    kind: kindOf(v.kind),
    rest: rest && rest > 0 ? Math.round(rest) : null,
    imageId: strOrNull(v.imageId),
    memo: str(v.memo),
    memoAt: numOrNull(v.memoAt),
    fav: !!v.fav,
    pinned: Array.isArray(v.pinned) ? v.pinned.filter((x): x is string => typeof x === 'string') : [],
    seed: !!v.seed,
    createdAt: toNum(v.createdAt, 0),
    toggle: v.toggle === 'bar' || v.toggle === 'machine' || v.toggle === 'body' ? v.toggle : null,
    aka: Array.isArray(v.aka) ? v.aka.filter((x): x is string => typeof x === 'string' && !!x) : [],
  };
}

export function normalizeRoutine(v: unknown): Routine | null {
  if (!isObj(v) || !v.id) return null;
  const items = Array.isArray(v.items) ? v.items : [];
  return {
    ...v,
    id: str(v.id),
    name: str(v.name, '루틴'),
    emoji: str(v.emoji) || DEFAULT_ROUTINE_EMOJI,
    imageId: strOrNull(v.imageId),
    createdAt: toNum(v.createdAt, 0),
    groupId: strOrNull(v.groupId),
    ...(Number.isFinite(toNum(v.order, NaN)) ? { order: toNum(v.order, 0) } : {}),
    items: items.filter(isObj).filter((it) => it.exerciseId).map((it) => ({
      ...it,
      exerciseId: str(it.exerciseId),
      setCount: Math.max(1, Math.round(toNum(it.setCount, 3))),
    })),
  };
}

export function normalizeSet(v: unknown): WorkoutSet | null {
  if (!isObj(v)) return null;
  return {
    ...v,
    w: Math.max(0, toNum(v.w, 0)),
    r: Math.max(0, toNum(v.r, 0)),
    t: SET_TYPES.includes(v.t as SetType) ? (v.t as SetType) : 'N',
    done: !!v.done,
  };
}

export function normalizeSessionItem(v: unknown): SessionItem | null {
  if (!isObj(v) || !v.exerciseId) return null;
  const sets = Array.isArray(v.sets) ? v.sets.map(normalizeSet).filter((x): x is WorkoutSet => !!x) : [];
  return {
    ...v,
    exerciseId: str(v.exerciseId),
    name: str(v.name, '이름 없음'),
    part: str(v.part, '기타') || '기타',
    equip: str(v.equip, '기타') || '기타',
    kind: kindOf(v.kind),
    ...(typeof v.opt === 'string' && v.opt ? { opt: v.opt } : { opt: undefined }),
    sets,
  };
}

export function normalizeSession(v: unknown): Session | null {
  if (!isObj(v) || !v.id) return null;
  const startedAt = toNum(v.startedAt, NaN);
  if (!Number.isFinite(startedAt)) return null;
  const items = Array.isArray(v.items) ? v.items.map(normalizeSessionItem).filter((x): x is SessionItem => !!x) : [];
  return {
    ...v,
    id: str(v.id),
    name: str(v.name, '운동'),
    routineId: strOrNull(v.routineId),
    startedAt,
    endedAt: numOrNull(v.endedAt),
    status: v.status === 'active' ? 'active' : 'done',
    bw: Math.max(0, toNum(v.bw, 0)),
    items,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeBody(v: unknown): BodyEntry | null {
  if (!isObj(v) || !v.id || typeof v.date !== 'string' || !DATE_RE.test(v.date)) return null;
  const out: BodyEntry = { ...v, id: str(v.id), date: v.date };
  for (const k of ['weight', 'muscle', 'fat'] as const) {
    const n = numOrNull(v[k]);
    if (n != null && n > 0) out[k] = n; else delete out[k];
  }
  return out;
}

export function normalizeGroups(v: unknown): RoutineGroup[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: RoutineGroup[] = [];
  for (const g of v) {
    if (!isObj(g) || typeof g.id !== 'string' || !g.id || seen.has(g.id)) continue;
    seen.add(g.id);
    out.push({ id: g.id, name: str(g.name, '그룹').trim() || '그룹' });
  }
  return out;
}

/** 알려진 설정 키만, 타입이 맞는 값만 받아들임 */
export function normalizeSettings(entries: Iterable<[string, unknown]>, base: Settings = { ...DEFAULT_SETTINGS }): Settings {
  const out: Settings = { ...base };
  const rec = out as unknown as Record<string, unknown>;
  for (const [k, v] of entries) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[k];
    if (k === 'activeSessionId') { rec[k] = typeof v === 'string' && v ? v : null; continue; }
    if (k === 'soundMode') { rec[k] = v === 'loud' ? 'loud' : 'mix'; continue; }
    if (k === 'routineGroups') { rec[k] = normalizeGroups(v); continue; }
    if (k === 'collapsedGroups') { rec[k] = Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x))] : []; continue; }
    if (typeof def === 'number') { const n = toNum(v, NaN); if (Number.isFinite(n)) rec[k] = n; continue; }
    if (typeof def === 'boolean') { rec[k] = !!v; continue; }
  }
  if (out.restDefault < 5) out.restDefault = DEFAULT_SETTINGS.restDefault;
  return out;
}

export function normalizeList<T>(list: unknown, fn: (v: unknown) => T | null): T[] {
  if (!Array.isArray(list)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const v = fn(raw);
    if (!v) continue;
    const id = (v as { id?: string }).id;
    if (id) { if (seen.has(id)) continue; seen.add(id); }
    out.push(v);
  }
  return out;
}
