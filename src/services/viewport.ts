// 아이폰 홈 화면 앱에서 position:fixed 의 "맨 아래" 기준선(앱이 실제로 그릴 수 있는 아래쪽 끝)이
// 화면 맨 아래보다 위에 있는 경우가 있어요. 그 아래쪽은 앱이 그릴 수 없는 영역이라,
// 탭바를 아래로 내리지 않고(잘려요) 보이는 영역 안에 맞춰요. 홈 인디케이터는 이미 그 영역 밖이므로 여백도 줄여요.
// (v1.0.6에서 사용자 확인: 잘리지 않음. 동작을 바꿀 땐 아이폰 스크린샷으로 확인하세요)
function probeRect(css: string) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;visibility:hidden;margin:0;' + css;
  document.body.append(el);
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const out = { bottom: r.bottom, pb: parseFloat(cs.paddingBottom) || 0, pt: parseFloat(cs.paddingTop) || 0 };
  el.remove();
  return out;
}

export const isStandalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
export const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function measureViewport() {
  const a = probeRect('left:0;bottom:0;width:1px;height:0;');
  const b = probeRect('left:0;top:0;width:1px;height:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);');
  return { standalone: isStandalone(), layoutBottom: Math.round(a.bottom), envTop: Math.round(b.pt), envBottom: Math.round(b.pb) };
}

export function applyViewportGap(): void {
  const root = document.documentElement;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return; // 키보드가 올라온 동안엔 건드리지 않아요
  root.style.removeProperty('--sab');
  const m = measureViewport();
  const portrait = innerHeight > innerWidth;
  const gap = m.standalone && portrait ? Math.round(screen.height - m.layoutBottom) : 0;
  if (gap >= 20 && gap <= 120) {
    root.style.setProperty('--sab', Math.max(0, Math.min(m.envBottom, 34) - gap) + 'px');
    root.style.setProperty('--vgap', gap + 'px');
  } else {
    root.style.setProperty('--vgap', '0px');
  }
}

/** 설정 화면 맨 아래 진단 문자열 (아이폰 화면 문제 확인용) */
export function screenInfo(): string {
  const m = measureViewport();
  const vv = window.visualViewport ? Math.round(window.visualViewport.height) : '-';
  const gap = getComputedStyle(document.documentElement).getPropertyValue('--vgap').trim() || '0px';
  return `${m.standalone ? '홈화면앱' : '브라우저'} · 화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · vv ${vv} · 하단선 ${m.layoutBottom} · 안전영역 위 ${m.envTop} 아래 ${m.envBottom} · 어긋남 ${gap}`;
}

export function initViewport(): void {
  applyViewportGap();
  addEventListener('resize', applyViewportGap);
  addEventListener('orientationchange', () => setTimeout(applyViewportGap, 300));
  addEventListener('pageshow', applyViewportGap);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyViewportGap(); });
}
