// 백업 파일 만들기 / 불러오기 / 전체 삭제
import { batch } from '@preact/signals';
import { buildBackup, parseBackup, type BackupFile, type ParsedBackup } from '@/domain/backup';
import { DEFAULT_SETTINGS } from '@/domain/constants';
import { seedExercises } from '@/domain/seed';
import type { Settings } from '@/domain/types';
import { blobToDataURL, dataURLToBlob } from '@/services/imageFile';
import { stopRest } from '@/services/restTimer';
import { body, exercises, flush, getRepo, putMany, resetCollections, routines, sessions, setSetting, settings } from './core';
import { imageURLs, initImages, revokeAll } from './images';

export async function exportBackup(): Promise<BackupFile> {
  await flush();
  const images = [];
  for (const im of await getRepo().allImages()) images.push({ id: im.id, type: im.type || im.blob.type, data: await blobToDataURL(im.blob) });
  return buildBackup({
    exercises: exercises.value, routines: routines.value, sessions: sessions.value,
    body: body.value, settings: settings.value, images,
  });
}

export { parseBackup };
export type ImportMode = 'merge' | 'replace';

/**
 * merge: 지금 기록에 합치기(같은 id는 파일 내용으로 덮어씀)
 * replace: 지금 기기의 기록을 모두 지우고 파일 내용으로
 */
export async function importBackup(p: ParsedBackup, mode: ImportMode): Promise<void> {
  await flush();
  const repo = getRepo();
  if (mode === 'replace') {
    await repo.clearAll({ keepMeta: true });
    revokeAll();
    resetCollections();
    stopRest();
    await setSetting('activeSessionId', null);
  }
  const known = new Set(Object.keys(imageURLs.value));
  for (const im of p.images) {
    if (known.has(im.id)) continue;
    const blob = await dataURLToBlob(im.data);
    await repo.putImage({ id: im.id, blob, type: im.type || blob.type });
  }
  initImages(await repo.allImages());
  batch(() => {
    putMany('exercises', p.exercises);
    putMany('routines', p.routines);
    putMany('sessions', p.sessions);
    putMany('body', p.body);
  });
  for (const [k, v] of Object.entries(p.settings) as [keyof Settings, Settings[keyof Settings]][]) void setSetting(k, v as never);
  void setSetting('seeded', true);
  await flush();
}

export async function wipeAll(): Promise<void> {
  await flush();
  await getRepo().clearAll();
  revokeAll();
  stopRest();
  batch(() => {
    resetCollections();
    settings.value = { ...DEFAULT_SETTINGS };
  });
  try { localStorage.removeItem('workout-log-rest'); } catch { /* noop */ }
  seedIfNeeded();
  await flush();
}

/** 처음 설치 때 기본 운동 54개를 한 번만 넣음 */
export function seedIfNeeded(): void {
  if (settings.value.seeded) return;
  if (exercises.value.length === 0) putMany('exercises', seedExercises());
  void setSetting('seeded', true);
}

