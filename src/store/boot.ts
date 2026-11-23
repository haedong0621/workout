// 저장소 열기 → 읽기 → 상태 채우기
import { IdbRepository } from '@/data/idbRepository';
import { loadAppData } from '@/data/load';
import { MemoryRepository } from '@/data/memoryRepository';
import type { Repository } from '@/data/repository';
import { initStore, setSetting, storageInfo } from './core';
import { initImages } from './images';
import { seedIfNeeded } from './backup';
import { activeSession } from './selectors';

export async function bootStore(open: () => Promise<Repository> = () => IdbRepository.open()): Promise<void> {
  let repo: Repository;
  try { repo = await open(); } catch (e) {
    console.warn('저장소를 열 수 없어 임시 저장소를 써요', e);
    repo = new MemoryRepository();
  }
  let loaded;
  try { loaded = await loadAppData(repo); } catch (e) {
    console.error('기록을 읽지 못했어요', e);
    repo = new MemoryRepository();
    loaded = await loadAppData(repo);
  }
  initStore(repo, loaded.data);
  initImages(loaded.images);
  seedIfNeeded();
  // 가리키는 진행 중 운동이 없어졌으면 정리
  if (loaded.data.settings.activeSessionId && !activeSession.value) void setSetting('activeSessionId', null);
  void requestPersist();
}

async function requestPersist(): Promise<void> {
  try {
    let persisted = (await navigator.storage?.persisted?.()) ?? false;
    if (!persisted && navigator.storage?.persist) persisted = await navigator.storage.persist();
    storageInfo.value = { ...storageInfo.value, persisted };
  } catch { /* noop */ }
}
