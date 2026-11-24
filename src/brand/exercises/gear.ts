// 운동 그림 장비 조립품 (사람 기준 좌표: 앞 +x, 왼쪽 +y, 위 +z) — 머신 부품은 machine.ts
import { add, capsule, cyl, lerp, mul, norm, rbox, sub, type Shape, type V } from './iso.ts';
import { cylA, obox, type pose } from './kit.ts';
import { cableColumn, cushion, cushionAB, handle, horn, hub, pulleyOut, roll, tube } from './machine.ts';

export type P = ReturnType<typeof pose>;
export const pelvisOf = (p: P): V => lerp(p.L.hip, p.R.hip, 0.5);

/** 몸통 뒤에 붙는 등받이 패드(누운·앉은 자세): 엉덩이 아래 → 어깨 위 */
export function backPad(p: P, extra = 1.0, below = 0.2): Shape[] {
  const pel = pelvisOf(p);
  const off = mul(p.front, -1.35);
  return cushionAB(add(add(pel, off), mul(p.spine, -below)), add(add(p.shMid, off), mul(p.spine, extra)), 1.35, p.front);
}
/** 앉는 좌판(엉덩이 아래, 허벅지 방향으로) */
export function seatPad(p: P, len = 3.2): Shape[] {
  const pel = pelvisOf(p);
  return cushion([pel[0] + len / 2 - 1.0, 0, pel[2] - 1.32], [1, 0, 0], [0, 1, 0], [len / 2 + 0.2, 1.45]);
}
/** 패드 아래 받침 기둥 + 바닥 받침 */
export function legs(xs: number[], top: number, w = 1.5): Shape[] {
  return xs.flatMap((x) => [tube([x, 0, 0.3], [x, 0, top], 0.28), tube([x, -w, 0.26], [x, w, 0.26], 0.26)]);
}
/** 누운 벤치 전체: 등받이 + 좌판 + 다리 */
export function benchFor(p: P, opts: { seat?: boolean } = {}): Shape[] {
  const pel = pelvisOf(p);
  const out: Shape[] = [...backPad(p, 1.4, 0.6)];
  if (opts.seat !== false) out.push(...seatPad(p, 2.6));
  out.push(...legs([pel[0] + 0.6, Math.min(p.shMid[0], pel[0]) - 2.2], Math.min(pel[2], p.shMid[2]) - 1.5));
  return out;
}
/** 중량 스택 기둥 */
export { weightStack as stack } from './machine.ts';
/** 고무 손잡이 */
export const grip = (c: V, axis: V = [0, 0, 1], h = 0.55): Shape[] => handle(c, axis, h);
/** 레버 팔: 회전축 → 손잡이 */
export function lever(pivot: V, hand: V, r = 0.22): Shape[] { return [...hub(pivot, [0, 1, 0], r + 0.2), tube(pivot, hand, r)]; }
/** 평행봉(딥스): 높이 z, 간격 y */
export function dipBars(z = 10.5, y = 2.9, x0 = -3, x1 = 4): Shape[] {
  return [-1, 1].flatMap((s) => [cylA([(x0 + x1) / 2, y * s, z], [1, 0, 0], 0.24, (x1 - x0) / 2, 'bar'), tube([x0 + 0.4, y * s, 0.3], [x0 + 0.4, y * s, z - 0.2]), tube([x1 - 0.4, y * s, 0.3], [x1 - 0.4, y * s, z - 0.2]), tube([x0 - 0.4, y * s, 0.26], [x1 + 0.4, y * s, 0.26])]);
}
/** 철봉 프레임: 바 높이 z, 반폭 w */
export function pullupFrame(z: number, x = 0, w = 6): Shape[] {
  return [cylA([x, 0, z], [0, 1, 0], 0.22, w, 'bar'), ...[-1, 1].flatMap((s) => [tube([x - 1.4, w * s, 0.3], [x - 1.4, w * s, z + 1.0], 0.3), tube([x - 1.4, w * s, z + 1.0], [x, w * s, z], 0.26), tube([x - 3.2, w * s, 0.26], [x + 1.6, w * s, 0.26], 0.26)])];
}
/** 케이블 기둥 하나: 바닥 (x, y), 도르래 높이 z. 기본으로 사람(원점) 쪽을 봄 */
const faceTo = (x: number, y: number): V => (Math.hypot(x, y) < 0.1 ? [1, 0, 0] : norm([-x, -y, 0]));
export function tower(x: number, y: number, z: number, face?: V): Shape[] { return cableColumn(x, y, z, face ?? faceTo(x, y)); }
/** 그 기둥의 케이블이 나오는 점 */
export const towerOut = (x: number, y: number, z: number, face?: V): V => pulleyOut(x, y, z, face ?? faceTo(x, y));
/** 케이블 두 기둥(크로스오버): x 위치, 반간격 y, 도르래 높이 z (서로 마주 봄) */
export function crossover(x: number, y: number, z: number): Shape[] {
  return [-1, 1].flatMap((s) => cableColumn(x, y * s, z, [0, -s, 0]));
}
export const crossOut = (x: number, y: number, z: number, s: number): V => pulleyOut(x, y * s, z, [0, -s, 0]);
/** 원판 꽂는 뿔 */
export const plateOn = (c: V, axis: V = [0, 1, 0], _r = 1.5): Shape[] => horn(c, axis, 1);
/** 롤러 패드(다리 걸기) */
export const roller = (c: V, half = 2.0): Shape[] => roll(c, half);
/** 상자 */
export const box = (c: V, h: V, mat: 'steel' | 'pad' | 'plate' = 'steel'): Shape => rbox(c, h, 0.1, mat);
export { capsule, cyl, obox, sub, tube };

// ── 앉는 머신 공통 몸체
import { baseFrame, rope, tubes, weightStack } from './machine.ts';
export interface ChassisOpts {
  /** 뒤 기둥 높이 */ h?: number;
  /** 뒤 기둥 x */ rx?: number;
  /** 등받이 위로 더 */ backUp?: number;
  /** 등받이 없음 */ noBack?: boolean;
  /** 중량 스택: 뒤(기본) / 앞(x 위치) / 없음 */ stackX?: number | false;
  /** 바닥틀 앞 끝 */ fx?: number;
  /** 좌판 길이 */ seatLen?: number;
}
export function chassis(p: P, o: ChassisOpts = {}): Shape[] {
  const pel = pelvisOf(p);
  const h = o.h ?? 15.8, rx = o.rx ?? pel[0] - 3.0, fx = o.fx ?? pel[0] + 2.4;
  const sx = o.stackX === undefined ? rx - 2.0 : o.stackX;
  const out: Shape[] = [
    ...baseFrame(Math.min(rx, sx === false ? rx : sx) - 0.6, Math.max(fx, sx === false ? fx : sx + 1.2), 2.4),
    ...seatPad(p, o.seatLen ?? 3.0),
    tube([pel[0] + 0.3, 0, pel[2] - 1.9], [pel[0] + 0.3, 0, 0.3], 0.3),
    ...[-1, 1].map((s) => tube([rx, 2.4 * s, 0.3], [rx, 2.4 * s, h], 0.3)),
    tube([rx, -2.4, h], [rx, 2.4, h], 0.3),
    tube([rx, -2.4, pel[2] + 2.2], [rx, 2.4, pel[2] + 2.2], 0.26),
  ];
  if (!o.noBack) {
    const back = backPad(p, o.backUp ?? 1.5, 0.3);
    const mid = add(lerp(pel, p.shMid, 0.45), mul(p.front, -1.9));
    out.push(...back, tube(mid, [rx, 0, mid[2]], 0.26));
  }
  if (sx !== false) {
    const face = sx < pel[0] ? -1 : 1;
    out.push(...weightStack(sx, 0, h - 1.0, face as 1 | -1), rope([sx, 0, h - 1.6], [rx, 0, h - 1.6]));
  }
  return out;
}
/** 앞뒤로 움직이는 레버 팔: 회전축 → 꺾임점 → 손잡이 (양쪽) */
export function arms(p: P, pivot: V, bend: (h: V) => V, gripAxis: V = [0, 0, 1], spread = 0.3): Shape[] {
  const out: Shape[] = [];
  for (const h of [p.hands.L, p.hands.R]) {
    const s = Math.sign(h[1]);
    const pv: V = [pivot[0], pivot[1] * s, pivot[2]];
    const root = bend(h);
    const ga = norm(gripAxis);
    const end = add(add(h, [0, spread * s, 0]), mul(ga, -0.65));
    out.push(...hub(pv), ...tubes([pv, root, end], 0.22), tube(end, add(h, mul(ga, -0.65)), 0.2), ...handle(h, ga, 0.6));
  }
  return out;
}
export { tubes };
