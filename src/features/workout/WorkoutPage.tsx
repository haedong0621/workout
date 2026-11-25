// 운동 진행 화면
import { useEffect, useRef, useState } from 'preact/hooks';
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
import { useSwipePager } from './useSwipePager';
import { createPortal } from 'preact/compat';
import { useSortable } from '@/ui/sortable';
import { moveItem } from '@/domain/workout';

/** 운동 페이지 넘기기: 운동 하나 = 한 화면, 좌우로 밀기. 마지막 세트 체크 → 1초 뒤 다음 운동 */
const AUTO_NEXT_MS = 1000;
const lastPage = new Map<string, number>(); // 세션별 보던 페이지 (화면을 나갔다 와도 유지)

export function WorkoutPage() {
  const s = activeSession.value;
  const [page, setPage] = useState(() => (s ? lastPage.get(s.id) ?? firstUndone(s) : 0));
  const doneRef = useRef<boolean[]>([]);
  const pages = (s?.items.length ?? 0) + 1; // + 운동 추가 화면

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(pages - 1, i));
    setPage(n);
    if (s) lastPage.set(s.id, n);
    // 화면 스크롤 영역(#view)을 맨 위로 — 다음 운동은 처음부터 보이게
    const view = pager.viewRef.current?.closest('#view');
    if (view && view.scrollTop > 0) view.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const pager = useSwipePager(pages, Math.min(page, pages - 1), goTo);
  // 마지막 세트를 체크해 운동이 끝나면 1초 뒤 다음 운동으로
  useEffect(() => {
    if (!s) return;
    const now = s.items.map((it) => it.sets.length > 0 && it.sets.every((x) => x.done));
    const before = doneRef.current;
    doneRef.current = now;
    if (before.length !== now.length) return;
    const justDone = now.findIndex((d, i) => d && !before[i]);
    if (justDone < 0 || justDone !== page || justDone >= s.items.length - 1) return;
    const t = setTimeout(() => goTo(justDone + 1), AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [s]);

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
      <div class="wk-head">
        <div class="topbar workout-top">
          <button class="icon-btn" type="button" onClick={() => go(paths.home)} aria-label="홈으로(운동은 계속돼요)"><Icon name="back" /></button>
          <button class="wk-title" type="button" onClick={() => renameSession(s)}>
            <div class="wk-name">{s.name}</div>
            <Elapsed since={s.startedAt} class="clock mono" />
          </button>
          <button class="icon-btn" type="button" onClick={() => moreMenu(s)} aria-label="더보기"><Icon name="more" /></button>
        </div>
        <div class="ex-dots" aria-label={`${Math.min(page + 1, pages)} / ${pages}`}>
          {Array.from({ length: pages }, (_, i) => <button key={i} type="button" class={'dot' + (i === Math.min(page, pages - 1) ? ' on' : '') + (i === pages - 1 ? ' plus' : '')} aria-label={i === pages - 1 ? '운동 추가 화면' : `${i + 1}번째 운동`} onClick={() => goTo(i)} />)}
        </div>
      </div>

      <div class="ex-pager" ref={pager.viewRef}>
        <div class="ex-track" ref={pager.trackRef}>
          {s.items.map((it, idx) => <div class="ex-page" key={it.exerciseId + ':' + idx}><ExerciseCard session={s} item={it} idx={idx} /></div>)}
          <div class="ex-page add-page">
            <div class="ex-card add-card">
              {!s.items.length && <EmptyState small title="운동이 없어요" sub="아래 버튼으로 운동을 추가하세요" />}
              <button class="btn soft wide" type="button" onClick={() => addExercises(s)}><Icon name="plus" size={18} /> 운동 추가</button>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 바·휴식 바는 스크롤 영역(#view) 밖, #app 바로 아래에 붙여 화면에 완전히 고정 (시트보다는 아래) */}
      {createPortal(<>
        <RestBar />
        <div class="bottombar">
          <div class="bb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
          <div class="bb-stats">
            <div class="bb-main">{fmtNum(volume, 0)} kg</div>
            <div class="sub">{done}/{total} 세트 완료</div>
          </div>
          <button class="btn primary" type="button" onClick={() => finishFlow(s)}><Icon name="flag" size={18} /> 운동 완료</button>
        </div>
      </>, document.getElementById('app') ?? document.body)}
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
      s.items.length > 1 && { label: '운동 순서 바꾸기', value: 'order', icon: 'swap' },
      { label: '운동 취소 (기록 삭제)', value: 'discard', icon: 'trash', danger: true },
    ],
  });
  if (c === 'rename') await renameSession(s);
  if (c === 'order') await openSheet({ title: '운동 순서 바꾸기', render: () => <ReorderList sid={s.id} /> });
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

function firstUndone(s: Session): number {
  const i = s.items.findIndex((it) => !(it.sets.length > 0 && it.sets.every((x) => x.done)));
  return i < 0 ? 0 : i;
}

/** 꾹 눌러 끌어서 운동 순서 바꾸기 (시트 안) */
function ReorderList({ sid }: { sid: string }) {
  const s = activeSession.value;
  const sort = useSortable({ onMove: (from, to) => workoutActions.updateSession(sid, (x) => ({ ...x, items: moveItem(x.items, from, to) })) });
  if (!s) return null;
  return (
    <div>
      <div class="sub help">꾹 눌러서 끌어 옮겨요</div>
      <div class="reorder-list" ref={sort.containerRef}>
        {s.items.map((it, i) => (
          <div key={it.exerciseId + ':' + i} class="reorder-item" {...sort.bind(i)}>
            <span class="grow">{it.name}</span><Icon name="more" size={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
