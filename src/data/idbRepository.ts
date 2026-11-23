import type { CollectionMap, CollectionName, ImageRecord } from '@/domain/types';
import { openDB, reqP, txDone } from './idb';
import type { LoadedData, Repository } from './repository';
import { DB_NAME, DB_VERSION, META_STORE, RECORD_STORES, upgradeSchema, type StoreName } from './schema';

const COLLECTIONS: readonly CollectionName[] = ['exercises', 'routines', 'sessions', 'body'];

/** IDB에 넣기 전에 함수·undefined 등 복제 불가 값을 없앰 */
const plain = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export class IdbRepository implements Repository {
  readonly persistent = true;
  private constructor(private db: IDBDatabase) {
    // 다른 탭에서 DB 버전을 올리려 하면 닫아 줌
    db.onversionchange = () => db.close();
  }

  static async open(name = DB_NAME): Promise<IdbRepository> {
    const db = await openDB(name, DB_VERSION, (d, old) => upgradeSchema(d, old));
    return new IdbRepository(db);
  }

  private tx(names: StoreName | StoreName[], mode: IDBTransactionMode = 'readwrite') {
    return this.db.transaction(names, mode);
  }

  async loadAll(): Promise<LoadedData> {
    const tx = this.tx([...RECORD_STORES, META_STORE], 'readonly');
    const get = (n: StoreName) => reqP(tx.objectStore(n).getAll());
    const [exercises, routines, sessions, body, images, meta] = await Promise.all([
      get('exercises'), get('routines'), get('sessions'), get('body'), get('images'), get(META_STORE),
    ]);
    return {
      exercises, routines, sessions, body,
      images: (images as ImageRecord[]).filter((im) => im && im.id && im.blob instanceof Blob),
      meta: (meta as { key: string; value: unknown }[]).map((m) => [m.key, m.value]),
    };
  }

  async put<K extends CollectionName>(name: K, obj: CollectionMap[K]): Promise<void> {
    const tx = this.tx(name);
    tx.objectStore(name).put(plain(obj));
    await txDone(tx);
  }

  async putMany<K extends CollectionName>(name: K, objs: readonly CollectionMap[K][]): Promise<void> {
    if (!objs.length) return;
    const tx = this.tx(name);
    const st = tx.objectStore(name);
    for (const o of objs) st.put(plain(o));
    await txDone(tx);
  }

  async delete(name: CollectionName, id: string): Promise<void> {
    const tx = this.tx(name);
    tx.objectStore(name).delete(id);
    await txDone(tx);
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    const tx = this.tx(META_STORE);
    tx.objectStore(META_STORE).put({ key, value });
    await txDone(tx);
  }

  async putImage(rec: ImageRecord): Promise<void> {
    const tx = this.tx('images');
    tx.objectStore('images').put(rec);
    await txDone(tx);
  }

  async deleteImage(id: string): Promise<void> {
    const tx = this.tx('images');
    tx.objectStore('images').delete(id);
    await txDone(tx);
  }

  async allImages(): Promise<ImageRecord[]> {
    return (await reqP(this.tx('images', 'readonly').objectStore('images').getAll())) as ImageRecord[];
  }

  async clearAll({ keepMeta = false } = {}): Promise<void> {
    const names: StoreName[] = keepMeta ? [...RECORD_STORES] : [...RECORD_STORES, META_STORE];
    const tx = this.tx(names);
    for (const n of names) tx.objectStore(n).clear();
    await txDone(tx);
  }

  async replaceCollections(data: Partial<{ [K in CollectionName]: CollectionMap[K][] }>): Promise<void> {
    const names = COLLECTIONS.filter((n) => data[n]);
    if (!names.length) return;
    const tx = this.tx(names);
    for (const n of names) {
      const st = tx.objectStore(n);
      st.clear();
      for (const o of data[n] ?? []) st.put(plain(o));
    }
    await txDone(tx);
  }
}
