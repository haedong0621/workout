// 머신 부품: 사각 철제 프레임 · 중량 스택 기둥 · 케이블 기둥 · 패드(철판 받침) · 레버 팔 · 손잡이 · 스미스 머신
// 좌표는 사람 기준(앞 +x, 왼쪽 +y, 위 +z). 실제 헬스장 기계 비율을 대략 따름.
import { add, capsule, cross, cyl, len, lerp, mul, norm, rbox, sphere, sub, type Shape, type V } from './iso.ts';
import { cylA, obox } from './kit.ts';
import type { MatName } from './palette.ts';

/** 사각 철제 튜브 a → b (반 굵기 s) */
export function tube(a: V, b: V, s = 0.26, mat: MatName = 'steel'): Shape {
  const u = sub(b, a); const un = norm(u);
  const ref: V = Math.abs(un[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const v = norm(cross(ref, un));
  return obox(lerp(a, b, 0.5), un, v, [len(u) / 2 + s, s, s], 0.05, mat);
}
/** 여러 점을 잇는 튜브 */
export const tubes = (pts: V[], s = 0.26, mat: MatName = 'steel'): Shape[] => pts.slice(1).map((p, i) => tube(pts[i]!, p, s, mat));
/** 바닥 사각 틀 (x0~x1, 반폭 w) */
export function baseFrame(x0: number, x1: number, w: number): Shape[] {
  return [tube([x0, -w, 0.26], [x0, w, 0.26]), tube([x1, -w, 0.26], [x1, w, 0.26]), tube([x0, -w, 0.26], [x1, -w, 0.26]), tube([x0, w, 0.26], [x1, w, 0.26])];
}
/** 회전축 캡 */
export const hub = (c: V, axis: V = [0, 1, 0], r = 0.42): Shape[] => [cylA(c, axis, r, 0.2, 'plate'), cylA(c, axis, r * 0.45, 0.32, 'bar')];
/** 고무 손잡이 + 끝 캡 */
export function handle(c: V, axis: V = [0, 0, 1], h = 0.6): Shape[] {
  const ax = norm(axis);
  return [cylA(c, ax, 0.21, h, 'shoe'), ...[-1, 1].map((s) => cylA(add(c, mul(ax, (h + 0.06) * s)), ax, 0.25, 0.06, 'steel'))];
}
/** 패드 + 뒤 철판: 가운데 c, 축 u(길이 방향)·v(폭 방향), 반 크기 [길이, 폭], 두께 t. 철판은 n 방향 반대편 */
export function cushion(c: V, u: V, v: V, half: [number, number], t = 0.42): Shape[] {
  const n = norm(cross(norm(u), norm(v)));
  return [obox(c, u, v, [half[0], half[1], t], 0.26, 'pad'), obox(add(c, mul(n, -(t + 0.08))), u, v, [half[0] - 0.25, half[1] - 0.3, 0.08], 0.03, 'steel')];
}
/** 두 점 사이 패드 (등받이 등): 아래 a, 위 b, 폭 반 w, 앞쪽 방향 front */
export function cushionAB(a: V, b: V, w: number, front: V, t = 0.42): Shape[] {
  const u = sub(b, a);
  const v = norm(cross(front, u));
  const c = lerp(a, b, 0.5);
  // v는 폭 방향, 패드 법선은 front 쪽이 되도록 u·v 순서 맞춤
  const n = norm(cross(norm(u), v));
  const vv = n[0] * front[0] + n[1] * front[1] + n[2] * front[2] > 0 ? v : mul(v, -1);
  return cushion(c, u, vv, [len(u) / 2, w], t);
}
/** 롤러 패드 (발목·허벅지 고정용), 축 방향 axis */
export const roll = (c: V, half = 1.8, axis: V = [0, 1, 0], r = 0.5): Shape[] => [cylA(c, axis, r, half, 'pad'), cylA(c, axis, 0.14, half + 0.2, 'bar')];

/** 중량 스택 기둥: 바닥 가운데 (x, y), 높이 h. 원판이 앞(+x 또는 face 방향)에서 보임 */
export function weightStack(x: number, y: number, h = 14, face: 1 | -1 = 1): Shape[] {
  const out: Shape[] = [];
  out.push(rbox([x, y, 0.2], [1.1, 1.5, 0.2], 0.05, 'plate'));                                      // 받침
  for (const s of [-1, 1]) out.push(tube([x - 0.6 * face, y + 1.3 * s, 0.3], [x - 0.6 * face, y + 1.3 * s, h]));   // 기둥 2개
  out.push(tube([x - 0.6 * face, y - 1.3, h], [x - 0.6 * face, y + 1.3, h]));                        // 위 가로대
  out.push(rbox([x - 0.85 * face, y, h / 2], [0.1, 1.15, h / 2 - 0.3], 0.03, 'plate'));                // 뒤 판
  for (const s of [-1, 1]) out.push(capsule([x, y + 0.55 * s, 0.4], [x, y + 0.55 * s, h - 0.4], 0.07, 'bar')); // 가이드 봉
  // 원판 12장 (틈 선)
  out.push(rbox([x, y, 2.6], [0.62, 1.0, 2.2], 0.06, (p) => (Math.abs((((p[2] - 0.4) % 0.37) + 0.37) % 0.37 - 0.36) < 0.035 ? { mat: 'plate', line: true } : 'plate')));
  out.push(rbox([x, y, 5.0], [0.55, 0.9, 0.18], 0.05, 'steel'));                                      // 윗판
  out.push(capsule([x, y, 5.1], [x, y, h - 0.6], 0.06, 'bar'));                                       // 선택 봉
  out.push(sphere([x + 0.66 * face, y + 0.5, 3.2], 0.13, 'shoe'));                                     // 핀
  out.push(...hub([x, y, h - 0.6], [1, 0, 0], 0.48));                                                 // 위 도르래
  return out;
}
/** 케이블 기둥(펑셔널 트레이너 한쪽): 바닥 (x, y), 도르래 높이 z, 도르래가 향하는 쪽 face(사람 기준 방향) */
export function cableColumn(x: number, y: number, z: number, face: V = [1, 0, 0], h = 19.5): Shape[] {
  const f = norm([face[0], face[1], 0]);
  const side: V = [-f[1], f[0], 0];
  const at = (a: number, b: number, zz: number): V => [x + f[0] * a + side[0] * b, y + f[1] * a + side[1] * b, zz];
  const out: Shape[] = [
    obox(at(0, 0, 0.2), f, side, [1.4, 1.6, 0.2], 0.05, 'plate'),
    ...[-1, 1].map((s) => tube(at(-0.4, 1.2 * s, 0.3), at(-0.4, 1.2 * s, h))),
    tube(at(-0.4, -1.2, h), at(-0.4, 1.2, h)),
    obox(at(-0.75, 0, h / 2), f, side, [0.1, 1.05, h / 2 - 0.3], 0.03, 'plate'),
    obox(at(0.15, 0, 2.6), f, side, [0.5, 0.85, 2.2], 0.06, (p) => (Math.abs((((p[2] - 0.4) % 0.37) + 0.37) % 0.37 - 0.36) < 0.035 ? { mat: 'plate', line: true } : 'plate')),
    obox(at(0.15, 0, 5.0), f, side, [0.45, 0.8, 0.18], 0.05, 'steel'),
    tube(at(0.85, 0, 0.4), at(0.85, 0, h - 0.4), 0.18, 'steel'),                                    // 앞 레일
  ];
  const car = at(1.15, 0, z);
  out.push(obox(car, f, side, [0.35, 0.45, 0.55], 0.08, 'plate'));                                  // 캐리지
  out.push(...hub(add(car, mul(f, 0.45)), side, 0.4));                                              // 도르래
  return out;
}
/** 케이블 줄 */
export const rope = (a: V, b: V): Shape => capsule(a, b, 0.09, 'plate');
/** 케이블 끝(도르래 앞) 위치 */
export const pulleyOut = (x: number, y: number, z: number, face: V = [1, 0, 0]): V => { const f = norm([face[0], face[1], 0]); return [x + f[0] * 1.6, y + f[1] * 1.6, z]; };

/** 스미스 머신: 바가 x 위치의 가이드 봉에 걸려 위아래로만 움직임 */
export function smith(x: number, barZ: number): Shape[] {
  const out: Shape[] = [
    ...baseFrame(x - 2.2, x + 2.2, 6.1),
    ...[-1, 1].flatMap((s) => [tube([x - 2.2, 6.1 * s, 0.3], [x - 2.2, 6.1 * s, 21]), tube([x + 2.2, 6.1 * s, 0.3], [x + 2.2, 6.1 * s, 21]), tube([x - 2.2, 6.1 * s, 21], [x + 2.2, 6.1 * s, 21])]),
    tube([x - 2.2, -6.1, 21], [x - 2.2, 6.1, 21]), tube([x + 2.2, -6.1, 21], [x + 2.2, 6.1, 21]),
    ...[-1, 1].flatMap((s) => [capsule([x, 4.95 * s, 0.5], [x, 4.95 * s, 20.8], 0.13, 'bar'), rbox([x, 4.95 * s, barZ], [0.36, 0.3, 0.55], 0.08, 'steel'), rbox([x - 0.3, 4.95 * s, barZ + 0.1], [0.12, 0.1, 0.5], 0.04, 'plate')]),
    // 안전 고리 걸이(뒤 기둥)
    ...[-1, 1].flatMap((s) => [4, 8, 12, 16].map((zz) => rbox([x - 2.2, 5.75 * s, zz], [0.12, 0.12, 0.08], 0.03, 'plate'))),
  ];
  return out;
}

/** 원판 꽂는 뿔(플레이트 로디드) + 원판 */
export const horn = (c: V, axis: V = [0, 1, 0], plates = 1): Shape[] => {
  const ax = norm(axis);
  const out: Shape[] = [cylA(add(c, mul(ax, 0.9)), ax, 0.28, 0.9, 'bar')];
  for (let k = 0; k < plates; k++) out.push(cylA(add(c, mul(ax, 0.35 + k * 0.42)), ax, 1.55, 0.17, 'plate'));
  out.push(cylA(add(c, mul(ax, 0.35)), ax, 0.5, 0.3 + plates * 0.2, 'steel'));
  return out;
};
export { cyl, len };
