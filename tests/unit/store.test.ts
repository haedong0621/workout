// 상태(store) 동작: 저장소에 실제로 기록되는지까지 확인
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) }; })());
vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));

const { MemoryRepository } = await import('@/data/memoryRepository');
const store = await import('@/store');
const { parseBackup } = await import('@/domain/backup');
const { rest } = await import('@/services/restTimer');
const v1 = (await import('../fixtures/v1-backup.json')).default;

let repo: InstanceType<typeof MemoryRepository>;
beforeEach(async () => {
  repo = new MemoryRepository({ persistent: true });
  await store.bootStore(async () => repo);
});

describe('처음 실행', () => {
  it('기본 운동 98개를 한 번만 넣음', async () => {
    expect(store.exercises.value).toHaveLength(98);
    expect(store.settings.value.seeded).toBe(true);
    await store.flush();
    expect((await repo.loadAll()).exercises).toHaveLength(98);
    // 다시 부팅해도 중복 없음
    await store.bootStore(async () => repo);
    expect(store.exercises.value).toHaveLength(98);
  });
  it('기본 운동을 다 지운 뒤 다시 열어도 다시 넣지 않음', async () => {
    for (const e of [...store.exercises.value]) store.exerciseActions.deleteExercise(e.id);
    await store.flush();
    await store.bootStore(async () => repo);
    expect(store.exercises.value).toHaveLength(0);
  });
});

describe('운동 흐름', () => {
  it('시작 → 세트 체크 → 종료 → 기록 저장', async () => {
    const s = store.workoutActions.startWorkout(null);
    expect(store.activeSession.value?.id).toBe(s.id);
    const bench = store.exercises.value[0]!;
    store.workoutActions.addExercisesToSession(s.id, [bench]);
    store.workoutActions.updateSet(s.id, 0, 0, { w: 60, r: 10, done: true });
    const done = store.workoutActions.finishWorkout(s.id, '테스트')!;
    expect(done.status).toBe('done');
    expect(done.items[0]!.sets).toHaveLength(1);
    expect(store.activeSession.value).toBeNull();
    expect(store.settings.value.activeSessionId).toBeNull();
    expect(rest.value.endAt).toBe(0);
    await store.flush();
    const saved = (await repo.loadAll()).sessions as { id: string; status: string }[];
    expect(saved.find((x) => x.id === s.id)?.status).toBe('done');
  });
  it('운동 취소는 기록을 지움', async () => {
    const s = store.workoutActions.startWorkout(null);
    store.workoutActions.discardWorkout();
    await store.flush();
    expect(store.findById('sessions', s.id)).toBeUndefined();
    expect((await repo.loadAll()).sessions).toHaveLength(0);
  });
  it('체중 입력은 세션과 내 몸 기록에 모두 반영', () => {
    const s = store.workoutActions.startWorkout(null);
    store.workoutActions.setSessionBodyweight(s.id, 87);
    expect(store.findById('sessions', s.id)?.bw).toBe(87);
    expect(store.body.value.at(-1)?.weight).toBe(87);
  });
});

describe('종목', () => {
  it('메모를 고치면 날짜 갱신, 같으면 그대로', () => {
    const id = store.exercises.value[0]!.id;
    store.exerciseActions.setMemo(id, ' 시트 4 ');
    const a = store.findById('exercises', id)!;
    expect(a.memo).toBe('시트 4');
    expect(a.memoAt).toBeTypeOf('number');
    store.exerciseActions.setMemo(id, '시트 4');
    expect(store.findById('exercises', id)).toBe(a);
  });
  it('삭제하면 루틴에서도 빠짐', () => {
    const [a, b] = store.exercises.value;
    store.routineActions.saveRoutine({ id: 'r', name: 'r', emoji: '💪', imageId: null, createdAt: 0, items: [{ exerciseId: a!.id, setCount: 3 }, { exerciseId: b!.id, setCount: 3 }] });
    store.exerciseActions.deleteExercise(a!.id);
    expect(store.findById('routines', 'r')!.items.map((i) => i.exerciseId)).toEqual([b!.id]);
  });
});

describe('백업', () => {
  it('합치기: 같은 id는 덮어쓰고 설정 반영', async () => {
    await store.backupActions.importBackup(parseBackup(v1), 'merge');
    // 예전 백업은 새 기본 목록으로 옮겨져서 들어옴: 기본 98 + 직접 만든 1
    expect(store.exercises.value).toHaveLength(99);
    expect(store.exercises.value.find((e) => e.id === 'seed-0')).toMatchObject({ name: '바벨 벤치 프레스', toggle: 'bar' });
    expect(store.sessions.value.filter((s) => s.status === 'done')).toHaveLength(2);
    expect(store.settings.value.restDefault).toBe(75);
    expect((await repo.allImages())).toHaveLength(1);
  });
  it('교체: 진행 중이던 운동도 정리', async () => {
    store.workoutActions.startWorkout(null);
    await store.backupActions.importBackup(parseBackup(v1), 'replace');
    expect(store.activeSession.value).toBeNull();
    expect(store.sessions.value).toHaveLength(2);
  });
  it('내보내기 → 불러오기 왕복', async () => {
    await store.backupActions.importBackup(parseBackup(v1), 'replace');
    const file = JSON.parse(JSON.stringify(await store.backupActions.exportBackup()));
    expect(parseBackup(file).counts).toEqual(parseBackup(v1).counts);
  });
  it('전체 삭제 후에는 기본 운동만', async () => {
    await store.backupActions.importBackup(parseBackup(v1), 'merge');
    await store.backupActions.wipeAll();
    expect(store.sessions.value).toHaveLength(0);
    expect(store.exercises.value).toHaveLength(98);
    expect(store.settings.value.restDefault).toBe(90);
  });
});
