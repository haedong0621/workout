import { describe, expect, it } from 'vitest';
import { monthGrid, sessionsByDay } from '@/domain/calendar';
import { choseong, matchName } from '@/domain/search';
import { latestBodyWeight, mergeBodyEntry } from '@/domain/body';
import { buildCSV } from '@/domain/csv';
import { fmtClock, fmtDur, fmtDurShort } from '@/lib/format';
import { seedExercises, SEED } from '@/domain/seed';
import type { Session } from '@/domain/types';

describe('검색', () => {
  it('초성', () => expect(choseong('벤치 프레스')).toBe('ㅂㅊ ㅍㄹㅅ'));
  it('부분 일치·공백 무시·초성', () => {
    expect(matchName('벤치 프레스', '벤치프')).toBe(true);
    expect(matchName('벤치 프레스', 'ㅂㅊㅍㄹㅅ')).toBe(true);
    expect(matchName('벤치 프레스', 'ㅅㅋ')).toBe(false);
    expect(matchName('Lat Pulldown', 'lat')).toBe(true);
    expect(matchName('아무거나', '')).toBe(true);
  });
});

describe('달력', () => {
  it('월요일 시작, 주 단위', () => {
    const g = monthGrid(2026, 10); // 2026년 11월: 1일이 일요일
    expect(g.length % 7).toBe(0);
    expect(g[0]!.key).toBe('2026-10-26');
    expect(g[6]).toMatchObject({ key: '2026-11-01', inMonth: true });
  });
  it('sessionsByDay는 완료한 것만', () => {
    const s = (id: string, t: number, status: Session['status']): Session => ({ id, name: id, routineId: null, startedAt: t, endedAt: t, status, bw: 0, items: [] });
    const m = sessionsByDay([s('a', new Date(2026, 0, 1, 9).getTime(), 'done'), s('b', new Date(2026, 0, 1, 8).getTime(), 'done'), s('c', new Date(2026, 0, 1).getTime(), 'active')]);
    expect(m.get('2026-01-01')!.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('몸 기록', () => {
  it('가장 최근 체중, 없으면 설정값', () => {
    expect(latestBodyWeight([{ id: '1', date: '2026-01-02', weight: 80 }, { id: '2', date: '2026-01-05', fat: 20 }, { id: '3', date: '2026-01-01', weight: 90 }], { bodyweight: 70 })).toBe(80);
    expect(latestBodyWeight([], { bodyweight: 70 })).toBe(70);
  });
  it('같은 날은 값만 덮어쓰고 빈 값은 무시', () => {
    const e = mergeBodyEntry({ id: '1', date: '2026-01-01', weight: 80, fat: 20 }, 'x', '2026-01-01', { weight: 81, fat: NaN });
    expect(e).toEqual({ id: '1', date: '2026-01-01', weight: 81, fat: 20 });
  });
});

describe('형식', () => {
  it('시계', () => { expect(fmtClock(59)).toBe('00:59'); expect(fmtClock(3725)).toBe('1:02:05'); });
  it('시간', () => { expect(fmtDur(5340)).toBe('1시간 29분'); expect(fmtDurShort(5340)).toBe('1h29m'); expect(fmtDurShort(0)).toBe('0m'); });
});

describe('기본 운동', () => {
  it('54개, id 고정(seed-0..)', () => {
    const ex = seedExercises(0);
    expect(ex).toHaveLength(SEED.length);
    expect(ex[0]).toMatchObject({ id: 'seed-0', name: '벤치 프레스' });
    expect(new Set(ex.map((e) => e.name)).size).toBe(ex.length);
  });
});

describe('CSV', () => {
  it('체크한 세트만, 어시스트 실제 무게', () => {
    const s: Session = { id: 's', name: '등, "당기기"', routineId: null, startedAt: new Date(2026, 0, 2, 9, 5).getTime(), endedAt: 1, status: 'done', bw: 80,
      items: [{ exerciseId: 'a', name: '어시스트 풀업', part: '등', equip: '머신', kind: 'assist', sets: [{ w: 20, r: 10, t: 'N', done: true }, { w: 20, r: 10, t: 'N', done: false }] }] };
    const lines = buildCSV([s]).replace('﻿', '').split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-01-02,09:05,"등, ""당기기""",어시스트 풀업,등,1,N,20,10,60,600');
  });
});
