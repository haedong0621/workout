import { describe, expect, it } from 'vitest';
import { SEED } from '@/domain/seed';
import { exerciseArt } from '@/ui/exerciseArt';
import { EX_ARTS } from '@/brand/exercises/index.ts';

describe('기본 운동 그림', () => {
  it('기본 운동에 그림 연결, 토글 옵션마다 다른 그림', () => {
    expect(SEED[0]![0]).toBe('벤치 프레스');
    expect(exerciseArt('seed-0')).toEqual({ url: './exercises/bench-press.png', frames: 2 });
    expect(exerciseArt('seed-0', '바벨')).toEqual({ url: './exercises/bench-press.png', frames: 2 });
    expect(exerciseArt('seed-0', '스미스')).toEqual({ url: './exercises/bench-press-smith.png', frames: 2 });
    expect(exerciseArt('seed-5', '플레이트')?.url).toBe('./exercises/machine-chest-press-plate.png');
    expect(exerciseArt('seed-31', '이지바')?.url).toBe('./exercises/barbell-curl-ez.png');
    expect(exerciseArt('seed-11', '중량')?.url).toBe('./exercises/dips.png');      // 맨몸은 한 장
  });
  it('직접 만든 운동은 그림 없음(사진·이모지)', () => {
    expect(exerciseArt('ex-abc')).toBeNull();
    expect(exerciseArt(undefined)).toBeNull();
  });
  it('그림 원본: 프레임 크기 일정, 모든 칸이 팔레트 색 (종류별 한 장씩)', async () => {
    const { EX_PALETTE } = await import('@/brand/exercises/palette.ts');
    const pick = ['bench-press', 'machine-chest-press-plate', 'barbell-curl-ez'];
    for (const id of pick) {
      const art = EX_ARTS.find((a) => a.id === id)!;
      expect(art).toBeTruthy();
      for (const f of art.frames) {
        const g = f();
        expect(g.length).toBe(art.size);
        for (const row of g) { expect(row.length).toBe(art.size); for (const c of row) expect(c === '.' || c in EX_PALETTE).toBe(true); }
      }
    }
  }, 60000);
  it('모든 기본 운동·토글 옵션에 그림이 있음 (그림 id 겹침 없음)', async () => {
    const { CATALOG_ART, OPTION_SUFFIX } = await import('@/brand/exercises/catalogArt.ts');
    const { CATALOG, TOGGLE_OPTIONS } = await import('@/domain/catalog');
    const ids = new Set(EX_ARTS.map((a) => a.id));
    expect(ids.size).toBe(EX_ARTS.length);
    for (const e of CATALOG) {
      const base = CATALOG_ART[e.id]!;
      expect(ids.has(base), e.name).toBe(true);
      if (e.toggle && e.toggle !== 'body') for (const o of TOGGLE_OPTIONS[e.toggle].slice(1)) expect(ids.has(base + OPTION_SUFFIX[o]), e.name + ' ' + o).toBe(true);
    }
  });
});
