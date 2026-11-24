// 지난 운동 상세 (세트 수정, 날짜·시간 수정, 루틴으로 저장, 삭제)
import { previousEntry } from '@/domain/history';
import type { Session } from '@/domain/types';
import { itemStats, sessionStats } from '@/domain/volume';
import { shiftStart } from '@/domain/workout';
import { dateKey, fmtDur, fmtFull, fmtNum, fmtTime, fmtYMD } from '@/lib/format';
import { parseNum } from '@/lib/num';
import { exerciseMap, findById, includeWarmup, routineActions, sessions, workoutActions } from '@/store';
import { back, go, paths, type RouteProps } from '@/app/router';
import { Card, DiffBadge, EmptyState, TopBar } from '@/ui/controls';
import { choiceSheet, confirmSheet, promptSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { SetChips } from '@/ui/SetChips';
import { PartPills } from '@/ui/thumbs';
import { toast } from '@/ui/toast';
import { openSetEditor } from '../workout/SetEditor';

export function SessionDetailPage({ params }: RouteProps) {
  const s = findById('sessions', params.id ?? '');
  if (!s || s.status !== 'done') {
    return <div class="page"><EmptyState title="기록을 찾을 수 없어요" action="기록으로" onAction={() => go(paths.history, { replace: true })} /></div>;
  }
  const inc = includeWarmup.value;
  const st = sessionStats(s, inc);

  return (
    <div class="page">
      <TopBar title={s.name} onBack={() => back(paths.history)}
        right={<button class="icon-btn" type="button" onClick={() => void sessionMenu(s)} aria-label="메뉴"><Icon name="more" /></button>} />
      <div class="sess-hero">
        <div class="eyebrow">{fmtFull(s.startedAt)} · {fmtTime(s.startedAt)}–{s.endedAt ? fmtTime(s.endedAt) : ''}</div>
        <div class="sess-stats">
          <SessStat num={fmtDur(st.durationSec)} label="운동 시간" />
          <SessStat num={String(st.sets)} label="세트" />
          <SessStat num={String(st.exercises)} label="종목" />
          <SessStat num={fmtNum(st.volume, 0)} label="볼륨(kg)" />
        </div>
        <PartPills byPart={st.byPart} suffix="세트" />
      </div>
      {s.bw > 0 && <div class="sub pad">계산에 사용한 체중 {fmtNum(s.bw)}kg</div>}
      {s.items.map((it, idx) => {
        const ist = itemStats(it, s.bw, inc);
        if (!ist.setCount) return null;
        const prev = previousEntry(sessions.value, s, it.exerciseId, inc, { toggle: exerciseMap.value.get(it.exerciseId)?.toggle, value: it.opt });
        return (
          <Card key={idx} class="ex-sum"
            title={<div><div class="card-title">{it.name}</div><div class="sub">{it.part} · {it.equip}</div></div>}
            right={<div class="right"><b>{fmtNum(ist.volume, 0)} kg</b>{prev && <DiffBadge delta={ist.volume - prev.volume} />}</div>}>
            <SetChips big sets={it.sets} onPick={(si) => void openSetEditor(s.id, idx, si)} />
          </Card>
        );
      })}
      <div class="sub pad">세트를 누르면 무게·횟수를 고칠 수 있어요</div>
    </div>
  );
}

function SessStat({ num, label }: { num: string; label: string }) {
  return <div><div class="sum-num">{num}</div><div class="sub">{label}</div></div>;
}

async function sessionMenu(s: Session) {
  const c = await choiceSheet({
    options: [
      { label: '기록 이름 변경', value: 'name', icon: 'edit' },
      { label: '날짜 수정', value: 'date', icon: 'cal' },
      { label: '시작 시간 수정', value: 'time', icon: 'clock' },
      { label: '총 운동 시간 수정', value: 'dur', icon: 'timer' },
      { label: '루틴으로 저장', value: 'routine', icon: 'star' },
      { label: '기록 삭제', value: 'del', icon: 'trash', danger: true },
    ],
  });
  switch (c) {
    case 'name': {
      const v = await promptSheet({ title: '기록 이름', value: s.name, ok: '저장' });
      if (v?.trim()) workoutActions.setSessionField(s.id, { name: v.trim() });
      return;
    }
    case 'date': {
      const v = await promptSheet({ title: '날짜 수정', type: 'date', value: dateKey(s.startedAt), ok: '저장' });
      if (!v) return;
      const [yy, mm, dd] = v.split('-').map(Number) as [number, number, number];
      const d = new Date(s.startedAt); d.setFullYear(yy, mm - 1, dd);
      if (Number.isFinite(d.getTime())) workoutActions.updateSession(s.id, (x) => shiftStart(x, d.getTime()));
      return;
    }
    case 'time': {
      const v = await promptSheet({ title: '시작 시간 수정', type: 'time', value: fmtTime(s.startedAt), ok: '저장' });
      if (!v) return;
      const [hh, mi] = v.split(':').map(Number) as [number, number];
      const d = new Date(s.startedAt); d.setHours(hh, mi, 0, 0);
      if (Number.isFinite(d.getTime())) workoutActions.updateSession(s.id, (x) => shiftStart(x, d.getTime()));
      return;
    }
    case 'dur': {
      const cur = Math.round(sessionStats(s).durationSec / 60);
      const v = await promptSheet({ title: '총 운동 시간', inputMode: 'numeric', unit: '분', value: String(cur), ok: '저장' });
      const min = Math.round(parseNum(v, 0));
      if (v != null && min > 0) workoutActions.setSessionField(s.id, { endedAt: s.startedAt + min * 60000 });
      return;
    }
    case 'routine': {
      const name = await promptSheet({ title: '루틴 이름', value: s.name, ok: '저장' });
      if (name?.trim()) { routineActions.saveSessionAsRoutine(s.id, name.trim()); toast('루틴으로 저장했어요'); }
      return;
    }
    case 'del': {
      const ok = await confirmSheet({ title: '기록을 삭제할까요?', message: `${fmtYMD(s.startedAt)} ${s.name}`, ok: '삭제', danger: true });
      if (ok) { workoutActions.deleteSession(s.id); back(paths.history); }
      return;
    }
    default:
  }
}
