// 가슴 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, mul } from './iso.ts';
import { art, barbell, dumbbell, grounded, type BodySpec, type LimbSpec } from './kit.ts';
import { backPad, benchFor, crossover, dipBars, grip, legs, lever, pelvisOf, seatPad, stack, type P } from './gear.ts';
import { SIT, STAND_WIDE, stand } from './poses.ts';

/** 벤치에 누운 자세: angle = 등받이 각도(평평 0, 인클라인 +, 디클라인 −) */
export function lie(angle: number, arm: LimbSpec): BodySpec {
  const decl = angle < 0;
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

// ── 앉아서 미는 머신 (가슴 프레스·인클라인·디클라인)
const seated = (arm: LimbSpec, lean = -10): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: 5, arm, leg: SIT });
function pressMachine(pivot: V) {
  return (p: P): Shape[] => {
    const pel = pelvisOf(p);
    return [
      backPad(p, 1.6, 0.4), seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7),
      ...stack(pel[0] - 3.2, 0, 15),
      ...[p.hands.L, p.hands.R].flatMap((h) => { const s = Math.sign(h[1]); const pv: V = [pivot[0], pivot[1] * s, pivot[2]]; return [...lever(pv, add(h, [0, 0.55 * s, 0])), grip(h)]; }),
    ];
  };
}
const machineArt = (id: string, a: LimbSpec, b: LimbSpec, pivot: V) => {
  const g = pressMachine(pivot);
  const cam = { yaw: -70, center: [0.5, 0, 8.5] as V, floor: [6, 5] as [number, number] };
  return art(id, { body: seated(a), gear: g, ...cam }, { body: seated(b), gear: g, ...cam });
};
const CP_IN: LimbSpec = { hand: [1.0, 3.2, -0.9], pole: [-1, 1, -0.4], rel: 'torso' };
export const MACHINE_CHEST_PRESS = machineArt('machine-chest-press', CP_IN, { hand: [4.4, 2.3, -1.0], pole: [-0.3, 1, -1], rel: 'torso' }, [-1.6, 3.6, 13.5]);
export const MACHINE_INCLINE_PRESS = machineArt('machine-incline-chest-press', { hand: [1.0, 3.2, -0.2], pole: [-1, 1, -0.4], rel: 'torso' }, { hand: [3.6, 2.2, 2.4], pole: [-0.3, 1, -1], rel: 'torso' }, [-1.6, 3.6, 5.5]);
export const MACHINE_DECLINE_PRESS = machineArt('machine-decline-chest-press', { hand: [1.0, 3.2, -1.5], pole: [-1, 1, -0.4], rel: 'torso' }, { hand: [4.0, 2.3, -3.0], pole: [-0.3, 1, -1], rel: 'torso' }, [-1.6, 3.6, 15.5]);

// ── 머신 플라이(펙덱): 팔을 옆으로 벌림 → 앞으로 모음
function pecDeck(p: P): Shape[] {
  const pel = pelvisOf(p);
  return [
    backPad(p, 1.8, 0.4), seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), ...stack(pel[0] - 3.0, 0, 16),
    ...[p.hands.L, p.hands.R].flatMap((h) => { const s = Math.sign(h[1]); const pv: V = [pel[0] - 1.6, 2.0 * s, h[2] + 4.5]; return [capsule(pv, add(h, [0, 0, 1.2]), 0.22, 'steel'), grip(h)]; }),
  ];
}
const PD_A: LimbSpec = { hand: [0.4, 5.4, 0.3], pole: [-0.2, 0.3, -1], rel: 'torso' };
const PD_B: LimbSpec = { hand: [3.9, 0.9, 0.1], pole: [0, 1, -0.6], rel: 'torso' };
export const MACHINE_FLY = art('machine-fly',
  { body: seated(PD_A, -6), gear: pecDeck, yaw: -80, center: [0.5, 0, 9] },
  { body: seated(PD_B, -6), gear: pecDeck, yaw: -80, center: [0.5, 0, 9] });

// ── 케이블 플라이(크로스오버): 서서 높은 도르래 → 앞 아래로 모음
const cfly = (arm: LimbSpec): BodySpec => stand({ lean: 18, head: 10, arm, leg: { L: { th: [12, 6], sh: [-4, 4] }, R: { th: [-14, 6], sh: [-20, 4] } } });
const cflyGear = (p: P): Shape[] => [...crossover(-1.0, 7.4, 17.5), ...[p.hands.L, p.hands.R].flatMap((h) => { const s = Math.sign(h[1]); return [capsule(h, [-1.0, 7.1 * s, 17.5], 0.1, 'plate'), grip(h, [1, 0, 0], 0.45)]; })];
export const CABLE_FLY = art('cable-fly',
  { body: cfly({ hand: [0.2, 6.0, 14.6], pole: [-0.5, 0.5, -1] }), gear: cflyGear, yaw: -95, center: [0, 0, 10.5], scale: 4.7, floor: [6, 8] },
  { body: cfly({ hand: [4.0, 0.7, 10.6], pole: [0, 1, -0.4] }), gear: cflyGear, yaw: -95, center: [0, 0, 10.5], scale: 4.7, floor: [6, 8] });

// ── 딥스: 평행봉에서 팔 펴고 → 팔꿈치 굽혀 내려감
const dip = (z: number, lean: number): BodySpec => ({ pelvis: [0, 0, z], lean, head: 5, arm: { hand: [0.6, 2.9, 10.9], pole: [-1, 0.2, 0] }, leg: { th: [-10, 4], sh: [-95, 4], ft: 20 } });
export const DIPS = art('dips',
  { body: dip(8.8, 12), gear: () => dipBars(10.5), yaw: -40, center: [0, 0, 9.5] },
  { body: dip(6.6, 26), gear: () => dipBars(10.5), yaw: -40, center: [0, 0, 9.5] });

// ── 머신 딥스: 앉아서 손잡이를 아래로 누름
const mdip = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: -6, head: 5, arm, leg: SIT });
const mdipGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [backPad(p, 1.6, 0.4), seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), ...stack(pel[0] - 3.2, 0, 15), ...[p.hands.L, p.hands.R].flatMap((h) => [...lever([pel[0] - 2.4, 2.9 * Math.sign(h[1]), h[2] + 0.6], h), grip(h, [1, 0, 0], 0.5)])]; };
export const MACHINE_DIPS = art('machine-dips',
  { body: mdip({ hand: [0.0, 3.0, 9.6], pole: [-1, 0.3, 0.4] }), gear: mdipGear, yaw: -55, center: [0, 0, 8.5] },
  { body: mdip({ hand: [0.5, 2.9, 6.9], pole: [-1, 0.3, 0] }), gear: mdipGear, yaw: -55, center: [0, 0, 8.5] });

export const ARTS = [INCLINE_BENCH, DECLINE_BENCH, DB_BENCH, DB_INCLINE, DB_DECLINE, DB_FLY, DB_INCLINE_FLY, MACHINE_CHEST_PRESS, MACHINE_INCLINE_PRESS, MACHINE_DECLINE_PRESS, MACHINE_FLY, CABLE_FLY, DIPS, MACHINE_DIPS];
void grounded; void STAND_WIDE;
