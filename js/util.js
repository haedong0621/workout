// 공용 유틸: DOM 헬퍼, 포맷터, 검색
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && !k.includes('-')) {
        try { el[k] = v; } catch { el.setAttribute(k, v); }
      } else el.setAttribute(k, v === true ? '' : v);
    }
  }
  appendKids(el, kids);
  return el;
}

function appendKids(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) appendKids(el, k);
    else el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  appendKids(el, kids);
  return el;
}

export function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const pad = (n) => String(n).padStart(2, '0');

export function fmtNum(n, d = 1) {
  if (n == null || Number.isNaN(Number(n))) return '0';
  const f = 10 ** d;
  return (Math.round(Number(n) * f) / f).toLocaleString('ko-KR', { maximumFractionDigits: d });
}

// 59 -> 00:59, 3725 -> 1:02:05
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

// 5340 -> 1시간 29분
export function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60);
  if (hh) return `${hh}시간 ${mm}분`;
  if (mm) return `${mm}분`;
  return `${sec}초`;
}

// 5340 -> 1h29m
export function fmtDurShort(sec) {
  sec = Math.max(0, Math.round(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60);
  if (!hh && !mm) return sec ? '<1m' : '0m';
  return hh ? `${hh}h${pad(mm)}m` : `${mm}m`;
}

export const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const fmtMD = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtYMD = (ts) => { const d = new Date(ts); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
export function fmtFull(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}
export function fmtDateTime(ts) { return `${fmtYMD(ts)} ${fmtTime(ts)}`; }

export function timeOfDayName(ts) {
  const hr = new Date(ts).getHours();
  if (hr < 5) return '새벽';
  if (hr < 11) return '아침';
  if (hr < 14) return '점심';
  if (hr < 18) return '오후';
  if (hr < 22) return '저녁';
  return '밤';
}

// ---- 한글 검색(초성 포함) ----
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export function choseong(str) {
  return [...str].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) return CHO[Math.floor((c - 0xac00) / 588)];
    return ch;
  }).join('');
}
export function matchName(name, q) {
  const query = (q || '').trim().toLowerCase().replace(/\s/g, '');
  if (!query) return true;
  const n = name.toLowerCase().replace(/\s/g, '');
  if (n.includes(query)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(query)) return choseong(n).includes(query);
  return false;
}

export function clone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

export function parseNum(v, fallback = 0) {
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}
