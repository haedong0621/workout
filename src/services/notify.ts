// 배너 알림 (앱이 백그라운드에서 살아 있을 때만 동작)
export const notifySupported = (): boolean => typeof Notification !== 'undefined';

export async function ensureNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export const notifyGranted = (): boolean => notifySupported() && Notification.permission === 'granted';

export async function showNotification(title: string, body: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: 'rest', icon: 'icons/icon-192.png' });
    else new Notification(title, { body });
  } catch { /* noop */ }
}
