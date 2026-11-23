import { describe, expect, it } from 'vitest';
import { seedExercises } from '@/domain/seed';
import type { Routine, Session } from '@/domain/types';
import * as W from '@/domain/workout';

const ex = seedExercises(0);
const bench = ex[0]!;
const assist = ex.find((e) => e.kind === 'assist')!;

const past: Session = {
  id: 'p', name: 'p', routineId: null, startedAt: 1000, endedAt: 2000, status: 'done', bw: 80,
  items: [{ exerciseId: bench.id, name: bench.name, part: '가슴', equip: '바벨', kind: 'normal', sets: [{ w: 60, r: 10, t: 'W', done: true }, { w: 80, r: 8, t: 'N', done: true }] }],
};
const routine: Routine = { id: 'r', name: '가슴날', emoji: '💪', imageId: null, createdAt: 0, items: [{ exerciseId: bench.id, setCount: 3 }, { exerciseId: assist.id, setCount: 2 }, { exerciseId: 'deleted', setCount: 3 }] };

describe('createSession', () => {
  const s = W.createSession({ id: 's', now: 5000, bw: 0, routine, exercises: ex, sessions: [past] });
  it('루틴 이름·순서, 지워진 운동은 건너뜀', () => {
    expect(s.name).toBe('가슴날');
    expect(s.items.map((i) => i.exerciseId)).toEqual([bench.id, assist.id]);
  });
  it('지난 기록이 있으면 그 세트를 불러오고, 없으면 루틴 세트 수만큼', () => {
    expect(s.items[0]!.sets).toEqual([{ w: 60, r: 10, t: 'W', done: false }, { w: 80, r: 8, t: 'N', done: false }]);
    expect(s.items[1]!.sets).toHaveLength(2);
  });
  it('어시스트가 있는데 체중이 없으면 물어봐야 함', () => expect(W.needsBodyweight(s)).toBe(true));
  it('빈 운동은 시간대 이름', () => {
    const e = W.createSession({ id: 'e', now: new Date(2026, 0, 1, 19).getTime(), bw: 80, routine: null, exercises: ex, sessions: [] });
    expect(e.name).toBe('저녁 운동');
    expect(e.items).toHaveLength(0);
  });
});

describe('세트 편집', () => {
  const s0 = W.createSession({ id: 's', now: 5000, bw: 80, routine, exercises: ex, sessions: [past] });
  it('addSet은 마지막 세트를 복사(웜업 다음은 일반)', () => {
    const one = W.updateItem(s0, 0, (it) => ({ ...it, sets: [it.sets[0]!] }));
    const s = W.addSet(one, 0);
    expect(s.items[0]!.sets[1]).toEqual({ w: 60, r: 10, t: 'N', done: false });
    expect(one.items[0]!.sets).toHaveLength(1); // 원본은 그대로(불변)
  });
  it('updateSet / removeSet / applySetToAll', () => {
    let s = W.updateSet(s0, 0, 1, { w: 85, done: true });
    expect(s.items[0]!.sets[1]).toMatchObject({ w: 85, done: true });
    s = W.applySetToAll(s, 0, 1);
    expect(s.items[0]!.sets.map((x) => x.w)).toEqual([85, 85]);
    s = W.removeSet(s, 0, 0);
    expect(s.items[0]!.sets).toHaveLength(1);
  });
  it('moveItem', () => {
    expect(W.moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(W.moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
  it('finalizeSession은 체크 안 한 세트와 빈 종목을 뺌', () => {
    const s = W.updateSet(s0, 0, 1, { done: true });
    const f = W.finalizeSession(s, '  오늘 운동 ', 9000);
    expect(f.status).toBe('done');
    expect(f.endedAt).toBe(9000);
    expect(f.name).toBe('오늘 운동');
    expect(f.items).toHaveLength(1);
    expect(f.items[0]!.sets).toHaveLength(1);
    expect(W.finalizeSession(s, '   ', 9000).name).toBe('가슴날');
  });
  it('isAllDone', () => {
    expect(W.isAllDone(s0)).toBe(false);
    const all = { ...s0, items: s0.items.map((it) => ({ ...it, sets: it.sets.map((x) => ({ ...x, done: true })) })) };
    expect(W.isAllDone(all)).toBe(true);
  });
});

describe('지난 기록 수정', () => {
  it('shiftStart는 운동 시간을 유지', () => {
    const s = W.shiftStart(past, 11000);
    expect(s.startedAt).toBe(11000);
    expect(s.endedAt).toBe(12000);
  });
  it('routineFromSession', () => {
    const r = W.routineFromSession(past, '새 루틴', 'rid', 1);
    expect(r.items).toEqual([{ exerciseId: bench.id, setCount: 2 }]);
  });
});
