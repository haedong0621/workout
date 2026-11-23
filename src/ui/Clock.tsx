import { fmtClock } from '@/lib/format';
import { now } from '@/services/clock';

/** since 이후 지난 시간(0.5초마다 갱신). 이 컴포넌트만 다시 그려져요 */
export function Elapsed({ since, class: cls = 'mono' }: { since: number; class?: string }) {
  return <span class={cls}>{fmtClock((now.value - since) / 1000)}</span>;
}
