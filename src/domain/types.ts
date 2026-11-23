// 앱 전체에서 쓰는 데이터 모양. IndexedDB·백업 파일에 이 모양 그대로 저장됩니다.
// ⚠️ 필드 이름을 바꾸거나 지우면 기존 폰의 기록과 백업 파일을 못 읽어요.
//    바꿔야 하면 src/domain/migrations.ts 에 변환 단계를 추가하세요.

export type ExerciseKind = 'normal' | 'assist' | 'bodyweight';
export type SetType = 'N' | 'W' | 'F' | 'D';

export interface Exercise {
  id: string;
  name: string;
  part: string;
  equip: string;
  kind: ExerciseKind;
  /** 종목별 휴식(초). null이면 기본값 사용 */
  rest: number | null;
  imageId: string | null;
  memo: string;
  /** 메모를 마지막으로 고친 시각 */
  memoAt: number | null;
  fav: boolean;
  /** 고정해 둔 지난 기록(세션 id) */
  pinned: string[];
  /** 기본 제공 운동인지 */
  seed: boolean;
  createdAt: number;
}

export interface RoutineItem {
  exerciseId: string;
  setCount: number;
}

export interface Routine {
  id: string;
  name: string;
  emoji: string;
  imageId: string | null;
  createdAt: number;
  items: RoutineItem[];
  /** 속한 그룹(Settings.routineGroups 의 id). 없으면 그룹 밖 */
  groupId?: string | null;
  /** 홈에서 끌어서 정한 순서(작을수록 위). 없으면 최근에 한 순 */
  order?: number;
}

/** 루틴 그룹 — 사용자가 직접 만들고 이름 짓는 묶음 */
export interface RoutineGroup {
  id: string;
  name: string;
}

export interface WorkoutSet {
  /** 입력 무게(kg). 어시스트는 핀 무게, 체중 운동은 추가 무게 */
  w: number;
  /** 횟수 */
  r: number;
  t: SetType;
  done: boolean;
}

/** 운동 기록 안의 종목. 이름·부위 등은 기록한 시점 값으로 복사해 둡니다. */
export interface SessionItem {
  exerciseId: string;
  name: string;
  part: string;
  equip: string;
  kind: ExerciseKind;
  sets: WorkoutSet[];
}

export type SessionStatus = 'active' | 'done';

export interface Session {
  id: string;
  name: string;
  routineId: string | null;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  /** 볼륨 계산에 쓴 체중 */
  bw: number;
  items: SessionItem[];
}

export interface BodyEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  weight?: number;
  muscle?: number;
  fat?: number;
}

export type BodyMetric = 'weight' | 'muscle' | 'fat';

export type SoundMode = 'mix' | 'loud';

export interface Settings {
  restDefault: number;
  restAuto: boolean;
  sound: boolean;
  soundMode: SoundMode;
  notify: boolean;
  keepAwake: boolean;
  includeWarmup: boolean;
  lastBackupAt: number;
  activeSessionId: string | null;
  seeded: boolean;
  bodyweight: number;
  iosTipDismissed: boolean;
  /** 루틴 그룹 목록(보이는 순서) */
  routineGroups: RoutineGroup[];
  /** 접어 둔 그룹 id */
  collapsedGroups: string[];
}

export interface ImageRecord {
  id: string;
  blob: Blob;
  type: string;
}

/** 메모리에 올려 두는 전체 데이터 */
export interface AppData {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  body: BodyEntry[];
  settings: Settings;
}

export type CollectionName = 'exercises' | 'routines' | 'sessions' | 'body';
export interface CollectionMap {
  exercises: Exercise;
  routines: Routine;
  sessions: Session;
  body: BodyEntry;
}
