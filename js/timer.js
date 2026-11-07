// 휴식 타이머 / 소리·알림 / 화면 켜짐 유지 / 전역 틱
import { state } from './db.js';

// ---- 전역 틱 (0.5초) ----
const tickers = new Set();
export function onTick(fn) { tickers.add(fn); return () => tickers.delete(fn); }
let tickHandle = null;
export function startTicker() {
  if (tickHandle) return;
  tickHandle = setInterval(() => {
    tickRest();
    tickers.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  }, 500);
}

// ---- 휴식 타이머 ----
// endAt(절대 시각)을 기준으로 계산하므로 앱이 잠깐 멈췄다 돌아와도 시간이 정확합니다.
export const rest = { endAt: 0, total: 0, label: '', fired: true };
const LS = 'workout-log-rest';
const restListeners = new Set();
export function onRestChange(fn) { restListeners.add(fn); return () => restListeners.delete(fn); }
const emit = () => restListeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
const persist = () => { try { localStorage.setItem(LS, JSON.stringify(rest)); } catch { /* noop */ } };

export function loadRest() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || 'null');
    if (o && o.endAt && o.endAt > Date.now() - 30000) Object.assign(rest, o);
  } catch { /* noop */ }
}

export const restRemaining = () => (rest.endAt ? Math.max(0, Math.ceil((rest.endAt - Date.now()) / 1000)) : 0);
export const restRunning = () => rest.endAt > Date.now();
export const restFinished = () => rest.endAt > 0 && rest.endAt <= Date.now();

export function startRest(sec, label = '') {
  unlockAudio();
  rest.endAt = Date.now() + sec * 1000;
  rest.total = sec;
  rest.label = label;
  rest.fired = false;
  persist(); emit();
}

export function addRest(deltaSec) {
  if (!rest.endAt) return;
  rest.endAt += deltaSec * 1000;
  rest.total = Math.max(1, rest.total + deltaSec);
  if (rest.endAt <= Date.now()) { stopRest(); return; }
  rest.fired = false;
  persist(); emit();
}

export function stopRest() {
  rest.endAt = 0; rest.total = 0; rest.label = ''; rest.fired = true;
  persist(); emit();
}

function tickRest() {
  if (!rest.endAt) return;
  const now = Date.now();
  if (!rest.fired && now >= rest.endAt) {
    rest.fired = true;
    persist();
    // 앱이 멈춰 있다가 한참 뒤에 돌아온 경우엔 소리를 내지 않음
    if (now - rest.endAt < 4000) alertRestEnd();
    emit();
  } else if (rest.fired && now - rest.endAt > 30000) {
    stopRest(); // 끝난 지 30초 지나면 표시 정리
  }
}

function alertRestEnd() {
  if (state.settings.sound) playBeep();
  if (navigator.vibrate) { try { navigator.vibrate([200, 100, 200, 100, 300]); } catch { /* noop */ } }
  if (document.hidden && state.settings.notify) showNotification('휴식 끝!', '다음 세트를 시작할 시간이에요');
}

// ---- 소리 ----
// iOS는 사용자 터치 안에서 한 번 "잠금 해제"를 해야 이후 자동 재생이 됩니다.
// 무음 스위치의 영향을 덜 받도록 <audio> 요소를 우선 쓰고, 실패하면 WebAudio를 씁니다.
let audioEl = null;
let actx = null;

function makeBeepWav() {
  const sr = 22050;
  const pattern = [[880, 0.16], [0, 0.07], [880, 0.16], [0, 0.07], [1175, 0.32]];
  const total = Math.floor(pattern.reduce((a, [, d]) => a + d, 0) * sr);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  wr(36, 'data'); v.setUint32(40, total * 2, true);
  let idx = 0;
  for (const [freq, dur] of pattern) {
    const n = Math.floor(dur * sr);
    for (let i = 0; i < n && idx < total; i++, idx++) {
      const env = Math.min(1, i / 200, (n - i) / 400); // 클릭음 방지
      const sample = freq ? Math.sin((2 * Math.PI * freq * i) / sr) * 0.55 * Math.max(0, env) : 0;
      v.setInt16(44 + idx * 2, Math.round(sample * 32767), true);
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function unlockAudio() {
  try {
    if (!audioEl) {
      audioEl = new Audio(URL.createObjectURL(makeBeepWav()));
      audioEl.preload = 'auto';
    }
    audioEl.muted = true;
    const p = audioEl.play();
    const reset = () => { try { audioEl.pause(); audioEl.currentTime = 0; } catch { /* noop */ } audioEl.muted = false; };
    if (p && p.then) p.then(reset).catch(() => { audioEl.muted = false; }); else reset();
  } catch { /* noop */ }
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch { /* noop */ }
}

function webAudioBeep() {
  if (!actx) return;
  [[880, 0], [880, 0.23], [1175, 0.46]].forEach(([f, t]) => {
    const o = actx.createOscillator(); const g = actx.createGain();
    o.frequency.value = f; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, actx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.4, actx.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.18);
    o.connect(g); g.connect(actx.destination);
    o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.2);
  });
}

export function playBeep() {
  try {
    if (audioEl) {
      audioEl.muted = false; audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && p.catch) p.catch(() => webAudioBeep());
      return;
    }
  } catch { /* fallthrough */ }
  webAudioBeep();
}

// ---- 알림 (앱이 백그라운드에서 살아 있을 때만 동작) ----
export async function ensureNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

async function showNotification(title, body) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: 'rest', renotify: true, icon: 'icons/icon-192.png' });
    else new Notification(title, { body });
  } catch { /* noop */ }
}

// ---- 화면 켜짐 유지 ----
let wl = null;
export async function setWakeLock(on) {
  try {
    if (on && state.settings.keepAwake && 'wakeLock' in navigator && !document.hidden) {
      if (!wl) {
        wl = await navigator.wakeLock.request('screen');
        wl.addEventListener('release', () => { wl = null; });
      }
    } else if (wl) {
      await wl.release();
      wl = null;
    }
  } catch { /* noop */ }
}
