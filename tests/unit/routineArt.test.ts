import { describe, expect, it } from 'vitest';
import { CATALOG } from '@/domain/catalog';
import { normalizeRoutine } from '@/domain/normalize';
import { ROUTINE_ARTS, recommendArt } from '@/domain/routineArt';
import { PICTO_H, drawPicto } from '@/brand/routines/pictogram.ts';

const ex = new Map(CATALOG.map((e) => [e.id, e]));
const id = (name: string) => CATALOG.find((e) => e.name === name)!.id;
const items = (...rows: [string, number][]) => rows.map(([n, setCount]) => ({ exerciseId: id(n), setCount }));

describe('루틴 그림', () => {
  it('11종, id 겹침 없음, 그림이 그려짐', () => {
    expect(ROUTINE_ARTS.map((a) => a.label)).toEqual(['전신', '상체 전체', '하체 전체', '유산소', '가슴', '등', '어깨', '이두', '삼두', '팔 전체', '복근']);
    expect(new Set(ROUTINE_ARTS.map((a) => a.id)).size).toBe(11);
    for (const a of ROUTINE_ARTS) {
      const g = drawPicto(a);
      expect(g.length).toBe(PICTO_H);
      expect(g.flat().includes('r')).toBe(a.hl.length > 0 || !!a.heart); // 강조(또는 하트)가 보임
    }
  });

  it('한 부위면 그 부위 (하체 → 하체 전체)', () => {
    expect(recommendArt(items(['바벨 벤치 프레스', 4], ['덤벨 플라이', 3]), ex)).toBe('chest');
    expect(recommendArt(items(['바벨 스쿼트', 5]), ex)).toBe('lower');
    expect(recommendArt(items(['크런치', 3]), ex)).toBe('abs');
  });

  it('팔: 컬만 → 이두, 삼두 운동만 → 삼두, 섞이면 팔 전체', () => {
    expect(recommendArt(items(['바벨 컬', 3], ['덤벨 해머 컬', 3]), ex)).toBe('biceps');
    expect(recommendArt(items(['케이블 푸시다운', 3], ['덤벨 킥백', 3]), ex)).toBe('triceps');
    expect(recommendArt(items(['바벨 컬', 3], ['케이블 푸시다운', 3]), ex)).toBe('arms');
  });

  it('70% 넘는 부위가 없으면 상체 전체 / 하체가 섞이면 전신', () => {
    expect(recommendArt(items(['바벨 벤치 프레스', 4], ['케이블 푸시다운', 3]), ex)).toBe('upper');
    expect(recommendArt(items(['바벨 벤치 프레스', 8], ['케이블 푸시다운', 3]), ex)).toBe('chest');
    expect(recommendArt(items(['바벨 벤치 프레스', 4], ['바벨 스쿼트', 4]), ex)).toBe('full');
  });

  it('복근·유산소는 곁들임으로 보고 빼고, 유산소만 있으면 유산소', () => {
    expect(recommendArt(items(['바벨 스쿼트', 4], ['크런치', 4]), ex)).toBe('lower');
    const withRun = new Map<string, { name: string; part: string }>([...ex, ['run', { name: '러닝머신', part: '유산소' }]]);
    expect(recommendArt([{ exerciseId: 'run', setCount: 1 }], withRun)).toBe('cardio');
    expect(recommendArt([{ exerciseId: 'run', setCount: 1 }, ...items(['바벨 벤치 프레스', 3])], withRun)).toBe('chest');
    expect(recommendArt([], ex)).toBe('full');
  });

  it('기록 정리: 모르는 그림 id는 버림', () => {
    const base = { id: 'r1', name: '가슴', emoji: '💪', imageId: null, createdAt: 1, items: [] };
    expect(normalizeRoutine({ ...base, art: 'chest' })!.art).toBe('chest');
    expect(normalizeRoutine({ ...base, art: 'nope' })!.art).toBeNull();
    expect(normalizeRoutine(base)!.art).toBeNull();
  });
});
