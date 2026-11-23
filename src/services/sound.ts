// 휴식 종료 소리
// 'mix'(기본): WebAudio + audioSession 'ambient' → 다른 앱 음악을 끊지 않음(무음 스위치를 따름)
// 'loud'     : <audio> 재생 → 확실히 울리지만 다른 앱 음악이 멈출 수 있음
// iOS는 사용자 터치 안에서 한 번 unlockAudio()를 불러야 이후에 소리가 나요.
import type { SoundMode } from '@/domain/types';

type AudioSessionNav = Navigator & { audioSession?: { type: string } };
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let mode: SoundMode = 'mix';
let audioEl: HTMLAudioElement | null = null;
let actx: AudioContext | null = null;

export function setSoundMode(m: SoundMode): void {
  mode = m === 'loud' ? 'loud' : 'mix';
  applyAudioSession();
}

export function applyAudioSession(): void {
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = mode === 'loud' ? 'playback' : 'ambient';
  } catch { /* 지원 안 함 */ }
}

function makeBeepWav(): Blob {
  const sr = 22050;
  const pattern: [number, number][] = [[880, 0.16], [0, 0.07], [880, 0.16], [0, 0.07], [1175, 0.32]];
  const total = Math.floor(pattern.reduce((a, [, d]) => a + d, 0) * sr);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const wr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  wr(36, 'data'); v.setUint32(40, total * 2, true);
  let idx = 0;
  for (const [freq, dur] of pattern) {
    const n = Math.floor(dur * sr);
    for (let i = 0; i < n && idx < total; i++, idx++) {
      const env = Math.min(1, i / 200, (n - i) / 400);
      const sample = freq ? Math.sin((2 * Math.PI * freq * i) / sr) * 0.55 * Math.max(0, env) : 0;
      v.setInt16(44 + idx * 2, Math.round(sample * 32767), true);
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function unlockAudio(): void {
  applyAudioSession();
  if (mode === 'loud') {
    try {
      if (!audioEl) { audioEl = new Audio(URL.createObjectURL(makeBeepWav())); audioEl.preload = 'auto'; }
      const el = audioEl;
      el.muted = true;
      const reset = () => { try { el.pause(); el.currentTime = 0; } catch { /* noop */ } el.muted = false; };
      el.play().then(reset).catch(() => { el.muted = false; });
    } catch { /* noop */ }
  }
  try {
    if (!actx) { const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') void actx.resume();
  } catch { /* noop */ }
}

function webAudioBeep(): void {
  if (!actx) return;
  const c = actx;
  ([[880, 0], [880, 0.23], [1175, 0.46]] as const).forEach(([f, t]) => {
    const o = c.createOscillator(); const g = c.createGain();
    o.frequency.value = f; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.4, c.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.18);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.2);
  });
}

export function playBeep(): void {
  applyAudioSession();
  if (mode === 'mix') {
    try { if (actx && actx.state === 'suspended') void actx.resume(); } catch { /* noop */ }
    webAudioBeep();
    return;
  }
  if (audioEl) {
    try {
      audioEl.muted = false; audioEl.currentTime = 0;
      audioEl.play().catch(() => webAudioBeep());
      return;
    } catch { /* fallthrough */ }
  }
  webAudioBeep();
}

export function vibrate(pattern: number[] = [200, 100, 200, 100, 300]): void {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}
