// 예전 운동 데이터 → 새 기본 운동 목록(catalog.ts)으로 옮기기 (순수 함수)
// - 운동: 같은 운동으로 판정되면 하나로 합침(메모·즐겨찾기·휴식·고정 기록 합치기)
// - 옵션: 이름의 (핀)/(플레이트)/스미스/어시스트/중량, 무게 방식, 사용자가 알려 준 값(answers) 순으로 정함
// - 기록·루틴: 운동 id를 새 id로, 기록의 이름을 그때 고른 옵션 이름으로(스미스 숄더 프레스, 어시스트 딥스)
import { CATALOG, RETIRED_SEEDS, TOGGLE_OPTIONS, findCatalog, kindFor, optionTitle, type CatalogEntry } from './catalog.ts';
import type { Exercise, Routine, Session } from './types';

export interface ConvertInput { exercises: Exercise[]; routines: Routine[]; sessions: Session[] }
export interface MapRow { oldId: string; oldName: string; newId: string; newName: string; opt?: string; how: string }
export interface ConvertResult extends ConvertInput { map: MapRow[]; unknown: string[] }

const byId = new Map(CATALOG.map((e) => [e.id, e]));

/** 이름에 붙은 옵션 표시를 떼어 낸 이름과 그 옵션 */
function splitOption(name: string): { base: string; opt?: string } {
  const m = name.match(/\s*\((핀|플레이트)\)\s*$/);
  if (m) return { base: name.slice(0, m.index).trim(), opt: m[1] };
  for (const o of ['스미스', '어시스트', '중량']) if (name.startsWith(o + ' ')) return { base: name.slice(o.length + 1), opt: o };
  return { base: name };
}

function decideOpt(e: CatalogEntry, ex: Exercise, fromName: string | undefined, answers: Record<string, string>): { opt?: string; how: string } {
  if (!e.toggle) return { how: '' };
  const allowed = TOGGLE_OPTIONS[e.toggle];
  const ok = (o?: string) => (o && allowed.includes(o) ? o : undefined);
  const a = ok(answers[ex.name]);
  if (a) return { opt: a, how: '알려 준 값' };
  if (ok(fromName)) return { opt: fromName, how: '이름' };
  if (e.toggle === 'body') return { opt: ex.kind === 'bodyweight' ? '중량' : '어시스트', how: '무게 방식' };
  if (e.toggle === 'bar') return { opt: '바벨', how: '기본(바벨)' };
  return { how: '모름' };
}

export function convertToCatalog(input: ConvertInput, answers: Record<string, string> = {}): ConvertResult {
  const map: MapRow[] = [];
  const unknown: string[] = [];
  const plan = new Map<string, { entry: CatalogEntry | null; opt?: string }>();
  const used = new Set([...input.sessions.flatMap((s) => s.items.map((i) => i.exerciseId)), ...input.routines.flatMap((r) => r.items.map((i) => i.exerciseId))]);

  for (const ex of input.exercises) {
    let entry: CatalogEntry | undefined; let opt: string | undefined; let how = '';
    const retired = RETIRED_SEEDS[ex.id];
    if (retired) { entry = byId.get(retired.id); opt = retired.opt; how = '합쳐진 기본 운동'; }
    else if (byId.has(ex.id)) { entry = byId.get(ex.id); }
    else {
      const { base, opt: o } = splitOption(ex.name);
      entry = findCatalog(ex.name) ?? findCatalog(base);
      const d = entry ? decideOpt(entry, ex, o, answers) : { how: '' };
      opt = d.opt; how = d.how;
    }
    if (entry && byId.has(ex.id) && !retired) { const d = decideOpt(entry, ex, undefined, answers); opt = d.opt; how = d.how; }
    if (entry?.toggle && !opt && used.has(ex.id)) unknown.push(ex.name);
    plan.set(ex.id, { entry: entry ?? null, opt });
    map.push({ oldId: ex.id, oldName: ex.name, newId: entry?.id ?? ex.id, newName: entry?.name ?? ex.name + ' (그대로)', opt, how });
  }

  // ── 운동 목록: 카탈로그 전체 + 예전 사용자 값 합치기
  const sources = new Map<string, { ex: Exercise; opt?: string }[]>();
  for (const ex of input.exercises) {
    const p = plan.get(ex.id)!;
    if (!p.entry) continue;
    const list = sources.get(p.entry.id) ?? []; list.push({ ex, opt: p.opt }); sources.set(p.entry.id, list);
  }
  const now = Math.max(0, ...input.exercises.map((e) => e.createdAt));
  const exercises: Exercise[] = CATALOG.map((e) => {
    const src = (sources.get(e.id) ?? []).slice().sort((a, b) => Number(a.ex.seed) - Number(b.ex.seed)); // 직접 만든 것 먼저
    const opts = new Set(src.map((s) => s.opt));
    const memos = src.filter((s) => s.ex.memo.trim()).map((s) => (opts.size > 1 && s.opt ? `[${s.opt}]\n` : '') + s.ex.memo.trim());
    const own = src.find((s) => s.ex.id === e.id)?.ex;
    return {
      id: e.id, name: e.name, part: e.part, equip: e.equip,
      kind: kindFor(e.toggle),
      rest: src.find((s) => s.ex.rest != null)?.ex.rest ?? null,
      imageId: src.find((s) => s.ex.imageId)?.ex.imageId ?? null,
      memo: memos.join('\n\n'),
      memoAt: Math.max(0, ...src.map((s) => s.ex.memoAt ?? 0)) || null,
      fav: src.some((s) => s.ex.fav),
      pinned: [...new Set(src.flatMap((s) => s.ex.pinned))],
      seed: true,
      createdAt: own?.createdAt ?? (src.length ? Math.min(...src.map((s) => s.ex.createdAt)) : now),
      toggle: e.toggle, aka: e.aka,
    };
  });
  // 목록에 없는 직접 만든 운동은 그대로 남김
  for (const ex of input.exercises) if (!plan.get(ex.id)!.entry) exercises.push(ex);

  const target = (oldId: string) => plan.get(oldId) ?? { entry: byId.get(RETIRED_SEEDS[oldId]?.id ?? oldId) ?? null, opt: RETIRED_SEEDS[oldId]?.opt };

  const sessions: Session[] = input.sessions.map((s) => ({
    ...s,
    items: s.items.map((it) => {
      const t = target(it.exerciseId);
      if (!t.entry) return it;
      const e = t.entry;
      const opt = e.toggle ? (t.opt ?? (e.toggle === 'body' ? (it.kind === 'bodyweight' ? '중량' : '어시스트') : undefined)) : undefined;
      return {
        ...it,
        exerciseId: e.id,
        name: optionTitle(e.name, e.toggle, opt),
        part: e.part, equip: e.equip,
        kind: e.toggle === 'body' ? kindFor('body', opt) : it.kind,
        ...(opt ? { opt } : {}),
      };
    }),
  }));

  const routines: Routine[] = input.routines.map((r) => ({
    ...r,
    items: r.items.map((it) => {
      const t = target(it.exerciseId);
      if (!t.entry) return it;
      return { ...it, exerciseId: t.entry.id, ...(t.entry.toggle && t.opt ? { opt: t.opt } : {}) };
    }),
  }));

  return { exercises, routines, sessions, map, unknown };
}
