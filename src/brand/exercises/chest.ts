// 가슴 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, mul } from './iso.ts';
import { art, barbell, dumbbell, grounded, type BodySpec, type LimbSpec } from './kit.ts';
import {  benchFor,  crossOut, crossover, dipBars, grip, pelvisOf,  type P } from './gear.ts';
import { rope } from './machine.ts';
import {  STAND_WIDE, stand } from './poses.ts';

/** 벤치에 누운 자세: angle = 등받이 각도(평평 0, 인클라인 +, 디클라인 −) */
export function lie(angle: number, arm: LimbSpec): BodySpec {
  const decl = angle < 0;
  // 몸통 기준 손 위치를 등받이 각도만큼 돌림 → 인클라인·디클라인에서도 팔이 천장(수직) 쪽으로 오르내림
  if ('hand' in arm && arm.rel === 'torso' && angle !== 0) {
    const a = (angle * Math.PI) / 180, [f, l, s] = arm.hand;
    arm = { ...arm, hand: [f * Math.cos(a) - s * Math.sin(a), l, f * Math.sin(a) + s * Math.cos(a)] };
  }
  return {
    pelvis: [1.6, 0, decl ? 6.6 : 5.6],
    lean: -90 + angle,
    head: decl ? 10 : 25 - angle * 0.3,
    arm,
    leg: decl ? { ankle: [5.6, 1.3, 4.2], pole: [0, 0, 1], ft: 100 } : { ankle: [5.4, 2.8, 1.0], pole: [1, 0.3, 1] },
  };
}
const barAt = (p: P) => barbell(mul(add(p.hands.L, p.hands.R), 0.5));
const dbsAt = (axis: V) => (p: P) => [...dumbbell(p.hands.L, axis), ...dumbbell(p.hands.R, axis)];
const declRoller = (p: P): Shape[] => { const pel = pelvisOf(p); return [capsule([pel[0] + 3.6, -2, pel[2] - 1.2], [pel[0] + 3.6, 2, pel[2] - 1.2], 0.45, 'pad')]; };
const benchGear = (angle: number, extra: (p: P) => Shape[]) => (p: P) => [...benchFor(p), ...(angle < 0 ? declRoller(p) : []), ...extra(p)];

const PRESS_UP: LimbSpec = { hand: [4.6, 2.6, -0.5], pole: [0, 1, -1], rel: 'torso' };
const PRESS_DN: LimbSpec = { hand: [1.3, 3.0, -0.8], pole: [0, 1, -1], rel: 'torso' };
const DB_UP: LimbSpec = { hand: [4.6, 1.5, -0.4], pole: [0, 1, -1], rel: 'torso' };
const DB_DN: LimbSpec = { hand: [1.0, 3.6, -0.5], pole: [0, 0.6, -1], rel: 'torso' };
const FLY_UP: LimbSpec = { hand: [4.4, 0.9, -0.3], pole: [0, 1, -0.5], rel: 'torso' };
const FLY_DN: LimbSpec = { hand: [0.6, 5.6, -0.3], pole: [0, 0.2, -1], rel: 'torso' };
const CAM = { yaw: -112 + 90, center: [-1, 0, 6] as V, floor: [7, 4.5] as [number, number] };
const lieArt = (id: string, angle: number, up: LimbSpec, dn: LimbSpec, gear: (p: P) => Shape[]) =>
  art(id, { body: lie(angle, up), gear: benchGear(angle, gear), ...CAM }, { body: lie(angle, dn), gear: benchGear(angle, gear), ...CAM });

export const INCLINE_BENCH = lieArt('barbell-incline-bench-press', 35, PRESS_UP, PRESS_DN, barAt);
export const DECLINE_BENCH = lieArt('barbell-decline-bench-press', -18, PRESS_UP, PRESS_DN, barAt);
export const DB_BENCH = lieArt('dumbbell-bench-press', 0, DB_UP, DB_DN, dbsAt([0, 1, 0]));
export const DB_INCLINE = lieArt('dumbbell-incline-bench-press', 35, DB_UP, DB_DN, dbsAt([0, 1, 0]));
export const DB_DECLINE = lieArt('dumbbell-decline-bench-press', -18, DB_UP, DB_DN, dbsAt([0, 1, 0]));
export const DB_FLY = lieArt('dumbbell-fly', 0, FLY_UP, FLY_DN, dbsAt([1, 0, 0]));
export const DB_INCLINE_FLY = lieArt('dumbbell-incline-fly', 35, FLY_UP, FLY_DN, dbsAt([1, 0, 0]));

// ── 앉아서 미는 머신 (가슴 프레스·인클라인·디클라인): 뒤 기둥 위 회전축에서 팔이 앞으로
// ── 머신 플라이(펙덱): 위 회전축에서 내려온 팔 손잡이를 옆 → 앞으로 모음
// ── 케이블 플라이(크로스오버): 서서 높은 도르래 → 앞 아래로 모음
const cfly = (arm: LimbSpec): BodySpec => stand({ lean: 18, head: 10, arm, leg: { L: { th: [12, 6], sh: [-4, 4] }, R: { th: [-14, 6], sh: [-20, 4] } } });
const cflyGear = (p: P): Shape[] => [...crossover(-1.0, 8.0, 17.5), ...[p.hands.L, p.hands.R].flatMap((h) => { const s = Math.sign(h[1]); return [rope(h, crossOut(-1.0, 8.0, 17.5, s)), ...grip(h, [1, 0, 0], 0.45)]; })];
export const CABLE_FLY = art('cable-fly',
  { body: cfly({ hand: [0.2, 6.0, 14.6], pole: [-0.5, 0.5, -1] }), gear: cflyGear, yaw: -95, center: [-0.5, 0, 10.5], scale: 4.5, floor: [6, 8.5], floorX: -1 },
  { body: cfly({ hand: [4.0, 0.7, 10.6], pole: [0, 1, -0.4] }), gear: cflyGear, yaw: -95, center: [-0.5, 0, 10.5], scale: 4.5, floor: [6, 8.5], floorX: -1 });

// ── 딥스: 평행봉에서 팔 펴고 → 팔꿈치 굽혀 내려감
const dip = (z: number, lean: number): BodySpec => ({ pelvis: [0, 0, z], lean, head: 5, arm: { hand: [0.6, 2.9, 10.9], pole: [-1, 0.2, 0] }, leg: { th: [-10, 4], sh: [-95, 4], ft: 20 } });
export const DIPS = art('dips',
  { body: dip(8.8, 12), gear: () => dipBars(10.5), yaw: -40, center: [0, 0, 9.5] },
  { body: dip(6.6, 26), gear: () => dipBars(10.5), yaw: -40, center: [0, 0, 9.5] });

// ── 머신 딥스: 앉아서 옆 손잡이를 아래로 누름 (뒤 회전축)

export const ARTS = [INCLINE_BENCH, DECLINE_BENCH, DB_BENCH, DB_INCLINE, DB_DECLINE, DB_FLY, DB_INCLINE_FLY, CABLE_FLY, DIPS];
void grounded; void STAND_WIDE;
