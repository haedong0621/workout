// 종목별 지난 기록·최고 기록
import type { ExerciseToggle, Session, SessionItem, WorkoutSet } from './types';
import { itemStats } from './volume';
import { TOGGLE_OPTIONS } from './catalog.ts';

const TOGGLE_FIRST: Record<ExerciseToggle, string> = { bar: TOGGLE_OPTIONS.bar[0], machine: TOGGLE_OPTIONS.machine[0], body: TOGGLE_OPTIONS.body[0] };

/** 이 운동에서 마지막으로 쓴 토글 옵션 (before 이전, 끝낸 기록 중) */
export function lastUsedOption(sessions: readonly Session[], exerciseId: string, before = Infinity): string | undefined {
  let best: { ts: number; opt: string } | null = null;
  for (const s of sessions) {
    if (s.status !== 'done' || s.startedAt >= before) continue;
    for (const it of s.items) if (it.exerciseId === exerciseId && it.opt && (!best || s.startedAt > best.ts)) best = { ts: s.startedAt, opt: it.opt };
  }
  return best?.opt;
}

export interface HistoryEntry {
  sessionId: string;
  ts: number;
  bw: number;
  item: SessionItem;
  volume: number;
  maxW: number;
  best1RM: number;
  setCount: number;
  /** 완료한 세트만 */
  sets: WorkoutSet[];
}

export interface HistoryOptions {
  includeWarmup?: boolean;
  /** 이 세션은 빼고 */
  excludeId?: string | null;
  /** 이 시각 "이전"에 시작한 세션만 */
  before?: number;
  /** 이 토글 옵션의 기록만 (바벨/스미스, 핀/플레이트). 맨몸은 한 줄로 이어 보니 거르지 않음 */
  opt?: { toggle: ExerciseToggle | null | undefined; value: string | undefined };
}

/** 기록 항목의 옵션 (예전 기록처럼 옵션이 없으면 첫 옵션으로 봄) */
export const itemOption = (it: Pick<SessionItem, 'opt'>, first: string | undefined) => it.opt ?? first;

/** 한 종목의 과거 기록 (오래된 순). 완료한 세션만. 같은 세션에 같은 종목이 두 번 있으면 각각 들어감 */
export function exerciseHistory(sessions: readonly Session[], exerciseId: string, opts: HistoryOptions = {}): HistoryEntry[] {
  const { includeWarmup = true, excludeId = null, before = Infinity, opt } = opts;
  const filterOpt = opt && opt.toggle && opt.toggle !== 'body' && opt.value ? opt.value : null;
  const first = opt?.toggle ? TOGGLE_FIRST[opt.toggle] : undefined;
  const out: HistoryEntry[] = [];
  for (const s of sessions) {
    if (s.status !== 'done' || s.id === excludeId || s.startedAt >= before) continue;
    for (const it of s.items) {
      if (it.exerciseId !== exerciseId) continue;
      if (filterOpt && itemOption(it, first) !== filterOpt) continue;
      const st = itemStats(it, s.bw, includeWarmup);
      if (!st.setCount) continue;
      out.push({
        sessionId: s.id, ts: s.startedAt, bw: s.bw, item: it,
        volume: st.volume, maxW: st.maxW, best1RM: st.best1RM, setCount: st.setCount,
        sets: it.sets.filter((x) => x.done),
      });
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/** 직전 기록 (지금 세션 시작 이전 것 중 가장 최근) */
export function previousEntry(sessions: readonly Session[], session: Session, exerciseId: string, includeWarmup = true, opt?: HistoryOptions['opt']): HistoryEntry | null {
  const hist = exerciseHistory(sessions, exerciseId, { before: session.startedAt, excludeId: session.id, includeWarmup, opt });
  return hist[hist.length - 1] ?? null;
}

/** 지난 기록의 세트를 "아직 안 한" 상태로 복사 */
export function prefillSets(entry: Pick<HistoryEntry, 'sets'>): WorkoutSet[] {
  return entry.sets.map((s) => ({ w: s.w, r: s.r, t: s.t || 'N', done: false }));
}

export interface PersonalRecords { pr: number; rm: number; vol: number }

export function personalRecords(hist: readonly HistoryEntry[]): PersonalRecords {
  let pr = 0, rm = 0, vol = 0;
  for (const e of hist) {
    if (e.maxW > pr) pr = e.maxW;
    if (e.best1RM > rm) rm = e.best1RM;
    if (e.volume > vol) vol = e.volume;
  }
  return { pr, rm, vol };
}

export type ChartMetric = 'volume' | 'maxW' | 'rm';
export function metricOf(entry: HistoryEntry, metric: ChartMetric): number {
  if (metric === 'volume') return entry.volume;
  if (metric === 'maxW') return entry.maxW;
  return entry.best1RM;
}

/** 고정한 기록을 앞으로, 나머지는 원래 순서 유지 */
export function pinnedFirst<T extends { sessionId: string }>(list: readonly T[], pinned: readonly string[]): T[] {
  const set = new Set(pinned);
  return [...list].sort((a, b) => (set.has(b.sessionId) ? 1 : 0) - (set.has(a.sessionId) ? 1 : 0));
}

/** 종목별 사용 횟수 (정렬용) */
export function usageCounts(sessions: readonly Session[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) for (const it of s.items) m.set(it.exerciseId, (m.get(it.exerciseId) ?? 0) + 1);
  return m;
}
