// 상태에서 계산되는 값들. computed라서 원본이 바뀔 때만 다시 계산돼요.
import { computed } from '@preact/signals';
import { usageCounts } from '@/domain/history';
import type { Exercise, Session } from '@/domain/types';
import { exercises, routines, sessions, settings } from './core';

export const exerciseMap = computed(() => new Map(exercises.value.map((e) => [e.id, e])));
export const routineMap = computed(() => new Map(routines.value.map((r) => [r.id, r])));

export const activeSession = computed<Session | null>(() => {
  const id = settings.value.activeSessionId;
  if (!id) return null;
  return sessions.value.find((s) => s.id === id && s.status === 'active') ?? null;
});

/** 완료한 운동, 최근 순 */
export const doneSessions = computed(() =>
  sessions.value.filter((s) => s.status === 'done').sort((a, b) => b.startedAt - a.startedAt));

export const usage = computed(() => usageCounts(sessions.value));

/** 즐겨찾기 → 많이 한 순 → 이름순 */
export const sortedExercises = computed<Exercise[]>(() => {
  const u = usage.value;
  return [...exercises.value].sort((a, b) =>
    (b.fav ? 1 : 0) - (a.fav ? 1 : 0)
    || (u.get(b.id) ?? 0) - (u.get(a.id) ?? 0)
    || a.name.localeCompare(b.name, 'ko'));
});

/** 루틴별 마지막으로 한 시각 */
export const routineLastRun = computed(() => {
  const m = new Map<string, number>();
  for (const s of sessions.value) {
    if (s.status !== 'done' || !s.routineId) continue;
    m.set(s.routineId, Math.max(m.get(s.routineId) ?? 0, s.startedAt));
  }
  return m;
});

export const includeWarmup = computed(() => settings.value.includeWarmup);
export const restFor = (ex: Pick<Exercise, 'rest'> | undefined | null): number => ex?.rest || settings.value.restDefault;
