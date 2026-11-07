// 내 몸: 몸무게·골격근량·체지방률 기록
import { h, dateKey, fmtNum, fmtYMD, parseNum } from '../util.js';
import { state, save, remove, upsertBody } from '../db.js';
import { rerender } from '../router.js';
import { icon, segmented, lineChart, confirmSheet, toast } from '../ui.js';

const METRICS = {
  weight: { label: '몸무게', unit: 'kg', cls: 'm-weight' },
  muscle: { label: '골격근량', unit: 'kg', cls: 'm-muscle' },
  fat: { label: '체지방률', unit: '%', cls: 'm-fat' },
};

let metric = 'weight';
let range = 'recent';

export function render() {
  const entries = [...state.body].sort((a, b) => (a.date < b.date ? -1 : 1));
  const seriesOf = (k) => entries.filter((e) => Number(e[k]) > 0);

  const tiles = Object.entries(METRICS).map(([k, m]) => {
    const ser = seriesOf(k);
    const last = ser[ser.length - 1];
    const prev = ser[ser.length - 2];
    const delta = last && prev ? Number(last[k]) - Number(prev[k]) : null;
    return h('button', { class: 'metric-tile ' + m.cls + (metric === k ? ' sel' : ''), type: 'button', onclick: () => { metric = k; rerender(); } },
      h('div', { class: 'mt-label' }, m.label),
      h('div', { class: 'mt-val' }, last ? fmtNum(last[k]) : '–', h('span', null, m.unit)),
      delta != null ? h('div', { class: 'mt-delta' }, `${delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} ${fmtNum(Math.abs(delta))}${m.unit}`) : h('div', { class: 'mt-delta' }, ' '));
  });

  // 입력 폼
  const today = dateKey(Date.now());
  const dateIn = h('input', { class: 'input', type: 'date', value: today });
  const mk = (ph) => h('input', { class: 'input', type: 'text', inputMode: 'decimal', placeholder: ph });
  const wIn = mk('몸무게 kg'), mIn = mk('골격근량 kg'), fIn = mk('체지방률 %');
  const latest = (k) => { const s = seriesOf(k); return s.length ? s[s.length - 1][k] : ''; };
  wIn.placeholder = latest('weight') ? `몸무게 (최근 ${latest('weight')}kg)` : '몸무게 kg';
  mIn.placeholder = latest('muscle') ? `골격근량 (최근 ${latest('muscle')}kg)` : '골격근량 kg (선택)';
  fIn.placeholder = latest('fat') ? `체지방률 (최근 ${latest('fat')}%)` : '체지방률 % (선택)';

  const form = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, '기록하기'), dateIn),
    h('div', { class: 'form-grid' }, wIn, mIn, fIn),
    h('button', {
      class: 'btn primary wide mt', type: 'button',
      onclick: () => {
        const fields = { weight: parseNum(wIn.value, NaN), muscle: parseNum(mIn.value, NaN), fat: parseNum(fIn.value, NaN) };
        if (![fields.weight, fields.muscle, fields.fat].some((v) => Number.isFinite(v) && v > 0)) { toast('값을 하나 이상 입력해 주세요'); return; }
        upsertBody(dateIn.value || today, fields);
        toast('기록했어요');
        rerender();
      },
    }, '저장'),
    h('div', { class: 'sub pad' }, '몸무게는 어시스트·체중 운동의 볼륨 계산에도 쓰여요'));

  // 차트
  const m = METRICS[metric];
  const ser = seriesOf(metric);
  const src = range === 'recent' ? ser.slice(-30) : ser;
  const chart = h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('div', { class: 'card-title' }, m.label),
      segmented([['recent', '최근'], ['all', '전체']], range, (v) => { range = v; rerender(); })),
    lineChart(src.map((e) => ({ ts: new Date(e.date + 'T12:00:00').getTime(), value: Number(e[metric]) })), { unit: m.unit }));

  // 기록 목록
  const list = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', { class: 'card-title' }, '기록 목록')),
    entries.length
      ? h('div', { class: 'list' }, [...entries].reverse().slice(0, 40).map((e) => h('div', { class: 'list-item static' },
        h('div', { class: 'grow' },
          h('div', { class: 'li-title' }, fmtYMD(new Date(e.date + 'T12:00:00').getTime())),
          h('div', { class: 'sub' }, [e.weight ? `${fmtNum(e.weight)}kg` : null, e.muscle ? `근육 ${fmtNum(e.muscle)}kg` : null, e.fat ? `체지방 ${fmtNum(e.fat)}%` : null].filter(Boolean).join(' · '))),
        h('button', {
          class: 'icon-btn danger', type: 'button', 'aria-label': '삭제',
          onclick: async () => { const ok = await confirmSheet({ title: '기록을 삭제할까요?', message: fmtYMD(new Date(e.date + 'T12:00:00').getTime()), ok: '삭제', danger: true }); if (ok) { remove('body', e.id); rerender(); } },
        }, icon('trash', 18)))))
      : h('div', { class: 'sub pad' }, '아직 기록이 없어요'));

  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('h1', null, '내 몸')),
    h('div', { class: 'metric-row' }, tiles),
    form, chart, list);
}
