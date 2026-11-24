// 루틴 그림: 정해진 11종 + 운동 부위로 자동 추천 (순수 함수)
import type { Exercise, RoutineItem } from './types';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs' | 'calves';

export interface RoutineArt {
  id: string;
  label: string;
  view: 'front' | 'back';
  hl: MuscleGroup[];
  heart?: boolean;
}

const UPPER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs'];

/** 고르는 화면 순서 그대로 */
export const ROUTINE_ARTS: readonly RoutineArt[] = [
  { id: 'full', label: '전신', view: 'front', hl: [...UPPER, 'legs'] },
  { id: 'upper', label: '상체 전체', view: 'front', hl: UPPER },
  { id: 'lower', label: '하체 전체', view: 'front', hl: ['legs'] },
  { id: 'cardio', label: '유산소', view: 'front', hl: [], heart: true },
  { id: 'chest', label: '가슴', view: 'front', hl: ['chest'] },
  { id: 'back', label: '등', view: 'back', hl: ['back'] },
  { id: 'shoulders', label: '어깨', view: 'front', hl: ['shoulders'] },
  { id: 'biceps', label: '이두', view: 'front', hl: ['biceps'] },
  { id: 'triceps', label: '삼두', view: 'back', hl: ['triceps'] },
  { id: 'arms', label: '팔 전체', view: 'front', hl: ['biceps', 'triceps', 'forearms'] },
  { id: 'abs', label: '복근', view: 'front', hl: ['abs'] },
];

export const routineArtById = (id: string | null | undefined): RoutineArt | undefined => ROUTINE_ARTS.find((a) => a.id === id);

const PART_ART: Record<string, string> = { 가슴: 'chest', 등: 'back', 어깨: 'shoulders', 하체: 'lower', 복근: 'abs', 유산소: 'cardio' };
const UPPER_PARTS = new Set(['가슴', '등', '어깨', '팔', '복근']);
const BICEPS = /컬/;
const TRICEPS = /트라이셉스|푸시다운|킥백|클로즈 그립|딥스/;

type ExLike = Pick<Exercise, 'name' | 'part'>;

/**
 * 루틴 운동으로 그림 추천 (세트 수로 비중 계산)
 * - 기타는 빼고, 유산소만 있으면 유산소. 다른 부위가 있으면 유산소·복근은 비중에서 뺌
 * - 한 부위가 70% 이상이면 그 부위(하체 → 하체 전체, 팔 → 이두/삼두/팔 전체)
 * - 아니면 하체와 상체가 섞이면 전신, 상체끼리면 상체 전체
 */
export function recommendArt(items: readonly Pick<RoutineItem, 'exerciseId' | 'setCount'>[], exercises: ReadonlyMap<string, ExLike>): string {
  const rows = items.map((it) => ({ ex: exercises.get(it.exerciseId), n: Math.max(1, it.setCount || 1) }))
    .filter((r): r is { ex: ExLike; n: number } => !!r.ex && r.ex.part !== '기타');
  if (!rows.length) return 'full';
  const parts = new Set(rows.map((r) => r.ex.part));
  if (parts.size === 1 && parts.has('유산소')) return 'cardio';
  if (parts.size === 1 && parts.has('복근')) return 'abs';
  const main = rows.filter((r) => r.ex.part !== '유산소' && (r.ex.part !== '복근' || [...parts].every((p) => p === '복근' || p === '유산소')));
  const by = new Map<string, number>();
  for (const r of main) by.set(r.ex.part, (by.get(r.ex.part) ?? 0) + r.n);
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  const [top, n] = [...by.entries()].sort((a, b) => b[1] - a[1])[0]!;
  if (n / total >= 0.7) {
    if (top !== '팔') return PART_ART[top] ?? 'full';
    const arm = main.filter((r) => r.ex.part === '팔');
    if (arm.every((r) => BICEPS.test(r.ex.name))) return 'biceps';
    if (arm.every((r) => TRICEPS.test(r.ex.name))) return 'triceps';
    return 'arms';
  }
  const upper = [...by.keys()].some((p) => UPPER_PARTS.has(p));
  return by.has('하체') && upper ? 'full' : upper ? 'upper' : 'full';
}
