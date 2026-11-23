// IndexedDB를 Promise로 쓰기 위한 얇은 도우미
export const reqP = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error ?? new Error('transaction aborted'));
  });

export function openDB(name: string, version: number, upgrade: (db: IDBDatabase, oldVersion: number, tx: IDBTransaction) => void): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('IndexedDB를 쓸 수 없어요')); return; }
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = (e) => { if (r.transaction) upgrade(r.result, e.oldVersion, r.transaction); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('다른 탭에서 앱이 열려 있어요. 닫고 다시 열어 주세요'));
  });
}
