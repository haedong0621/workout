// 데이터 모양 변경(마이그레이션) 목록.
//
// 기록 형식을 바꿔야 할 때:
//   1) CURRENT_SCHEMA를 1 올리고
//   2) MIGRATIONS에 { version: 새번호, up(data) { ... } } 를 추가하세요.
//   3) tests/unit/migrations.test.ts 에 이전 형식 → 새 형식 테스트를 추가하세요.
// 앱을 열 때 폰에 저장된 버전보다 높은 단계만 순서대로 한 번 실행되고, 결과가 저장됩니다.
// 백업 파일을 불러올 때도 같은 단계가 적용됩니다(백업 파일의 schema 값 기준, 없으면 1).
// ⚠️ 이전 형식을 읽을 수 있게만 바꾸고, 필드를 지우는 변환은 피하세요(이전 버전 앱으로 되돌릴 수 있게).

import { CATALOG, EZ_CHANGED, RETIRED_SEEDS, optionTitle } from './catalog.ts';

export interface RawData {
  exercises: Record<string, unknown>[];
  routines: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  body: Record<string, unknown>[];
  settings: Record<string, unknown>;
}

export interface Migration {
  version: number;
  description: string;
  /** data를 직접 고쳐도 되고, 새 객체를 돌려줘도 됩니다 */
  up(data: RawData): RawData | void;
}

export const CURRENT_SCHEMA = 2;

export const MIGRATIONS: readonly Migration[] = [
  { version: 2, description: '이지바 운동을 바벨 운동의 이지바 옵션으로 (v2.7.0)', up: ezToggle },
];

/**
 * v2.7.0: 이지바 컬·이지바 업라이트 로우(따로 있던 운동)를 바벨 컬·바벨 업라이트 로우의 "이지바" 옵션으로 합치고,
 * 이지바 라잉 트라이셉스 익스텐션·이지바 프리처 컬은 바벨 쪽 이름 + 바벨·이지바 토글로 바꿈.
 * 새 기본 목록(v2.6.0, 운동에 toggle 칸이 있는 데이터)에만 적용. 예전 목록 데이터는 백업 불러오기 때 한 번에 변환됨.
 */
function ezToggle(d: RawData): RawData {
  const isCatalog = d.exercises.some((e) => e.seed === true && !!e.toggle);
  if (!isCatalog) return d;
  const cat = new Map(CATALOG.map((e) => [e.id, e]));
  const retired = Object.fromEntries(Object.entries(RETIRED_SEEDS).filter(([, t]) => t.opt === '이지바'));
  const exById = new Map(d.exercises.map((e) => [String(e.id), e]));
  // 1) 바뀐 기본 운동: 이름·토글·다른 이름을 새 목록 값으로
  for (const id of EZ_CHANGED) {
    const e = exById.get(id); const c = cat.get(id);
    if (e && c) Object.assign(e, { name: c.name, toggle: c.toggle, aka: c.aka, equip: c.equip, kind: 'normal' });
  }
  // 2) 합쳐지는 운동의 메모·휴식·즐겨찾기·고정 기록을 옮기고 목록에서 뺌
  for (const [oldId, t] of Object.entries(retired)) {
    const from = exById.get(oldId); const to = exById.get(t.id);
    if (!from) continue;
    if (to) {
      const memo = String(from.memo ?? '').trim();
      const cur = String(to.memo ?? '').trim();
      if (memo) to.memo = cur ? `${cur}\n\n[이지바]\n${memo}` : memo;
      if (to.rest == null && from.rest != null) to.rest = from.rest;
      if (!to.imageId && from.imageId) to.imageId = from.imageId;
      to.fav = !!to.fav || !!from.fav;
      to.pinned = [...new Set([...(Array.isArray(to.pinned) ? to.pinned : []), ...(Array.isArray(from.pinned) ? from.pinned : [])])];
      to.memoAt = Math.max(Number(to.memoAt) || 0, Number(from.memoAt) || 0) || null;
    }
  }
  d.exercises = d.exercises.filter((e) => !retired[String(e.id)]);
  // 3) 기록·루틴: 예전 이지바 운동 → 새 운동의 이지바 옵션
  const target = (id: string): { id: string; opt: string } | null =>
    retired[id] ? { id: retired[id]!.id, opt: '이지바' } : id === 'seed-37' || id === 'seed-81' ? { id, opt: '이지바' } : null;
  for (const s of d.sessions) {
    for (const it of Array.isArray(s.items) ? (s.items as Record<string, unknown>[]) : []) {
      const t = target(String(it.exerciseId));
      if (!t || it.opt) continue;
      const c = cat.get(t.id);
      Object.assign(it, { exerciseId: t.id, opt: t.opt, ...(c ? { name: optionTitle(c.name, c.toggle, t.opt), equip: c.equip } : {}) });
    }
  }
  for (const r of d.routines) {
    for (const it of Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : []) {
      const t = target(String(it.exerciseId));
      if (t && !it.opt) Object.assign(it, { exerciseId: t.id, opt: t.opt });
    }
  }
  return d;
}

export function migrate(data: RawData, from: number, migrations: readonly Migration[] = MIGRATIONS): { data: RawData; version: number; applied: number[] } {
  let cur = data;
  let version = from;
  const applied: number[] = [];
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (m.version <= from) continue;
    cur = m.up(cur) ?? cur;
    version = m.version;
    applied.push(m.version);
  }
  return { data: cur, version: Math.max(version, from), applied };
}
