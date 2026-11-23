// 볼륨·1RM 계산 (순수 함수 — DOM 없음, 단위 테스트 대상)
import type { ExerciseKind, Session, SessionItem, WorkoutSet } from './types';

/**
 * 실제로 든 무게.
 * - normal: 입력한 무게 그대로
 * - assist: 어시스트 머신(핀 무게만큼 체중이 덜어짐) → max(체중 − 핀, 0)
 * - bodyweight: 맨몸 + 추가 중량 → 체중 + 추가
 */
export function effWeight(kind: ExerciseKind, w: number, bw: number): number {
  const weight = Number(w) || 0;
  const body = Number(bw) || 0;
  if (kind === 'assist') return Math.max(body - weight, 0);
  if (kind === 'bodyweight') return body + weight;
  return weight;
}

export function setVolume(kind: ExerciseKind, set: Pick<WorkoutSet, 'w' | 'r'>, bw: number): number {
  return effWeight(kind, set.w, bw) * (Number(set.r) || 0);
}

/** Epley 공식. 1회면 그 무게가 곧 1RM */
export function est1RM(weight: number, reps: number): number {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (!w || !r) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

export interface ItemStats {
  volume: number;
  maxW: number;
  best1RM: number;
  /** 완료한 세트 수(웜업 포함 여부와 상관없이 셈) */
  setCount: number;
}

/** 완료(체크)한 세트만 집계. includeWarmup=false면 W 세트는 볼륨·최고 무게에서 빠짐 */
export function itemStats(item: Pick<SessionItem, 'kind' | 'sets'>, bw: number, includeWarmup = true): ItemStats {
  let volume = 0, maxW = 0, best1RM = 0, setCount = 0;
  for (const s of item.sets) {
    if (!s.done) continue;
    setCount++;
    if (!includeWarmup && s.t === 'W') continue;
    const ew = effWeight(item.kind, s.w, bw);
    const r = Number(s.r) || 0;
    volume += ew * r;
    if (r > 0) {
      if (ew > maxW) maxW = ew;
      const e = est1RM(ew, r);
      if (e > best1RM) best1RM = e;
    }
  }
  return { volume, maxW, best1RM, setCount };
}

/** 모든 세트를 했다고 가정한 예정 볼륨 */
export function plannedVolume(item: Pick<SessionItem, 'kind' | 'sets'>, bw: number, includeWarmup = true): number {
  return itemStats({ kind: item.kind, sets: item.sets.map((x) => ({ ...x, done: true })) }, bw, includeWarmup).volume;
}

export interface SessionStats {
  volume: number;
  sets: number;
  exercises: number;
  /** 부위별 완료 세트 수 */
  byPart: Record<string, number>;
  durationSec: number;
}

export function sessionStats(session: Session, includeWarmup = true, now = Date.now()): SessionStats {
  let volume = 0, sets = 0, exercises = 0;
  const byPart: Record<string, number> = {};
  for (const it of session.items) {
    const st = itemStats(it, session.bw, includeWarmup);
    volume += st.volume;
    sets += st.setCount;
    if (st.setCount) {
      exercises++;
      const p = it.part || '기타';
      byPart[p] = (byPart[p] ?? 0) + st.setCount;
    }
  }
  const end = session.endedAt ?? now;
  return { volume, sets, exercises, byPart, durationSec: Math.max(0, Math.round((end - session.startedAt) / 1000)) };
}

export function setProgress(session: Session): { done: number; total: number } {
  let done = 0, total = 0;
  for (const it of session.items) for (const s of it.sets) { total++; if (s.done) done++; }
  return { done, total };
}
