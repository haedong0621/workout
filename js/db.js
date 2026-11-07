// IndexedDB 저장소 + 메모리 상태. 모든 변경은 save/remove로 즉시 기기에 저장됩니다.
import { uuid } from './util.js';
import { seedExercises } from './seed.js';

const DB_NAME = 'workout-log';
const DB_VER = 1;
export const APP_FORMAT_VERSION = 1;
const STORES = ['exercises', 'routines', 'sessions', 'body', 'images'];

export const DEFAULTS = {
  restDefault: 90,
  restAuto: true,
  sound: true,
  notify: false,
  keepAwake: true,
  includeWarmup: true,
  lastBackupAt: 0,
  activeSessionId: null,
  seeded: false,
  bodyweight: 0,
  iosTipDismissed: false,
};

export const state = {
  exercises: [], routines: [], sessions: [], body: [],
  settings: { ...DEFAULTS },
  imageURLs: {},
  persistent: true,   // false면 저장소를 못 열어서 메모리에만 있는 상태
  persisted: false,   // 브라우저가 "지우지 않기"로 승인했는지
  ready: false,
};

let db = null;
let errorHandler = (e) => console.error(e);
export const onDbError = (fn) => { errorHandler = fn; };

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

function openDB() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('IndexedDB 없음'));
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = (e) => {
      const d = r.result;
      // e.oldVersion 으로 향후 마이그레이션 분기
      for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

const store = (name, mode = 'readwrite') => db.transaction(name, mode).objectStore(name);
const getAll = (name) => req(store(name, 'readonly').getAll());

export async function loadAll() {
  try { db = await openDB(); } catch (e) { console.warn(e); db = null; state.persistent = false; }
  state.settings = { ...DEFAULTS };
  if (db) {
    for (const s of ['exercises', 'routines', 'sessions', 'body']) state[s] = await getAll(s);
    for (const m of await getAll('meta')) state.settings[m.key] = m.value;
    for (const im of await getAll('images')) state.imageURLs[im.id] = URL.createObjectURL(im.blob);
  }
  state.ready = true;
}

export async function seedIfNeeded() {
  if (state.settings.seeded) return;
  if (state.exercises.length === 0) for (const ex of seedExercises()) save('exercises', ex);
  await setSetting('seeded', true);
}

function safePut(name, obj) {
  if (!db) return;
  try {
    const r = store(name).put(JSON.parse(JSON.stringify(obj)));
    r.onerror = () => errorHandler(r.error);
  } catch (e) { errorHandler(e); }
}

export function save(name, obj) {
  const arr = state[name];
  const i = arr.findIndex((x) => x.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  safePut(name, obj);
  return obj;
}

export function remove(name, id) {
  const i = state[name].findIndex((x) => x.id === id);
  if (i >= 0) state[name].splice(i, 1);
  if (db) { try { store(name).delete(id); } catch (e) { errorHandler(e); } }
}

export async function setSetting(key, value) {
  state.settings[key] = value;
  if (db) { try { store('meta').put({ key, value }); } catch (e) { errorHandler(e); } }
}

export const activeSession = () =>
  state.sessions.find((s) => s.id === state.settings.activeSessionId && s.status === 'active') || null;

// ---- 이미지 ----
export const imgURL = (id) => (id ? state.imageURLs[id] || null : null);

export async function addImage(blob) {
  const id = uuid();
  if (db) await req(store('images').put({ id, blob, type: blob.type }));
  state.imageURLs[id] = URL.createObjectURL(blob);
  return id;
}

export function removeImage(id) {
  if (!id) return;
  if (db) { try { store('images').delete(id); } catch (e) { errorHandler(e); } }
  const u = state.imageURLs[id];
  if (u) URL.revokeObjectURL(u);
  delete state.imageURLs[id];
}

// ---- 신체 기록 ----
export function upsertBody(date, fields) {
  let e = state.body.find((b) => b.date === date);
  if (!e) e = { id: uuid(), date };
  for (const [k, v] of Object.entries(fields)) {
    if (v === '' || v == null || Number.isNaN(v)) continue;
    e[k] = v;
  }
  save('body', e);
  return e;
}

// ---- 백업 / 복원 ----
const blobToDataURL = (blob) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});

export async function exportAll() {
  const images = [];
  if (db) for (const im of await getAll('images')) images.push({ id: im.id, type: im.type, data: await blobToDataURL(im.blob) });
  const { activeSessionId, lastBackupAt, ...settings } = state.settings; // eslint-disable-line no-unused-vars
  return {
    app: 'workout-log',
    version: APP_FORMAT_VERSION,
    exportedAt: Date.now(),
    data: {
      exercises: state.exercises, routines: state.routines,
      sessions: state.sessions.filter((s) => s.status === 'done'),
      body: state.body, settings, images,
    },
  };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'workout-log' || !obj.data) throw new Error('이 앱의 백업 파일이 아니에요');
  if (obj.version > APP_FORMAT_VERSION) throw new Error('더 새로운 버전의 백업 파일이에요. 앱을 업데이트해 주세요');
  const d = obj.data;
  return {
    exercises: d.exercises?.length || 0, routines: d.routines?.length || 0,
    sessions: d.sessions?.length || 0, body: d.body?.length || 0, images: d.images?.length || 0,
  };
}

async function clearStore(name) { if (db) await req(store(name).clear()); state[name] = []; }

export async function importAll(obj, mode = 'merge') {
  validateBackup(obj);
  const d = obj.data;
  if (mode === 'replace') {
    for (const s of ['exercises', 'routines', 'sessions', 'body']) await clearStore(s);
    if (db) await req(store('images').clear());
    for (const u of Object.values(state.imageURLs)) URL.revokeObjectURL(u);
    state.imageURLs = {};
    await setSetting('activeSessionId', null);
  }
  for (const im of d.images || []) {
    if (state.imageURLs[im.id]) continue;
    const blob = await (await fetch(im.data)).blob();
    if (db) await req(store('images').put({ id: im.id, blob, type: im.type || blob.type }));
    state.imageURLs[im.id] = URL.createObjectURL(blob);
  }
  for (const s of ['exercises', 'routines', 'sessions', 'body']) for (const o of d[s] || []) save(s, o);
  for (const [k, v] of Object.entries(d.settings || {})) if (k in DEFAULTS) await setSetting(k, v);
  await setSetting('seeded', true);
}

export async function wipeAll() {
  for (const s of ['exercises', 'routines', 'sessions', 'body']) await clearStore(s);
  if (db) { await req(store('images').clear()); await req(store('meta').clear()); }
  for (const u of Object.values(state.imageURLs)) URL.revokeObjectURL(u);
  state.imageURLs = {};
  state.settings = { ...DEFAULTS, seeded: true };
  try { localStorage.removeItem('workout-log-rest'); } catch { /* noop */ }
}

export async function requestPersist() {
  try {
    if (navigator.storage?.persisted) state.persisted = await navigator.storage.persisted();
    if (!state.persisted && navigator.storage?.persist) state.persisted = await navigator.storage.persist();
  } catch { /* noop */ }
}
