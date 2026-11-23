// IndexedDB 구조. 이전 앱(v1.x)과 같은 DB를 그대로 씁니다.
// ⚠️ DB_VERSION을 올리면 이전 버전 앱으로 되돌렸을 때 DB를 열 수 없어요.
//    저장소(store)를 새로 만들어야 할 때만 올리고, 데이터 모양 변경은 migrations.ts로 하세요.
export const DB_NAME = 'workout-log';
export const DB_VERSION = 1;

export const RECORD_STORES = ['exercises', 'routines', 'sessions', 'body', 'images'] as const;
export const META_STORE = 'meta';
export type StoreName = (typeof RECORD_STORES)[number] | typeof META_STORE;

export function upgradeSchema(db: IDBDatabase, _oldVersion: number): void {
  for (const s of RECORD_STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
  if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
}

/** meta 저장소에서 설정이 아닌 내부용 키 */
export const META_SCHEMA_VERSION = 'schemaVersion';
