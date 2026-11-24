// 운동 그림 장비 조립품 (사람 기준 좌표: 앞 +x, 왼쪽 +y, 위 +z)
import { add, capsule, cyl, lerp, mul, rbox, sphere, sub, type Shape, type V } from './iso.ts';
import { cableTower, cylA, obox, pad, post, pulley, type pose } from './kit.ts';

export type P = ReturnType<typeof pose>;
export const pelvisOf = (p: P): V => lerp(p.L.hip, p.R.hip, 0.5);

/** 몸통 뒤에 붙는 등받이 패드(누운·앉은 자세): 엉덩이 아래 → 어깨 위 */
export function backPad(p: P, extra = 1.0, below = 0.2): Shape {
  const pel = pelvisOf(p);
  const off = mul(p.front, -1.32);
  return pad(add(add(pel, off), mul(p.spine, -below)), add(add(p.shMid, off), mul(p.spine, extra)));
}
/** 앉는 좌판(엉덩이 아래, 허벅지 방향으로) */
export function seatPad(p: P, len = 3.2): Shape {
  const pel = pelvisOf(p);
  const a: V = [pel[0] - 1.0, 0, pel[2] - 1.3];
  return pad(a, [pel[0] + len - 1.0, 0, pel[2] - 1.3], 1.4, 0.4);
}
/** 패드 아래 받침 기둥 + 바닥 */
export function legs(xs: number[], top: number, w = 1.5): Shape[] {
  return xs.flatMap((x) => [rbox([x, 0, top / 2], [0.28, 0.28, top / 2], 0.08, 'steel'), rbox([x, 0, 0.18], [0.35, w, 0.18], 0.08, 'steel')]);
}
/** 누운 벤치 전체: 등받이 + 좌판 + 다리 */
export function benchFor(p: P, opts: { seat?: boolean } = {}): Shape[] {
  const pel = pelvisOf(p);
  const out: Shape[] = [backPad(p, 1.4, 0.6)];
  if (opts.seat !== false) out.push(seatPad(p, 2.6));
  out.push(...legs([pel[0] + 0.6, Math.min(p.shMid[0], pel[0]) - 2.2], Math.min(pel[2], p.shMid[2]) - 1.4));
  return out;
}
/** 머신 뒤 기둥 + 중량 스택 (x 위치) */
export function stack(x: number, y = 0, h = 13): Shape[] {
  return [
    rbox([x, y, h / 2], [0.7, 1.4, h / 2], 0.1, 'steel'),
    rbox([x, y, 0.25], [1.4, 2.2, 0.25], 0.08, 'plate'),
    rbox([x + 0.75, y, 3.0], [0.2, 0.9, 2.2], 0.05, (q) => (Math.abs(((q[2] - 0.8) % 0.55) - 0.27) < 0.05 ? { mat: 'plate', line: true } : 'plate')),
  ];
}
/** 손잡이(세로) */
export const grip = (c: V, axis: V = [0, 0, 1], h = 0.55): Shape => cylA(c, axis, 0.2, h, 'shoe');
/** 레버 팔: 회전축 → 손잡이 */
export function lever(pivot: V, hand: V, r = 0.24): Shape[] { return [capsule(pivot, hand, r, 'steel'), sphere(pivot, r + 0.18, 'plate')]; }
/** 평행봉(딥스): 높이 z, 간격 y */
export function dipBars(z = 10.5, y = 2.9, x0 = -3, x1 = 4): Shape[] {
  return [-1, 1].flatMap((s) => [capsule([x0, y * s, z], [x1, y * s, z], 0.22, 'bar'), post([x0 + 0.4, y * s, 0], [x0 + 0.4, y * s, z]), post([x1 - 0.4, y * s, 0], [x1 - 0.4, y * s, z])]);
}
/** 철봉 프레임: 바 높이 z, 반폭 w */
export function pullupFrame(z: number, x = 0, w = 6): Shape[] {
  return [capsule([x, -w, z], [x, w, z], 0.2, 'bar'), ...[-1, 1].flatMap((s) => [post([x - 0.8, w * s, 0], [x - 0.8, w * s, z + 0.6]), capsule([x - 0.8, w * s, z + 0.6], [x, w * s, z], 0.3, 'steel')])];
}
/** 케이블 두 기둥(크로스오버): x 위치, 반간격 y, 도르래 높이 z */
export function crossover(x: number, y: number, z: number): Shape[] {
  return [-1, 1].flatMap((s) => [...cableTower(x, y * s, 19), ...pulley([x, y * s * 0.97, z], [1, 0, 0])]);
}
/** 기둥 하나 + 도르래 (x, y, 높이 z) */
export function tower(x: number, y: number, z: number): Shape[] { return [...cableTower(x, y, 19), ...pulley([x + 0.6, y, z], [0, 1, 0])]; }
/** 원판(머신에 끼운) */
export const plateOn = (c: V, axis: V = [0, 1, 0], r = 1.5): Shape[] => [cylA(c, axis, r, 0.16, 'plate'), cylA(c, axis, 0.4, 0.3, 'steel')];
/** 롤러 패드(다리 걸기) */
export const roller = (c: V, half = 2.0): Shape => cyl(c, 1, 0.48, half, 'pad');
/** 상자 */
export const box = (c: V, h: V, mat: 'steel' | 'pad' | 'plate' = 'steel'): Shape => rbox(c, h, 0.1, mat);
export { obox, sub };
