// 루틴 그림 고르기: 정해진 11종 중 하나 (운동 부위로 추천한 그림에 "추천" 표시)
import { ROUTINE_ARTS } from '@/domain/routineArt';

export function ArtPicker({ current, recommended, onPick }: { current: string | null; recommended: string; onPick: (id: string) => void }) {
  return (
    <div class="art-grid">
      {ROUTINE_ARTS.map((a) => (
        <button key={a.id} type="button" class={'art-cell' + (a.id === current ? ' on' : '')} aria-pressed={a.id === current} onClick={() => onPick(a.id)}>
          <img src={`./routines/${a.id}.png`} alt="" draggable={false} />
          <span class="art-label">{a.label}</span>
          {a.id === recommended && <span class="art-rec">추천</span>}
        </button>
      ))}
    </div>
  );
}
