import type { Exercise, Routine } from '@/domain/types';
import { imgURL } from '@/store';
import { exerciseArt } from './exerciseArt';

export const PART_COLOR: Record<string, string> = {
  가슴: '#ff6b6b', 등: '#5b8def', 어깨: '#2dd4bf', 팔: '#b388ff',
  하체: '#ffc14d', 복근: '#ff9f5a', 유산소: '#4dc3ff', 기타: '#9aa4b2',
};
export const partColor = (p: string): string => PART_COLOR[p] ?? PART_COLOR['기타']!;
export const EQUIP_EMOJI: Record<string, string> = { 바벨: '🏋️', 덤벨: '💪', 머신: '⚙️', 케이블: '🔗', 맨몸: '🤸', 기타: '🎯' };

export function ExThumb({ ex, size = 46, url }: { ex: Pick<Exercise, 'imageId' | 'part' | 'equip'> & { id?: string }; size?: number; url?: string | null }) {
  const src = url !== undefined ? url : imgURL(ex.imageId);
  const style: Record<string, string> = { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.46) + 'px' };
  if (src) return <div class="thumb" style={style}><img src={src} alt="" draggable={false} /></div>;
  const c = partColor(ex.part);
  const art = exerciseArt(ex.id);
  if (art) {
    return (
      <div class="thumb" style={{ ...style, background: c + '2b' }}>
        <span class={'ex-art f' + art.frames} style={{ backgroundImage: `url(${art.url})` }} />
      </div>
    );
  }
  return <div class="thumb" style={{ ...style, background: c + '2b', color: c }}><span>{EQUIP_EMOJI[ex.equip] ?? '🏋️'}</span></div>;
}

export function RoutineThumb({ r, size = 56, url }: { r: Pick<Routine, 'emoji' | 'imageId'>; size?: number; url?: string | null }) {
  const src = url !== undefined ? url : imgURL(r.imageId);
  return (
    <div class="thumb round" style={{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.5) + 'px' }}>
      {src ? <img src={src} alt="" draggable={false} /> : <span>{r.emoji || '💪'}</span>}
    </div>
  );
}

export function PartPills({ byPart, suffix = '' }: { byPart: Record<string, number>; suffix?: string }) {
  return (
    <div class="part-dots">
      {Object.entries(byPart).map(([p, n]) => <span key={p} class="part-pill" style={{ borderColor: partColor(p) }}>{p} {n}{suffix}</span>)}
    </div>
  );
}
