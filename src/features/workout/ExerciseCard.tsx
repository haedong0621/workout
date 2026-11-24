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
      <div class="ex-head">
        <ExThumb ex={thumbSrc} size={48} opt={it.opt ?? null} />
        <div class="grow">
          <div class="ex-name">{ex ? optionTitle(ex.name, ex.toggle, it.opt) : it.name}</div>
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

function SetRow({ s, it, set, idx, si }: { s: Session; it: SessionItem; set: WorkoutSet; idx: number; si: number }) {
  const label = set.t === 'N' ? String(si + 1) : set.t;
  const open = () => void openSetEditor(s.id, idx, si);
  return (
    <div class={'set-row' + (set.done ? ' done' : '')}>
      <button class={'set-label t-' + set.t} type="button" aria-label={`${si + 1}번째 세트 유형 변경`} onClick={async () => {
        const c = await choiceSheet({
          title: `${si + 1}세트 유형`,
          options: SET_TYPE_KEYS.map((k) => ({ label: k === 'N' ? '일반 세트' : `${k} · ${SET_TYPES[k]} 세트`, value: k })),
        });
        if (c) workoutActions.updateSet(s.id, idx, si, { t: c });
      }}>{label}</button>
      <button class="cell" type="button" onClick={open}>
        <span class="num">{fmtNum(set.w)}</span>
        {it.kind !== 'normal' && <span class="eff">→ {fmtNum(effWeight(it.kind, set.w, s.bw))}kg</span>}
      </button>
      <button class="cell" type="button" onClick={open}><span class="num">{set.r}</span><span class="unit">회</span></button>
      <button class={'check' + (set.done ? ' on' : '')} type="button" aria-label={set.done ? '완료 취소' : '세트 완료'} aria-pressed={set.done} onClick={() => toggleDone(s, idx, si)}>
        <Icon name="check" size={22} />
      </button>
    </div>
  );
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
      { label: '운동 교체', value: 'swap', icon: 'swap' },
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

