// 공용 UI 컴포넌트: 아이콘, 바텀시트, 토스트, 차트, 썸네일, 이미지 처리
import { h, svg, fmtNum, fmtMD } from './util.js';
import { imgURL } from './db.js';

// ---------- 아이콘 ----------
const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  pin: '<path d="M9 3h6l-1 6 3 3.5H7L10 9z"/><path d="M12 12.5V21"/>',
  trash: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.2 4 2.2 4h-12"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  home: '<path d="M4 11l8-6.5 8 6.5v8.5a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  body: '<circle cx="12" cy="5.5" r="2.5"/><path d="M6 21v-7l-2-3.5 3-2h10l3 2L18 14v7M10 21v-5h4v5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  note: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M14.5 3.5V8H19M9 13h7M9 17h5"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
};
export function icon(name, size = 22) {
  const el = svg('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'ico',
  });
  el.innerHTML = ICONS[name] || '';
  return el;
}

// ---------- 색상 / 썸네일 ----------
export const PART_COLOR = {
  가슴: '#ff6b6b', 등: '#5b8def', 어깨: '#2dd4bf', 팔: '#b388ff',
  하체: '#ffc14d', 복근: '#ff9f5a', 유산소: '#4dc3ff', 기타: '#9aa4b2',
};
export const EQUIP_EMOJI = { 바벨: '🏋️', 덤벨: '💪', 머신: '⚙️', 케이블: '🔗', 맨몸: '🤸', 기타: '🎯' };

export function exThumb(ex, size = 46) {
  const el = h('div', { class: 'thumb', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.46) + 'px' } });
  const url = imgURL(ex.imageId);
  if (url) el.append(h('img', { src: url, alt: '', draggable: false }));
  else {
    const c = PART_COLOR[ex.part] || PART_COLOR.기타;
    el.style.background = c + '2b';
    el.style.color = c;
    el.append(h('span', null, EQUIP_EMOJI[ex.equip] || '🏋️'));
  }
  return el;
}

export function routineThumb(r, size = 56) {
  const el = h('div', { class: 'thumb round', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.5) + 'px' } });
  const url = r.pendingURL || imgURL(r.imageId);
  if (url) el.append(h('img', { src: url, alt: '', draggable: false }));
  else el.append(h('span', null, r.emoji || '💪'));
  return el;
}

// ---------- 토스트 ----------
let toastEl = null;
let toastTimer = null;
export function toast(msg, { ms = 2200, action = null } = {}) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status' });
    document.body.append(toastEl);
  }
  toastEl.replaceChildren(h('span', null, msg));
  if (action) toastEl.append(h('button', { class: 'toast-act', onclick: () => { hideToast(); action.fn(); } }, action.label));
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms);
}
function hideToast() { toastEl?.classList.remove('show'); }

// ---------- 바텀 시트 ----------
let sheetDepth = 0;
export function openSheet({ title = '', content, full = false, onClose } = {}) {
  sheetDepth++;
  const z = 100 + sheetDepth * 2;
  const back = h('div', { class: 'sheet-back', style: { zIndex: z } });
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': '닫기' }, icon('x', 20));
  const body = h('div', { class: 'sheet-body' }, content);
  const sheet = h('div', { class: 'sheet' + (full ? ' full' : ''), style: { zIndex: z + 1 }, role: 'dialog' },
    h('div', { class: 'sheet-grab' }),
    title ? h('div', { class: 'sheet-head' }, h('div', { class: 'sheet-title' }, title), closeBtn) : null,
    body);
  document.body.append(back, sheet);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => requestAnimationFrame(() => { back.classList.add('open'); sheet.classList.add('open'); }));

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    back.classList.remove('open'); sheet.classList.remove('open');
    sheetDepth = Math.max(0, sheetDepth - 1);
    if (!sheetDepth) document.body.classList.remove('sheet-open');
    setTimeout(() => { back.remove(); sheet.remove(); }, 260);
    if (onClose) onClose();
  }
  back.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  return { close, el: sheet, body };
}

export function confirmSheet({ title, message, ok = '확인', cancel = '취소', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    let s;
    const fin = (v) => { if (done) return; done = true; s.close(); resolve(v); };
    const content = h('div', null,
      message ? h('p', { class: 'sheet-msg' }, message) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => fin(false) }, cancel),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => fin(true) }, ok)));
    s = openSheet({ title, content, onClose: () => fin(false) });
  });
}

export function promptSheet({ title, label = '', value = '', type = 'text', placeholder = '', ok = '확인', inputMode, unit = '', multiline = false, min, max, step }) {
  return new Promise((resolve) => {
    let done = false;
    let s;
    const fin = (v) => { if (done) return; done = true; s.close(); resolve(v); };
    const input = multiline
      ? h('textarea', { class: 'input', rows: 4, placeholder, value })
      : h('input', { class: 'input', type, value, placeholder, inputMode, min, max, step, enterKeyHint: 'done' });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !multiline) fin(input.value); });
    const content = h('div', null,
      label ? h('div', { class: 'field-label' }, label) : null,
      unit ? h('div', { class: 'input-unit' }, input, h('span', null, unit)) : input,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onclick: () => fin(null) }, '취소'),
        h('button', { class: 'btn primary', onclick: () => fin(input.value) }, ok)));
    s = openSheet({ title, content, onClose: () => fin(null) });
    setTimeout(() => { if (type !== 'date' && type !== 'time') { input.focus(); input.select?.(); } }, 280);
  });
}

// 메뉴형 선택 시트. 선택한 value 반환, 닫으면 null
export function choiceSheet({ title = '', options }) {
  return new Promise((resolve) => {
    let done = false;
    let s;
    const fin = (v) => { if (done) return; done = true; s.close(); resolve(v); };
    const list = h('div', { class: 'menu' }, options.map((o) =>
      h('button', { class: 'menu-item' + (o.danger ? ' danger' : ''), onclick: () => fin(o.value) },
        o.icon ? icon(o.icon, 20) : null,
        h('div', { class: 'menu-text' }, h('div', null, o.label), o.sub ? h('div', { class: 'sub' }, o.sub) : null))));
    s = openSheet({ title, content: list, onClose: () => fin(null) });
  });
}

// ---------- 작은 컴포넌트 ----------
export function chip(label, active, onclick, extra = '') {
  return h('button', { class: 'chip' + (active ? ' active' : '') + (extra ? ' ' + extra : ''), onclick, type: 'button' }, label);
}

export function segmented(options, value, onChange) {
  const el = h('div', { class: 'seg' });
  const draw = (val) => {
    el.replaceChildren(...options.map(([v, label]) =>
      h('button', { class: 'seg-btn' + (v === val ? ' active' : ''), type: 'button', onclick: () => { draw(v); onChange(v); } }, label)));
  };
  draw(value);
  return el;
}

export function toggle(value, onChange) {
  const el = h('button', { class: 'toggle' + (value ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(!!value) }, h('span'));
  el.addEventListener('click', () => {
    const next = !el.classList.contains('on');
    el.classList.toggle('on', next);
    el.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return el;
}

export function diffBadge(delta, unit = 'kg', muted = false) {
  if (delta == null) return null;
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
  return h('span', { class: 'diff ' + dir + (muted ? ' muted' : '') }, `${arrow} ${fmtNum(Math.abs(delta), 0)}${unit ? ' ' + unit : ''}`);
}

export function emptyState(title, sub, actionLabel, onAction) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-title' }, title),
    sub ? h('div', { class: 'sub' }, sub) : null,
    actionLabel ? h('button', { class: 'btn primary', onclick: onAction }, actionLabel) : null);
}

// ---------- 이미지 선택/가공 ----------
export function pickImageFile() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
    input.addEventListener('cancel', () => { resolve(null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

// 사진은 640px JPEG로 줄여서 저장(저장공간 절약), 움짤(GIF)은 5MB 이하면 원본 유지
export async function processImage(file, max = 640) {
  if (file.type === 'image/gif' && file.size <= 5 * 1024 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = hgt;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
    ctx.drawImage(img, 0, 0, w, hgt);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
    if (!blob) throw new Error('이미지 변환 실패');
    if (file.type === 'image/gif') toast('GIF가 커서 정지 이미지로 저장했어요');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

// ---------- 라인 차트 (SVG) ----------
// points: [{ts, value}]
export function lineChart(points, { unit = 'kg', height = 180 } = {}) {
  if (!points.length) return h('div', { class: 'chart-empty' }, '아직 기록이 없어요');
  const W = 340, H = height, pl = 40, pr = 14, pt = 14, pb = 26;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { const pad = Math.max(1, Math.abs(max) * 0.1); min -= pad; max += pad; }
  const span = max - min;
  min = Math.max(0, min - span * 0.12); max += span * 0.12;
  const x = (i) => pl + (points.length === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (points.length - 1));
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);

  const root = h('div', { class: 'chart' });
  const read = h('div', { class: 'chart-read' });
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', preserveAspectRatio: 'none' });
  const ticks = [min, (min + max) / 2, max];
  ticks.forEach((t) => {
    s.append(svg('line', { x1: pl, x2: W - pr, y1: y(t), y2: y(t), class: 'chart-grid' }));
    const tx = svg('text', { x: pl - 6, y: y(t) + 4, class: 'chart-axis', 'text-anchor': 'end' });
    tx.textContent = fmtNum(t, t >= 100 ? 0 : 1);
    s.append(tx);
  });
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  if (points.length > 1) {
    s.append(svg('path', { d: `${d} L${x(points.length - 1)},${H - pb} L${x(0)},${H - pb} Z`, class: 'chart-area' }));
    s.append(svg('path', { d, class: 'chart-line', fill: 'none' }));
  }
  const dots = points.map((p, i) => {
    const c = svg('circle', { cx: x(i), cy: y(p.value), r: 3.6, class: 'chart-dot' });
    s.append(c);
    return c;
  });
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  labelIdx.forEach((i) => {
    const tx = svg('text', { x: x(i), y: H - 7, class: 'chart-axis', 'text-anchor': i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle' });
    tx.textContent = fmtMD(points[i].ts);
    s.append(tx);
  });
  let active = points.length - 1;
  const setActive = (i) => {
    active = i;
    dots.forEach((c, j) => c.classList.toggle('active', j === i));
    read.replaceChildren(h('b', null, `${fmtNum(points[i].value)} ${unit}`), h('span', { class: 'sub' }, ` · ${fmtMD(points[i].ts)}`));
  };
  const pick = (ev) => {
    const r = s.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    points.forEach((_, i) => { const dd = Math.abs(x(i) - px); if (dd < bd) { bd = dd; best = i; } });
    if (best !== active) setActive(best);
  };
  s.addEventListener('pointerdown', pick);
  s.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  setActive(active);
  root.append(read, s);
  return root;
}
