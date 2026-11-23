// 서비스 워커 등록 + 새 버전 안내
// 새 서비스 워커가 페이지를 넘겨받았을 때, 지금 실행 중인 코드가 그 버전에 없으면(= 옛 코드) 새로고침을 안내해요.

/** 지금 실행 중인 코드 파일(해시가 붙은 이름)이 활성 서비스 워커 버전에 들어 있는지 */
function controllerHasCurrentCode(): Promise<boolean | null> {
  const ctl = navigator.serviceWorker.controller;
  if (!ctl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    ch.port1.onmessage = (e: MessageEvent<{ has?: boolean }>) => { clearTimeout(timer); resolve(!!e.data?.has); };
    ctl.postMessage({ type: 'has-asset', url: import.meta.url }, [ch.port2]);
  });
}

export function registerServiceWorker(onUpdate: () => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let notified = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (notified) return;
    void controllerHasCurrentCode().then((has) => {
      if (has === false && !notified) { notified = true; onUpdate(); }
    });
  });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // 앱으로 돌아올 때마다 새 버전 확인
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void reg.update().catch(() => {}); });
  }).catch((e) => console.warn('SW 등록 실패', e));
}
