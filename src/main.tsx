// 앱 시작점: 저장소 열기 → 상태 채우기 → 화면 그리기 → 타이머·서비스 워커
import { effect } from '@preact/signals';
import { render } from 'preact';
import { App } from './app/App';
import { initRouter, onNavigate, paths } from './app/router';
import { ROUTES } from './app/routes';
import { startClock } from './services/clock';
import { notifyGranted, showNotification } from './services/notify';
import { initRestTimer, setRestFinishedHandler } from './services/restTimer';
import { registerServiceWorker } from './services/serviceWorker';
import { playBeep, setSoundMode, vibrate } from './services/sound';
import { initViewport } from './services/viewport';
import { hideSplash } from './services/splash';
import { setWakeLock } from './services/wakeLock';
import { activeSession, bootStore, onStorageError, settings, storageInfo } from './store';
import { closeSheetsOpenedBefore } from './ui/sheet';
import { toast } from './ui/toast';
import './styles/index.css';

addEventListener('error', (e) => console.error(e.error ?? e.message));
addEventListener('unhandledrejection', (e) => console.error(e.reason));

async function boot() {
  onStorageError((e) => { console.error(e); toast('저장 중 문제가 생겼어요. 저장 공간을 확인해 주세요', { ms: 4000 }); });
  initViewport();
  await bootStore();

  setSoundMode(settings.value.soundMode);
  setRestFinishedHandler(() => {
    const S = settings.value;
    if (S.sound) playBeep();
    vibrate();
    if (document.hidden && S.notify && notifyGranted()) void showNotification('휴식 끝!', '다음 세트를 시작할 시간이에요');
  });
  initRestTimer();
  startClock();

  // 운동 중이던 앱을 다시 열면 바로 운동 화면으로
  if (!location.hash && activeSession.value) location.replace(paths.workout);
  initRouter(ROUTES);
  onNavigate((_hash, cutoff) => closeSheetsOpenedBefore(cutoff));

  const root = document.getElementById('app');
  if (!root) throw new Error('#app 이 없어요');
  render(<App />, root);
  hideSplash();

  // 운동 중에는 화면 켜짐 유지
  effect(() => { void setWakeLock(!!activeSession.value && settings.value.keepAwake); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void setWakeLock(!!activeSession.value && settings.value.keepAwake);
  });

  if (!storageInfo.value.persistent) toast('이 브라우저에서는 기록이 저장되지 않을 수 있어요 (사생활 보호 모드?)', { ms: 5000 });
  registerServiceWorker(() => toast('새 버전이 준비됐어요', { ms: 8000, action: { label: '새로고침', fn: () => location.reload() } }));
}

boot().catch((e: unknown) => {
  console.error(e);
  hideSplash(0);
  const el = document.getElementById('app');
  if (el) el.textContent = '앱을 시작하지 못했어요: ' + (e instanceof Error ? e.message : String(e));
});

