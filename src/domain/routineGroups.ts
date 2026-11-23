// 루틴 그룹: 홈 목록 만들기 + 끌어서 놓았을 때 그룹·순서 정하기 (순수 함수)
import type { Routine, RoutineGroup } from './types';
import { moveItem } from './workout';

/** 홈 목록 한 줄. 'group' = 그룹 머리, 'ungrouped' = '그룹 없음' 제목, 'routine' = 루틴 카드 */
export type RoutineRow =
  | { kind: 'group'; group: RoutineGroup; count: number; collapsed: boolean }
  | { kind: 'ungrouped' }
  | { kind: 'routine'; routine: Routine; hidden: boolean };

/** 같은 묶음 안 정렬: 순서(order)가 없는 것(새로 만든 것)이 위, 그다음 order 오름차순. order 없는 것끼리는 최근에 한 순 */
export function sortInSection(list: readonly Routine[], lastRun: ReadonlyMap<string, number>): Routine[] {
  const recent = (r: Routine) => lastRun.get(r.id) ?? r.createdAt;
  return [...list].sort((a, b) => {
    const ao = a.order, bo = b.order;
    if (ao == null && bo == null) return recent(b) - recent(a);
    if (ao == null) return -1;
    if (bo == null) return 1;
    return ao - bo;
  });
}

/**
 * 홈에 그릴 줄 목록. 그룹이 없으면 루틴만.
 * 접은 그룹의 루틴도 목록에 넣되 hidden=true (끌어 놓기 계산에 필요)
 * 루틴이 하나도 없는 그룹은 빼요. 없는 그룹을 가리키는 루틴은 '그룹 없음'으로.
 */
export function routineRows(routines: readonly Routine[], groups: readonly RoutineGroup[], collapsed: readonly string[], lastRun: ReadonlyMap<string, number>): RoutineRow[] {
  const ids = new Set(groups.map((g) => g.id));
  const byGroup = new Map<string, Routine[]>();
  const loose: Routine[] = [];
  for (const r of routines) {
    if (r.groupId && ids.has(r.groupId)) { const l = byGroup.get(r.groupId); if (l) l.push(r); else byGroup.set(r.groupId, [r]); }
    else loose.push(r);
  }
  const rows: RoutineRow[] = [];
  const shown = groups.filter((g) => byGroup.has(g.id));
  for (const g of shown) {
    const list = sortInSection(byGroup.get(g.id)!, lastRun);
    const isCollapsed = collapsed.includes(g.id);
    rows.push({ kind: 'group', group: g, count: list.length, collapsed: isCollapsed });
    for (const r of list) rows.push({ kind: 'routine', routine: r, hidden: isCollapsed });
  }
  if (shown.length) rows.push({ kind: 'ungrouped' });
  for (const r of sortInSection(loose, lastRun)) rows.push({ kind: 'routine', routine: r, hidden: false });
  return rows;
}

/**
 * from번째 줄(루틴)을 to번째 줄 자리로 옮긴 뒤, 위에서부터 훑으며 각 루틴의 그룹과 순서를 다시 매김.
 * 바뀐 루틴만 돌려줘요.
 */
export function applyRoutineDrop(rows: readonly RoutineRow[], from: number, to: number): Routine[] {
  if (rows[from]?.kind !== 'routine') return [];
  const next = moveItem(rows, from, to);
  const changed: Routine[] = [];
  let group: string | null = null;
  let order = 0;
  for (const row of next) {
    if (row.kind === 'group') { group = row.group.id; continue; }
    if (row.kind === 'ungrouped') { group = null; continue; }
    const r = row.routine;
    const g = group;
    const o = order++;
    if ((r.groupId ?? null) !== g || r.order !== o) changed.push({ ...r, groupId: g, order: o });
  }
  return changed;
}
