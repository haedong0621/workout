// 운동 진행 화면
import { h, fmtClock, fmtNum, fmtDur, parseNum, fmtMD, fmtTime } from '../util.js';
import { state, save, activeSession } from '../db.js';
import { itemStats, exerciseHistory, effWeight, prefillSets, SET_TYPES } from '../calc.js';
import { go, rerender } from '../router.js';
import {
  icon, exThumb, toast, openSheet, choiceSheet, confirmSheet, promptSheet,
  diffBadge, emptyState, chip,
} from '../ui.js';
import { pickExercises } from '../picker.js';
import {
  exById, buildItem, newSet, openSetEditor, ensureBodyweight, finalizeSession, discardWorkout,
} from '../session.js';
import {
  rest, startRest, addRest, stopRest, restRemaining, unlockAudio, onRestChange,
} from '../timer.js';

const inc = () => state.settings.includeWarmup;

function prevFor(s, it) {
  const hist = exerciseHistory(state.sessions, it.exerciseId, { before: s.startedAt, excludeId: s.id, includeWarmup: inc() });
  return hist[hist.length - 1] || null;
}

function plannedVolume(it, bw) {
  return itemStats({ ...it, sets: it.sets.map((x) => ({ ...x, done: true })) }, bw, inc()).volume;
}

const restSecFor = (it) => exById(it.exerciseId)?.rest || state.settings.restDefault;

export function render(ctx) {
  const s = activeSession();
  if (!s) {
    return h('div', { class: 'page' },
      emptyState('진행 중인 운동이 없어요', '홈에서 루틴을 골라 운동을 시작해 보세요', '홈으로', () => go('#/home', { replace: true })));
  }

  const totalSets = s.items.reduce((a, it) => a + it.sets.length, 0);
  const doneSets = s.items.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0);
  const totalVol = s.items.reduce((a, it) => a + itemStats(it, s.bw, inc()).volume, 0);

  // ---- 상단 ----
  const clock = h('div', { class: 'clock mono' }, fmtClock((Date.now() - s.startedAt) / 1000));
  ctx.tick(() => { clock.textContent = fmtClock((Date.now() - s.startedAt) / 1000); });

  const top = h('div', { class: 'topbar workout-top' },
    h('button', { class: 'icon-btn', type: 'button', onclick: () => go('#/home'), 'aria-label': '홈으로(운동은 계속돼요)' }, icon('back')),
    h('button', { class: 'wk-title', type: 'button', onclick: renameSession }, h('div', { class: 'wk-name' }, s.name), clock),
    h('button', { class: 'icon-btn', type: 'button', onclick: moreMenu, 'aria-label': '더보기' }, icon('more')));

  async function renameSession() {
    const v = await promptSheet({ title: '운동 이름', value: s.name, ok: '저장' });
    if (v != null && v.trim()) { s.name = v.trim(); save('sessions', s); rerender(); }
  }

  async function moreMenu() {
    const c = await choiceSheet({
      options: [
        { label: '운동 이름 변경', value: 'rename', icon: 'edit' },
        { label: '운동 취소 (기록 삭제)', value: 'discard', icon: 'trash', danger: true },
      ],
    });
    if (c === 'rename') renameSession();
    if (c === 'discard') {
      const ok = await confirmSheet({ title: '운동을 취소할까요?', message: '이번 운동 기록이 모두 삭제돼요.', ok: '기록 삭제', danger: true });
      if (ok) { await discardWorkout(); go('#/home', { replace: true }); }
    }
  }

  // ---- 종목 카드 ----
  const cards = s.items.map((it, idx) => exerciseCard(s, it, idx));

  // ---- 휴식 바 ----
  const restFill = h('div', { class: 'rest-fill' });
  const restTime = h('div', { class: 'rest-time mono' });
  const restLabel = h('div', { class: 'rest-label' });
  const restBar = h('div', { class: 'restbar' },
    restFill,
    h('div', { class: 'rest-inner' },
      h('div', { class: 'rest-info' }, restLabel, restTime),
      h('div', { class: 'rest-btns' },
        h('button', { type: 'button', onclick: () => addRest(-15) }, '−15'),
        h('button', { type: 'button', onclick: () => addRest(15) }, '+15'),
        h('button', { type: 'button', class: 'skip', onclick: () => stopRest() }, '닫기'))));
  function updateRest() {
    if (!rest.endAt) { restBar.classList.remove('show', 'done'); return; }
    restBar.classList.add('show');
    const remMs = rest.endAt - Date.now();
    const done = remMs <= 0;
    restBar.classList.toggle('done', done);
    restTime.textContent = done ? '휴식 끝!' : fmtClock(restRemaining());
    restLabel.textContent = done ? '다음 세트 시작' : (rest.label ? `휴식 · ${rest.label}` : '휴식');
    restFill.style.width = done ? '100%' : `${Math.min(100, Math.max(0, (1 - remMs / (rest.total * 1000)) * 100))}%`;
  }
  updateRest();
  ctx.tick(updateRest);
  ctx.onCleanup(onRestChange(updateRest));

  // ---- 하단 바 ----
  const bottom = h('div', { class: 'bottombar' },
    h('div', { class: 'bb-stats' },
      h('div', { class: 'bb-main' }, `${fmtNum(totalVol, 0)} kg`),
      h('div', { class: 'sub' }, `${doneSets}/${totalSets} 세트 완료`)),
    h('button', { class: 'btn primary', type: 'button', onclick: finish }, icon('flag', 18), ' 운동 완료'));

  const addBtn = h('button', {
    class: 'btn soft wide', type: 'button',
    onclick: async () => {
      const ids = await pickExercises({ multi: true, exclude: s.items.map((i) => i.exerciseId), title: '운동 추가' });
      if (!ids || !ids.length) return;
      for (const id of ids) { const ex = exById(id); if (ex) s.items.push(buildItem(ex, 3, s.startedAt)); }
      save('sessions', s);
      rerender();
      await ensureBodyweight(s);
      rerender();
    },
  }, icon('plus', 18), ' 운동 추가');

  async function finish() {
    const undone = totalSets - doneSets;
    if (doneSets === 0) {
      const ok = await confirmSheet({ title: '완료한 세트가 없어요', message: '운동을 취소(기록 삭제)할까요? 세트 오른쪽 체크 버튼을 눌러야 기록돼요.', ok: '운동 취소', cancel: '계속하기', danger: true });
      if (ok) { await discardWorkout(); go('#/home', { replace: true }); }
      return;
    }
    let sheet;
    const nameInput = h('input', { class: 'input', type: 'text', value: s.name, enterKeyHint: 'done' });
    const durSec = (Date.now() - s.startedAt) / 1000;
    const body = h('div', null,
      h('div', { class: 'field-label' }, '운동 이름'), nameInput,
      h('div', { class: 'sum-grid' },
        h('div', null, h('div', { class: 'sum-num' }, fmtDur(durSec)), h('div', { class: 'sub' }, '운동 시간')),
        h('div', null, h('div', { class: 'sum-num' }, `${doneSets}`), h('div', { class: 'sub' }, '완료 세트')),
        h('div', null, h('div', { class: 'sum-num' }, fmtNum(totalVol, 0)), h('div', { class: 'sub' }, '총 볼륨 (kg)'))),
      undone > 0 ? h('div', { class: 'banner warn static' }, `체크하지 않은 ${undone}세트는 기록에서 빠져요`) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => sheet.close() }, '계속하기'),
        h('button', {
          class: 'btn primary', type: 'button',
          onclick: () => {
            const done = finalizeSession(s, nameInput.value);
            sheet.close();
            toast('캘린더에 기록했어요');
            go('#/session/' + done.id, { replace: true });
          },
        }, '저장하고 종료')));
    sheet = openSheet({ title: '운동을 마칠까요?', content: body });
  }

  const page = h('div', { class: 'page workout' },
    top,
    cards.length ? h('div', { class: 'ex-list' }, cards) : emptyState('운동이 없어요', '아래 버튼으로 운동을 추가하세요'),
    addBtn,
    restBar, bottom);
  return page;
}

// ---------------------------------------------------------------------------
function exerciseCard(s, it, idx) {
  const ex = exById(it.exerciseId) || { id: it.exerciseId, name: it.name, part: it.part, equip: it.equip, kind: it.kind, rest: null, memo: '' };
  const st = itemStats(it, s.bw, inc());
  const prev = prevFor(s, it);
  const allDone = it.sets.length > 0 && it.sets.every((x) => x.done);

  const volLine = h('div', { class: 'vol' });
  if (st.setCount) {
    volLine.append(h('b', null, `${fmtNum(st.volume, 0)} kg`));
    if (prev) volLine.append(diffBadge(st.volume - prev.volume, 'kg', !allDone));
  } else {
    volLine.append(h('span', { class: 'sub' }, `예정 ${fmtNum(plannedVolume(it, s.bw), 0)} kg`));
  }
  if (prev) volLine.append(h('span', { class: 'sub' }, ` 지난번 ${fmtNum(prev.volume, 0)}`));

  const memo = h('button', { class: 'memo-line' + (ex.memo ? '' : ' blank'), type: 'button', onclick: () => editMemo(ex) },
    icon('note', 14),
    ex.memo
      ? h('span', { class: 'memo-text' }, ex.memo, h('span', { class: 'sub' }, ex.memoAt ? `  · ${fmtMD(ex.memoAt)}` : ''))
      : h('span', null, '메모 추가'));

  const rows = it.sets.map((set, si) => setRow(s, it, set, si, idx));

  return h('section', { class: 'ex-card' + (allDone ? ' complete' : '') },
    h('div', { class: 'ex-head' },
      exThumb(ex, 48),
      h('div', { class: 'grow' },
        h('div', { class: 'ex-name' }, ex.name),
        volLine),
      h('button', { class: 'icon-btn', type: 'button', onclick: () => exMenu(s, idx), 'aria-label': '운동 메뉴' }, icon('more'))),
    ex.id && state.exercises.some((e) => e.id === ex.id) ? memo : null,
    h('div', { class: 'set-head' }, h('span', null, '세트'), h('span', null, it.kind === 'assist' ? '핀(kg)' : it.kind === 'bodyweight' ? '추가(kg)' : 'kg'), h('span', null, '횟수'), h('span', null, '')),
    h('div', { class: 'sets' }, rows),
    h('div', { class: 'ex-foot' },
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => addSet(s, it) }, icon('plus', 16), ' 세트 추가'),
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => restSheet(ex) }, icon('timer', 16), ` ${ex.rest || state.settings.restDefault}초`)));
}

function setRow(s, it, set, si, idx) {
  const label = set.t === 'N' ? String(si + 1) : set.t;
  const open = () => openSetEditor({ session: s, itemIndex: idx, setIndex: si, onChange: rerender });
  return h('div', { class: 'set-row' + (set.done ? ' done' : '') },
    h('button', {
      class: 'set-label t-' + set.t, type: 'button', 'aria-label': `${si + 1}번째 세트 유형 변경`,
      onclick: async () => {
        const c = await choiceSheet({
          title: `${si + 1}세트 유형`,
          options: Object.entries(SET_TYPES).map(([k, name]) => ({ label: k === 'N' ? '일반 세트' : `${k} · ${name} 세트`, value: k })),
        });
        if (c) { set.t = c; save('sessions', s); rerender(); }
      },
    }, label),
    h('button', { class: 'cell', type: 'button', onclick: open },
      h('span', { class: 'num' }, fmtNum(set.w)),
      it.kind !== 'normal' ? h('span', { class: 'eff' }, `→ ${fmtNum(effWeight(it.kind, set.w, s.bw))}kg`) : null),
    h('button', { class: 'cell', type: 'button', onclick: open }, h('span', { class: 'num' }, String(set.r)), h('span', { class: 'unit' }, '회')),
    h('button', {
      class: 'check' + (set.done ? ' on' : ''), type: 'button', 'aria-label': set.done ? '완료 취소' : '세트 완료',
      onclick: () => toggleDone(s, it, set),
    }, icon('check', 22)));
}

function toggleDone(s, it, set) {
  set.done = !set.done;
  save('sessions', s);
  if (set.done) {
    unlockAudio();
    const allDone = s.items.every((x) => x.sets.every((y) => y.done));
    if (allDone) stopRest();
    else if (state.settings.restAuto) startRest(restSecFor(it), it.name);
  }
  rerender();
}

function addSet(s, it) {
  const last = it.sets[it.sets.length - 1];
  it.sets.push(last ? newSet(last.w, last.r, last.t === 'W' ? 'N' : last.t) : newSet());
  save('sessions', s);
  rerender();
}

async function editMemo(ex) {
  const v = await promptSheet({ title: `${ex.name} 메모`, value: ex.memo || '', multiline: true, ok: '저장', placeholder: '세팅, 자세 팁, 시트 높이 등' });
  if (v == null) return;
  const next = v.trim();
  if (next === (ex.memo || '')) return;
  ex.memo = next;
  ex.memoAt = next ? Date.now() : null; // 수정하면 날짜가 자동으로 오늘로 갱신돼요
  save('exercises', ex);
  rerender();
}

function restSheet(ex) {
  if (!state.exercises.some((e) => e.id === ex.id)) return;
  let sheet;
  const cur = ex.rest || state.settings.restDefault;
  const input = h('input', { class: 'input', type: 'text', inputMode: 'numeric', value: String(cur) });
  const apply = (n) => { ex.rest = n; save('exercises', ex); sheet.close(); rerender(); toast(`${ex.name} 휴식 ${n}초로 저장했어요`); };
  const content = h('div', null,
    h('div', { class: 'sub' }, '이 운동만의 휴식 시간을 저장해요. 세트를 체크하면 이 시간으로 타이머가 시작돼요.'),
    h('div', { class: 'chips wrap mt' }, [30, 45, 60, 90, 120, 150, 180, 240].map((n) => chip(`${n}초`, cur === n, () => apply(n)))),
    h('div', { class: 'field-label' }, '직접 입력 (초)'), input,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { ex.rest = null; save('exercises', ex); sheet.close(); rerender(); } }, `기본값(${state.settings.restDefault}초) 사용`),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { const n = Math.round(parseNum(input.value, 0)); if (n > 0) apply(n); } }, '저장')));
  sheet = openSheet({ title: `${ex.name} 휴식 시간`, content });
}

async function exMenu(s, idx) {
  const it = s.items[idx];
  const ex = exById(it.exerciseId);
  const opts = [
    { label: '지난 기록 불러오기', sub: '이전 운동의 세트를 그대로 가져와요', value: 'load', icon: 'clock' },
    ex ? { label: '휴식 시간 설정', sub: `${ex.rest || state.settings.restDefault}초`, value: 'rest', icon: 'timer' } : null,
    ex ? { label: '메모 수정', value: 'memo', icon: 'note' } : null,
    { label: '운동 교체', value: 'swap', icon: 'swap' },
    ex ? { label: '이 운동의 기록·그래프', value: 'detail', icon: 'cal' } : null,
    idx > 0 ? { label: '위로 이동', value: 'up', icon: 'up' } : null,
    idx < s.items.length - 1 ? { label: '아래로 이동', value: 'down', icon: 'down' } : null,
    { label: '운동 삭제', value: 'del', icon: 'trash', danger: true },
  ].filter(Boolean);
  const c = await choiceSheet({ title: it.name, options: opts });
  if (!c) return;
  if (c === 'load') loadHistorySheet(s, it);
  else if (c === 'rest') restSheet(ex);
  else if (c === 'memo') editMemo(ex);
  else if (c === 'detail') go('#/exercise/' + ex.id);
  else if (c === 'up' || c === 'down') {
    const j = c === 'up' ? idx - 1 : idx + 1;
    [s.items[idx], s.items[j]] = [s.items[j], s.items[idx]];
    save('sessions', s); rerender();
  } else if (c === 'swap') {
    const ids = await pickExercises({ multi: false, exclude: s.items.map((i) => i.exerciseId), title: '교체할 운동' });
    if (!ids || !ids[0]) return;
    const nx = exById(ids[0]);
    if (!nx) return;
    s.items[idx] = buildItem(nx, it.sets.length, s.startedAt);
    save('sessions', s); rerender();
    await ensureBodyweight(s);
    rerender();
  } else if (c === 'del') {
    const ok = await confirmSheet({ title: `${it.name}을(를) 뺄까요?`, message: '이번 운동에서만 빠져요.', ok: '삭제', danger: true });
    if (ok) { s.items.splice(idx, 1); save('sessions', s); rerender(); }
  }
}

function loadHistorySheet(s, it) {
  const ex = exById(it.exerciseId);
  const hist = exerciseHistory(state.sessions, it.exerciseId, { before: s.startedAt, excludeId: s.id, includeWarmup: inc() }).reverse();
  const pinned = new Set(ex?.pinned || []);
  hist.sort((a, b) => (pinned.has(b.sessionId) ? 1 : 0) - (pinned.has(a.sessionId) ? 1 : 0));
  let sheet;
  const list = hist.length
    ? h('div', { class: 'hist-list' }, hist.slice(0, 30).map((e) => h('button', {
      class: 'hist-item', type: 'button',
      onclick: () => { it.sets = prefillSets(e); save('sessions', s); sheet.close(); rerender(); toast('지난 기록을 불러왔어요'); },
    },
    h('div', { class: 'hist-date' }, pinned.has(e.sessionId) ? icon('pin', 14) : null, fmtMD(e.ts)),
    h('div', { class: 'set-chips' }, e.sets.map((x) => h('span', { class: 'set-chip' }, (x.t !== 'N' ? x.t + ' ' : '') + `${fmtNum(x.w)}×${x.r}`))))))
    : h('div', { class: 'empty small' }, h('div', { class: 'sub' }, '이 운동의 지난 기록이 아직 없어요'));
  sheet = openSheet({ title: '지난 기록 불러오기', content: list });
}
