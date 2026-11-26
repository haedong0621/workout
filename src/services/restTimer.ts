// 휴식 타이머. 끝나는 시각(endAt)을 기준으로 계산해서, 앱이 잠깐 멈췄다 돌아와도 정확해요.
// 상태는 localStorage('workout-log-rest')에 저장 → 앱을 다시 열어도 이어짐(이전 버전과 같은 키·형식).
import { computed, signal } from '@preact/signals';
import { now, onTick } from './clock';

export interface RestState { endAt: number; total: number; label: string; fired: boolean }

const LS_KEY = 'workout-log-rest';
const IDLE: RestState = { endAt: 0, total: 0, label: '', fired: true };
/** 끝난 뒤 이 시간이 지나면 표시를 치움 ("휴식 끝!"을 잠깐 보여 주고 자동으로 사라짐) */
const CLEAR_AFTER_MS = 2_000;
/** 앱이 멈췄다가 이보다 늦게 깨어나면 소리를 내지 않음 */
const LATE_ALERT_MS = 4_000;

export const rest = signal<RestState>({ ...IDLE });

export const restRemainingSec = computed(() => {
  const r = rest.value;
  return r.endAt ? Math.max(0, Math.ceil((r.endAt - now.value) / 1000)) : 0;
});
export const restActive = computed(() => rest.value.endAt > 0);
export const restDone = computed(() => rest.value.endAt > 0 && rest.value.endAt <= now.value);
/** 0~1 진행률 */
export const restProgress = computed(() => {
  const r = rest.value;
  if (!r.endAt || !r.total) return 0;
  return Math.min(1, Math.max(0, 1 - (r.endAt - now.value) / (r.total * 1000)));
});

let onFinished: () => void = () => {};
/** 휴식이 끝났을 때 할 일(소리·진동·알림) 등록 */
export const setRestFinishedHandler = (fn: () => void): void => { onFinished = fn; };

function persist(): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(rest.value)); } catch { /* noop */ }
}
function set(next: RestState): void { rest.value = next; persist(); }

export function loadRest(): void {
  try {
    const o = JSON.parse(localStorage.getItem(LS_KEY) || 'null') as Partial<RestState> | null;
    if (o && typeof o.endAt === 'number' && o.endAt > Date.now() - CLEAR_AFTER_MS) {
      rest.value = { endAt: o.endAt, total: Number(o.total) || 0, label: String(o.label ?? ''), fired: !!o.fired };
    }
  } catch { /* noop */ }
}

export function startRest(sec: number, label = ''): void {
  set({ endAt: Date.now() + sec * 1000, total: sec, label, fired: false });
}

export function addRest(deltaSec: number): void {
  const r = rest.value;
  if (!r.endAt) return;
  const endAt = r.endAt + deltaSec * 1000;
  if (endAt <= Date.now()) { stopRest(); return; }
  set({ ...r, endAt, total: Math.max(1, r.total + deltaSec), fired: false });
}

export function stopRest(): void { set({ ...IDLE }); }

export function tickRest(t = Date.now()): void {
  const r = rest.value;
  if (!r.endAt) return;
  if (!r.fired && t >= r.endAt) {
    set({ ...r, fired: true });
    if (t - r.endAt < LATE_ALERT_MS) onFinished();
  } else if (r.fired && t - r.endAt > CLEAR_AFTER_MS) {
    stopRest();
  }
}

export function initRestTimer(): void {
  loadRest();
  onTick(tickRest);
}
