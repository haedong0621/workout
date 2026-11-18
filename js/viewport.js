// 아이폰 홈 화면 앱에서 position:fixed 의 "맨 아래" 기준선(앱이 실제로 그릴 수 있는 아래쪽 끝)이
// 화면 맨 아래보다 위에 있는 경우가 있어요. 그 아래쪽은 앱이 그릴 수 없는 영역이라,
// 탭바를 아래로 내리지 않고(잘려요) 보이는 영역 안에 맞춰요. 홈 인디케이터는 이미 그 영역 밖이므로 여백도 줄여요.
function probeRect(css) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;visibility:hidden;margin:0;' + css;
  document.body.append(el);
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const out = { bottom: r.bottom, pb: parseFloat(cs.paddingBottom) || 0, pt: parseFloat(cs.paddingTop) || 0 };
  el.remove();
  return out;
}

export function measureViewport() {
  const a = probeRect('left:0;bottom:0;width:1px;height:0;');
  const b = probeRect('left:0;top:0;width:1px;height:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);');
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  return { standalone, layoutBottom: Math.round(a.bottom), envTop: Math.round(b.pt), envBottom: Math.round(b.pb) };
}

export function applyViewportGap() {
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

export function screenInfo() {
  const m = measureViewport();
  const vv = window.visualViewport ? Math.round(visualViewport.height) : '-';
  const gap = getComputedStyle(document.documentElement).getPropertyValue('--vgap').trim() || '0px';
  return `${m.standalone ? '홈화면앱' : '브라우저'} · 화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight} · vv ${vv} · 하단선 ${m.layoutBottom} · 안전영역 위 ${m.envTop} 아래 ${m.envBottom} · 어긋남 ${gap}`;
}

export function initViewportGap() {
  applyViewportGap();
  addEventListener('resize', applyViewportGap);
  addEventListener('orientationchange', () => setTimeout(applyViewportGap, 300));
  addEventListener('pageshow', applyViewportGap);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyViewportGap(); });
}
