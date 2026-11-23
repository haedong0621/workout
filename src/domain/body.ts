import type { BodyEntry, BodyMetric, Settings } from './types';

/** 날짜 오름차순 */
export const sortBody = (body: readonly BodyEntry[]): BodyEntry[] => [...body].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export function bodySeries(body: readonly BodyEntry[], metric: BodyMetric): BodyEntry[] {
  return sortBody(body).filter((e) => Number(e[metric]) > 0);
}

/** 가장 최근 체중. 기록이 없으면 설정의 기본 체중 */
export function latestBodyWeight(body: readonly BodyEntry[], settings: Pick<Settings, 'bodyweight'>): number {
  const ser = bodySeries(body, 'weight');
  const last = ser[ser.length - 1];
  if (last) return Number(last.weight);
  return Number(settings.bodyweight) || 0;
}

/** 같은 날짜 기록이 있으면 값만 덮어쓰기. 빈 값(NaN, 0 이하)은 무시 */
export function mergeBodyEntry(existing: BodyEntry | undefined, id: string, date: string, fields: Partial<Record<BodyMetric, number>>): BodyEntry {
  const e: BodyEntry = existing ? { ...existing } : { id, date };
  for (const [k, v] of Object.entries(fields) as [BodyMetric, number | undefined][]) {
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    e[k] = v;
  }
  return e;
}
