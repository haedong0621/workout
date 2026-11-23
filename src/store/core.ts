// 앱 상태(메모리) + 저장. 모든 변경은 여기 함수를 거쳐 즉시 기기에 저장됩니다.
//
// 상태는 @preact/signals 의 signal 이라, 값을 바꾸면 그 값을 쓰는 화면만 자동으로 다시 그려져요.
// 규칙: 배열·객체를 "직접 고치지 말고" 새 값으로 바꿔 끼웁니다(put / patch 사용).
import { batch, signal } from '@preact/signals';
import { DEFAULT_SETTINGS } from '@/domain/constants';
import type { AppData, CollectionMap, CollectionName, Settings } from '@/domain/types';
import type { Repository } from '@/data/repository';
import { MemoryRepository } from '@/data/memoryRepository';

export const exercises = signal<CollectionMap['exercises'][]>([]);
export const routines = signal<CollectionMap['routines'][]>([]);
export const sessions = signal<CollectionMap['sessions'][]>([]);
export const body = signal<CollectionMap['body'][]>([]);
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });

const collections = { exercises, routines, sessions, body } as const;

export const storageInfo = signal({ persistent: true, persisted: false, ready: false });

let repo: Repository = new MemoryRepository();
let errorHandler: (e: unknown) => void = (e) => console.error(e);

export const onStorageError = (fn: (e: unknown) => void): void => { errorHandler = fn; };
export const getRepo = (): Repository => repo;

// 저장 작업은 한 줄로 세워서 "호출한 순서대로" 기기에 기록해요.
// (예: 추가 직후 삭제했는데 저장 순서가 뒤바뀌어 되살아나는 일을 막음)
let chain: Promise<unknown> = Promise.resolve();

/** 저장 작업을 순서대로 실행 + 오류 알림. 실패해도 다음 작업은 계속 */
export function track<T>(job: () => Promise<T>): Promise<T | undefined> {
  const run = chain.then(job).catch((e: unknown) => { errorHandler(e); return undefined; });
  chain = run;
  return run;
}

/** 지금까지 요청한 저장이 모두 끝날 때까지 */
export async function flush(): Promise<void> {
  let last: Promise<unknown>;
  do { last = chain; await last; } while (last !== chain);
}

export function initStore(r: Repository, data: AppData): void {
  repo = r;
  batch(() => {
    exercises.value = data.exercises;
    routines.value = data.routines;
    sessions.value = data.sessions;
    body.value = data.body;
    settings.value = data.settings;
    storageInfo.value = { ...storageInfo.value, persistent: r.persistent, ready: true };
  });
}

/** 추가 또는 교체(같은 id) */
export function put<K extends CollectionName>(name: K, obj: CollectionMap[K]): CollectionMap[K] {
  const sig = collections[name] as unknown as { value: CollectionMap[K][] };
  const list = sig.value;
  const i = list.findIndex((x) => x.id === obj.id);
  sig.value = i >= 0 ? list.map((x, j) => (j === i ? obj : x)) : [...list, obj];
  void track(() => repo.put(name, obj));
  return obj;
}

export function putMany<K extends CollectionName>(name: K, objs: readonly CollectionMap[K][]): void {
  if (!objs.length) return;
  const sig = collections[name] as unknown as { value: CollectionMap[K][] };
  const byId = new Map(objs.map((o) => [o.id, o]));
  const kept = sig.value.map((x) => byId.get(x.id) ?? x);
  const existing = new Set(sig.value.map((x) => x.id));
  sig.value = [...kept, ...objs.filter((o) => !existing.has(o.id))];
  void track(() => repo.putMany(name, objs));
}

export function removeRecord(name: CollectionName, id: string): void {
  const sig = collections[name] as unknown as { value: { id: string }[] };
  sig.value = sig.value.filter((x) => x.id !== id);
  void track(() => repo.delete(name, id));
}

export function findById<K extends CollectionName>(name: K, id: string | null | undefined): CollectionMap[K] | undefined {
  if (!id) return undefined;
  return (collections[name].value as CollectionMap[K][]).find((x) => x.id === id);
}

/** id로 찾아서 fn으로 고친 뒤 저장. 없으면 undefined */
export function patch<K extends CollectionName>(name: K, id: string, fn: (cur: CollectionMap[K]) => CollectionMap[K]): CollectionMap[K] | undefined {
  const cur = findById(name, id);
  if (!cur) return undefined;
  return put(name, fn(cur));
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<unknown> {
  settings.value = { ...settings.value, [key]: value };
  return track(() => repo.setMeta(key, value));
}

/** 메모리 상태를 통째로 비움(초기화·전체 교체 복원 때) */
export function resetCollections(): void {
  batch(() => { exercises.value = []; routines.value = []; sessions.value = []; body.value = []; });
}
