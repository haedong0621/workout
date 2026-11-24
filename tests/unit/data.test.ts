import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IdbRepository } from '@/data/idbRepository';
import { loadAppData } from '@/data/load';
import { MemoryRepository } from '@/data/memoryRepository';
import { migrate, type Migration } from '@/domain/migrations';
import { parseBackup } from '@/domain/backup';
import { DB_NAME } from '@/data/schema';
import v1 from '../fixtures/v1-backup.json';

/** 이전 앱이 IndexedDB에 저장하던 그대로 넣기 */
async function seedLikeOldApp(name: string) {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      for (const s of ['exercises', 'routines', 'sessions', 'body', 'images']) r.result.createObjectStore(s, { keyPath: 'id' });
      r.result.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = db.transaction(['exercises', 'routines', 'sessions', 'body', 'meta'], 'readwrite');
  const d = v1.data;
  for (const s of ['exercises', 'routines', 'sessions', 'body'] as const) for (const o of d[s]) tx.objectStore(s).put(o);
  for (const [key, value] of Object.entries(d.settings)) tx.objectStore('meta').put({ key, value });
  tx.objectStore('meta').put({ key: 'activeSessionId', value: null });
  await new Promise((r) => { tx.oncomplete = r; });
  db.close();
}

let n = 0;
let dbName = '';
beforeEach(() => { dbName = `${DB_NAME}-test-${++n}`; });

describe('IndexedDB 저장소', () => {
  it('이전 앱이 저장한 DB를 그대로 읽음', async () => {
    await seedLikeOldApp(dbName);
    const repo = await IdbRepository.open(dbName);
    const { data, schemaVersion, migrated } = await loadAppData(repo);
    expect(data.exercises).toHaveLength(55);
    expect(data.sessions).toHaveLength(2);
    expect(data.settings.restDefault).toBe(75);
    expect(data.settings.includeWarmup).toBe(false);
    // v2(이지바 토글) 단계는 예전 목록 데이터에는 아무것도 바꾸지 않음
    expect(schemaVersion).toBe(2);
    expect(migrated).toEqual([2]);
    expect(data.exercises.find((e) => e.id === 'seed-0')!.name).toBe('벤치 프레스');
  });

  it('put / delete / clearAll', async () => {
    const repo = await IdbRepository.open(dbName);
    await repo.put('body', { id: 'b1', date: '2026-01-01', weight: 80 });
    await repo.setMeta('restDefault', 60);
    let all = await repo.loadAll();
    expect(all.body).toEqual([{ id: 'b1', date: '2026-01-01', weight: 80 }]);
    expect(all.meta).toContainEqual(['restDefault', 60]);
    await repo.delete('body', 'b1');
    await repo.clearAll({ keepMeta: true });
    all = await repo.loadAll();
    expect(all.body).toEqual([]);
    expect(all.meta).toContainEqual(['restDefault', 60]);
    await repo.clearAll();
    expect((await repo.loadAll()).meta).toEqual([]);
  });
});

describe('마이그레이션', () => {
  const m2: Migration = { version: 2, description: '세트에 메모 추가', up(d) { for (const s of d.sessions) for (const it of s.items as { sets: Record<string, unknown>[] }[]) for (const x of it.sets) x.note = ''; } };
  const m3: Migration = { version: 3, description: '루틴 이름 다듬기', up(d) { return { ...d, routines: d.routines.map((r) => ({ ...r, name: String(r.name).trim() })) }; } };

  it('저장된 버전보다 높은 단계만 순서대로', () => {
    const base = { exercises: [], routines: [{ name: ' a ' }], sessions: [], body: [], settings: {} };
    expect(migrate(structuredClone(base), 1, [m3, m2]).applied).toEqual([2, 3]);
    expect(migrate(structuredClone(base), 2, [m3, m2]).applied).toEqual([3]);
    expect(migrate(structuredClone(base), 3, [m3, m2]).applied).toEqual([]);
  });

  it('앱을 열 때 한 번 적용되고 결과·버전이 저장됨', async () => {
    await seedLikeOldApp(dbName);
    const repo = await IdbRepository.open(dbName);
    const first = await loadAppData(repo, [m2], 2);
    expect(first.migrated).toEqual([2]);
    expect((first.data.sessions[0]!.items[0]!.sets[0] as unknown as { note: string }).note).toBe('');
    const second = await loadAppData(repo, [m2], 2);
    expect(second.migrated).toEqual([]);
    expect(second.schemaVersion).toBe(2);
    expect((second.data.sessions[0]!.items[0]!.sets[0] as unknown as { note: string }).note).toBe('');
  });
});

describe('백업 파일에도 마이그레이션 적용', () => {
  const m2: Migration = { version: 2, description: '루틴에 태그', up(d) { for (const r of d.routines) r.tags = ['기본']; } };
  it('schema 없는(이전 앱) 파일은 1로 보고 변환', () => {
    const p = parseBackup(v1, [m2], 2);
    expect((p.routines[0] as unknown as { tags: string[] }).tags).toEqual(['기본']);
  });
  it('이미 최신이면 변환 안 함, 더 새로우면 거부', () => {
    expect((parseBackup({ ...v1, schema: 2 }, [m2], 2).routines[0] as unknown as { tags?: string[] }).tags).toBeUndefined();
    expect(() => parseBackup({ ...v1, schema: 3 }, [m2], 2)).toThrow(/새로운 버전/);
  });
});

describe('메모리 저장소', () => {
  it('IndexedDB가 없을 때도 같은 동작', async () => {
    const repo = new MemoryRepository();
    await repo.put('routines', { id: 'r', name: 'r', emoji: '💪', imageId: null, createdAt: 0, items: [] });
    const { data } = await loadAppData(repo);
    expect(data.routines).toHaveLength(1);
    expect(repo.persistent).toBe(false);
  });
});
