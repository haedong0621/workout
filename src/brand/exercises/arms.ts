// 팔 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, mul } from './iso.ts';
import { art, barbell, cable, cylA, dumbbell, pad, type BodySpec, type LimbSpec } from './kit.ts';
import { backPad, benchFor, box, grip, legs, lever, pelvisOf, seatPad, stack, tower, type P } from './gear.ts';
import { lie } from './chest.ts';
import { SIT, stand } from './poses.ts';

const mid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const dbs = (axis: V) => (p: P): Shape[] => [...dumbbell(p.hands.L, axis), ...dumbbell(p.hands.R, axis)];
const CURL_LO: LimbSpec = { hand: [1.0, 2.3, 10.0], pole: [-1, 0.2, 0] };
const CURL_HI: LimbSpec = { hand: [1.8, 2.3, 14.2], pole: [-1, 0.2, -0.6] };
const curl = (arm: LimbSpec): BodySpec => stand({ arm });

export const DB_CURL = art('dumbbell-curl', { body: curl(CURL_LO), gear: dbs([0, 1, 0]), yaw: -40 }, { body: curl(CURL_HI), gear: dbs([0, 1, 0]), yaw: -40 });
export const HAMMER_CURL = art('dumbbell-hammer-curl', { body: curl(CURL_LO), gear: dbs([1, 0, 0.15]), yaw: -40 }, { body: curl(CURL_HI), gear: dbs([0.3, 0, 1]), yaw: -40 });

// ── 덤벨 인클라인 컬: 45도 벤치에 기대 팔을 늘어뜨림 → 컬
const incl = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.6], lean: -40, head: 15, arm, leg: { ankle: [4.6, 2.4, 1.0], pole: [1, 0.2, 1] } });
const inclGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [backPad(p, 1.6, 0.4), seatPad(p, 2.6), ...legs([pel[0] + 0.6, pel[0] - 2.6], pel[2] - 1.6), ...dbs([0, 1, 0])(p)]; };
export const INCLINE_CURL = art('dumbbell-incline-curl',
  { body: incl({ hand: [-0.6, 2.4, 5.4], pole: [0.3, 0, 1] }), gear: inclGear, yaw: -30, center: [0, 0, 7.5] },
  { body: incl({ hand: [0.3, 2.4, 9.8], pole: [-1, 0, -0.3] }), gear: inclGear, yaw: -30, center: [0, 0, 7.5] });

// ── 케이블 컬(바) / 케이블 해머 컬(로프): 앞쪽 아래 도르래
const cGear = (rope: boolean) => (p: P): Shape[] => { const h = mid(p); const anchor: V = [7.6, 0, 1.0]; return [...tower(7.0, 0, 1.0), ...cable(rope ? add(h, [0, 0, -0.8]) : h, anchor), ...(rope ? [p.hands.L, p.hands.R].map((x) => capsule(x, add(h, [0, 0, -0.8]), 0.18, 'shoe')) : [cylA(h, [0, 1, 0], 0.2, 2.2, 'bar')])]; };
const cc = (arm: LimbSpec) => stand({ arm });
const C_LO: LimbSpec = { hand: [1.2, 1.9, 10.0], pole: [-1, 0.2, 0] };
const C_HI: LimbSpec = { hand: [1.8, 1.9, 14.2], pole: [-1, 0.2, -0.6] };
const CC = { yaw: -20, center: [3, 0, 9.5] as V, floorX: 3.4, floor: [7, 4.5] as [number, number] };
export const CABLE_CURL = art('cable-curl', { body: cc(C_LO), gear: cGear(false), ...CC }, { body: cc(C_HI), gear: cGear(false), ...CC });
export const CABLE_HAMMER_CURL = art('cable-hammer-curl', { body: cc({ ...C_LO, hand: [1.2, 1.2, 10.0] }), gear: cGear(true), ...CC }, { body: cc({ ...C_HI, hand: [1.8, 1.2, 14.2] }), gear: cGear(true), ...CC });

// ── 프리처 컬(바벨 / 머신): 앉아서 위팔을 비스듬한 패드에
const pr = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 6.0], lean: 14, head: 10, arm, leg: SIT });
const preacherPad = (p: P): Shape => pad([p.shMid[0] + 0.7, 0, p.shMid[2] - 1.4], [p.shMid[0] + 3.0, 0, p.shMid[2] - 3.6], 3.0, 0.45);
const prGear = (machine: boolean) => (p: P): Shape[] => {
  const pel = pelvisOf(p);
  const base: Shape[] = [seatPad(p, 2.6), ...legs([pel[0] + 0.2], pel[2] - 1.7), preacherPad(p), capsule([p.shMid[0] + 2.4, 0, p.shMid[2] - 3.4], [p.shMid[0] + 2.4, 0, 0.3], 0.3, 'steel')];
  if (!machine) return [...base, ...barbell(mid(p), 1, 7.25, 1.45)];
  return [...base, ...stack(pel[0] + 6.5, 0, 12), ...[p.hands.L, p.hands.R].flatMap((h) => [...lever([p.L.el[0] + 0.3, 3.4 * Math.sign(h[1]), p.L.el[2]], add(h, [0, 0.5 * Math.sign(h[1]), 0])), grip(h, [0, 1, 0], 0.45)])];
};
const PR_LO: LimbSpec = { hand: [4.4, 2.3, -3.8], pole: [-0.2, 0.2, 1], rel: 'torso' };
const PR_HI: LimbSpec = { hand: [2.0, 2.3, -0.6], pole: [0.5, 0.2, -1], rel: 'torso' };
export const PREACHER_CURL = art('barbell-preacher-curl', { body: pr(PR_LO), gear: prGear(false), yaw: -30, center: [1, 0, 8] }, { body: pr(PR_HI), gear: prGear(false), yaw: -30, center: [1, 0, 8] });
export const MACHINE_CURL = art('machine-curl', { body: pr(PR_LO), gear: prGear(true), yaw: -30, center: [1, 0, 8] }, { body: pr(PR_HI), gear: prGear(true), yaw: -30, center: [1, 0, 8] });

// ── 케이블 푸시다운(바 / 로프): 위 도르래, 팔꿈치 고정
const pdGear = (rope: boolean) => (p: P): Shape[] => { const h = mid(p); const top: V = [4.4, 0, 19.4]; const end = rope ? add(h, [0, 0, 1.0]) : h; return [...tower(5.0, 0, 19.4), ...cable(end, top), ...(rope ? [p.hands.L, p.hands.R].map((x) => capsule(x, end, 0.18, 'shoe')) : [cylA(h, [0, 1, 0], 0.2, 1.5, 'bar')])]; };
const pd = (hand: V) => stand({ lean: 10, head: 5, arm: { hand, pole: [-1, 0.3, 0] } });
const PD = { yaw: -20, center: [2.4, 0, 10] as V, floorX: 2.6, floor: [7, 4.5] as [number, number] };
export const PUSHDOWN = art('cable-pushdown', { body: pd([2.4, 1.1, 13.6]), gear: pdGear(false), ...PD }, { body: pd([1.4, 1.1, 9.2]), gear: pdGear(false), ...PD });
export const ROPE_PUSHDOWN = art('cable-rope-pushdown', { body: pd([2.4, 0.9, 13.6]), gear: pdGear(true), ...PD }, { body: pd([1.2, 2.4, 9.0]), gear: pdGear(true), ...PD });

// ── 라잉 트라이셉스 익스텐션: 누워 이마 위 → 팔 폄 (위팔 고정)
const LTE_DN: LimbSpec = { hand: [1.6, 1.4, 3.0], pole: [0.2, 0.1, -1], rel: 'torso' };
const LTE_UP: LimbSpec = { hand: [4.6, 1.4, 0.9], pole: [0.2, 0.1, -1], rel: 'torso' };
const LIE_CAM = { yaw: -22, center: [-1, 0, 6] as V, floor: [7, 4.5] as [number, number] };
export const LYING_TRICEPS = art('barbell-lying-triceps-extension',
  { body: lie(0, LTE_UP), gear: (p) => [...benchFor(p), ...barbell(mid(p), 1, 7.25, 1.45)], ...LIE_CAM },
  { body: lie(0, LTE_DN), gear: (p) => [...benchFor(p), ...barbell(mid(p), 1, 7.25, 1.45)], ...LIE_CAM });

// ── 클로즈 그립 벤치 프레스
export const CLOSE_GRIP_BENCH = art('barbell-close-grip-bench-press',
  { body: lie(0, { hand: [4.6, 1.3, -0.6], pole: [0, 0.4, -1], rel: 'torso' }), gear: (p) => [...benchFor(p), ...barbell(mid(p))], ...LIE_CAM },
  { body: lie(0, { hand: [1.3, 1.3, -1.2], pole: [0, 0.3, -1], rel: 'torso' }), gear: (p) => [...benchFor(p), ...barbell(mid(p))], ...LIE_CAM });

// ── 덤벨 오버헤드 트라이셉스 익스텐션: 앉아서 덤벨 하나를 머리 뒤 → 위로
const oh = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: -4, head: 5, arm, leg: SIT });
const ohGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [backPad(p, 0.6, 0.4), seatPad(p, 3.0), ...legs([pel[0] + 0.4, pel[0] - 1], pel[2] - 1.7), ...dumbbell(add(mid(p), [0, 0, 0.6]), [0, 0, 1])]; };
export const DB_OVERHEAD_TRICEPS = art('dumbbell-overhead-triceps-extension',
  { body: oh({ hand: [-1.4, 0.35, 2.0], pole: [0.3, 0.3, 1], rel: 'torso' }), gear: ohGear, yaw: -40, center: [0, 0, 10] },
  { body: oh({ hand: [0.2, 0.35, 4.8], pole: [0.3, 0.3, 1], rel: 'torso' }), gear: ohGear, yaw: -40, center: [0, 0, 10] });

// ── 케이블 오버헤드 트라이셉스 익스텐션: 기둥 등지고 로프를 머리 뒤 → 앞 위로
const coh = (arm: LimbSpec): BodySpec => stand({ lean: 30, head: 10, arm, leg: { L: { th: [16, 5], sh: [-4, 4] }, R: { th: [-14, 5], sh: [-18, 4] } } });
const cohGear = (p: P): Shape[] => { const h = mid(p); const knot = add(h, [-0.9, 0, 0]); return [...tower(-5.6, 0, 14.0), ...cable(knot, [-5.0, 0, 14.0]), ...[p.hands.L, p.hands.R].map((x) => capsule(x, knot, 0.18, 'shoe'))]; };
export const CABLE_OVERHEAD_TRICEPS = art('cable-overhead-triceps-extension',
  { body: coh({ hand: [-1.6, 0.8, 2.6], pole: [0.6, 0.3, 1], rel: 'torso' }), gear: cohGear, yaw: -25, center: [-1, 0, 10], floorX: -1.5, floor: [7.5, 4.5] },
  { body: coh({ hand: [1.2, 0.8, 4.6], pole: [0.6, 0.3, 1], rel: 'torso' }), gear: cohGear, yaw: -25, center: [-1, 0, 10], floorX: -1.5, floor: [7.5, 4.5] });

// ── 머신 트라이셉스 익스텐션: 앉아서 팔꿈치를 패드에 두고 손잡이를 아래로
const mte = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: 4, head: 5, arm, leg: SIT });
const mteGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), box([p.L.el[0] + 0.6, 0, p.L.el[2] - 0.8], [0.7, 3.2, 0.35], 'pad'), capsule([p.L.el[0] + 0.6, 0, p.L.el[2] - 1.2], [p.L.el[0] + 0.6, 0, 0.3], 0.3, 'steel'), ...stack(pel[0] - 3.2, 0, 14), ...[p.hands.L, p.hands.R].flatMap((h) => [...lever([p.L.el[0], 3.6 * Math.sign(h[1]), p.L.el[2]], add(h, [0, 0.5 * Math.sign(h[1]), 0])), grip(h, [0, 1, 0], 0.45)])]; };
export const MACHINE_TRICEPS = art('machine-triceps-extension',
  { body: mte({ hand: [2.6, 2.4, 13.3], pole: [1, 0.3, -1] }), gear: mteGear, yaw: -40, center: [1, 0, 9] },
  { body: mte({ hand: [5.6, 2.4, 9.6], pole: [1, 0.3, -1] }), gear: mteGear, yaw: -40, center: [1, 0, 9] });

// ── 덤벨 킥백: 숙여서 위팔 고정, 아래팔을 뒤로 폄
const kb = (arm: LimbSpec): BodySpec => stand({ lean: 68, head: 40, arm, leg: { th: [24, 8], sh: [-14, 6] } });
export const KICKBACK = art('dumbbell-kickback',
  { body: kb({ hand: [-0.5, 2.0, 7.8], pole: [-1, 0.2, 1] }), gear: dbs([1, 0, 0]), yaw: -30 },
  { body: kb({ hand: [-4.2, 2.0, 11.6], pole: [0.3, 0, -1] }), gear: dbs([1, 0, 0]), yaw: -30 });

export const ARTS = [DB_CURL, HAMMER_CURL, INCLINE_CURL, CABLE_CURL, CABLE_HAMMER_CURL, PREACHER_CURL, MACHINE_CURL, PUSHDOWN, ROPE_PUSHDOWN, LYING_TRICEPS, CLOSE_GRIP_BENCH, DB_OVERHEAD_TRICEPS, CABLE_OVERHEAD_TRICEPS, MACHINE_TRICEPS, KICKBACK];
