// 운동 진행 화면
import { useState } from 'preact/hooks';
import { setProgress, sessionStats } from '@/domain/volume';
import type { Session } from '@/domain/types';
import { fmtDur, fmtNum } from '@/lib/format';
import { activeSession, exerciseMap, includeWarmup, workoutActions } from '@/store';
import { go, paths } from '@/app/router';
import { EmptyState } from '@/ui/controls';
import { Elapsed } from '@/ui/Clock';
import { choiceSheet, confirmSheet, promptSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { openSheet, type CloseFn } from '@/ui/sheet';
import { toast } from '@/ui/toast';
import { pickExercises } from '../exercises/ExercisePicker';
import { ExerciseCard } from './ExerciseCard';
import { ensureBodyweight } from './flows';
import { RestBar } from './RestBar';
import { useSortable } from '@/ui/sortable';
import { moveItem } from '@/domain/workout';

export function WorkoutPage() {
  const s = activeSession.value;
  const sort = useSortable({ onMove: (from, to) => { if (s) workoutActions.updateSession(s.id, (x) => ({ ...x, items: moveItem(x.items, from, to) })); } });
  if (!s) {
    return (
      <div class="page">
        <EmptyState title="진행 중인 운동이 없어요" sub="홈에서 루틴을 골라 운동을 시작해 보세요" action="홈으로" onAction={() => go(paths.home, { replace: true })} />
      </div>
    );
  }
  const { done, total } = setProgress(s);
  const volume = sessionStats(s, includeWarmup.value).volume;

  async function addExercises(cur: Session) {
    const ids = await pickExercises({ multi: true, exclude: cur.items.map((i) => i.exerciseId), title: '운동 추가' });
    if (!ids) return;
    const list = ids.map((id) => exerciseMap.value.get(id)).filter((e) => !!e);
    workoutActions.addExercisesToSession(cur.id, list);
    await ensureBodyweight(cur.id);
  }

  return (
    <div class="page workout">
      <div class="topbar workout-top">
        <button class="icon-btn" type="button" onClick={() => go(paths.home)} aria-label="홈으로(운동은 계속돼요)"><Icon name="back" /></button>
        <button class="wk-title" type="button" onClick={() => renameSession(s)}>
          <div class="wk-name">{s.name}</div>
          <Elapsed since={s.startedAt} class="clock mono" />
        </button>
        <button class="icon-btn" type="button" onClick={() => moreMenu(s)} aria-label="더보기"><Icon name="more" /></button>
      </div>

      {s.items.length
        ? <div class="ex-list" ref={sort.containerRef}>{s.items.map((it, idx) => <ExerciseCard key={it.exerciseId + ':' + idx} session={s} item={it} idx={idx} sort={sort.bind(idx)} />)}</div>
        : <EmptyState title="운동이 없어요" sub="아래 버튼으로 운동을 추가하세요" />}

      <button class="btn soft wide" type="button" onClick={() => addExercises(s)}><Icon name="plus" size={18} /> 운동 추가</button>

      <RestBar />
      <div class="bottombar">
        <div class="bb-stats">
          <div class="bb-main">{fmtNum(volume, 0)} kg</div>
          <div class="sub">{done}/{total} 세트 완료</div>
        </div>
        <button class="btn primary" type="button" onClick={() => finishFlow(s)}><Icon name="flag" size={18} /> 운동 완료</button>
      </div>
    </div>
  );
}

async function renameSession(s: Session) {
  const v = await promptSheet({ title: '운동 이름', value: s.name, ok: '저장' });
  if (v != null && v.trim()) workoutActions.setSessionField(s.id, { name: v.trim() });
}

async function moreMenu(s: Session) {
  const c = await choiceSheet({
    options: [
      { label: '운동 이름 변경', value: 'rename', icon: 'edit' },
      { label: '운동 취소 (기록 삭제)', value: 'discard', icon: 'trash', danger: true },
    ],
  });
  if (c === 'rename') await renameSession(s);
  if (c === 'discard') {
    const ok = await confirmSheet({ title: '운동을 취소할까요?', message: '이번 운동 기록이 모두 삭제돼요.', ok: '기록 삭제', danger: true });
    if (ok) { workoutActions.discardWorkout(); go(paths.home, { replace: true }); }
  }
}

function FinishBody({ s, close }: { s: Session; close: CloseFn<string> }) {
  const [name, setName] = useState(s.name);
  const { done, total } = setProgress(s);
  const st = sessionStats(s, includeWarmup.value);
  const undone = total - done;
  return (
    <div>
      <div class="field-label">운동 이름</div>
      <input class="input" type="text" value={name} enterKeyHint="done" onInput={(e) => setName(e.currentTarget.value)} />
      <div class="sum-grid">
        <div><div class="sum-num">{fmtDur(st.durationSec)}</div><div class="sub">운동 시간</div></div>
        <div><div class="sum-num">{done}</div><div class="sub">완료 세트</div></div>
        <div><div class="sum-num">{fmtNum(st.volume, 0)}</div><div class="sub">총 볼륨 (kg)</div></div>
      </div>
      {undone > 0 && <div class="banner warn static">체크하지 않은 {undone}세트는 기록에서 빠져요</div>}
      <div class="btn-row">
        <button class="btn ghost" type="button" onClick={() => close(undefined)}>계속하기</button>
        <button class="btn primary" type="button" onClick={() => close(name)}>저장하고 종료</button>
      </div>
    </div>
  );
}

async function finishFlow(s: Session) {
  if (setProgress(s).done === 0) {
    const ok = await confirmSheet({ title: '완료한 세트가 없어요', message: '운동을 취소(기록 삭제)할까요? 세트 오른쪽 체크 버튼을 눌러야 기록돼요.', ok: '운동 취소', cancel: '계속하기', danger: true });
    if (ok) { workoutActions.discardWorkout(); go(paths.home, { replace: true }); }
    return;
  }
  const name = await openSheet<string>({ title: '운동을 마칠까요?', render: (close) => <FinishBody s={activeSession.value ?? s} close={close} /> });
  if (name === undefined) return;
  const done = workoutActions.finishWorkout(s.id, name);
  toast('캘린더에 기록했어요');
  if (done) go(paths.session(done.id), { replace: true });
}
