import type { WorkoutSet } from '@/domain/types';
import { fmtNum } from '@/lib/format';

export const setChipText = (x: Pick<WorkoutSet, 't' | 'w' | 'r'>): string => (x.t !== 'N' ? x.t + ' ' : '') + `${fmtNum(x.w)}×${x.r}`;

export function SetChips({ sets, big, onPick }: { sets: readonly WorkoutSet[]; big?: boolean; onPick?: (i: number) => void }) {
  return (
    <div class={'set-chips' + (big ? ' big' : '')}>
      {sets.map((x, i) => onPick
        ? <button key={i} class={'set-chip btn-chip t-' + x.t} type="button" onClick={() => onPick(i)}>{setChipText(x)}</button>
        : <span key={i} class={'set-chip t-' + x.t}>{setChipText(x)}</span>)}
    </div>
  );
}
