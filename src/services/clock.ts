// 0.5초마다 바뀌는 "지금" 시각. 시계·타이머 표시는 이 값을 읽으면 자동으로 갱신돼요.
import { signal } from '@preact/signals';

export const now = signal(Date.now());
const tickers = new Set<(t: number) => void>();
let handle: ReturnType<typeof setInterval> | null = null;

/** 매 틱마다 실행할 함수 등록(해제 함수 반환) */
export function onTick(fn: (t: number) => void): () => void {
  tickers.add(fn);
  return () => { tickers.delete(fn); };
}

export function startClock(intervalMs = 500): void {
  if (handle) return;
  const tick = () => {
    const t = Date.now();
    for (const f of tickers) { try { f(t); } catch (e) { console.error(e); } }
    now.value = t;
  };
  handle = setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
