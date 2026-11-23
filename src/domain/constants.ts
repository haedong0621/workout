import type { ExerciseKind, SetType, Settings } from './types';

export const PARTS = ['가슴', '등', '어깨', '팔', '하체', '복근', '유산소', '기타'] as const;
export const EQUIPS = ['바벨', '덤벨', '머신', '케이블', '맨몸', '기타'] as const;

export const KINDS: Record<ExerciseKind, string> = { normal: '일반', assist: '어시스트', bodyweight: '체중+추가' };
export const KIND_HELP: Record<ExerciseKind, string> = {
  normal: '입력한 무게 그대로 볼륨을 계산해요',
  assist: '어시스트 머신: 핀 무게를 입력하면 (내 체중 − 핀 무게)로 볼륨을 계산해요',
  bodyweight: '풀업·딥스처럼 맨몸으로 하는 운동: (내 체중 + 추가 무게)로 볼륨을 계산해요',
};

export const SET_TYPES: Record<SetType, string> = { N: '일반', W: '웜업', F: '실패', D: '드롭' };
export const SET_TYPE_KEYS = Object.keys(SET_TYPES) as SetType[];

export const DEFAULT_SET_COUNT = 3;
export const DEFAULT_REPS = 10;
export const MAX_SET_COUNT = 20;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  restDefault: 90,
  restAuto: true,
  sound: true,
  soundMode: 'mix',
  notify: false,
  keepAwake: true,
  includeWarmup: true,
  lastBackupAt: 0,
  activeSessionId: null,
  seeded: false,
  bodyweight: 0,
  iosTipDismissed: false,
  routineGroups: [],
  collapsedGroups: [],
});

export const ROUTINE_EMOJIS = ['💪', '🏋️', '🔥', '⚡', '🦵', '🍑', '🫁', '🦾', '🧘', '🏃', '🚴', '🤸', '🥇', '🎯', '🧱', '🦍', '🐺', '🦁', '🐯', '🚀', '🌙', '☀️', '🍖', '😤'];
export const DEFAULT_ROUTINE_EMOJI = '💪';

export const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180, 240];
