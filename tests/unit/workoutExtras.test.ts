// 미실시 · 대체 운동 · 루틴 반영 · 실패 세트 목표
import { describe, expect, it } from 'vitest';
import { seedExercises } from '@/domain/seed';
import { exerciseHistory, lastUsedOption, prefillSets, usageCounts } from '@/domain/history';
import { normalizeSession } from '@/domain/normalize';
import type { Routine, Session, SessionItem } from '@/domain/types';
import { sessionStats } from '@/domain/volume';
import * as W from '@/domain/workout';

const ex = seedExercises(0);
const [a, b, c, d] = [ex[0]!, ex[1]!, ex[2]!, ex[3]!];
const item = (e: typeof a, sets: [number, number, boolean][], extra: Partial<SessionItem> = {}): SessionItem => ({
  exerciseId: e.id, name: e.name, part: e.part, equip: e.equip, kind: e.kind, sets: sets.map(([w, r, done]) => ({ w, r, t: 'N', done })), ...extra,
});
const routine: Routine = { id: 'r', name: '가슴날', emoji: '💪', imageId: null, createdAt: 0, items: [{ exerciseId: a.id, setCount: 3 }, { exerciseId: b.id, setCount: 2 }, { exerciseId: c.id, setCount: 4 }] };
const active = (items: SessionItem[]): Session => ({ id: 's', name: '가슴날', routineId: 'r', startedAt: 5000, endedAt: null, status: 'active', bw: 80, items });

describe('미실시: 세트를 하나도 안 한 운동은 지우지 않고 남김', () => {
  const done = W.finalizeSession(active([item(a, [[60, 10, true], [60, 10, false]]), item(b, [[20, 12, false], [20, 12, false]])]), undefined, 9000);
  it('한 운동은 체크한 세트만, 안 한 운동은 미실시 + 계획 세트 수', () => {
    expect(done.items[0]!.sets).toHaveLength(1);
    expect(done.items[0]!.skipped).toBeUndefined();
    expect(done.items[1]).toMatchObject({ exerciseId: b.id, sets: [], skipped: true, planned: 2 });
  });
  it('볼륨·종목 수·기록·마지막 옵션·사용 횟수에는 안 들어감', () => {
    expect(sessionStats(done).exercises).toBe(1);
    expect(exerciseHistory([done], b.id)).toHaveLength(0);
    const withOpt = { ...done, items: [{ ...done.items[1]!, opt: '스미스' }] };
    expect(lastUsedOption([withOpt], b.id)).toBeUndefined();
    expect(usageCounts([done]).get(b.id)).toBeUndefined();
  });
  it('백업을 거쳐도(정리 함수) 그대로', () => {
    const back = normalizeSession(JSON.parse(JSON.stringify(done)))!;
    expect(back.items[1]).toMatchObject({ skipped: true, planned: 2, sets: [] });
    expect(back.items[0]!.skipped).toBeUndefined();
  });
});

describe('대체 운동: 오늘만 다른 운동으로', () => {
  const s0 = active([item(a, [[60, 10, false], [60, 10, false], [60, 10, false]])]);
  const s1 = W.substituteItem(s0, 0, d, []);
  it('운동은 바뀌고 원래 운동은 sub에, 세트 수는 유지', () => {
    expect(s1.items[0]!.exerciseId).toBe(d.id);
    expect(s1.items[0]!.sub).toEqual({ exerciseId: a.id, name: a.name });
    expect(s1.items[0]!.sets).toHaveLength(3);
  });
  it('대체한 걸 또 대체해도 원래 운동은 처음 것', () => {
    expect(W.substituteItem(s1, 0, c, []).items[0]!.sub!.exerciseId).toBe(a.id);
  });
  it('원래 운동을 다시 고르거나 되돌리면 대체 표시가 없어짐', () => {
    expect(W.substituteItem(s1, 0, a, []).items[0]!.sub).toBeUndefined();
    const r = W.revertSubstitute(s1, 0, a, []);
    expect(r.items[0]!.exerciseId).toBe(a.id);
    expect(r.items[0]!.sub).toBeUndefined();
  });
  it('기록은 실제로 한 운동 쪽에 쌓임', () => {
    const done = W.finalizeSession(W.updateSet(s1, 0, 0, { done: true }), undefined, 9000);
    expect(exerciseHistory([done], d.id)).toHaveLength(1);
    expect(exerciseHistory([done], a.id)).toHaveLength(0);
    expect(normalizeSession(JSON.parse(JSON.stringify(done)))!.items[0]!.sub).toEqual({ exerciseId: a.id, name: a.name });
  });
});

describe('루틴 반영: 운동 추가·삭제만', () => {
  const base = [item(a, [[60, 10, true]]), item(b, [[20, 12, true]]), item(c, [[30, 8, true]])];
  it('그대로면 변경 없음 (순서·세트 수가 달라도)', () => {
    const s = active([base[2]!, base[0]!, base[1]!]);
    expect(W.routineDiff(routine, s)).toEqual({ added: [], removed: [] });
  });
  it('대체 운동과 미실시는 변경이 아님', () => {
    const subbed = { ...item(d, [[10, 10, true]]), sub: { exerciseId: b.id, name: b.name } };
    const skipped = { ...base[2]!, sets: [], skipped: true, planned: 4 };
    expect(W.routineDiff(routine, active([base[0]!, subbed, skipped]))).toEqual({ added: [], removed: [] });
  });
  it('뺀 운동·추가한 운동(교체 = 삭제 + 추가)을 찾고, 추가한 운동은 앞 운동 다음 자리에 넣음', () => {
    const s = active([base[0]!, item(d, [[10, 10, true], [10, 10, true]]), base[2]!]); // b 대신 d (교체)
    const diff = W.routineDiff(routine, s);
    expect(diff.added.map((x) => x.exerciseId)).toEqual([d.id]);
    expect(diff.removed.map((x) => x.exerciseId)).toEqual([b.id]);
    const r = W.applyRoutineDiff(routine, s, diff);
    expect(r.items).toEqual([{ exerciseId: a.id, setCount: 3 }, { exerciseId: d.id, setCount: 2 }, { exerciseId: c.id, setCount: 4 }]);
  });
  it('맨 앞에 추가한 운동은 루틴 맨 앞으로', () => {
    const s = active([item(d, [[10, 10, true]]), ...base]);
    expect(W.applyRoutineDiff(routine, s, W.routineDiff(routine, s)).items[0]!.exerciseId).toBe(d.id);
  });
});

describe('실패 세트 목표 횟수', () => {
  const s0 = active([item(a, [[60, 10, false], [60, 8, false]])]);
  it('실패로 바꾸는 순간의 횟수를 목표로 저장, 다른 유형으로 바꾸면 지움', () => {
    const f = W.setSetType(s0, 0, 1, 'F');
    expect(f.items[0]!.sets[1]).toEqual({ w: 60, r: 8, t: 'F', done: false, goal: 8 });
    const back = W.setSetType(W.updateSet(f, 0, 1, { r: 5 }), 0, 1, 'N');
    expect(back.items[0]!.sets[1]).toEqual({ w: 60, r: 5, t: 'N', done: false });
  });
  it('다음에 불러올 때 목표도 이어 감', () => {
    expect(prefillSets({ sets: [{ w: 60, r: 7, t: 'F', done: true, goal: 10 }, { w: 60, r: 6, t: 'F', done: true }] }))
      .toEqual([{ w: 60, r: 7, t: 'F', done: false, goal: 10 }, { w: 60, r: 6, t: 'F', done: false, goal: 6 }]);
  });
});
