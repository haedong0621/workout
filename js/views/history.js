// 기록 탭: 월간 캘린더 + 운동 상세
import { h, dateKey, fmtDurShort, fmtDur, fmtNum, fmtMD, fmtTime, fmtYMD, fmtFull, fmtDateTime, WEEK } from '../util.js';
import { state, save, remove } from '../db.js';
import { sessionStats, monthGrid, exerciseHistory, itemStats } from '../calc.js';
import { go, back, rerender } from '../router.js';
import { icon, openSheet, choiceSheet, confirmSheet, promptSheet, diffBadge, emptyState, toast, PART_COLOR } from '../ui.js';
import { openSetEditor, routineFromSession } from '../session.js';

const inc = () => state.settings.includeWarmup;
const now = new Date();
const cal = { y: now.getFullYear(), m: now.getMonth() };

export function render() {
  const { y, m } = cal;
  const grid = monthGrid(y, m);
  const done = state.sessions.filter((s) => s.status === 'done');
  const byDay = new Map();
  for (const s of done) {
    const k = dateKey(s.startedAt);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(s);
  }

  // 월 요약
  let days = 0, secs = 0, vol = 0, sets = 0;
  for (const c of grid) {
    if (!c.inMonth) continue;
    const list = byDay.get(c.key);
    if (!list) continue;
    days++;
    for (const s of list) { const st = sessionStats(s, inc()); secs += st.durationSec; vol += st.volume; sets += st.sets; }
  }

  const todayKey = dateKey(Date.now());
  const cells = grid.map((c) => {
    const list = byDay.get(c.key) || [];
    const dayStats = list.map((s) => sessionStats(s, inc()));
    const dur = dayStats.reduce((a, b) => a + b.durationSec, 0);
    const parts = {};
    dayStats.forEach((st) => { for (const [p, n] of Object.entries(st.byPart)) parts[p] = (parts[p] || 0) + n; });
    const top = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return h('button', {
      class: 'day' + (c.inMonth ? '' : ' out') + (c.key === todayKey ? ' today' : '') + (list.length ? ' has' : ''),
      type: 'button', disabled: !list.length,
      onclick: () => daySheet(c.key, list),
    },
    h('div', { class: 'day-num' }, c.day),
    list.length ? h('div', { class: 'day-dur' }, fmtDurShort(dur)) : null,
    top.map(([p, n]) => h('div', { class: 'day-part', style: { borderColor: PART_COLOR[p] || PART_COLOR.기타 } }, h('span', null, p), h('b', null, n))));
  });

  const shift = (d) => {
    const dt = new Date(cal.y, cal.m + d, 1);
    cal.y = dt.getFullYear(); cal.m = dt.getMonth();
    rerender();
  };

  return h('div', { class: 'page' },
    h('div', { class: 'page-head row' },
      h('h1', null, '기록'),
      h('div', { class: 'month-nav' },
        h('button', { class: 'icon-btn', type: 'button', onclick: () => shift(-1), 'aria-label': '이전 달' }, icon('back', 20)),
        h('button', { class: 'month-title', type: 'button', onclick: () => { cal.y = now.getFullYear(); cal.m = now.getMonth(); rerender(); } }, `${y}년 ${m + 1}월`),
        h('button', { class: 'icon-btn', type: 'button', onclick: () => shift(1), 'aria-label': '다음 달' }, icon('chevron', 20)))),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('div', { class: 'sub' }, '운동한 날'), h('div', { class: 'stat-num' }, String(days), h('span', null, '일'))),
      h('div', { class: 'stat' }, h('div', { class: 'sub' }, '총 시간'), h('div', { class: 'stat-num sm' }, fmtDur(secs))),
      h('div', { class: 'stat' }, h('div', { class: 'sub' }, '총 볼륨'), h('div', { class: 'stat-num' }, fmtNum(vol, 0), h('span', null, 'kg')))),
    h('div', { class: 'cal' },
      h('div', { class: 'cal-week' }, ['월', '화', '수', '목', '금', '토', '일'].map((d, i) => h('div', { class: i >= 5 ? 'we' : '' }, d))),
      h('div', { class: 'cal-grid' }, cells)),
    !done.length ? emptyState('아직 기록이 없어요', '운동을 완료하면 날짜별로 여기에 쌓여요') : null);
}

function daySheet(key, list) {
  let sheet;
  const [yy, mm, dd] = key.split('-').map(Number);
  const body = h('div', { class: 'list' }, list.slice().sort((a, b) => a.startedAt - b.startedAt).map((s) => {
    const st = sessionStats(s, inc());
    return h('button', { class: 'list-item', type: 'button', onclick: () => { sheet.close(); go('#/session/' + s.id); } },
      h('div', { class: 'grow' },
        h('div', { class: 'li-title' }, s.name),
        h('div', { class: 'sub' }, `${fmtTime(s.startedAt)} · ${fmtDur(st.durationSec)} · ${st.sets}세트 · ${st.exercises}종목`),
        h('div', { class: 'part-dots' }, Object.entries(st.byPart).map(([p, n]) => h('span', { class: 'part-pill', style: { borderColor: PART_COLOR[p] || PART_COLOR.기타 } }, `${p} ${n}`)))),
      h('div', { class: 'li-right' }, `${fmtNum(st.volume, 0)} kg`));
  }));
  sheet = openSheet({ title: `${mm}월 ${dd}일 (${WEEK[new Date(yy, mm - 1, dd).getDay()]})`, content: body });
}

// ---------------------------------------------------------------------------
export function renderSession(ctx, id) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s || s.status !== 'done') {
    return h('div', { class: 'page' }, emptyState('기록을 찾을 수 없어요', null, '기록으로', () => go('#/history', { replace: true })));
  }
  const st = sessionStats(s, inc());

  async function menu() {
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
    if (!c) return;
    if (c === 'name') {
      const v = await promptSheet({ title: '기록 이름', value: s.name, ok: '저장' });
      if (v != null && v.trim()) { s.name = v.trim(); save('sessions', s); rerender(); }
    } else if (c === 'date') {
      const v = await promptSheet({ title: '날짜 수정', type: 'date', value: dateKey(s.startedAt), ok: '저장' });
      if (!v) return;
      const [yy, mm, dd] = v.split('-').map(Number);
      const d = new Date(s.startedAt); d.setFullYear(yy, mm - 1, dd);
      shiftStart(s, d.getTime()); rerender();
    } else if (c === 'time') {
      const v = await promptSheet({ title: '시작 시간 수정', type: 'time', value: fmtTime(s.startedAt), ok: '저장' });
      if (!v) return;
      const [hh, mi] = v.split(':').map(Number);
      const d = new Date(s.startedAt); d.setHours(hh, mi, 0, 0);
      shiftStart(s, d.getTime()); rerender();
    } else if (c === 'dur') {
      const v = await promptSheet({ title: '총 운동 시간', type: 'text', inputMode: 'numeric', unit: '분', value: String(Math.round(st.durationSec / 60)), ok: '저장' });
      const min = Math.round(parseFloat(v));
      if (v != null && min > 0) { s.endedAt = s.startedAt + min * 60000; save('sessions', s); rerender(); }
    } else if (c === 'routine') {
      const name = await promptSheet({ title: '루틴 이름', value: s.name, ok: '저장' });
      if (name != null && name.trim()) { routineFromSession(s, name.trim()); toast('루틴으로 저장했어요'); }
    } else if (c === 'del') {
      const ok = await confirmSheet({ title: '기록을 삭제할까요?', message: `${fmtYMD(s.startedAt)} ${s.name}`, ok: '삭제', danger: true });
      if (ok) { remove('sessions', s.id); back('#/history'); }
    }
  }

  const exBlocks = s.items.map((it, idx) => {
    const ist = itemStats(it, s.bw, inc());
    if (!ist.setCount) return null;
    const hist = exerciseHistory(state.sessions, it.exerciseId, { before: s.startedAt, excludeId: s.id, includeWarmup: inc() });
    const prev = hist[hist.length - 1];
    return h('div', { class: 'card ex-sum' },
      h('div', { class: 'card-head' },
        h('div', null,
          h('div', { class: 'card-title' }, it.name),
          h('div', { class: 'sub' }, `${it.part} · ${it.equip}`)),
        h('div', { class: 'right' }, h('b', null, `${fmtNum(ist.volume, 0)} kg`), prev ? diffBadge(ist.volume - prev.volume) : null)),
      h('div', { class: 'set-chips big' }, it.sets.map((x, si) => h('button', {
        class: 'set-chip btn-chip t-' + x.t, type: 'button',
        onclick: () => openSetEditor({ session: s, itemIndex: idx, setIndex: si, onChange: rerender }),
      }, (x.t !== 'N' ? x.t + ' ' : '') + `${fmtNum(x.w)}×${x.r}`))));
  });

  return h('div', { class: 'page' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', onclick: () => back('#/history'), 'aria-label': '뒤로' }, icon('back')),
      h('div', { class: 'topbar-title' }, s.name),
      h('button', { class: 'icon-btn', type: 'button', onclick: menu, 'aria-label': '메뉴' }, icon('more'))),
    h('div', { class: 'sess-hero' },
      h('div', { class: 'eyebrow' }, `${fmtFull(s.startedAt)} · ${fmtTime(s.startedAt)}–${fmtTime(s.endedAt)}`),
      h('div', { class: 'sess-stats' },
        sessStat(fmtDur(st.durationSec), '운동 시간'),
        sessStat(`${st.sets}`, '세트'),
        sessStat(`${st.exercises}`, '종목'),
        sessStat(fmtNum(st.volume, 0), '볼륨(kg)')),
      h('div', { class: 'part-dots' }, Object.entries(st.byPart).map(([p, n]) => h('span', { class: 'part-pill', style: { borderColor: PART_COLOR[p] || PART_COLOR.기타 } }, `${p} ${n}세트`)))),
    s.bw ? h('div', { class: 'sub pad' }, `계산에 사용한 체중 ${fmtNum(s.bw)}kg`) : null,
    exBlocks,
    h('div', { class: 'sub pad' }, '세트를 누르면 무게·횟수를 고칠 수 있어요'));
}

function sessStat(num, label) {
  return h('div', null, h('div', { class: 'sum-num' }, num), h('div', { class: 'sub' }, label));
}

function shiftStart(s, newStart) {
  const delta = newStart - s.startedAt;
  s.startedAt = newStart;
  if (s.endedAt) s.endedAt += delta;
  save('sessions', s);
}
