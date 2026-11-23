import { describe, expect, it } from 'vitest';
import { applyRoutineDrop, routineRows } from '@/domain/routineGroups';
import type { Routine, RoutineGroup } from '@/domain/types';

const r = (id: string, extra: Partial<Routine> = {}): Routine => ({ id, name: id, emoji: '💪', imageId: null, createdAt: 0, items: [], ...extra });
const groups: RoutineGroup[] = [{ id: 'up', name: '상체' }, { id: 'low', name: '하체' }, { id: 'empty', name: '빈 그룹' }];
const lastRun = new Map<string, number>();
const names = (rows: ReturnType<typeof routineRows>) => rows.map((x) => (x.kind === 'group' ? `[${x.group.name}${x.collapsed ? ' 접힘' : ''}]` : x.kind === 'ungrouped' ? '[없음]' : x.routine.id + (x.hidden ? '*' : '')));

describe('routineRows', () => {
  it('그룹이 없으면 루틴만, 최근에 한 순', () => {
    const rows = routineRows([r('a', { createdAt: 1 }), r('b', { createdAt: 2 })], [], [], lastRun);
    expect(names(rows)).toEqual(['b', 'a']);
  });
  it('그룹 순서대로, 빈 그룹은 숨김, 그룹 밖은 맨 아래', () => {
    const rows = routineRows([r('x'), r('a', { groupId: 'low' }), r('b', { groupId: 'up', order: 2 }), r('c', { groupId: 'up', order: 1 }), r('z', { groupId: 'gone' })], groups, ['low'], lastRun);
    expect(names(rows)).toEqual(['[상체]', 'c', 'b', '[하체 접힘]', 'a*', '[없음]', 'x', 'z']);
  });
  it('순서(order)가 없는 새 루틴은 그 묶음 맨 위', () => {
    const rows = routineRows([r('old', { order: 0 }), r('new')], [], [], lastRun);
    expect(names(rows)).toEqual(['new', 'old']);
  });
});

describe('applyRoutineDrop', () => {
  const base = [r('c', { groupId: 'up', order: 0 }), r('b', { groupId: 'up', order: 1 }), r('a', { groupId: 'low', order: 2 }), r('x', { order: 3 })];
  const rows = routineRows(base, groups, [], lastRun); // [상체] c b [하체] a [없음] x
  it('같은 그룹 안에서 순서만 바뀜', () => {
    const ch = applyRoutineDrop(rows, 1, 2); // c를 b 자리로
    expect(ch.map((x) => [x.id, x.groupId, x.order])).toEqual([['b', 'up', 0], ['c', 'up', 1]]);
  });
  it('다른 그룹 머리 아래로 놓으면 그 그룹으로', () => {
    const ch = applyRoutineDrop(rows, 1, 3); // c를 [하체] 자리(아래로) → 하체 첫째
    expect(ch.find((x) => x.id === 'c')).toMatchObject({ groupId: 'low' });
  });
  it('"그룹 없음" 아래로 놓으면 그룹에서 빠짐', () => {
    const ch = applyRoutineDrop(rows, 4, 6); // a를 x 자리로
    expect(ch.find((x) => x.id === 'a')).toMatchObject({ groupId: null });
  });
  it('그룹 머리 위로 끌어 올리면 바로 앞 그룹의 끝으로', () => {
    const rs = routineRows(base, groups, ['low'], lastRun); // [상체] c b [하체접힘] a* [없음] x
    const ch = applyRoutineDrop(rs, 7 - 1, 3); // x(6)를 [하체](3) 자리로 위로 → [하체] 앞 = 상체 끝
    expect(ch.find((x) => x.id === 'x')).toMatchObject({ groupId: 'up' });
  });
  it('머리 줄은 옮기지 않음', () => {
    expect(applyRoutineDrop(rows, 0, 2)).toEqual([]);
  });
});
