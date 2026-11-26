// 휴식 타이머: 끝나면 소리 한 번, "휴식 끝!"을 잠깐 보여 주고 자동으로 사라짐
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) }; })());
const { rest, setRestFinishedHandler, startRest, tickRest } = await import('@/services/restTimer');

describe('휴식 끝나면 자동으로 사라짐', () => {
  it('끝난 순간 알림 한 번, 2초 안에는 남아 있고, 그 뒤엔 사라짐', () => {
    const done = vi.fn();
    setRestFinishedHandler(done);
    startRest(60, '벤치');
    const end = rest.value.endAt;
    tickRest(end + 100);
    expect(done).toHaveBeenCalledTimes(1);
    tickRest(end + 1500);
    expect(rest.value.endAt).toBe(end); // "휴식 끝!" 잠깐 보임
    tickRest(end + 2500);
    expect(rest.value.endAt).toBe(0); // 자동으로 사라짐
    expect(done).toHaveBeenCalledTimes(1);
  });
});
