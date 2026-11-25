// 운동 진행 화면의 종목 카드 하나
import { SET_TYPE_KEYS, SET_TYPES } from '@/domain/constants';
import { TOGGLE_OPTIONS, optionTitle } from '@/domain/catalog';
import { exerciseHistory, pinnedFirst, prefillSets, previousEntry } from '@/domain/history';
import type { Session, SessionItem, WorkoutSet } from '@/domain/types';
import { effWeight, itemStats, plannedVolume } from '@/domain/volume';
import * as W from '@/domain/workout';
import { fmtMD, fmtNum } from '@/lib/format';
import { unlockAudio } from '@/services/sound';
import { startRest, stopRest } from '@/services/restTimer';
import { exerciseMap, includeWarmup, restFor, sessions, settings, workoutActions } from '@/store';
import { go, paths } from '@/app/router';
import { DiffBadge, EmptyState, Segmented } from '@/ui/controls';
import { choiceSheet, confirmSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/sheet';
import { SetChips } from '@/ui/SetChips';
import { ExThumb } from '@/ui/thumbs';
import type { SortableBind } from '@/ui/sortable';
import { toast } from '@/ui/toast';
import { pickExercises } from '../exercises/ExercisePicker';
import { editMemoFlow, restSheet } from '../exercises/flows';
import { ensureBodyweight } from './flows';
import { openSetEditor } from './SetEditor';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';

const update = (s: Session, fn: (s: Session) => Session) => workoutActions.updateSession(s.id, fn);

export function ExerciseCard({ session: s, item: it, idx, sort }: { session: Session; item: SessionItem; idx: number; sort?: SortableBind }) {
  const ex = exerciseMap.value.get(it.exerciseId);
  const inc = includeWarmup.value;
  const st = itemStats(it, s.bw, inc);
  const prev = previousEntry(sessions.value, s, it.exerciseId, inc, { toggle: ex?.toggle, value: it.opt });
  const opts = ex?.toggle ? TOGGLE_OPTIONS[ex.toggle] : null;
  const allDone = it.sets.length > 0 && it.sets.every((x) => x.done);
  const thumbSrc = ex ?? { id: it.exerciseId, imageId: null, part: it.part, equip: it.equip };

  return (
    <section class={'ex-card' + (allDone ? ' complete' : '')} {...sort}>
      <div class="ex-top">
        <div class="ex-head">
          <ExThumb ex={thumbSrc} size={76} opt={it.opt ?? null} />
          <div class="grow">
            <div class="ex-name">{ex ? optionTitle(ex.name, ex.toggle, it.opt) : it.name}{it.sub && <span class="tag sub-tag">대체</span>}</div>
            {it.sub && <div class="sub sub-of">{it.sub.name} 대신 · 오늘만</div>}
            <div class="vol">
              {st.setCount
                ? <><b>{fmtNum(st.volume, 0)} kg</b>{prev && <DiffBadge delta={st.volume - prev.volume} muted={!allDone} />}</>
                : <span class="sub">예정 {fmtNum(plannedVolume(it, s.bw, inc), 0)} kg</span>}
              {prev && <span class="sub"> 지난번 {fmtNum(prev.volume, 0)}</span>}
            </div>
          </div>
          <button class="icon-btn" type="button" onClick={() => exerciseMenu(s, idx)} aria-label="운동 메뉴"><Icon name="more" /></button>
        </div>
        {opts && (
          <div class="ex-toggle">
            <Segmented options={opts.map((o) => [o, o] as [string, string])} value={it.opt ?? opts[0]} onChange={(o) => workoutActions.setItemOption(s.id, idx, o)} />
          </div>
        )}
        {ex && (
          <button class={'memo-line' + (ex.memo ? '' : ' blank')} type="button" onClick={() => editMemoFlow(ex.id)}>
            <Icon name="note" size={14} />
            {ex.memo
              ? <span class="memo-text">{ex.memo}<span class="sub">{ex.memoAt ? `  · ${fmtMD(ex.memoAt)}` : ''}</span></span>
              : <span>메모 추가</span>}
          </button>
        )}
        <div class="set-head">
          <span>세트</span><span>{it.kind === 'assist' ? '어시스트(kg)' : it.kind === 'bodyweight' ? '추가(kg)' : 'kg'}</span><span>횟수</span><span />
        </div>
      </div>
      <div class="sets">
        {it.sets.map((set, si) => <SetRow key={si} s={s} it={it} set={set} idx={idx} si={si} />)}
      </div>
      <div class="ex-foot">
        <button class="btn ghost small" type="button" onClick={() => update(s, (x) => W.addSet(x, idx))}><Icon name="plus" size={16} /> 세트 추가</button>
        <button class="btn ghost small" type="button" disabled={!ex} onClick={() => ex && restSheet(ex.id)}><Icon name="timer" size={16} /> {restFor(ex)}초</button>
      </div>
    </section>
  );
}

/** 열린(왼쪽으로 밀어 삭제 버튼이 보이는) 세트 줄. 한 번에 하나만 */
const openRow = signal<string | null>(null);
const DEL_W = 76; // 삭제 버튼 폭 (.set-del 과 같게)

function SetRow({ s, it, set, idx, si }: { s: Session; it: SessionItem; set: WorkoutSet; idx: number; si: number }) {
  const label = set.t === 'N' ? String(si + 1) : set.t;
  const open = () => void openSetEditor(s.id, idx, si);
  const key = `${s.id}:${idx}:${si}`;
  const isOpen = openRow.value === key;
  const rowRef = useSwipeToDelete(key);
  return (
    <div class="set-wrap">
      <button class="set-del" type="button" tabIndex={isOpen ? 0 : -1} aria-hidden={!isOpen} onClick={() => { openRow.value = null; workoutActions.removeSet(s.id, idx, si); }}>삭제</button>
      <div ref={rowRef} class={'set-row' + (set.done ? ' done' : '')}>
        <button class={'set-label t-' + set.t} type="button" aria-label={`${si + 1}번째 세트 유형 변경`} onClick={async () => {
          const c = await choiceSheet({
            title: `${si + 1}세트 유형`,
            options: SET_TYPE_KEYS.map((k) => ({ label: k === 'N' ? '일반 세트' : `${k} · ${SET_TYPES[k]} 세트`, sub: k === 'F' ? '지금 횟수를 목표로 남겨요. 실제로 한 횟수만 고치세요' : undefined, value: k })),
          });
          if (c) workoutActions.setSetType(s.id, idx, si, c);
        }}>{label}</button>
        <button class="cell" type="button" onClick={open}>
          <span class="num">{fmtNum(set.w)}</span>
          {it.kind !== 'normal' && <span class="eff">→ {fmtNum(effWeight(it.kind, set.w, s.bw))}kg</span>}
        </button>
        <button class="cell" type="button" onClick={open}>
          <span class="num">{set.r}</span><span class="unit">회</span>
          {set.t === 'F' && set.goal != null && <span class="eff goal">목표 {set.goal}</span>}
        </button>
        <button class={'check' + (set.done ? ' on' : '')} type="button" aria-label={set.done ? '완료 취소' : '세트 완료'} aria-pressed={set.done} onClick={() => toggleDone(s, idx, si)}>
          <Icon name="check" size={22} />
        </button>
      </div>
    </div>
  );
}

/** 세트 줄을 왼쪽으로 밀면 삭제 버튼이 나옴(눌러야 지워짐). 오른쪽으로 미는 건 카드 넘기기에 양보 */
function useSwipeToDelete(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = openRow.value === key;
  const move = (x: number, anim: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = anim ? 'transform 0.2s ease' : 'none';
    el.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
  };
  // 다른 줄이 열리거나 지워지면 닫힘
  useEffect(() => { move(isOpen ? -DEL_W : 0, true); }, [isOpen]);
  // 열린 동안 바깥(삭제 버튼 말고)을 누르면 닫힘
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: Event) => { if (!(e.target as Element).closest?.('.set-del')) openRow.value = null; };
    document.addEventListener('touchstart', close, { capture: true, passive: true });
    document.addEventListener('mousedown', close, true);
    return () => { document.removeEventListener('touchstart', close, true); document.removeEventListener('mousedown', close, true); };
  }, [isOpen]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x0 = 0, y0 = 0, dx = 0, base = 0, axis: 'x' | 'y' | 'pass' | null = null, swiped = false, wasOpen = false, blockUntil = 0;
    const start = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!p || e.touches.length !== 1) return;
      x0 = p.clientX; y0 = p.clientY; dx = 0; axis = null; swiped = false;
      wasOpen = openRow.value === key; base = wasOpen ? -DEL_W : 0;
    };
    const onMove = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!p || axis === 'y' || axis === 'pass') return;
      const mx = p.clientX - x0, my = p.clientY - y0;
      if (!axis) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        if (Math.abs(my) >= Math.abs(mx)) { axis = 'y'; return; }
        if (mx > 0 && base === 0) { axis = 'pass'; return; } // 닫힌 줄을 오른쪽으로 → 카드 넘기기
        axis = 'x';
      }
      e.preventDefault();
      e.stopPropagation(); // 카드 넘기기에 안 넘김
      swiped = true;
      dx = Math.max(-DEL_W - 24, Math.min(0, base + mx));
      move(dx, false);
    };
    const end = (e: TouchEvent) => {
      if (swiped || wasOpen) blockUntil = performance.now() + 400;
      if (axis !== 'x') return;
      e.stopPropagation();
      const openNow = dx < -DEL_W / 2;
      if (openNow) openRow.value = key;
      else if (openRow.value === key) openRow.value = null;
      move(openNow ? -DEL_W : 0, true);
    };
    // 민 손가락을 뗄 때나, 열린 줄을 눌러 닫을 때 버튼이 눌리지 않게
    const click = (e: MouseEvent) => { if (performance.now() < blockUntil) { e.preventDefault(); e.stopPropagation(); blockUntil = 0; } };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('click', click, true);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      el.removeEventListener('click', click, true);
    };
  }, [key]);
  return ref;
}

/** 세트 체크 → 휴식 타이머 자동 시작 (모든 세트가 끝났으면 타이머 정리) */
export function toggleDone(s: Session, idx: number, si: number): void {
  const it = s.items[idx];
  const set = it?.sets[si];
  if (!it || !set) return;
  const next = update(s, (x) => W.updateSet(x, idx, si, { done: !set.done }));
  if (!next || set.done) return; // 체크 해제
  unlockAudio();
  if (W.isAllDone(next)) stopRest();
  else if (settings.value.restAuto) startRest(restFor(exerciseMap.value.get(it.exerciseId)), it.name);
}

async function exerciseMenu(s: Session, idx: number): Promise<void> {
  const it = s.items[idx];
  if (!it) return;
  const ex = exerciseMap.value.get(it.exerciseId);
  const c = await choiceSheet({
    title: it.name,
    options: [
      { label: '지난 기록 불러오기', sub: '이전 운동의 세트를 그대로 가져와요', value: 'load', icon: 'clock' },
      ex && { label: '휴식 시간 설정', sub: `${restFor(ex)}초`, value: 'rest', icon: 'timer' },
      ex && { label: '메모 수정', value: 'memo', icon: 'note' },
      { label: '대체 운동', sub: '오늘만 다른 운동으로 (루틴은 그대로, 기록에 "대체" 표시)', value: 'sub', icon: 'swap' },
      it.sub && { label: '원래 운동으로 되돌리기', sub: it.sub.name, value: 'revert', icon: 'back' },
      { label: '운동 교체', sub: '다른 운동으로 아예 바꾸기', value: 'swap', icon: 'swap' },
      ex && { label: '이 운동의 기록·그래프', value: 'detail', icon: 'cal' },
      idx > 0 && { label: '위로 이동', value: 'up', icon: 'up' },
      idx < s.items.length - 1 && { label: '아래로 이동', value: 'down', icon: 'down' },
      { label: '운동 삭제', value: 'del', icon: 'trash', danger: true },
    ],
  });
  switch (c) {
    case 'load': return loadHistorySheet(s, idx);
    case 'rest': if (ex) await restSheet(ex.id); return;
    case 'memo': if (ex) await editMemoFlow(ex.id); return;
    case 'detail': if (ex) go(paths.exercise(ex.id)); return;
    case 'up': case 'down':
      update(s, (x) => ({ ...x, items: W.moveItem(x.items, idx, c === 'up' ? idx - 1 : idx + 1) }));
      return;
    case 'sub': {
      const ids = await pickExercises({ multi: false, exclude: s.items.map((i) => i.exerciseId), title: '대체할 운동' });
      const nx = ids?.[0] ? exerciseMap.value.get(ids[0]) : undefined;
      if (!nx) return;
      workoutActions.substituteExercise(s.id, idx, nx);
      await ensureBodyweight(s.id);
      return;
    }
    case 'revert':
      workoutActions.revertSubstitute(s.id, idx);
      await ensureBodyweight(s.id);
      return;
    case 'swap': {
      const ids = await pickExercises({ multi: false, exclude: s.items.map((i) => i.exerciseId), title: '교체할 운동' });
      const nx = ids?.[0] ? exerciseMap.value.get(ids[0]) : undefined;
      if (!nx) return;
      workoutActions.swapExercise(s.id, idx, nx);
      await ensureBodyweight(s.id);
      return;
    }
    case 'del': {
      const ok = await confirmSheet({ title: `${it.name}을(를) 뺄까요?`, message: '이번 운동에서만 빠져요.', ok: '삭제', danger: true });
      if (ok) update(s, (x) => W.removeItem(x, idx));
      return;
    }
    default:
  }
}

function loadHistorySheet(s: Session, idx: number): Promise<void> {
  const it = s.items[idx];
  if (!it) return Promise.resolve();
  const ex = exerciseMap.value.get(it.exerciseId);
  const hist = pinnedFirst(exerciseHistory(sessions.value, it.exerciseId, { before: s.startedAt, excludeId: s.id, includeWarmup: includeWarmup.value, opt: { toggle: ex?.toggle, value: it.opt } }).reverse(), ex?.pinned ?? []);
  const pinned = new Set(ex?.pinned ?? []);
  return openSheet<void>({
    title: '지난 기록 불러오기',
    render: (close) => hist.length ? (
      <div class="hist-list">
        {hist.slice(0, 30).map((e) => (
          <button key={e.sessionId + e.ts} class="hist-item" type="button" onClick={() => {
            update(s, (x) => W.updateItem(x, idx, (i) => ({ ...i, sets: prefillSets(e) })));
            close(); toast('지난 기록을 불러왔어요');
          }}>
            <div class="hist-date">{pinned.has(e.sessionId) && <Icon name="pin" size={14} />}{fmtMD(e.ts)}</div>
            <SetChips sets={e.sets} />
          </button>
        ))}
      </div>
    ) : <EmptyState small sub="이 운동의 지난 기록이 아직 없어요" />,
  }).then(() => undefined);
}

