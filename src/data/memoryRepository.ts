// IndexedDB를 못 쓰는 환경(사생활 보호 모드 등)용 임시 저장소. 앱을 닫으면 사라져요.
import type { CollectionMap, CollectionName, ImageRecord } from '@/domain/types';
import { clone } from '@/lib/clone';
import type { LoadedData, Repository } from './repository';

export class MemoryRepository implements Repository {
  readonly persistent: boolean;
  private stores: Record<CollectionName, Map<string, unknown>> = {
    exercises: new Map(), routines: new Map(), sessions: new Map(), body: new Map(),
  };
  private meta = new Map<string, unknown>();
  private images = new Map<string, ImageRecord>();

  constructor({ persistent = false }: { persistent?: boolean } = {}) { this.persistent = persistent; }

  async loadAll(): Promise<LoadedData> {
    const all = <T>(m: Map<string, T>) => [...m.values()].map((v) => clone(v));
    return {
      exercises: all(this.stores.exercises), routines: all(this.stores.routines),
      sessions: all(this.stores.sessions), body: all(this.stores.body),
      meta: [...this.meta.entries()], images: [...this.images.values()],
    };
  }
  async put<K extends CollectionName>(name: K, obj: CollectionMap[K]) { this.stores[name].set(obj.id, clone(obj)); }
  async putMany<K extends CollectionName>(name: K, objs: readonly CollectionMap[K][]) { for (const o of objs) this.stores[name].set(o.id, clone(o)); }
  async delete(name: CollectionName, id: string) { this.stores[name].delete(id); }
  async setMeta(key: string, value: unknown) { this.meta.set(key, clone(value)); }
  async putImage(rec: ImageRecord) { this.images.set(rec.id, rec); }
  async deleteImage(id: string) { this.images.delete(id); }
  async allImages() { return [...this.images.values()]; }
  async clearAll({ keepMeta = false } = {}) {
    for (const m of Object.values(this.stores)) m.clear();
    this.images.clear();
    if (!keepMeta) this.meta.clear();
  }
  async replaceCollections(data: Partial<{ [K in CollectionName]: CollectionMap[K][] }>) {
    for (const n of Object.keys(data) as CollectionName[]) {
      this.stores[n].clear();
      for (const o of data[n] ?? []) this.stores[n].set(o.id, clone(o));
    }
  }
}
