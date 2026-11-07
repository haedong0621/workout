// 운동(세션) 생애주기: 시작 / 세트 편집 시트 / 종료 / 취소
import { state, save, remove, setSetting, activeSession, upsertBody } from './db.js';
import { exerciseHistory, latestBodyWeight, prefillSets, effWeight, setVolume, SET_TYPES } from './calc.js';
import { uuid, timeOfDayName, dateKey, fmtNum, parseNum, clamp, h } from './util.js';
import { promptSheet, choiceSheet, openSheet, toast, icon } from './ui.js';
import { stopRest, setWakeLock } from './timer.js';
import { go, rerender } from './router.js';

export const exById = (id) => state.exercises.find((e) => e.id === id);
export const newSet = (w = 0, r = 10, t = 'N') => ({ w, r, t, done: false });

// 종목 하나를 세션 항목으로. 지난번 기록이 있으면 그 세트를 그대로 불러옵니다.
export function buildItem(ex, setCount = 3, beforeTs = Infinity) {
  const hist = exerciseHistory(state.sessions, ex.id, { before: beforeTs });
  const last = hist[hist.length - 1];
  const sets = last ? prefillSets(last) : Array.from({ length: setCount || 3 }, () => newSet());
  return { exerciseId: ex.id, name: ex.name, part: ex.part, equip: ex.equip, kind: ex.kind || 'normal', sets };
}

export async function startWorkout(routineId = null) {
  if (activeSession()) {
    const c = await choiceSheet({
      title: '진행 중인 운동이 있어요',
      options: [
        { label: '이어서 하기', value: 'resume', icon: 'play' },
        { label: '새로 시작하기', sub: '진행 중이던 기록은 삭제돼요', value: 'new', danger: true, icon: 'trash' },
      ],
    });
    if (c === 'resume') { go('#/workout'); return; }
    if (c !== 'new') return;
    await discardWorkout();
  }
  const routine = routineId ? state.routines.find((r) => r.id === routineId) : null;
  const now = Date.now();
  const s = {
    id: uuid(),
    name: routine ? routine.name : `${timeOfDayName(now)} 운동`,
    routineId: routine ? routine.id : null,
    startedAt: now, endedAt: null, status: 'active',
    bw: latestBodyWeight(state.body, state.settings),
    items: [],
  };
  if (routine) {
    for (const it of routine.items) {
      const ex = exById(it.exerciseId);
      if (ex) s.items.push(buildItem(ex, it.setCount, now));
    }
  }
  save('sessions', s);
  await setSetting('activeSessionId', s.id);
  setWakeLock(true);
  go('#/workout');
  await ensureBodyweight(s);
  rerender();
}

// 어시스트/체중 종목이 있는데 체중을 모르면 한 번 물어봅니다
export async function ensureBodyweight(session) {
  const need = session.items.some((it) => it.kind === 'assist' || it.kind === 'bodyweight');
  if (!need || session.bw) return;
  const v = await promptSheet({
    title: '체중을 입력해 주세요',
    label: '어시스트·체중 운동의 볼륨 계산에 사용돼요',
    type: 'text', inputMode: 'decimal', unit: 'kg', value: '', placeholder: '예: 87',
  });
  const n = parseNum(v, 0);
  if (n > 0) {
    session.bw = n;
    upsertBody(dateKey(Date.now()), { weight: n });
    save('sessions', session);
    toast('체중이 기록됐어요');
  }
}

export function finalizeSession(s, name) {
  s.items = s.items
    .map((it) => ({ ...it, sets: it.sets.filter((x) => x.done) }))
    .filter((it) => it.sets.length);
  if (name && name.trim()) s.name = name.trim();
  s.endedAt = Date.now();
  s.status = 'done';
  save('sessions', s);
  setSetting('activeSessionId', null);
  stopRest();
  setWakeLock(false);
  return s;
}

export async function discardWorkout() {
  const s = activeSession();
  if (s) remove('sessions', s.id);
  await setSetting('activeSessionId', null);
  stopRest();
  setWakeLock(false);
}

export function routineFromSession(s, name) {
  const r = {
    id: uuid(), name: name || s.name, emoji: '💪', imageId: null, createdAt: Date.now(),
    items: s.items.map((it) => ({ exerciseId: it.exerciseId, setCount: Math.max(1, it.sets.length) })),
  };
  save('routines', r);
  return r;
}

// ---------- 세트 편집 시트 (운동 중 / 지난 기록 수정 공용) ----------
export function openSetEditor({ session, itemIndex, setIndex, onChange }) {
  let ii = itemIndex;
  let si = setIndex;
  const body = h('div', { class: 'seted' });
  let sheet;

  const item = () => session.items[ii];
  const set = () => item().sets[si];
  const commit = () => { save('sessions', session); if (onChange) onChange(); };

  function draw() {
    const it = item();
    const st = set();
    if (!st) { sheet.close(); return; }

    const typeRow = h('div', { class: 'chips' }, Object.entries(SET_TYPES).map(([k, label]) =>
      h('button', {
        class: 'chip' + (st.t === k ? ' active' : ''), type: 'button',
        onclick: () => { st.t = k; commit(); draw(); },
      }, k === 'N' ? '일반' : `${k} ${label}`)));

    const hint = h('div', { class: 'seted-hint' });
    const updateHint = () => {
      if (it.kind === 'normal') { hint.textContent = ''; return; }
      const ew = effWeight(it.kind, st.w, session.bw);
      hint.textContent = (it.kind === 'assist' ? `핀 ${fmtNum(st.w)}kg → 실제 ${fmtNum(ew)}kg` : `체중 + ${fmtNum(st.w)}kg → 실제 ${fmtNum(ew)}kg`)
        + ` · 이 세트 볼륨 ${fmtNum(setVolume(it.kind, st, session.bw))}kg`
        + (session.bw ? '' : ' (체중 미입력)');
    };

    const mkField = (key, unit, steps, decimals) => {
      const input = h('input', { class: 'big-input', type: 'text', inputMode: decimals ? 'decimal' : 'numeric', value: String(st[key]), 'aria-label': unit });
      const apply = (v) => { st[key] = decimals ? Math.round(v * 100) / 100 : Math.round(v); input.value = String(st[key]); commit(); updateHint(); };
      input.addEventListener('input', () => {
        const n = parseNum(input.value, NaN);
        if (Number.isFinite(n) && n >= 0) { st[key] = n; commit(); updateHint(); }
      });
      input.addEventListener('focus', () => setTimeout(() => input.select(), 0));
      input.addEventListener('blur', () => { input.value = String(st[key]); });
      const btns = steps.map((d) => h('button', {
        class: 'step-btn ' + (d < 0 ? 'neg' : 'pos'), type: 'button',
        onclick: () => apply(clamp((Number(st[key]) || 0) + d, 0, 9999)),
      }, (d > 0 ? '+' : '−') + Math.abs(d)));
      return h('div', { class: 'seted-col' },
        h('div', { class: 'seted-label' }, unit),
        h('div', { class: 'big-wrap' }, input),
        h('div', { class: 'step-grid cols' + (steps.length / 2) }, btns));
    };

    const weightLabel = it.kind === 'assist' ? '핀 무게 (kg)' : it.kind === 'bodyweight' ? '추가 무게 (kg)' : '무게 (kg)';
    updateHint();
    body.replaceChildren(
      h('div', { class: 'seted-top' },
        h('button', { class: 'icon-btn', disabled: si === 0, onclick: () => { si--; draw(); }, 'aria-label': '이전 세트' }, icon('back', 20)),
        h('div', { class: 'seted-title' },
          h('div', { class: 'seted-name' }, it.name),
          h('div', { class: 'sub' }, `${si + 1} / ${it.sets.length} 세트`)),
        h('button', { class: 'icon-btn', disabled: si >= it.sets.length - 1, onclick: () => { si++; draw(); }, 'aria-label': '다음 세트' }, icon('chevron', 20))),
      typeRow,
      h('div', { class: 'seted-cols' },
        mkField('w', weightLabel, [-5, -2.5, -1, 1, 2.5, 5], true),
        mkField('r', '횟수', [-5, -1, 1, 5], false)),
      hint,
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn ghost', type: 'button',
          onclick: () => {
            const { w, r } = st;
            item().sets.forEach((x) => { x.w = w; x.r = r; });
            commit(); toast('모든 세트에 적용했어요'); draw();
          },
        }, '모든 세트에 적용'),
        h('button', {
          class: 'btn danger-ghost', type: 'button',
          onclick: () => {
            item().sets.splice(si, 1);
            if (si >= item().sets.length) si = item().sets.length - 1;
            commit();
            if (si < 0) sheet.close(); else draw();
          },
        }, '세트 삭제')));
  }

  sheet = openSheet({ content: body, onClose: () => { if (onChange) onChange(); } });
  draw();
  return sheet;
}
