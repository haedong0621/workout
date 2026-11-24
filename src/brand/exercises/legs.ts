// 하체 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, cyl, mul } from './iso.ts';
import { art, barbell, cable, cylA, dumbbell, flatBench, grounded, obox, pad, place, type BodySpec, type LegSpec, type LimbSpec } from './kit.ts';
import { backPad, box, grip, legs, lever, pelvisOf, plateOn, roller, seatPad, stack, tower, type P } from './gear.ts';
import { SIT, stand } from './poses.ts';

const mid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const dbs = (axis: V) => (p: P): Shape[] => [...dumbbell(p.hands.L, axis), ...dumbbell(p.hands.R, axis)];
const HANG: LimbSpec = { ua: [2, 6], fa: [2, 6] };
const backBar = (p: P): V => add(add(p.shMid, mul(p.front, -0.75)), mul(p.spine, 0.35));
const BACK_ARM: LimbSpec = { hand: [-0.75, 3.7, 0.35], pole: [-0.4, 0.6, -1], rel: 'torso' };
const SQ_UP: LegSpec = { th: [0, 9], sh: [0, 7] };
const SQ_DN: LegSpec = { th: [82, 20], sh: [-28, 12], ft: 70 };
const squatDown = (arm: LimbSpec, lean = 42, x = -1.6): BodySpec => grounded({ pelvis: [x, 0, 6], lean, head: 30, arm, leg: SQ_DN });

// ── 스쿼트 3종
export const SQUAT = art('barbell-squat',
  { body: stand({ lean: 6, arm: BACK_ARM, leg: SQ_UP }), gear: (p) => barbell(backBar(p)), yaw: -35 },
  { body: squatDown(BACK_ARM), gear: (p) => barbell(backBar(p)), yaw: -35 });
const FRONT_ARM: LimbSpec = { hand: [0.95, 2.1, 0.45], pole: [1, 0.4, 0.2], rel: 'torso' };
const frontBar = (p: P): V => add(add(p.shMid, mul(p.front, 0.95)), mul(p.spine, 0.45));
export const FRONT_SQUAT = art('barbell-front-squat',
  { body: stand({ lean: 3, arm: FRONT_ARM, leg: SQ_UP }), gear: (p) => barbell(frontBar(p)), yaw: -35 },
  { body: squatDown(FRONT_ARM, 22, -1.0), gear: (p) => barbell(frontBar(p)), yaw: -35 });
const GOB: LimbSpec = { hand: [1.4, 0.45, -1.2], pole: [0.2, 1, -1], rel: 'torso' };
export const GOBLET_SQUAT = art('dumbbell-goblet-squat',
  { body: stand({ lean: 3, arm: GOB, leg: SQ_UP }), gear: (p) => dumbbell(add(mid(p), [0, 0, -0.3]), [0, 0, 1]), yaw: -40 },
  { body: squatDown(GOB, 25, -1.0), gear: (p) => dumbbell(add(mid(p), [0, 0, -0.3]), [0, 0, 1]), yaw: -40 });

// ── 핵 스쿼트 / 펜듈럼 스쿼트: 비스듬한 등판에 기대 발판에서 앉았다 일어남
const FEET: V = [3.6, 1.6, 2.2];
const hack = (z: number, lean: number): BodySpec => ({ pelvis: [0, 0, z], lean, head: 10, arm: { hand: [-0.3, 2.6, 0.3], pole: [0, 1, -1], rel: 'torso' }, leg: { ankle: FEET, pole: [1, 0.3, 0.2], ft: 60 } });
const hackGear = (pend: boolean) => (p: P): Shape[] => [
  backPad(p, 1.4, 0.6),
  ...[-1, 1].map((s) => capsule(add(p.shMid, [0, 1.6 * s, 0.9]), add(p.shMid, [1.0, 1.6 * s, 0.9]), 0.42, 'pad')),   // 어깨 패드
  obox([FEET[0] + 0.6, 0, 1.2], [1, 0, 0.35], [0, 1, 0], [1.6, 2.6, 0.2], 0.08, 'plate'),                           // 발판
  ...(pend ? [capsule([-4.5, 0, 16], add(p.shMid, [-1.2, 0, 0.5]), 0.3, 'steel'), cylA([-4.5, 0, 16], [0, 1, 0], 0.6, 1.2, 'plate'), capsule([-4.5, 0, 16], [-4.5, 0, 0.3], 0.4, 'steel')]
    : [capsule([-7.4, 0, 0.6], [2.6, 0, 0.6], 0.3, 'steel'), capsule([-7.0, 2.4, 0.4], [-0.2, 2.4, 14.4], 0.28, 'steel'), capsule([-7.0, -2.4, 0.4], [-0.2, -2.4, 14.4], 0.28, 'steel')]),
];
export const HACK_SQUAT = art('machine-hack-squat',
  { body: hack(9.0, -22), gear: hackGear(false), yaw: -30, center: [-1, 0, 8] },
  { body: hack(5.4, -32), gear: hackGear(false), yaw: -30, center: [-1, 0, 8] });
export const PENDULUM_SQUAT = art('machine-pendulum-squat',
  { body: hack(9.0, -12), gear: hackGear(true), yaw: -30, center: [-1, 0, 8] },
  { body: hack(5.2, -20), gear: hackGear(true), yaw: -30, center: [-1, 0, 8] });

// ── 레그 프레스(45도): 뒤로 기대 앉아 발판을 밀어 올림
const lp = (ankle: V): BodySpec => ({ pelvis: [0, 0, 3.2], lean: -62, head: 35, arm: { hand: [0.8, 2.6, 2.8], pole: [-1, 0.5, 0] }, leg: { ankle, pole: [0, 0.4, 1], ft: 150 } });
const lpGear = (p: P): Shape[] => {
  const a = p.L.an;
  const plate: V = [a[0] + 0.5, 0, a[2] + 0.4];
  return [backPad(p, 1.4, 0.4), seatPad(p, 1.8), box([-1.6, 0, 1.0], [3.2, 1.6, 1.0]),
    obox(plate, [-0.7, 0, 0.7], [0, 1, 0], [1.7, 2.8, 0.25], 0.08, 'plate'),
    capsule([3, 2.8, 0.6], [11, 2.8, 8.6], 0.3, 'steel'), capsule([3, -2.8, 0.6], [11, -2.8, 8.6], 0.3, 'steel'),
    ...plateOn(add(plate, [0.8, 3.4, -0.6]), [0, 1, 0], 1.6), ...plateOn(add(plate, [0.8, -3.4, -0.6]), [0, 1, 0], 1.6)];
};
export const LEG_PRESS = art('machine-leg-press',
  { body: lp([7.4, 1.5, 7.8]), gear: lpGear, yaw: -30, center: [3, 0, 5], floorX: 3, floor: [8.5, 4.5] },
  { body: lp([4.6, 1.5, 5.4]), gear: lpGear, yaw: -30, center: [3, 0, 5], floorX: 3, floor: [8.5, 4.5] });

// ── 레그 익스텐션(양다리 / 한 다리)
const extGear = (p: P): Shape[] => {
  const kn = p.L.kn;
  const pads = [p.L.an, p.R.an].map((an): Shape => cyl([an[0] + 0.55, an[1], an[2] - 0.1], 1, 0.5, 1.1, 'pad'));
  return [backPad(p, 1.0, 0.4), seatPad(p, 3.6), ...legs([0.4, -1.4], 4.4), ...pads,
    ...[p.L.an, p.R.an].flatMap((an) => [capsule([kn[0], 2.6 * Math.sign(an[1]), kn[2]], [an[0] + 0.55, 2.6 * Math.sign(an[1]), an[2] - 0.1], 0.22, 'steel')]),
    cyl([kn[0], 2.65, kn[2]], 1, 0.45, 0.25, 'plate'), capsule([0.6, 2.3, 5.2], [0.6, 2.9, 5.2], 0.16, 'shoe'), ...stack(-3.4, 2.6, 10)];
};
const ext = (L: LegSpec, R: LegSpec): BodySpec => ({ pelvis: [0.2, 0, 5.7], lean: -12, arm: { hand: [0.6, 2.3, 5.4], pole: [-1, 0.4, 0] }, leg: { L, R } });
const BENT: LegSpec = { th: [86, 4], sh: [-6, 3], ft: 60 };
const STRAIGHT: LegSpec = { th: [86, 4], sh: [78, 3], ft: 140 };
const EXT = { yaw: -30, center: [1.5, 0, 6.5] as V };
export const LEG_EXTENSION = art('machine-leg-extension', { body: ext(BENT, BENT), gear: extGear, ...EXT }, { body: ext(STRAIGHT, STRAIGHT), gear: extGear, ...EXT });
export const SINGLE_LEG_EXTENSION = art('machine-single-leg-extension', { body: ext(BENT, BENT), gear: extGear, ...EXT, yaw: -60 }, { body: ext(BENT, STRAIGHT), gear: extGear, ...EXT, yaw: -60 });

// ── 라잉 레그 컬: 엎드려 발목 롤러를 엉덩이 쪽으로
const lyingCurl = (sh: number, ft: number): BodySpec => ({ pelvis: [0, 0, 5.4], lean: 92, head: 40, arm: { hand: [6.4, 2.2, 4.6], pole: [0, 1, 0.3] }, leg: { th: [-92, 4], sh: [sh, 3], ft } });
const lcGear = (p: P): Shape[] => { const an = p.L.an; return [box([1.6, 0, 4.0], [5.6, 1.4, 0.4], 'pad'), ...legs([5.4, -2.4], 3.6), roller([an[0] - 0.4, 0, an[2] + 0.5], 1.6), capsule([-4.0, 2.6, 4.4], [an[0] - 0.4, 2.6, an[2] + 0.5], 0.22, 'steel'), cylA([-4.0, 2.7, 4.4], [0, 1, 0], 0.45, 0.25, 'plate')]; };
export const LYING_LEG_CURL = art('machine-lying-leg-curl',
  { body: lyingCurl(-92, -60), gear: lcGear, yaw: -25, center: [0, 0, 5.5], floor: [8, 4.5] },
  { body: lyingCurl(170, 40), gear: lcGear, yaw: -25, center: [0, 0, 5.5], floor: [8, 4.5] });

// ── 시티드 레그 컬: 앉아서 다리를 앞 → 아래로 접음
const sc = (sh: number, ft: number): BodySpec => ({ pelvis: [0.2, 0, 5.7], lean: -14, arm: { hand: [0.6, 2.3, 5.4], pole: [-1, 0.4, 0] }, leg: { th: [84, 4], sh: [sh, 3], ft } });
const scGear = (p: P): Shape[] => { const an = p.L.an, kn = p.L.kn; return [backPad(p, 1.0, 0.4), seatPad(p, 3.6), ...legs([0.4, -1.4], 4.4), roller([kn[0] - 0.4, 0, kn[2] + 0.9], 1.8), roller([an[0] + 0.1, 0, an[2] - 0.6], 1.8), capsule([kn[0], 2.6, kn[2]], [an[0], 2.6, an[2] - 0.6], 0.22, 'steel'), cylA([kn[0], 2.7, kn[2]], [0, 1, 0], 0.45, 0.25, 'plate'), ...stack(-3.4, 2.6, 10)]; };
export const SEATED_LEG_CURL = art('machine-seated-leg-curl', { body: sc(80, 140), gear: scGear, ...EXT }, { body: sc(-22, 50), gear: scGear, ...EXT });

// ── 루마니안 / 스티프 데드리프트
const hinge = (lean: number, knee: number, arm: LimbSpec = HANG): BodySpec => grounded({ pelvis: [-1.0, 0, 9], lean, head: lean > 30 ? 40 : 0, arm, leg: { th: [knee, 8], sh: [-knee * 0.6, 6] } });
export const RDL = art('barbell-romanian-deadlift', { body: hinge(4, 4), gear: (p) => barbell(mid(p)), yaw: -30 }, { body: hinge(70, 18), gear: (p) => barbell(mid(p)), yaw: -30 });
export const DB_RDL = art('dumbbell-romanian-deadlift', { body: hinge(4, 4), gear: dbs([0, 1, 0]), yaw: -30 }, { body: hinge(70, 18), gear: dbs([0, 1, 0]), yaw: -30 });
export const STIFF_DL = art('barbell-stiff-leg-deadlift', { body: hinge(4, 2), gear: (p) => barbell(mid(p)), yaw: -30 }, { body: hinge(84, 4), gear: (p) => barbell(mid(p)), yaw: -30 });

// ── 런지 / 불가리안 스플릿 스쿼트
const lunge = (down: boolean, arm: LimbSpec, rear?: 'bench'): BodySpec => {
  const L: LegSpec = down ? { th: [88, 4], sh: [-6, 3] } : { th: [22, 4], sh: [-8, 3] };
  const R: LegSpec = rear ? (down ? { th: [-30, 4], sh: [-120, 3], ft: -10 } : { th: [-10, 4], sh: [-95, 3], ft: -10 }) : (down ? { th: [-20, 4], sh: [-95, 3], ft: -10 } : { th: [-22, 4], sh: [-30, 3], ft: 10 });
  return grounded({ pelvis: [0, 0, 8], lean: 6, head: 0, arm, leg: { L, R } });
};
const LUNGE = { yaw: -30, center: [0, 0, 8.5] as V, floor: [7, 4.5] as [number, number] };
export const BARBELL_LUNGE = art('barbell-lunge', { body: lunge(false, BACK_ARM), gear: (p) => barbell(backBar(p)), ...LUNGE }, { body: lunge(true, BACK_ARM), gear: (p) => barbell(backBar(p)), ...LUNGE });
export const DB_LUNGE = art('dumbbell-lunge', { body: lunge(false, HANG), gear: dbs([1, 0, 0]), ...LUNGE }, { body: lunge(true, HANG), gear: dbs([1, 0, 0]), ...LUNGE });
const splitBench = (p: P): Shape[] => place(flatBench(0, 2.4, 4.7), [], 0, [p.R.an[0] - 0.4, 0, 0]).shapes;
export const BARBELL_SPLIT = art('barbell-bulgarian-split-squat', { body: lunge(false, BACK_ARM, 'bench'), gear: (p) => [...barbell(backBar(p)), ...splitBench(p)], ...LUNGE }, { body: lunge(true, BACK_ARM, 'bench'), gear: (p) => [...barbell(backBar(p)), ...splitBench(p)], ...LUNGE });
export const DB_SPLIT = art('dumbbell-bulgarian-split-squat', { body: lunge(false, HANG, 'bench'), gear: (p) => [...dbs([1, 0, 0])(p), ...splitBench(p)], ...LUNGE }, { body: lunge(true, HANG, 'bench'), gear: (p) => [...dbs([1, 0, 0])(p), ...splitBench(p)], ...LUNGE });

// ── 힙 쓰러스트: 등 윗부분을 벤치에, 엉덩이 내렸다 → 들어 올림
const ht = (up: boolean): BodySpec => {
  const lean = up ? -88 : -58;
  const pelZ = up ? 5.6 : 2.8;
  const px = up ? 1.6 : 0.8;
  return { pelvis: [px, 0, pelZ], lean, head: up ? 40 : 30, arm: { hand: [px + 0.2, 2.9, pelZ + 0.7], pole: [-0.3, 1, 0.6] }, leg: { ankle: [5.2, 1.8, 1.0], pole: [1, 0.2, 1] } };
};
const htBench = (): Shape[] => [box([-4.6, 0, 2.3], [1.2, 3.6, 2.3], 'pad')];
export const BARBELL_HIP_THRUST = art('barbell-hip-thrust',
  { body: ht(false), gear: (p) => [...htBench(), ...barbell(add(pelvisOf(p), [0, 0, 1.2]))], yaw: -30, center: [0, 0, 5], floor: [7.5, 4.5] },
  { body: ht(true), gear: (p) => [...htBench(), ...barbell(add(pelvisOf(p), [0, 0, 1.2]))], yaw: -30, center: [0, 0, 5], floor: [7.5, 4.5] });
const htMachine = (p: P): Shape[] => { const pel = pelvisOf(p); return [...htBench(), capsule([pel[0], -2.2, pel[2] + 1.1], [pel[0], 2.2, pel[2] + 1.1], 0.6, 'pad'), ...[-1, 1].flatMap((s) => [capsule([pel[0], 2.6 * s, pel[2] + 1.1], [-3.0, 2.6 * s, 1.0], 0.24, 'steel'), cylA([-3.0, 2.8 * s, 1.0], [0, 1, 0], 0.5, 0.25, 'plate')]), ...plateOn([pel[0] - 0.2, 3.4, pel[2] + 1.1], [0, 1, 0], 1.5)]; };
export const MACHINE_HIP_THRUST = art('machine-hip-thrust', { body: ht(false), gear: htMachine, yaw: -30, center: [0, 0, 5], floor: [7.5, 4.5] }, { body: ht(true), gear: htMachine, yaw: -30, center: [0, 0, 5], floor: [7.5, 4.5] });

// ── 힙 어브덕션 / 어덕션: 앉아서 무릎을 벌림 / 모음
const hip = (abd: number): BodySpec => ({ pelvis: [0, 0, 5.7], lean: -14, head: 5, arm: { hand: [0.4, 2.6, 5.4], pole: [-1, 0.5, 0] }, leg: { th: [84, abd], sh: [-4, abd * 0.8], ft: 70 } });
const hipGear = (outside: boolean) => (p: P): Shape[] => [backPad(p, 1.2, 0.4), seatPad(p, 3.2), ...legs([0.4, -1.4], 4.4), ...[p.L, p.R].flatMap((s) => { const sg = Math.sign(s.kn[1]); const c = add(s.kn, [-0.3, (outside ? 0.65 : -0.65) * sg, 0]); return [obox(c, [1, 0, 0], [0, 1, 0], [1.2, 0.25, 0.9], 0.2, 'pad'), capsule(c, [-1.2, c[1], 2.4], 0.2, 'steel')]; }), ...stack(-3.6, 0, 9)];
export const HIP_ABDUCTION = art('machine-hip-abduction', { body: hip(6), gear: hipGear(true), yaw: -80, center: [1, 0, 6] }, { body: hip(36), gear: hipGear(true), yaw: -80, center: [1, 0, 6] });
export const HIP_ADDUCTION = art('machine-hip-adduction', { body: hip(36), gear: hipGear(false), yaw: -80, center: [1, 0, 6] }, { body: hip(6), gear: hipGear(false), yaw: -80, center: [1, 0, 6] });

// ── 카프 레이즈(서서 / 앉아서): 발판 끝에서 뒤꿈치 내림 → 까치발
const STEP = 1.0;
const calf = (up: boolean): BodySpec => { const b = grounded({ pelvis: [0, 0, 10], lean: 0, arm: { hand: [0.3, 2.3, 15.4], pole: [-1, 1, -0.4] }, leg: { th: [0, 5], sh: [0, 4], ft: up ? 18 : 95 } }); return { ...b, pelvis: add(b.pelvis, [0, 0, STEP]), arm: { hand: [0.2, 2.2, b.pelvis[2] + STEP + 5.7], pole: [-1, 1, -0.6] } }; };
const calfGear = (p: P): Shape[] => [box([0.9, 0, STEP / 2], [1.0, 2.6, STEP / 2], 'plate'), ...[-1, 1].map((s) => capsule(add(p.shMid, [-0.4, 1.4 * s, 0.7]), add(p.shMid, [1.4, 1.4 * s, 0.7]), 0.45, 'pad')), capsule(add(p.shMid, [-1.2, 0, 0.9]), [-3.2, 0, 0.3], 0.3, 'steel'), ...stack(-3.8, 0, 14)];
export const CALF_RAISE = art('machine-calf-raise', { body: calf(false), gear: calfGear, yaw: -35, center: [0, 0, 9] }, { body: calf(true), gear: calfGear, yaw: -35, center: [0, 0, 9] });
const scalf = (up: boolean): BodySpec => { const lift = up ? 0.9 : 0; return { pelvis: [0, 0, 5.7], lean: 6, head: 0, arm: { hand: [3.0, 2.0, 7.6 + lift], pole: [-1, 0.5, 0] }, leg: { th: [86, 6], sh: [-2, 5], ft: up ? 18 : 95 } }; };
const scalfGear = (p: P): Shape[] => { const kn = p.L.kn; return [seatPad(p, 3.0), ...legs([0.4], 4.4), box([kn[0] - 0.2, 0, STEP / 2], [1.0, 2.6, STEP / 2], 'plate'), obox([kn[0] - 1.0, 0, kn[2] + 0.8], [1, 0, 0], [0, 1, 0], [1.2, 2.6, 0.35], 0.2, 'pad'), capsule([kn[0] - 1.0, 2.8, kn[2] + 0.8], [kn[0] - 4.0, 2.8, 1.2], 0.24, 'steel'), ...plateOn([kn[0] - 1.8, 3.4, kn[2] + 0.4], [0, 1, 0], 1.4)]; };
const scalfBody = (up: boolean) => { const b = scalf(up); const g = grounded(b); return { ...b, pelvis: [0, 0, 5.7] as V, leg: { ...(b.leg as LegSpec) } } as BodySpec & { _g?: typeof g }; };
export const SEATED_CALF_RAISE = art('machine-seated-calf-raise', { body: scalfBody(false), gear: scalfGear, yaw: -35, center: [1, 0, 6] }, { body: scalfBody(true), gear: scalfGear, yaw: -35, center: [1, 0, 6] });

// ── 케이블 글루트 킥백: 기둥을 보고 서서 한 다리를 뒤로
const gk = (L: LegSpec): BodySpec => grounded({ pelvis: [0, 0, 9], lean: 28, head: 15, arm: { hand: [4.6, 1.6, 12.6], pole: [-0.5, 1, -0.5] }, leg: { L, R: { th: [4, 5], sh: [-2, 4] } } });
const gkGear = (p: P): Shape[] => [...tower(5.6, 0, 1.0), capsule([4.8, -1.8, 12.6], [4.8, 1.8, 12.6], 0.2, 'steel'), ...cable(p.L.an, [6.2, 0, 1.0])];
export const GLUTE_KICKBACK = art('cable-glute-kickback',
  { body: gk({ th: [10, 5], sh: [-10, 4], ft: 40 }), gear: gkGear, yaw: -20, center: [1.5, 0, 9], floorX: 2, floor: [7, 4.5] },
  { body: gk({ th: [-48, 5], sh: [-62, 4], ft: 0 }), gear: gkGear, yaw: -20, center: [1.5, 0, 9], floorX: 2, floor: [7, 4.5] });

export const ARTS = [SQUAT, FRONT_SQUAT, GOBLET_SQUAT, HACK_SQUAT, PENDULUM_SQUAT, LEG_PRESS, LEG_EXTENSION, SINGLE_LEG_EXTENSION, LYING_LEG_CURL, SEATED_LEG_CURL, RDL, DB_RDL, STIFF_DL, BARBELL_LUNGE, DB_LUNGE, BARBELL_SPLIT, DB_SPLIT, BARBELL_HIP_THRUST, MACHINE_HIP_THRUST, HIP_ABDUCTION, HIP_ADDUCTION, CALF_RAISE, SEATED_CALF_RAISE, GLUTE_KICKBACK];
void pad; void lever; void grip; void SIT;
