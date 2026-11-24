// 진행 중인 운동(세션) 관련 상태 변경
import { latestBodyWeight } from '@/domain/body';
import type { Exercise, Session, WorkoutSet } from '@/domain/types';
import * as W from '@/domain/workout';
import { dateKey } from '@/lib/format';
import { uuid } from '@/lib/id';
import { stopRest } from '@/services/restTimer';
import { setWakeLock } from '@/services/wakeLock';
import { body, findById, put, removeRecord, sessions, setSetting, settings, exercises } from './core';
import { activeSession } from './selectors';
import { upsertBody } from './body';

/** 세션 하나를 fn으로 고쳐서 저장 (진행 중·지난 기록 공용) */
export function updateSession(id: string, fn: (s: Session) => Session): Session | undefined {
  const cur = findById('sessions', id);
  if (!cur) return undefined;
  const next = fn(cur);
  if (next === cur) return cur;
  return put('sessions', next);
}

export function startWorkout(routineId: string | null): Session {
  const routine = routineId ? findById('routines', routineId) ?? null : null;
  const s = W.createSession({
    id: uuid(), now: Date.now(),
    bw: latestBodyWeight(body.value, settings.value),
    routine, exercises: exercises.value, sessions: sessions.value,
  });
  put('sessions', s);
  void setSetting('activeSessionId', s.id);
  if (settings.value.keepAwake) void setWakeLock(true);
  return s;
}

export function addExercisesToSession(sessionId: string, list: readonly Exercise[]): void {
  updateSession(sessionId, (s) => W.addItems(s, list.map((ex) => W.buildItem(ex, sessions.value, 3, s.startedAt))));
}

export function swapExercise(sessionId: string, idx: number, ex: Exercise): void {
  updateSession(sessionId, (s) => {
    const cur = s.items[idx];
    return W.replaceItem(s, idx, W.buildItem(ex, sessions.value, cur?.sets.length ?? 3, s.startedAt));
  });
}

/** 운동 중 장비 토글 바꾸기 (바벨/스미스, 핀/플레이트, 어시스트/중량) */
export function setItemOption(sessionId: string, idx: number, opt: string): void {
  updateSession(sessionId, (s) => {
    const it = s.items[idx];
    const ex = it ? exercises.value.find((e) => e.id === it.exerciseId) : undefined;
    return ex ? W.setItemOption(s, idx, ex, opt, sessions.value) : s;
  });
}

export const setSessionField = (id: string, patch: Partial<Pick<Session, 'name' | 'bw' | 'endedAt'>>) =>
  updateSession(id, (s) => ({ ...s, ...patch }));

export const updateSet = (id: string, idx: number, si: number, p: Partial<WorkoutSet>) => updateSession(id, (s) => W.updateSet(s, idx, si, p));

/** 체중 입력: 세션에 적용 + 내 몸 기록에 저장 */
export function setSessionBodyweight(id: string, kg: number): void {
  if (!(kg > 0)) return;
  setSessionField(id, { bw: kg });
  upsertBody(dateKey(Date.now()), { weight: kg });
}

export function finishWorkout(id: string, name?: string): Session | undefined {
  const done = updateSession(id, (s) => W.finalizeSession(s, name, Date.now()));
  void setSetting('activeSessionId', null);
  stopRest();
  void setWakeLock(false);
  return done;
}

export function discardWorkout(): void {
  const s = activeSession.value;
  if (s) removeRecord('sessions', s.id);
  void setSetting('activeSessionId', null);
  stopRest();
  void setWakeLock(false);
}

export const deleteSession = (id: string): void => removeRecord('sessions', id);
