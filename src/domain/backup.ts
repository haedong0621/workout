// 백업 파일(JSON) 형식. 버전 1(이전 앱)과 그대로 호환됩니다.
import { convertToCatalog } from './convertCatalog.ts';
import { clone } from '@/lib/clone';
import { DEFAULT_SETTINGS } from './constants';
import { CURRENT_SCHEMA, MIGRATIONS, migrate, type Migration, type RawData } from './migrations';
import { normalizeBody, normalizeExercise, normalizeList, normalizeRoutine, normalizeSession, normalizeSettings } from './normalize';
import type { BodyEntry, Exercise, Routine, Session, Settings } from './types';

export const BACKUP_APP = 'workout-log';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupImage { id: string; type: string; /** data: URL */ data: string }

export interface BackupFile {
  app: typeof BACKUP_APP;
  /** 파일 형식 버전(1 = 이전 앱과 같음). 이전 앱은 이 값만 확인해요 */
  version: number;
  /** 기록 모양 버전(migrations.ts의 CURRENT_SCHEMA). 없으면 1 */
  schema?: number;
  exportedAt: number;
  data: {
    exercises: Exercise[];
    routines: Routine[];
    sessions: Session[];
    body: BodyEntry[];
    settings: Partial<Settings>;
    images: BackupImage[];
  };
}

/** 백업에 넣지 않는 설정(기기마다 다른 값) */
const LOCAL_ONLY: readonly (keyof Settings)[] = ['activeSessionId', 'lastBackupAt'];

export function buildBackup(input: { exercises: Exercise[]; routines: Routine[]; sessions: Session[]; body: BodyEntry[]; settings: Settings; images: BackupImage[] }, now = Date.now()): BackupFile {
  const settings: Partial<Settings> = { ...input.settings };
  for (const k of LOCAL_ONLY) delete settings[k];
  return {
    app: BACKUP_APP,
    version: BACKUP_FORMAT_VERSION,
    schema: CURRENT_SCHEMA,
    exportedAt: now,
    data: {
      exercises: input.exercises,
      routines: input.routines,
      sessions: input.sessions.filter((s) => s.status === 'done'),
      body: input.body,
      settings,
      images: input.images,
    },
  };
}

export interface ParsedBackup {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  body: BodyEntry[];
  settings: Partial<Settings>;
  images: BackupImage[];
  counts: { exercises: number; routines: number; sessions: number; body: number; images: number };
}

export class BackupError extends Error {}

/** 백업 파일 검사 + 정리. 문제가 있으면 BackupError */
export function parseBackup(obj: unknown, migrations: readonly Migration[] = MIGRATIONS, target = CURRENT_SCHEMA): ParsedBackup {
  if (typeof obj !== 'object' || obj === null) throw new BackupError('이 앱의 백업 파일이 아니에요');
  const o = obj as Record<string, unknown>;
  if (o.app !== BACKUP_APP || typeof o.data !== 'object' || o.data === null) throw new BackupError('이 앱의 백업 파일이 아니에요');
  const schema = Number(o.schema) || 1;
  if (Number(o.version) > BACKUP_FORMAT_VERSION || schema > target) throw new BackupError('더 새로운 버전의 백업 파일이에요. 앱을 업데이트해 주세요');
  const src = o.data as Record<string, unknown>;
  const recs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : []);
  const raw: RawData = {
    exercises: recs(src.exercises), routines: recs(src.routines), sessions: recs(src.sessions), body: recs(src.body),
    settings: typeof src.settings === 'object' && src.settings ? { ...(src.settings as Record<string, unknown>) } : {},
  };
  const d: Record<string, unknown> = { ...src, ...(schema < target ? migrate(clone(raw), schema, migrations).data : raw) };
  let exercises = normalizeList(d.exercises, normalizeExercise);
  let routines = normalizeList(d.routines, normalizeRoutine);
  // 진행 중이던 운동은 가져오지 않아요
  let sessions = normalizeList(d.sessions, normalizeSession).filter((s) => s.status === 'done');
  // 예전(v2.6 이전) 기본 목록으로 만든 백업이면 새 기본 목록·이름 규칙으로 옮김
  if (raw.exercises.some((e) => e.seed === true) && !raw.exercises.some((e) => e.seed === true && !!e.toggle)) {
    ({ exercises, routines, sessions } = convertToCatalog({ exercises, routines, sessions }));
  }
  const body = normalizeList(d.body, normalizeBody);
  const images = Array.isArray(d.images)
    ? d.images.filter((im): im is BackupImage => !!im && typeof im.id === 'string' && typeof im.data === 'string' && im.data.startsWith('data:'))
    : [];
  const rawSettings = typeof d.settings === 'object' && d.settings ? Object.entries(d.settings as Record<string, unknown>) : [];
  const full = normalizeSettings(rawSettings.filter(([k]) => !LOCAL_ONLY.includes(k as keyof Settings)));
  // 파일에 실제로 있던 키만 돌려줌(없는 키로 지금 설정을 덮어쓰지 않도록)
  const settings: Partial<Settings> = {};
  for (const [k] of rawSettings) {
    if (k in DEFAULT_SETTINGS && !LOCAL_ONLY.includes(k as keyof Settings)) (settings as Record<string, unknown>)[k] = (full as unknown as Record<string, unknown>)[k];
  }
  return {
    exercises, routines, sessions, body, settings, images,
    counts: { exercises: exercises.length, routines: routines.length, sessions: sessions.length, body: body.length, images: images.length },
  };
}
