import { describe, expect, it } from 'vitest';
import { SEED } from '@/domain/seed';
import { exerciseArt } from '@/ui/exerciseArt';
import { EX_ARTS } from '@/brand/exercises/index.ts';

describe('기본 운동 그림', () => {
  it('seed-0(벤치 프레스)에 그림이 연결됨', () => {
    expect(SEED[0]![0]).toBe('벤치 프레스');
    expect(exerciseArt('seed-0')).toEqual({ url: './exercises/bench-press.png', frames: 2 });
  });
  it('그림 없는 운동·사용자 운동은 null', () => {
    expect(exerciseArt('seed-1')).toBeNull();
    expect(exerciseArt('ex-abc')).toBeNull();
    expect(exerciseArt(undefined)).toBeNull();
  });
  it('그림 원본: 프레임 크기 일정, 모든 칸이 팔레트 색', async () => {
    const { EX_PALETTE } = await import('@/brand/exercises/palette.ts');
    for (const art of EX_ARTS) {
      for (const f of art.frames) {
        const g = f();
        expect(g.length).toBe(art.size);
        for (const row of g) { expect(row.length).toBe(art.size); for (const c of row) expect(c === '.' || c in EX_PALETTE).toBe(true); }
      }
    }
  });
});
