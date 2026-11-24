import { describe, expect, it } from 'vitest';
import { BackupError, buildBackup, parseBackup } from '@/domain/backup';
import { DEFAULT_SETTINGS } from '@/domain/constants';
import v1 from '../fixtures/v1-backup.json';

describe('이전 앱(v1.0.6)이 만든 백업 파일', () => {
  const p = parseBackup(v1);
  it('모든 항목을 읽음', () => {
    // 예전 기본 목록(54) + 직접 만든 1 → 새 기본 목록(96) + 직접 만든 1 로 옮겨짐
    expect(p.counts).toEqual({ exercises: 97, routines: 1, sessions: 2, body: 2, images: 1 });
  });
  it('세부 값 유지', () => {
    const bench = p.exercises.find((e) => e.name === '바벨 벤치 프레스')!;
    expect(bench).toMatchObject({ id: 'seed-0', memo: '시트 4번', rest: 120, fav: true, pinned: ['s1'], toggle: 'bar' });
    expect(bench.imageId).toBe(p.images[0]!.id);
    const s2 = p.sessions.find((s) => s.id === 's2')!;
    expect(s2.items[0]!.sets.map((x) => x.t)).toEqual(['W', 'N', 'D']);
    expect(s2.bw).toBe(87);
  });
  it('설정은 파일에 있던 키만', () => {
    expect(p.settings.restDefault).toBe(75);
    expect(p.settings.includeWarmup).toBe(false);
    expect('activeSessionId' in p.settings).toBe(false);
    expect('lastBackupAt' in p.settings).toBe(false);
  });
});

describe('parseBackup 방어', () => {
  it('다른 파일은 거부', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow(BackupError);
    expect(() => parseBackup(null)).toThrow(BackupError);
  });
  it('더 새로운 형식은 거부', () => {
    expect(() => parseBackup({ app: 'workout-log', version: 99, data: {} })).toThrow(/새로운 버전/);
  });
  it('깨진 항목은 버리고 나머지는 살림, 진행 중 운동은 제외', () => {
    const p = parseBackup({
      app: 'workout-log', version: 1, data: {
        exercises: [{ id: 'a', name: '가' }, { name: 'id 없음' }, 'x', { id: 'a', name: '중복' }],
        sessions: [{ id: 's', startedAt: 'nope' }, { id: 't', startedAt: 5, status: 'active', items: [] }, { id: 'u', startedAt: 5, items: [{ exerciseId: 'a', sets: [{ w: '50', r: 5 }] }] }],
        body: [{ id: 'b', date: '2026-1-1' }, { id: 'c', date: '2026-01-01', weight: '80' }],
        settings: { restDefault: 'abc', sound: 0, unknown: 1 },
      },
    });
    expect(p.exercises).toHaveLength(1);
    expect(p.exercises[0]).toMatchObject({ kind: 'normal', part: '기타', pinned: [], rest: null });
    expect(p.sessions.map((s) => s.id)).toEqual(['u']);
    expect(p.sessions[0]!.items[0]!.sets[0]).toEqual({ w: 50, r: 5, t: 'N', done: false });
    expect(p.body).toEqual([{ id: 'c', date: '2026-01-01', weight: 80 }]);
    expect(p.settings).toEqual({ restDefault: DEFAULT_SETTINGS.restDefault, sound: false });
  });
  it('만들고 → 다시 읽으면 같음 (왕복)', () => {
    const p = parseBackup(v1);
    const again = parseBackup(JSON.parse(JSON.stringify(buildBackup({ ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings, activeSessionId: 'x', lastBackupAt: 5 } }))));
    expect(again.counts).toEqual(p.counts);
    expect(again.sessions).toEqual(p.sessions);
    expect('activeSessionId' in again.settings).toBe(false);
  });
});
