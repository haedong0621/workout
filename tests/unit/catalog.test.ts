import { describe, expect, it } from 'vitest';
import v1backup from '../fixtures/v1-backup.json';
import { CATALOG, RETIRED_SEEDS, TOGGLE_OPTIONS, findCatalog, optionTitle } from '@/domain/catalog';
import { convertToCatalog } from '@/domain/convertCatalog';
import { SEED } from '@/domain/seed';
import { normalizeExercise, normalizeRoutine, normalizeSession } from '@/domain/normalize';
import { sessionStats } from '@/domain/volume';

describe('기본 운동 목록 규칙', () => {
  it('id·이름이 겹치지 않음', () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map((e) => e.name)).size).toBe(CATALOG.length);
  });
  it('예전 기본 운동 id(seed-0…53)는 목록에 있거나 합쳐진 운동으로 등록됨', () => {
    const ids = new Set(CATALOG.map((e) => e.id));
    SEED.forEach((_, i) => expect(ids.has('seed-' + i) || !!RETIRED_SEEDS['seed-' + i]).toBe(true));
    for (const [old, t] of Object.entries(RETIRED_SEEDS)) { expect(ids.has(old)).toBe(false); expect(ids.has(t.id)).toBe(true); }
  });
  it('이름 = 장비 + 운동 이름 (맨몸만 장비 말 없음)', () => {
    for (const e of CATALOG) {
      if (e.toggle === 'body') { expect(e.equip).toBe('맨몸'); continue; }
      expect(['바벨', '덤벨', '이지바', '케이블', '머신']).toContain(e.equip);
      expect(e.name.startsWith(e.equip + ' ')).toBe(true);
      if (e.toggle === 'bar' || e.toggle === 'ez') expect(e.equip).toBe('바벨');
      if (e.toggle === 'machine') expect(e.equip).toBe('머신');
      if (['덤벨', '케이블', '이지바'].includes(e.equip)) expect(e.toggle).toBeNull();
    }
  });
  it('토글은 옵션 2개, 옵션을 고르면 제목이 바뀜', () => {
    for (const o of Object.values(TOGGLE_OPTIONS)) expect(o.length).toBe(2);
    expect(optionTitle('바벨 런지', 'bar', '스미스')).toBe('스미스 런지');
    expect(optionTitle('바벨 런지', 'bar', '바벨')).toBe('바벨 런지');
    expect(optionTitle('머신 레그 프레스', 'machine', '핀')).toBe('머신 레그 프레스 (핀)');
    expect(optionTitle('딥스', 'body', '어시스트')).toBe('어시스트 딥스');
    expect(optionTitle('바벨 컬', 'ez', '이지바')).toBe('이지바 컬');
  });
  it('다른 이름으로도 찾음 (띄어쓰기·표기 무시)', () => {
    expect(findCatalog('펙덱 플라이')?.name).toBe('머신 플라이');
    expect(findCatalog('리버스 펙덱 플라이')?.name).toBe('머신 리어 델트 플라이');
    expect(findCatalog('이지 바 컬')?.name).toBe('바벨 컬');
    expect(findCatalog('라트익')?.name).toBe('바벨 라잉 트라이셉스 익스텐션');
    expect(findCatalog('케이블 푸쉬 다운')?.name).toBe('케이블 푸시다운');
    expect(findCatalog('인클라인 덤벨 프레스')?.name).toBe('덤벨 인클라인 벤치 프레스');
  });
});

describe('백업 변환', () => {
  const v1 = v1backup.data as unknown as { exercises: unknown[]; routines: unknown[]; sessions: unknown[] };
  const input = {
    exercises: v1.exercises.map(normalizeExercise).filter((x): x is NonNullable<typeof x> => !!x),
    routines: v1.routines.map(normalizeRoutine).filter((x): x is NonNullable<typeof x> => !!x),
    sessions: v1.sessions.map(normalizeSession).filter((x): x is NonNullable<typeof x> => !!x),
  };
  const r = convertToCatalog(input);
  it('세트 수·볼륨이 그대로', () => {
    input.sessions.forEach((s, i) => {
      const a = sessionStats(s, true, 0), b = sessionStats(r.sessions[i]!, true, 0);
      expect(b.sets).toBe(a.sets);
      expect(b.volume).toBeCloseTo(a.volume, 6);
    });
  });
  it('모든 기록·루틴이 있는 운동을 가리킴', () => {
    const ids = new Set(r.exercises.map((e) => e.id));
    for (const s of r.sessions) for (const it of s.items) expect(ids.has(it.exerciseId)).toBe(true);
    for (const rt of r.routines) for (const it of rt.items) expect(ids.has(it.exerciseId)).toBe(true);
  });
  it('이름에 적힌 옵션을 토글 값으로: 스미스·(핀)·(플레이트)·어시스트', () => {
    const conv = convertToCatalog({
      exercises: [
        { id: 'a', name: '스미스 숄더 프레스', part: '어깨', equip: '머신', kind: 'normal', rest: null, imageId: null, memo: '', memoAt: null, fav: false, pinned: [], seed: false, createdAt: 1 },
        { id: 'b', name: '머신 체스트 프레스(플레이트)', part: '가슴', equip: '머신', kind: 'normal', rest: 60, imageId: null, memo: 'm', memoAt: 2, fav: true, pinned: [], seed: false, createdAt: 1 },
      ],
      routines: [],
      sessions: [{ id: 's', name: 'x', routineId: null, startedAt: 0, endedAt: 1, status: 'done', bw: 80, items: [
        { exerciseId: 'a', name: '스미스 숄더 프레스', part: '어깨', equip: '머신', kind: 'normal', sets: [{ w: 50, r: 10, t: 'N', done: true }] },
        { exerciseId: 'seed-12', name: '어시스트 딥스', part: '가슴', equip: '머신', kind: 'assist', sets: [{ w: 20, r: 10, t: 'N', done: true }] },
      ] }],
    });
    const [a, d] = conv.sessions[0]!.items;
    expect(a).toMatchObject({ exerciseId: 'seed-23', opt: '스미스', name: '스미스 숄더 프레스' });
    expect(d).toMatchObject({ exerciseId: 'seed-11', opt: '어시스트', name: '어시스트 딥스', kind: 'assist' });
    expect(conv.map.find((m) => m.oldId === 'b')).toMatchObject({ newId: 'seed-5', opt: '플레이트' });
    const cp = conv.exercises.find((e) => e.id === 'seed-5')!;
    expect(cp).toMatchObject({ rest: 60, memo: 'm', fav: true, toggle: 'machine' });
  });
});

describe('운동 중 장비 토글', async () => {
  const W = await import('@/domain/workout');
  const { exerciseHistory } = await import('@/domain/history');
  const { seedExercises } = await import('@/domain/seed');
  const all = seedExercises(0);
  const bench = all.find((e) => e.name === '바벨 벤치 프레스')!;
  const dips = all.find((e) => e.name === '딥스')!;
  const done = (id: string, start: number, items: Partial<import('@/domain/types').SessionItem>[]) => ({
    id, name: 'x', routineId: null, startedAt: start, endedAt: start + 1, status: 'done' as const, bw: 80,
    items: items.map((it) => ({ exerciseId: bench.id, name: '', part: '가슴', equip: '바벨', kind: 'normal' as const, sets: [{ w: 60, r: 10, t: 'N' as const, done: true }], ...it })),
  });
  const sessions = [
    done('a', 100, [{ opt: '바벨', sets: [{ w: 100, r: 5, t: 'N', done: true }] }]),
    done('b', 200, [{ opt: '스미스', sets: [{ w: 70, r: 8, t: 'N', done: true }] }]),
  ];
  it('새 기본 목록 96개, 토글·다른 이름 포함', () => {
    expect(all.length).toBe(96);
    expect(bench).toMatchObject({ id: 'seed-0', toggle: 'bar' });
    expect(dips).toMatchObject({ toggle: 'body', kind: 'assist' });
  });
  it('기본 옵션 = 마지막에 쓴 옵션, 세트는 그 옵션의 지난 기록', () => {
    const it0 = W.buildItem(bench, sessions, 3, 1000);
    expect(it0).toMatchObject({ opt: '스미스', name: '스미스 벤치 프레스' });
    expect(it0.sets[0]).toMatchObject({ w: 70, r: 8, done: false });
    const it1 = W.buildItem(bench, sessions, 3, 1000, '바벨');
    expect(it1).toMatchObject({ opt: '바벨', name: '바벨 벤치 프레스' });
    expect(it1.sets[0]).toMatchObject({ w: 100, r: 5 });
  });
  it('토글을 바꾸면 이름이 바뀌고, 안 한 세트는 그 옵션 기록으로 다시 채움', () => {
    const s = { ...done('c', 1000, []), status: 'active' as const, endedAt: null, items: [W.buildItem(bench, sessions, 3, 1000)] };
    const s2 = W.setItemOption(s, 0, bench, '바벨', sessions);
    expect(s2.items[0]).toMatchObject({ opt: '바벨', name: '바벨 벤치 프레스' });
    expect(s2.items[0]!.sets[0]!.w).toBe(100);
  });
  it('세트를 이미 체크했으면 체크한 세트는 그대로, 남은 세트만 그 옵션 기록으로', () => {
    const base = { ...done('c', 1000, []), status: 'active' as const, endedAt: null };
    const it0 = { ...W.buildItem(bench, sessions, 3, 1000), sets: [{ w: 70, r: 8, t: 'N' as const, done: true }, { w: 70, r: 8, t: 'N' as const, done: false }] };
    const two = [...sessions, done('e', 300, [{ opt: '바벨', sets: [{ w: 100, r: 5, t: 'N', done: true }, { w: 110, r: 3, t: 'N', done: true }, { w: 120, r: 1, t: 'N', done: true }] }])];
    const s2 = W.setItemOption({ ...base, items: [it0] }, 0, bench, '바벨', two);
    expect(s2.items[0]!.sets.map((x) => [x.w, x.done])).toEqual([[70, true], [110, false], [120, false]]);
    expect(W.setItemOption({ ...base, items: [it0] }, 0, bench, '바벨', []).items[0]!.sets).toEqual(it0.sets); // 기록 없으면 그대로
  });
  it('맨몸 토글: 어시스트 ↔ 중량 = 무게 방식도 바뀜', () => {
    const it0 = W.buildItem(dips, [], 3, 1000);
    expect(it0).toMatchObject({ opt: '어시스트', kind: 'assist', name: '어시스트 딥스' });
    const s = { ...done('d', 1000, []), status: 'active' as const, endedAt: null, items: [it0] };
    expect(W.setItemOption(s, 0, dips, '중량', []).items[0]).toMatchObject({ opt: '중량', kind: 'bodyweight', name: '중량 딥스' });
  });
  it('기록은 옵션별로 따로 (옵션 없는 예전 기록 = 첫 옵션)', () => {
    const old = done('o', 50, [{ sets: [{ w: 90, r: 5, t: 'N', done: true }] }]);
    const all3 = [old, ...sessions];
    expect(exerciseHistory(all3, bench.id, { opt: { toggle: 'bar', value: '바벨' } }).map((e) => e.sessionId)).toEqual(['o', 'a']);
    expect(exerciseHistory(all3, bench.id, { opt: { toggle: 'bar', value: '스미스' } }).map((e) => e.sessionId)).toEqual(['b']);
    expect(exerciseHistory(all3, bench.id).length).toBe(3);
  });
});

describe('v2.7.0 마이그레이션: 이지바 → 바벨 운동의 이지바 옵션', async () => {
  const { migrate, MIGRATIONS } = await import('@/domain/migrations');
  const { seedExercises } = await import('@/domain/seed');
  it('이지바 컬 기록 → 바벨 컬 [이지바], 라트익 → 이지바 옵션, 메모 합침', () => {
    // v2.6.0 모양: 이지바 컬(seed-78)이 따로 있던 목록
    const ex = seedExercises(0).map((e) => ({ ...e })) as unknown as Record<string, unknown>[];
    const find = (id: string) => ex.find((e) => e.id === id)!;
    Object.assign(find('seed-31'), { name: '바벨 컬', toggle: 'bar' });
    Object.assign(find('seed-37'), { name: '이지바 라잉 트라이셉스 익스텐션', toggle: null, equip: '이지바' });
    ex.push({ id: 'seed-78', name: '이지바 컬', part: '팔', equip: '이지바', kind: 'normal', toggle: null, aka: [], memo: '20kg 15x3', rest: 60, fav: true, pinned: ['s1'], seed: true, createdAt: 0, imageId: null, memoAt: 5 });
    const data = {
      exercises: ex,
      routines: [{ id: 'r', name: '팔', items: [{ exerciseId: 'seed-78', setCount: 3 }, { exerciseId: 'seed-37', setCount: 3 }] }],
      sessions: [{ id: 's1', status: 'done', startedAt: 1, bw: 80, items: [
        { exerciseId: 'seed-78', name: '이지바 컬', part: '팔', equip: '이지바', kind: 'normal', sets: [{ w: 20, r: 15, t: 'N', done: true }] },
        { exerciseId: 'seed-37', name: '이지바 라잉 트라이셉스 익스텐션', part: '팔', equip: '이지바', kind: 'normal', sets: [] },
      ] }],
      body: [], settings: {},
    };
    const r = migrate(data, 1, MIGRATIONS).data;
    expect(r.exercises.some((e) => e.id === 'seed-78')).toBe(false);
    expect(r.exercises.find((e) => e.id === 'seed-31')).toMatchObject({ name: '바벨 컬', toggle: 'ez', fav: true, rest: 60, pinned: ['s1'] });
    expect(r.exercises.find((e) => e.id === 'seed-31')!.memo).toBe('20kg 15x3');
    expect(r.exercises.find((e) => e.id === 'seed-37')).toMatchObject({ name: '바벨 라잉 트라이셉스 익스텐션', toggle: 'ez', equip: '바벨' });
    const items = r.sessions[0]!.items as Record<string, unknown>[];
    expect(items[0]).toMatchObject({ exerciseId: 'seed-31', opt: '이지바', name: '이지바 컬' });
    expect(items[1]).toMatchObject({ exerciseId: 'seed-37', opt: '이지바', name: '이지바 라잉 트라이셉스 익스텐션' });
    expect(r.routines[0]!.items).toEqual([{ exerciseId: 'seed-31', setCount: 3, opt: '이지바' }, { exerciseId: 'seed-37', setCount: 3, opt: '이지바' }]);
  });
  it('예전(v2.5 이전) 목록 데이터는 건드리지 않음', () => {
    const data = { exercises: [{ id: 'seed-0', name: '벤치 프레스', seed: true }], routines: [], sessions: [], body: [], settings: {} };
    expect(migrate(structuredClone(data), 1, MIGRATIONS).data).toEqual(data);
  });
});
