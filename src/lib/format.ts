// 날짜·시간·숫자 표시 형식
export const WEEK = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const pad = (n: number): string => String(n).padStart(2, '0');

export function fmtNum(n: unknown, digits = 1): string {
  const v = Number(n);
  if (n == null || !Number.isFinite(v)) return '0';
  const f = 10 ** digits;
  return (Math.round(v * f) / f).toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

/** 59 → 00:59, 3725 → 1:02:05 */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/** 5340 → 1시간 29분 */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
  if (hh) return `${hh}시간 ${mm}분`;
  if (mm) return `${mm}분`;
  return `${s}초`;
}

/** 5340 → 1h29m */
export function fmtDurShort(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
  if (!hh && !mm) return s ? '<1m' : '0m';
  return hh ? `${hh}h${pad(mm)}m` : `${mm}m`;
}

/** 로컬 시간 기준 YYYY-MM-DD */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** YYYY-MM-DD → 그날 정오(시간대 경계 문제 방지) */
export const keyToTs = (key: string): number => new Date(key + 'T12:00:00').getTime();

export const fmtMD = (ts: number): string => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtTime = (ts: number): string => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtYMD = (ts: number): string => { const d = new Date(ts); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
export function fmtFull(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

export function timeOfDayName(ts: number): string {
  const hr = new Date(ts).getHours();
  if (hr < 5) return '새벽';
  if (hr < 11) return '아침';
  if (hr < 14) return '점심';
  if (hr < 18) return '오후';
  if (hr < 22) return '저녁';
  return '밤';
}
