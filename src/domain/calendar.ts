import { dateKey, pad } from '@/lib/format';
import type { Session } from './types';

export interface DayCell { key: string; day: number; inMonth: boolean }

/** 월 달력 (월요일 시작) */
export function monthGrid(year: number, month: number /* 0-11 */): DayCell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 월=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const cells: DayCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(year, month, 1 - offset + i);
    cells.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}

/** 완료한 세션을 날짜(YYYY-MM-DD)별로 */
export function sessionsByDay(sessions: readonly Session[]): Map<string, Session[]> {
  const m = new Map<string, Session[]>();
  for (const s of sessions) {
    if (s.status !== 'done') continue;
    const k = dateKey(s.startedAt);
    const list = m.get(k);
    if (list) list.push(s); else m.set(k, [s]);
  }
  for (const list of m.values()) list.sort((a, b) => a.startedAt - b.startedAt);
  return m;
}
