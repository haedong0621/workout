import { signal } from '@preact/signals';

interface ToastState { id: number; msg: string; action?: { label: string; fn: () => void } | undefined; show: boolean }
const toastState = signal<ToastState | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

export function toast(msg: string, { ms = 2200, action }: { ms?: number; action?: { label: string; fn: () => void } } = {}): void {
  clearTimeout(timer);
  toastState.value = { id: ++seq, msg, action, show: true };
  timer = setTimeout(hideToast, ms);
}

function hideToast(): void {
  if (toastState.value) toastState.value = { ...toastState.value, show: false };
}

export function ToastHost() {
  const t = toastState.value;
  return (
    <div class={'toast' + (t?.show ? ' show' : '')} role="status">
      {t && <span>{t.msg}</span>}
      {t?.action && (
        <button class="toast-act" type="button" onClick={() => { hideToast(); t.action?.fn(); }}>{t.action.label}</button>
      )}
    </div>
  );
}
