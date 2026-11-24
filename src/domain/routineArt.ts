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
