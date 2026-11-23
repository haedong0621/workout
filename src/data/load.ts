// 저장소에서 읽어 와서 → 마이그레이션 → 정리(normalize)까지
import { normalizeBody, normalizeExercise, normalizeList, normalizeRoutine, normalizeSession, normalizeSettings } from '@/domain/normalize';
import type { AppData, ImageRecord } from '@/domain/types';
import { CURRENT_SCHEMA, MIGRATIONS, migrate, type Migration, type RawData } from '@/domain/migrations';
import type { Repository } from './repository';
import { META_SCHEMA_VERSION } from './schema';

export interface LoadResult {
  data: AppData;
  images: ImageRecord[];
  schemaVersion: number;
  migrated: number[];
}

const asRecords = (list: unknown[]): Record<string, unknown>[] => list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);

export async function loadAppData(repo: Repository, migrations: readonly Migration[] = MIGRATIONS, target = CURRENT_SCHEMA): Promise<LoadResult> {
  const raw = await repo.loadAll();
  const metaMap = new Map(raw.meta);
  const stored = Number(metaMap.get(META_SCHEMA_VERSION)) || 1;
  let rawData: RawData = {
    exercises: asRecords(raw.exercises), routines: asRecords(raw.routines),
    sessions: asRecords(raw.sessions), body: asRecords(raw.body),
    settings: Object.fromEntries(raw.meta.filter(([k]) => k !== META_SCHEMA_VERSION)),
  };
  let applied: number[] = [];
  let version = stored;
  if (stored < target) {
    const r = migrate(rawData, stored, migrations);
    rawData = r.data; applied = r.applied; version = Math.max(r.version, target);
  }

  const data: AppData = {
    exercises: normalizeList(rawData.exercises, normalizeExercise),
    routines: normalizeList(rawData.routines, normalizeRoutine),
    sessions: normalizeList(rawData.sessions, normalizeSession),
    body: normalizeList(rawData.body, normalizeBody),
    settings: normalizeSettings(Object.entries(rawData.settings)),
  };

  if (version !== stored) {
    if (applied.length) {
      await repo.replaceCollections({ exercises: data.exercises, routines: data.routines, sessions: data.sessions, body: data.body });
      for (const [k, v] of Object.entries(data.settings)) await repo.setMeta(k, v);
    }
    await repo.setMeta(META_SCHEMA_VERSION, version);
  }
  return { data, images: raw.images, schemaVersion: version, migrated: applied };
}
