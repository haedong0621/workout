import { describe, expect, it } from 'vitest';
import { effWeight, est1RM, itemStats, plannedVolume, sessionStats, setProgress } from '@/domain/volume';
import type { Session, SessionItem } from '@/domain/types';

const item = (kind: SessionItem['kind'], sets: [number, number, 'N' | 'W' | 'F' | 'D', boolean][]): SessionItem => ({
  exerciseId: 'x', name: 'x', part: '가슴', equip: '바벨', kind, sets: sets.map(([w, r, t, done]) => ({ w, r, t, done })),
});

describe('effWeight', () => {
  it('일반: 입력 무게 그대로', () => expect(effWeight('normal', 80, 87)).toBe(80));
  it('어시스트: 체중 − 핀 (음수면 0)', () => {
    expect(effWeight('assist', 20, 87)).toBe(67);
    expect(effWeight('assist', 100, 87)).toBe(0);
  });
  it('맨몸: 체중 + 추가', () => expect(effWeight('bodyweight', 10, 87)).toBe(97));
  it('체중이 없으면 0으로 계산', () => expect(effWeight('assist', 20, 0)).toBe(0));
});

describe('est1RM (Epley)', () => {
  it('1회면 그 무게', () => expect(est1RM(100, 1)).toBe(100));
  it('10회', () => expect(est1RM(60, 10)).toBeCloseTo(80));
  it('0이면 0', () => expect(est1RM(0, 5)).toBe(0));
});

describe('itemStats', () => {
  const it1 = item('normal', [[40, 10, 'W', true], [80, 8, 'N', true], [80, 7, 'N', false]]);
  it('체크한 세트만, 웜업 포함', () => {
    const s = itemStats(it1, 0, true);
    expect(s.volume).toBe(400 + 640);
    expect(s.setCount).toBe(2);
    expect(s.maxW).toBe(80);
  });
  it('웜업 제외 옵션: 볼륨에서 빠지지만 세트 수는 셈', () => {
    const s = itemStats(it1, 0, false);
    expect(s.volume).toBe(640);
    expect(s.setCount).toBe(2);
  });
  it('어시스트는 체중 반영', () => {
    expect(itemStats(item('assist', [[20, 10, 'N', true]]), 87).volume).toBe(670);
  });
  it('예정 볼륨은 모든 세트를 한 것으로 계산', () => {
    expect(plannedVolume(it1, 0)).toBe(400 + 640 + 560);
  });
});

describe('sessionStats', () => {
  const s: Session = {
    id: 's', name: 's', routineId: null, startedAt: 0, endedAt: 3_600_000, status: 'done', bw: 87,
    items: [item('normal', [[80, 8, 'N', true]]), { ...item('assist', [[20, 10, 'N', true], [20, 10, 'N', false]]), part: '등' }],
  };
  it('부위별 세트, 시간, 볼륨', () => {
    const st = sessionStats(s);
    expect(st.volume).toBe(640 + 670);
    expect(st.sets).toBe(2);
    expect(st.exercises).toBe(2);
    expect(st.byPart).toEqual({ 가슴: 1, 등: 1 });
    expect(st.durationSec).toBe(3600);
  });
  it('진행률', () => expect(setProgress(s)).toEqual({ done: 2, total: 3 }));
});
