// 아이폰 홈 화면 앱에서 position:fixed 의 "맨 아래" 기준선이 실제 화면보다 짧게 잡히는 경우를 보정해요.
// 실제로 재 보고(화면 높이 - 기준선), 어긋남이 있을 때만 --vgap 으로 아래쪽 고정 요소를 내려 줘요.
function measure() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:0;visibility:hidden;margin:0;padding:0';
  document.body.append(probe);
  const bottom = probe.getBoundingClientRect().bottom;
  probe.remove();
  return bottom;
}

export function applyViewportGap() {
  const root = document.documentElement;
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const portrait = innerHeight > innerWidth;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return; // 키보드가 올라온 동안엔 건드리지 않아요
  let gap = 0;
  if (standalone && portrait) {
    root.style.setProperty('--vgap', '0px');
    const bottom = measure();
    const g = Math.round(screen.height - bottom);
    if (g >= 20 && g <= 80) gap = g; // 상태바 높이 정도의 어긋남일 때만
  }
  root.style.setProperty('--vgap', gap + 'px');
}

export function initViewportGap() {
  applyViewportGap();
  addEventListener('resize', applyViewportGap);
  addEventListener('orientationchange', () => setTimeout(applyViewportGap, 300));
  addEventListener('pageshow', applyViewportGap);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyViewportGap(); });
}
