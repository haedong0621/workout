// 종목 라이브러리 + 종목 상세(그래프·메모·기록)
import { h, matchName, fmtNum, fmtMD, fmtYMD } from '../util.js';
import { state, save, remove, addImage, removeImage, imgURL } from '../db.js';
import { PARTS, EQUIPS, exerciseHistory, personalRecords, metricOf } from '../calc.js';
import { go, back, rerender } from '../router.js';
import { icon, exThumb, chip, segmented, lineChart, diffBadge, confirmSheet, toast, pickImageFile, processImage, emptyState, promptSheet } from '../ui.js';
import { sortedExercises, exerciseForm } from '../picker.js';

const inc = () => state.settings.includeWarmup;

export function render() {
  let q = '', part = '전체', equip = '전체', favOnly = false;
  const search = h('input', { class: 'input search', type: 'search', placeholder: '운동 검색 (초성 가능)', enterKeyHint: 'search', autocomplete: 'off' });
  const partRow = h('div', { class: 'chips scroll' });
  const equipRow = h('div', { class: 'chips scroll' });
  const listEl = h('div', { class: 'list' });
  const count = h('span', { class: 'sub' });

  function drawChips() {
    partRow.replaceChildren(
      chip('★ 즐겨찾기', favOnly, () => { favOnly = !favOnly; drawChips(); drawList(); }, 'fav'),
      ...['전체', ...PARTS].map((p) => chip(p, part === p, () => { part = p; drawChips(); drawList(); })));
    equipRow.replaceChildren(...['전체', ...EQUIPS].map((p) => chip(p, equip === p, () => { equip = p; drawChips(); drawList(); }, 'alt')));
  }

  function drawList() {
    const items = sortedExercises().filter((e) =>
      (!favOnly || e.fav) && (part === '전체' || e.part === part) && (equip === '전체' || e.equip === equip) && matchName(e.name, q));
    count.textContent = `${items.length}개`;
    if (!items.length) {
      listEl.replaceChildren(emptyState('조건에 맞는 운동이 없어요', null, '새 운동 만들기', create));
      return;
    }
    listEl.replaceChildren(...items.map((e) => h('button', { class: 'list-item', type: 'button', onclick: () => go('#/exercise/' + e.id) },
      exThumb(e, 44),
      h('div', { class: 'grow' },
        h('div', { class: 'li-title' }, e.name),
        h('div', { class: 'sub' }, `${e.part} · ${e.equip}${e.kind === 'assist' ? ' · 어시스트' : e.kind === 'bodyweight' ? ' · 체중' : ''}`)),
      e.fav ? h('span', { class: 'star on' }, icon('star', 18)) : null,
      icon('chevron', 18))));
  }

  async function create() {
    const ex = await exerciseForm({ name: q });
    if (ex) { drawList(); go('#/exercise/' + ex.id); }
  }

  search.addEventListener('input', () => { q = search.value; drawList(); });
  drawChips(); drawList();
  return h('div', { class: 'page' },
    h('div', { class: 'page-head row' },
      h('div', null, h('h1', null, '종목'), count),
      h('button', { class: 'btn primary small', type: 'button', onclick: create }, icon('plus', 16), ' 새 운동')),
    search, partRow, equipRow, listEl);
}

export function renderDetail(ctx, id) {
  const ex = state.exercises.find((e) => e.id === id);
  if (!ex) return h('div', { class: 'page' }, emptyState('운동을 찾을 수 없어요', null, '종목으로', () => go('#/library', { replace: true })));

  let metric = 'volume', range = 'recent';
  const hist = exerciseHistory(state.sessions, ex.id, { includeWarmup: inc() });
  const pr = personalRecords(hist);
  const pinned = new Set(ex.pinned || []);

  // --- 히어로 ---
  const hero = h('div', { class: 'hero' },
    h('button', {
      class: 'hero-img', type: 'button', 'aria-label': '이미지 변경',
      onclick: async () => {
        const f = await pickImageFile();
        if (!f) return;
        try {
          const blob = await processImage(f);
          const old = ex.imageId;
          ex.imageId = await addImage(blob);
          removeImage(old);
          save('exercises', ex);
          rerender();
        } catch { toast('이미지를 불러오지 못했어요'); }
      },
    }, imgURL(ex.imageId) ? h('img', { src: imgURL(ex.imageId), alt: '' }) : exThumb(ex, 120), h('span', { class: 'thumb-edit' }, icon('image', 14))),
    h('div', { class: 'hero-name' }, ex.name),
    h('div', { class: 'chips center' },
      h('span', { class: 'tag' }, ex.part), h('span', { class: 'tag' }, ex.equip),
      ex.kind === 'assist' ? h('span', { class: 'tag accent' }, '어시스트') : null,
      ex.kind === 'bodyweight' ? h('span', { class: 'tag accent' }, '체중+추가') : null),
    ex.imageId ? null : h('div', { class: 'sub' }, '이미지를 눌러 사진·움짤로 바꿀 수 있어요'));

  const actions = h('div', { class: 'action-row' },
    h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { const r = await exerciseForm(ex); if (r) rerender(); } }, icon('edit', 16), ' 수정'),
    h('button', { class: 'btn ghost small' + (ex.fav ? ' on' : ''), type: 'button', onclick: () => { ex.fav = !ex.fav; save('exercises', ex); rerender(); } }, icon('star', 16), ex.fav ? ' 즐겨찾기 해제' : ' 즐겨찾기'),
    h('button', {
      class: 'btn danger-ghost small', type: 'button',
      onclick: async () => {
        const ok = await confirmSheet({ title: `"${ex.name}" 삭제`, message: '지난 운동 기록에는 이름이 그대로 남아요. 루틴에서는 빠져요.', ok: '삭제', danger: true });
        if (!ok) return;
        removeImage(ex.imageId);
        for (const r of state.routines) {
          const n = r.items.filter((i) => i.exerciseId !== ex.id);
          if (n.length !== r.items.length) { r.items = n; save('routines', r); }
        }
        remove('exercises', ex.id);
        back('#/library');
      },
    }, icon('trash', 16)));

  // --- 기록 요약 ---
  const stats = h('div', { class: 'stat-row' },
    statTile('최고 중량', pr.pr ? `${fmtNum(pr.pr)}` : '–', 'kg'),
    statTile('추정 1RM', pr.rm ? `${fmtNum(pr.rm, 0)}` : '–', 'kg'),
    statTile('최고 볼륨', pr.vol ? `${fmtNum(pr.vol, 0)}` : '–', 'kg'));

  // --- 차트 ---
  const chartBox = h('div', { class: 'chart-box' });
  function drawChart() {
    const src = range === 'recent' ? hist.slice(-12) : hist;
    chartBox.replaceChildren(lineChart(src.map((e) => ({ ts: e.ts, value: Math.round(metricOf(e, metric) * 10) / 10 })), { unit: 'kg' }));
  }
  drawChart();
  const chartCard = h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      segmented([['volume', '볼륨'], ['maxW', '최고 중량'], ['rm', '1RM']], metric, (v) => { metric = v; drawChart(); }),
      segmented([['recent', '최근'], ['all', '전체']], range, (v) => { range = v; drawChart(); })),
    chartBox);

  // --- 메모 (수정하면 날짜 자동 갱신) ---
  const memoDate = h('span', { class: 'sub' });
  const setMemoDate = () => { memoDate.textContent = ex.memoAt ? `마지막 수정 ${fmtYMD(ex.memoAt)}` : ''; };
  setMemoDate();
  const ta = h('textarea', { class: 'input memo-area', rows: 3, placeholder: '세팅, 자세 팁, 시트 높이, 느낌 등을 적어 두세요', value: ex.memo || '' });
  const saveMemo = () => {
    const v = ta.value.trim();
    if (v === (ex.memo || '')) return;
    ex.memo = v;
    ex.memoAt = v ? Date.now() : null;
    save('exercises', ex);
    setMemoDate();
  };
  ta.addEventListener('blur', saveMemo);
  ta.addEventListener('change', saveMemo);
  const memoCard = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, icon('note', 16), ' 메모'), memoDate), ta);

  // --- 휴식 ---
  const restVal = h('b', { class: 'mono' }, `${ex.rest || state.settings.restDefault}초`);
  const stepRest = (d) => {
    ex.rest = Math.max(10, (ex.rest || state.settings.restDefault) + d);
    save('exercises', ex);
    restVal.textContent = `${ex.rest}초`;
  };
  const restCard = h('div', { class: 'card row-card' },
    h('div', { class: 'card-title' }, icon('timer', 16), ' 휴식 시간'),
    h('div', { class: 'mini-stepper' },
      h('button', { type: 'button', onclick: () => stepRest(-15), 'aria-label': '15초 줄이기' }, icon('minus', 16)),
      restVal,
      h('button', { type: 'button', onclick: () => stepRest(15), 'aria-label': '15초 늘리기' }, icon('plus', 16))));

  // --- 기록 목록 ---
  const rows = hist.map((e, i) => ({ ...e, prev: i > 0 ? hist[i - 1] : null })).reverse();
  rows.sort((a, b) => (pinned.has(b.sessionId) ? 1 : 0) - (pinned.has(a.sessionId) ? 1 : 0));
  const histCard = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, '운동 기록'), h('span', { class: 'sub' }, `${hist.length}회`)),
    rows.length
      ? h('div', { class: 'hist-list' }, rows.slice(0, 40).map((e) => h('div', { class: 'hist-item static' },
        h('button', { class: 'hist-main', type: 'button', onclick: () => go('#/session/' + e.sessionId) },
          h('div', { class: 'hist-top' },
            h('b', null, fmtMD(e.ts)),
            h('span', { class: 'sub' }, `${fmtNum(e.volume, 0)} kg`),
            e.prev ? diffBadge(e.volume - e.prev.volume) : null),
          h('div', { class: 'set-chips' }, e.sets.map((x) => h('span', { class: 'set-chip' }, (x.t !== 'N' ? x.t + ' ' : '') + `${fmtNum(x.w)}×${x.r}`)))),
        h('button', {
          class: 'icon-btn' + (pinned.has(e.sessionId) ? ' on' : ''), type: 'button', 'aria-label': '고정',
          onclick: () => {
            const set = new Set(ex.pinned || []);
            if (set.has(e.sessionId)) set.delete(e.sessionId); else set.add(e.sessionId);
            ex.pinned = [...set]; save('exercises', ex); rerender();
          },
        }, icon('pin', 18)))))
      : h('div', { class: 'sub pad' }, '아직 이 운동의 기록이 없어요. 운동을 완료하면 여기에 쌓여요.'));

  return h('div', { class: 'page' },
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', onclick: () => back('#/library'), 'aria-label': '뒤로' }, icon('back')),
      h('div', { class: 'topbar-title' }, '종목 상세'), h('span', { style: { width: '40px' } })),
    hero, actions, stats, chartCard, memoCard, restCard, histCard);
}

function statTile(label, value, unit) {
  return h('div', { class: 'stat' }, h('div', { class: 'sub' }, label), h('div', { class: 'stat-num' }, value, h('span', null, unit)));
}
