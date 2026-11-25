// 홈의 루틴 목록: 그룹별 접기/펴기, 카드 ⋯ 메뉴, 꾹 눌러 끌어서 순서·그룹 바꾸기
import { useState } from 'preact/hooks';
import { applyRoutineDrop, routineRows } from '@/domain/routineGroups';
import type { Routine } from '@/domain/types';
import { fmtMD } from '@/lib/format';
import { groupActions, routineActions, routineLastRun, routines, settings } from '@/store';
import { go, paths } from '@/app/router';
import { confirmSheet, promptSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { openMenu } from '@/ui/popover';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { useSortable, type SortableBind } from '@/ui/sortable';
import { RoutineThumb } from '@/ui/thumbs';
import { toast } from '@/ui/toast';

export function RoutineList({ onOpen }: { onOpen: (r: Routine) => void }) {
  const S = settings.value;
  const lastRun = routineLastRun.value;
  const rows = routineRows(routines.value, S.routineGroups, S.collapsedGroups, lastRun);
  const sort = useSortable({ onMove: (from, to) => groupActions.applyRoutineChanges(applyRoutineDrop(rows, from, to)) });

  return (
    <div class="routine-list" ref={sort.containerRef}>
      {rows.map((row, i) => {
        if (row.kind === 'group') {
          return (
            <button key={'g:' + row.group.id} type="button" class={'group-head' + (row.collapsed ? ' collapsed' : '')} aria-expanded={!row.collapsed}
              {...sort.bindStatic(i)} onClick={() => groupActions.toggleCollapsed(row.group.id)}>
              <span class="group-chev"><Icon name="chevron" size={18} /></span>
              <span class="group-name">{row.group.name}</span>
              <span class="sub">루틴 {row.count}개</span>
            </button>
          );
        }
        if (row.kind === 'ungrouped') return <div key="ungrouped" class="group-label" {...sort.bindStatic(i)}>그룹 없음</div>;
        if (row.hidden) return null;
        const r = row.routine;
        return <RoutineCard key={r.id} r={r} last={lastRun.get(r.id)} sort={sort.bind(i)} onOpen={() => onOpen(r)} />;
      })}
    </div>
  );
}

function RoutineCard({ r, last, sort, onOpen }: { r: Routine; last: number | undefined; sort: SortableBind; onOpen: () => void }) {
  return (
    <div class="routine-card" role="button" tabIndex={0} {...sort} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <RoutineThumb r={r} size={64} />
      <div class="grow">
        <div class="routine-name">{r.name}</div>
        <div class="sub">운동 {r.items.length}개{last ? ` · 마지막 ${fmtMD(last)}` : ''}</div>
      </div>
      <button class="icon-btn more" type="button" aria-label={`${r.name} 메뉴`} onClick={(e) => { e.stopPropagation(); void routineMenu(r, e.currentTarget); }}>
        <Icon name="more" />
      </button>
    </div>
  );
}

async function routineMenu(r: Routine, anchor: HTMLElement) {
  const c = await openMenu(anchor, [
    { value: 'edit', label: '수정', icon: 'edit' },
    { value: 'group', label: '그룹으로 관리', icon: 'folder' },
    { value: 'delete', label: '삭제', icon: 'trash', danger: true },
  ]);
  if (c === 'edit') go(paths.routine(r.id));
  if (c === 'group') await groupSheet(r);
  if (c === 'delete') {
    const ok = await confirmSheet({ title: `"${r.name}" 루틴을 삭제할까요?`, message: '지난 운동 기록은 그대로 남아요.', ok: '삭제', danger: true });
    if (ok) { routineActions.deleteRoutine(r.id); toast('루틴을 삭제했어요'); }
  }
}

function GroupBody({ r, close }: { r: Routine; close: CloseFn<void> }) {
  const [sel, setSel] = useState<string | null>(r.groupId ?? null);
  const [name, setName] = useState('');
  const groups = settings.value.routineGroups;
  const count = (id: string) => routines.value.filter((x) => x.groupId === id).length;
  const options: { id: string | null; name: string; sub: string }[] = [
    { id: null, name: '그룹 없음', sub: '그룹 밖에 따로 보여요' },
    ...groups.map((g) => ({ id: g.id, name: g.name, sub: `루틴 ${count(g.id)}개` })),
  ];
  const addGroup = () => {
    if (!name.trim()) return;
    const g = groupActions.createGroup(name);
    setSel(g.id); setName('');
  };
  return (
    <div class="group-sheet">
      <div class="field-label">"{r.name}"을(를) 넣을 그룹</div>
      <div class="pick-list">
        {options.map((o) => {
          const on = sel === o.id;
          return (
            <button key={o.id ?? 'none'} type="button" class={'pick-item' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setSel(o.id)}>
              <div class="pick-text"><div class="pick-name">{o.name}</div><div class="sub">{o.sub}</div></div>
              <div class={'pick-check' + (on ? ' on' : '')}>{on && <Icon name="check" size={16} />}</div>
            </button>
          );
        })}
      </div>
      <div class="new-group">
        <input class="input" type="text" placeholder="새 그룹 이름" value={name} enterKeyHint="done"
          onInput={(e) => setName(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') addGroup(); }} />
        <button class="btn soft small" type="button" disabled={!name.trim()} onClick={addGroup}><Icon name="plus" size={16} /> 추가</button>
      </div>
      <button class="btn primary wide mt" type="button" onClick={() => { groupActions.setRoutineGroup(r.id, sel); close(); }}>저장</button>
    </div>
  );
}

function groupSheet(r: Routine) {
  return openSheet<void>({ title: '그룹으로 관리', render: (close) => <GroupBody r={r} close={close} /> });
}
