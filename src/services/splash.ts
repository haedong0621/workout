// 스플래시(index.html 의 #splash) 숨기기. 앱 준비가 빨라도 최소 시간은 보여 줘서 깜빡임을 막아요.
export const SPLASH_MIN_MS = 800;
const FADE_MS = 300;

export function hideSplash(minMs = SPLASH_MIN_MS): void {
  const el = document.getElementById('splash');
  if (!el) return;
  const wait = Math.max(0, minMs - performance.now());
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), FADE_MS);
  }, wait);
}
