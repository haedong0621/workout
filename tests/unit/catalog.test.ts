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
      if (e.toggle === 'bar') expect(e.equip).toBe('바벨');
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
  });
  it('다른 이름으로도 찾음 (띄어쓰기·표기 무시)', () => {
    expect(findCatalog('펙덱 플라이')?.name).toBe('머신 플라이');
    expect(findCatalog('리버스 펙덱 플라이')?.name).toBe('머신 리어 델트 플라이');
    expect(findCatalog('이지 바 컬')?.name).toBe('이지바 컬');
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
