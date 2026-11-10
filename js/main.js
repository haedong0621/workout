// 앱 시작점
import { loadAll, seedIfNeeded, requestPersist, state, activeSession, onDbError } from './db.js';
import { initViewportGap } from './viewport.js';
import { initRouter, go, currentHash } from './router.js';
import { startTicker, loadRest, setWakeLock, onTick, rest, restRemaining, restRunning } from './timer.js';
import { h, fmtClock } from './util.js';
import { icon, toast } from './ui.js';
import * as home from './views/home.js';
import * as workout from './views/workout.js';
import * as routine from './views/routine.js';
import * as library from './views/library.js';
import * as history from './views/history.js';
import * as body from './views/body.js';
import * as settings from './views/settings.js';

const TABS = [
  ['home', '홈', 'home', '#/home'],
  ['history', '기록', 'cal', '#/history'],
  ['library', '종목', 'dumbbell', '#/library'],
  ['body', '내 몸', 'body', '#/body'],
  ['settings', '설정', 'gear', '#/settings'],
];

const routes = [
  [/^#\/home$/, home.render, { tab: 'home' }],
  [/^#\/history$/, history.render, { tab: 'history' }],
  [/^#\/library$/, library.render, { tab: 'library' }],
  [/^#\/body$/, body.render, { tab: 'body' }],
  [/^#\/settings$/, settings.render, { tab: 'settings' }],
  [/^#\/workout$/, workout.render, { tab: null, bare: true }],
  [/^#\/exercise\/(.+)$/, library.renderDetail, { tab: 'library', sub: true }],
  [/^#\/session\/(.+)$/, history.renderSession, { tab: 'history', sub: true }],
  [/^#\/routine\/(.+)$/, routine.render, { tab: 'home', sub: true }],
];

function buildChrome() {
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  tabbar.replaceChildren(...TABS.map(([key, label, ic, hash]) =>
    h('a', { class: 'tab', href: hash, 'data-tab': key }, icon(ic, 24), h('span', null, label))));

  // 다른 화면에 있을 때 보이는 "운동 중" 미니 바
  const miniClock = h('span', { class: 'mono' });
  const miniRest = h('span', { class: 'mini-rest mono' });
  const mini = h('a', { class: 'minibar', href: '#/workout' },
    icon('play', 16), h('span', { class: 'grow' }, '운동 중 · ', miniClock), miniRest, icon('chevron', 16));
  document.body.append(mini);
  const updateMini = () => {
    const a = activeSession();
    const show = !!a && !document.body.classList.contains('bare');
    mini.classList.toggle('show', show);
    document.body.classList.toggle('has-mini', show);
    if (!show) return;
    miniClock.textContent = fmtClock((Date.now() - a.startedAt) / 1000);
    if (rest.endAt) {
      const left = rest.endAt - Date.now();
      miniRest.textContent = left > 0 ? `휴식 ${fmtClock(restRemaining())}` : '휴식 끝!';
      mini.classList.toggle('rest-done', left <= 0);
    } else { miniRest.textContent = ''; mini.classList.remove('rest-done'); }
  };
  onTick(updateMini);

  return {
    view,
    onRender(meta) {
      document.body.classList.toggle('bare', !!meta.bare);
      document.body.classList.toggle('no-tabs', !!meta.bare || !!meta.sub);
      tabbar.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === meta.tab));
      updateMini();
    },
  };
}

async function boot() {
  onDbError((e) => { console.error(e); toast('저장 중 문제가 생겼어요. 저장 공간을 확인해 주세요', { ms: 4000 }); });
  initViewportGap();
  try { await loadAll(); } catch (e) { console.error(e); }
  await seedIfNeeded();
  loadRest();
  requestPersist();
  const chrome = buildChrome();

  // 운동 중이던 앱을 다시 열면 바로 운동 화면으로
  const startHash = location.hash;
  if (!startHash && activeSession()) location.replace('#/workout');

  initRouter({ routes, viewEl: chrome.view, onRender: chrome.onRender });
  startTicker();
  if (activeSession()) setWakeLock(true);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setWakeLock(!!activeSession());
  });

  if (!state.persistent) toast('이 브라우저에서는 기록이 저장되지 않을 수 있어요 (사생활 보호 모드?)', { ms: 5000 });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW 등록 실패', e));
  }
}

window.addEventListener('error', (e) => console.error(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => console.error(e.reason));
boot();
