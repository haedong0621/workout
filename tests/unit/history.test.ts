import { describe, expect, it } from 'vitest';
import { exerciseHistory, personalRecords, pinnedFirst, prefillSets, previousEntry, usageCounts } from '@/domain/history';
import type { Session } from '@/domain/types';

const mk = (id: string, startedAt: number, w: number, status: Session['status'] = 'done'): Session => ({
  id, name: id, routineId: null, startedAt, endedAt: startedAt + 1, status, bw: 80,
  items: [{ exerciseId: 'bench', name: '벤치', part: '가슴', equip: '바벨', kind: 'normal', sets: [{ w, r: 10, t: 'N', done: true }, { w: 999, r: 1, t: 'N', done: false }] }],
});
const sessions = [mk('b', 200, 70), mk('a', 100, 60), mk('c', 300, 80), mk('act', 400, 90, 'active')];

describe('exerciseHistory', () => {
  it('완료한 세션만, 오래된 순, 체크한 세트만', () => {
    const h = exerciseHistory(sessions, 'bench');
    expect(h.map((e) => e.sessionId)).toEqual(['a', 'b', 'c']);
    expect(h[0]!.sets).toHaveLength(1);
  });
  it('before / excludeId', () => {
    expect(exerciseHistory(sessions, 'bench', { before: 300 }).map((e) => e.sessionId)).toEqual(['a', 'b']);
    expect(exerciseHistory(sessions, 'bench', { excludeId: 'b' }).map((e) => e.sessionId)).toEqual(['a', 'c']);
  });
  it('previousEntry는 시작 시각 이전의 직전 기록', () => {
    expect(previousEntry(sessions, sessions[3]!, 'bench')?.sessionId).toBe('c');
    expect(previousEntry(sessions, sessions[1]!, 'bench')).toBeNull();
  });
});

describe('기타', () => {
  it('personalRecords', () => {
    const pr = personalRecords(exerciseHistory(sessions, 'bench'));
    expect(pr.pr).toBe(80);
    expect(pr.vol).toBe(800);
  });
  it('prefillSets는 체크 해제 상태로 복사', () => {
    expect(prefillSets({ sets: [{ w: 1, r: 2, t: 'W', done: true }] })).toEqual([{ w: 1, r: 2, t: 'W', done: false }]);
  });
  it('pinnedFirst는 고정한 것을 앞으로, 나머지 순서 유지', () => {
    const list = [{ sessionId: '1' }, { sessionId: '2' }, { sessionId: '3' }];
    expect(pinnedFirst(list, ['3']).map((x) => x.sessionId)).toEqual(['3', '1', '2']);
  });
  it('usageCounts', () => expect(usageCounts(sessions).get('bench')).toBe(4));
});
