// 저장소 인터페이스. 화면/상태 코드는 이것만 알고, IndexedDB 세부는 모릅니다.
// (나중에 동기화·서버 저장을 붙일 때 이 인터페이스를 구현하면 됩니다)
import type { CollectionMap, CollectionName, ImageRecord } from '@/domain/types';

export interface LoadedData {
  exercises: unknown[];
  routines: unknown[];
  sessions: unknown[];
  body: unknown[];
  /** meta 저장소의 [key, value] 전부 */
  meta: [string, unknown][];
  images: ImageRecord[];
}

export interface Repository {
  /** false면 기기에 저장되지 않는 임시 저장소 */
  readonly persistent: boolean;
  loadAll(): Promise<LoadedData>;
  put<K extends CollectionName>(name: K, obj: CollectionMap[K]): Promise<void>;
  putMany<K extends CollectionName>(name: K, objs: readonly CollectionMap[K][]): Promise<void>;
  delete(name: CollectionName, id: string): Promise<void>;
  setMeta(key: string, value: unknown): Promise<void>;
  putImage(rec: ImageRecord): Promise<void>;
  deleteImage(id: string): Promise<void>;
  allImages(): Promise<ImageRecord[]>;
  /** 기록 저장소 전부(+meta) 비우기 */
  clearAll(opts?: { keepMeta?: boolean }): Promise<void>;
  /** 마이그레이션 결과를 한 번에 저장 */
  replaceCollections(data: Partial<{ [K in CollectionName]: CollectionMap[K][] }>): Promise<void>;
}
