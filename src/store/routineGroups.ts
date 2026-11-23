// 루틴 그룹 관련 상태 변경
import type { Routine, RoutineGroup } from '@/domain/types';
import { uuid } from '@/lib/id';
import { patch, putMany, setSetting, settings } from './core';

/** 새 그룹을 만들어 목록 끝에 추가 (같은 이름이 있으면 그걸 돌려줌) */
export function createGroup(name: string): RoutineGroup {
  const n = name.trim() || '새 그룹';
  const found = settings.value.routineGroups.find((g) => g.name === n);
  if (found) return found;
  const g: RoutineGroup = { id: uuid(), name: n };
  void setSetting('routineGroups', [...settings.value.routineGroups, g]);
  return g;
}

/** 루틴을 그룹에 넣기(null이면 그룹 밖). 옮긴 그룹의 맨 위에 보이도록 순서는 비움 */
export function setRoutineGroup(routineId: string, groupId: string | null): void {
  patch('routines', routineId, (r) => ((r.groupId ?? null) === groupId ? r : { ...r, groupId, order: undefined }));
}

export function toggleCollapsed(groupId: string): void {
  const cur = settings.value.collapsedGroups;
  void setSetting('collapsedGroups', cur.includes(groupId) ? cur.filter((x) => x !== groupId) : [...cur, groupId]);
}

/** 끌어서 놓은 결과(바뀐 루틴들) 저장 */
export function applyRoutineChanges(changed: readonly Routine[]): void {
  if (changed.length) putMany('routines', changed);
}
