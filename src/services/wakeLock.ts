// 운동 중 화면 켜짐 유지
let wl: WakeLockSentinel | null = null;

export async function setWakeLock(on: boolean): Promise<void> {
  try {
    if (on && 'wakeLock' in navigator && !document.hidden) {
      if (!wl) {
        wl = await navigator.wakeLock.request('screen');
        wl.addEventListener('release', () => { wl = null; });
      }
    } else if (!on && wl) {
      await wl.release();
      wl = null;
    }
  } catch { /* 지원 안 함/거부 */ }
}
