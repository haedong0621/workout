// 해시 라우터. 뷰는 (ctx, ...params) => Node 형태의 함수입니다.
import { onTick } from './timer.js';

let routes = [];
let viewEl = null;
let cleanups = [];
let afterRender = () => {};

export function initRouter({ routes: r, viewEl: v, onRender }) {
  routes = r; viewEl = v; afterRender = onRender || afterRender;
  window.addEventListener('hashchange', () => render(false));
  if (!location.hash) location.replace('#/home'); else render(false);
}

export const currentHash = () => location.hash || '#/home';

export function go(hash, { replace = false } = {}) {
  if (replace) { location.replace(hash); }
  else if (location.hash === hash) render(true);
  else location.hash = hash;
}

export function back(fallback = '#/home') {
  if (history.length > 1) history.back(); else go(fallback, { replace: true });
}

export function rerender() { render(true); }

function render(keepScroll) {
  const hash = currentHash();
  for (const fn of cleanups) { try { fn(); } catch (e) { console.error(e); } }
  cleanups = [];
  const found = routes.find(([re]) => re.test(hash));
  if (!found) { location.replace('#/home'); return; }
  const [re, view, meta] = found;
  const params = hash.match(re).slice(1).map(decodeURIComponent);
  const ctx = {
    tick: (fn) => { cleanups.push(onTick(fn)); },
    onCleanup: (fn) => { cleanups.push(fn); },
    hash,
  };
  const scroll = keepScroll ? viewEl.scrollTop : 0;
  let node;
  try {
    node = view(ctx, ...params);
  } catch (e) {
    console.error(e);
    node = document.createTextNode('화면을 그리는 중 오류가 발생했어요: ' + e.message);
  }
  viewEl.replaceChildren(node);
  viewEl.scrollTop = scroll;
  afterRender(meta || {}, hash);
}
