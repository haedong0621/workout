import { dateKey, fmtTime } from '@/lib/format';
import { round } from '@/lib/num';
import type { Session } from './types';
import { effWeight } from './volume';

const esc = (v: unknown): string => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** 엑셀용 CSV (UTF-8 BOM 포함). 완료한 세트만 */
export function buildCSV(sessions: readonly Session[]): string {
  const rows: unknown[][] = [['날짜', '시작', '운동 이름', '종목', '부위', '세트', '유형', '입력 무게(kg)', '횟수', '실제 무게(kg)', '볼륨(kg)']];
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  for (const s of done) {
    for (const it of s.items) {
      it.sets.filter((x) => x.done).forEach((x, i) => {
        const ew = effWeight(it.kind, x.w, s.bw);
        rows.push([dateKey(s.startedAt), fmtTime(s.startedAt), s.name, it.name, it.part, i + 1, x.t, x.w, x.r, round(ew), round(ew * x.r)]);
      });
    }
  }
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
}
