// 복근 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, mul } from './iso.ts';
import { art, cable, type BodySpec, type LimbSpec } from './kit.ts';
import { backPad, box, grip, legs, lever, pelvisOf, pullupFrame, seatPad, stack, tower, type P } from './gear.ts';
import { SIT } from './poses.ts';

const mid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const mat = (): Shape[] => [box([-1.5, 0, 0.12], [6.5, 2.6, 0.12], 'pad')];
const HEAD_HANDS: LimbSpec = { hand: [-0.1, 1.2, 2.0], pole: [0, 1, 0.2], rel: 'torso' };

// ── 크런치: 누워 무릎 세우고 어깨를 말아 올림
const crunch = (lean: number): BodySpec => ({ pelvis: [0, 0, 1.15], lean, head: 20, arm: HEAD_HANDS, leg: { ankle: [4.4, 1.3, 1.25], pole: [0, 0.2, 1], ft: 70 } });
export const CRUNCH = art('crunch',
  { body: crunch(-90), gear: mat, yaw: -25, center: [0, 0, 3], floor: [7, 4] },
  { body: crunch(-55), gear: mat, yaw: -25, center: [0, 0, 3], floor: [7, 4] });

// ── 케이블 크런치: 무릎 꿇고 로프를 머리 옆에 잡고 몸을 말아 내림
const kneel = (lean: number): BodySpec => ({ pelvis: [0, 0, 4.6], lean, head: 0, arm: { hand: [0.7, 0.9, 1.7], pole: [0.4, 1, -1], rel: 'torso' }, leg: { th: [lean > 40 ? -12 : 0, 6], sh: [-90, 5], ft: -110 } });
const ccGear = (p: P): Shape[] => { const h = mid(p); const knot = add(h, [0.6, 0, 0.6]); return [...tower(7.2, 0, 18.4), ...cable(knot, [7.8, 0, 18.4]), ...[p.hands.L, p.hands.R].map((x) => capsule(x, knot, 0.18, 'shoe')), box([0.3, 0, 0.12], [2.4, 2.4, 0.12], 'pad')]; };
export const CABLE_CRUNCH = art('cable-crunch',
  { body: kneel(18), gear: ccGear, yaw: -22, center: [2.5, 0, 8], floorX: 3, floor: [7.5, 4.5] },
  { body: kneel(78), gear: ccGear, yaw: -22, center: [2.5, 0, 8], floorX: 3, floor: [7.5, 4.5] });

// ── 머신 크런치: 앉아서 손잡이를 잡고 몸을 앞으로 말기
const mc = (lean: number): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: lean > 10 ? -10 : 5, arm: { hand: [0.5, 2.3, 0.6], pole: [1, 1, -0.6], rel: 'torso' }, leg: SIT });
const mcGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [backPad(p, 1.4, 0.4), seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), ...stack(pel[0] - 3.4, 0, 15), ...[p.hands.L, p.hands.R].flatMap((h) => [...lever([pel[0] - 1.0, 3.0 * Math.sign(h[1]), pel[2] + 2.0], add(h, [0, 0.4 * Math.sign(h[1]), 0])), grip(h)])]; };
export const MACHINE_CRUNCH = art('machine-crunch',
  { body: mc(-8), gear: mcGear, yaw: -55, center: [0.5, 0, 8.5] },
  { body: mc(36), gear: mcGear, yaw: -55, center: [0.5, 0, 8.5] });

// ── 레그 레이즈: 누워서 편 다리를 바닥 → 수직으로
const lr = (th: number): BodySpec => ({ pelvis: [0, 0, 1.15], lean: -90, head: 10, arm: { ua: 90, fa: 90 }, leg: { th: [th, 3], sh: [th, 3], ft: th + 80 } });
export const LEG_RAISE = art('leg-raise',
  { body: lr(84), gear: mat, yaw: -25, center: [0, 0, 3.5], floor: [7, 4] },
  { body: lr(172), gear: mat, yaw: -25, center: [0, 0, 3.5], floor: [7, 4] });

// ── 행잉 레그 레이즈: 철봉에 매달려 다리를 앞으로 들어 올림
const BAR_Z = 23.0;
const hl = (th: number): BodySpec => ({ pelvis: [-0.3 - (th > 45 ? 0.6 : 0), 0, BAR_Z - 10.3], lean: th > 45 ? -8 : 4, head: 10, arm: { hand: [0.2, 4.2, BAR_Z], pole: [0, 1, 0] }, leg: { th: [th, 3], sh: [th, 3], ft: th + 70 } });
export const HANGING_LEG_RAISE = art('hanging-leg-raise',
  { body: hl(4), gear: () => pullupFrame(BAR_Z, 0.2, 6.2), yaw: -40, center: [0.5, 0, 13.5], scale: 4.5 },
  { body: hl(90), gear: () => pullupFrame(BAR_Z, 0.2, 6.2), yaw: -40, center: [0.5, 0, 13.5], scale: 4.5 });

export const ARTS = [CRUNCH, CABLE_CRUNCH, MACHINE_CRUNCH, LEG_RAISE, HANGING_LEG_RAISE];
