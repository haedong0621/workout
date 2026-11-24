// 어깨 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, mul } from './iso.ts';
import { art, barbell, cable, cylA, dumbbell, type BodySpec, type LimbSpec } from './kit.ts';
import { backPad, crossover, grip, legs, lever, pelvisOf, seatPad, stack, tower, type P } from './gear.ts';
import { SIT, stand } from './poses.ts';

const mid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const dbs = (axis: V) => (p: P): Shape[] => [...dumbbell(p.hands.L, axis), ...dumbbell(p.hands.R, axis)];
const upright = (p: P): Shape[] => { const pel = pelvisOf(p); return [...backPad(p, 1.8, 0.4), ...seatPad(p, 3.0), ...legs([pel[0] + 0.4, pel[0] - 1.0], pel[2] - 1.7)]; };
const sit = (arm: LimbSpec, lean = -6): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: 5, arm, leg: SIT });
const SEAT_CAM = { yaw: -75, center: [0, 0, 10] as V };

// ── 덤벨 숄더 프레스 (앉아서)
const PRESS_LO: LimbSpec = { hand: [0.6, 3.5, 0.6], pole: [0, 1, -1], rel: 'torso' };
const PRESS_HI: LimbSpec = { hand: [0.3, 2.6, 4.7], pole: [0, 1, 0], rel: 'torso' };
export const DB_SHOULDER_PRESS = art('dumbbell-shoulder-press',
  { body: sit(PRESS_LO), gear: (p) => [...upright(p), ...dbs([0, 1, 0])(p)], ...SEAT_CAM },
  { body: sit(PRESS_HI), gear: (p) => [...upright(p), ...dbs([0, 1, 0])(p)], ...SEAT_CAM });

// ── 덤벨 아놀드 프레스: 얼굴 앞(손바닥 몸쪽) → 머리 위
export const ARNOLD_PRESS = art('dumbbell-arnold-press',
  { body: sit({ hand: [1.6, 1.3, 1.0], pole: [1, 0.2, -1], rel: 'torso' }), gear: (p) => [...upright(p), ...dbs([1, 0, 0])(p)], ...SEAT_CAM },
  { body: sit(PRESS_HI), gear: (p) => [...upright(p), ...dbs([0, 1, 0])(p)], ...SEAT_CAM });

// ── 머신 숄더 프레스
const mpGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [...upright(p), ...stack(pel[0] - 3.4, 0, 18), ...[p.hands.L, p.hands.R].flatMap((h) => [...lever([pel[0] - 2.6, 3.4 * Math.sign(h[1]), h[2] - 0.4], add(h, [0, 0.5 * Math.sign(h[1]), 0])), ...grip(h, [1, 0, 0], 0.5)])]; };
export const MACHINE_SHOULDER_PRESS = art('machine-shoulder-press',
  { body: sit(PRESS_LO), gear: mpGear, ...SEAT_CAM },
  { body: sit(PRESS_HI), gear: mpGear, ...SEAT_CAM });

// ── 케이블 숄더 프레스: 두 기둥 사이 의자, 아래 도르래
const cpGear = (p: P): Shape[] => [...upright(p), ...crossover(-0.5, 6.5, 1.2), ...[p.hands.L, p.hands.R].flatMap((h) => [capsule(h, [-0.5, 6.3 * Math.sign(h[1]), 1.2], 0.1, 'plate'), ...grip(h, [1, 0, 0], 0.45)])];
export const CABLE_SHOULDER_PRESS = art('cable-shoulder-press',
  { body: sit(PRESS_LO), gear: cpGear, yaw: -95, center: [0, 0, 10], scale: 4.8, floor: [6, 8] },
  { body: sit(PRESS_HI), gear: cpGear, yaw: -95, center: [0, 0, 10], scale: 4.8, floor: [6, 8] });

// ── 케이블 사이드 레터럴 레이즈: 기둥 옆에 서서 한 팔(오른팔)로
const cLat = (hand: V, pole: V): BodySpec => stand({ arm: { L: { hand: [0.3, 3.4, 12.6], pole: [-1, 1, 0] }, R: { hand, pole } } });
const cLatGear = (p: P): Shape[] => [...tower(0, 5.0, 1.0), ...cable(p.hands.R, [0.6, 5.0, 1.0]), ...grip(p.hands.R, [1, 0, 0], 0.45)];
export const CABLE_LATERAL_RAISE = art('cable-lateral-raise',
  { body: cLat([0.6, 0.2, 8.8], [-1, -0.3, 0]), gear: cLatGear, yaw: -100, center: [0, 1.5, 10] },
  { body: cLat([0.6, -6.1, 14.2], [-0.2, 0, 1]), gear: cLatGear, yaw: -100, center: [0, 1.5, 10] });

// ── 머신 사이드 레터럴 레이즈: 앉아서 팔꿈치 패드를 옆으로
const mLatGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [...seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), box2([pel[0] - 1.6, 0, pel[2] + 3.4], [0.4, 1.4, 1.6]), ...[p.L, p.R].flatMap((s) => [capsule(s.el, s.sh, 0.62, 'pad'), ...grip(s.ha, [1, 0, 0], 0.4)])]; };
import { box } from './gear.ts';
const box2 = (c: V, h: V) => box(c, h, 'pad');
const mlat = (abd: number): BodySpec => sit({ ua: [10, abd], fa: [60, abd * 0.6] }, 0);
export const MACHINE_LATERAL_RAISE = art('machine-lateral-raise',
  { body: mlat(8), gear: mLatGear, ...SEAT_CAM },
  { body: mlat(82), gear: mLatGear, ...SEAT_CAM });

// ── 덤벨 프론트 레이즈
const front = (flex: number): BodySpec => stand({ arm: { ua: [flex, 6], fa: [flex + 4, 4] } });
export const DB_FRONT_RAISE = art('dumbbell-front-raise',
  { body: front(8), gear: dbs([0, 1, 0]), yaw: -45 },
  { body: front(92), gear: dbs([0, 1, 0]), yaw: -45 });

// ── 케이블 프론트 레이즈: 등 뒤 아래 도르래, 바를 앞으로
const cfrGear = (p: P): Shape[] => { const h = mid(p); return [cylA(h, [0, 1, 0], 0.2, 1.8, 'bar'), ...cable(h, [-4.4, 0, 1.0]), ...tower(-5.0, 0, 1.0)]; };
const cfront = (flex: number): BodySpec => stand({ arm: { ua: [flex, 3], fa: [flex + 4, 2] }, leg: { L: { th: [6, 5], sh: [0, 4] }, R: { th: [-6, 5], sh: [-8, 4] } } });
export const CABLE_FRONT_RAISE = art('cable-front-raise',
  { body: cfront(10), gear: cfrGear, yaw: -30, center: [-1.5, 0, 9.5], floorX: -1.5, floor: [7, 4.5] },
  { body: cfront(90), gear: cfrGear, yaw: -30, center: [-1.5, 0, 9.5], floorX: -1.5, floor: [7, 4.5] });

// ── 머신 리어 델트 플라이: 패드 쪽을 보고 앉아 팔을 앞 → 옆 뒤로
const rdGear = (p: P): Shape[] => { const pel = pelvisOf(p); return [...seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), box([pel[0] + 2.4, 0, pel[2] + 3.8], [0.4, 1.4, 2.0], 'pad'), ...stack(pel[0] + 4.8, 0, 16), ...[p.hands.L, p.hands.R].flatMap((h) => [capsule([pel[0] + 3.4, 1.4 * Math.sign(h[1]), h[2] + 3.6], add(h, [0, 0, 1.0]), 0.22, 'steel'), ...grip(h)])]; };
const rd = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: 6, head: 0, arm, leg: SIT });
export const MACHINE_REAR_DELT = art('machine-rear-delt-fly',
  { body: rd({ hand: [4.4, 1.0, 0.2], pole: [0, 1, 0], rel: 'torso' }), gear: rdGear, yaw: 60, center: [1, 0, 9] },
  { body: rd({ hand: [0.6, 5.8, 0.4], pole: [0, 0.2, 1], rel: 'torso' }), gear: rdGear, yaw: 60, center: [1, 0, 9] });

// ── 덤벨 리어 델트 플라이: 숙여서 팔을 옆으로
const bentOver = (arm: LimbSpec): BodySpec => stand({ lean: 70, head: 40, arm, leg: { th: [24, 8], sh: [-14, 6] } });
export const DB_REAR_DELT = art('dumbbell-rear-delt-fly',
  { body: bentOver({ hand: [4.4, 1.1, 0], pole: [0, 1, 0], rel: 'torso' }), gear: dbs([1, 0, 0]), yaw: -95, center: [1, 0, 8] },
  { body: bentOver({ hand: [0.6, 5.7, 0.2], pole: [0, 0, 1], rel: 'torso' }), gear: dbs([1, 0, 0]), yaw: -95, center: [1, 0, 8] });

// ── 케이블 리어 델트 플라이: 두 기둥 사이, 팔을 교차 → 벌림
const crdGear = (p: P): Shape[] => [...crossover(2.6, 7.4, 14.6), ...[p.hands.L, p.hands.R].map((h) => capsule(h, [2.6, -7.1 * Math.sign(h[1]), 14.6], 0.1, 'plate'))];
const crd = (arm: LimbSpec): BodySpec => stand({ arm });
export const CABLE_REAR_DELT = art('cable-rear-delt-fly',
  { body: crd({ hand: [4.4, -0.6, 14.2], pole: [0, 1, 0] }), gear: crdGear, yaw: -60, center: [1, 0, 10], scale: 4.7, floor: [6, 8] },
  { body: crd({ hand: [0.6, 6.4, 14.4], pole: [0, 0, 1] }), gear: crdGear, yaw: -60, center: [1, 0, 10], scale: 4.7, floor: [6, 8] });

// ── 케이블 페이스 풀: 얼굴 높이 로프를 귀 옆으로
const fpGear = (p: P): Shape[] => { const h = mid(p); return [...tower(7.6, 0, 15.4), ...cable(h, [8.2, 0, 15.4]), ...[p.hands.L, p.hands.R].map((x) => capsule(x, h, 0.18, 'shoe'))]; };
const fp = (arm: LimbSpec): BodySpec => stand({ lean: -4, arm, leg: { L: { th: [8, 5], sh: [0, 4] }, R: { th: [-8, 5], sh: [-8, 4] } } });
export const FACE_PULL = art('cable-face-pull',
  { body: fp({ hand: [4.6, 0.6, 15.6], pole: [0, 1, 0] }), gear: fpGear, yaw: -15, center: [3, 0, 10], floorX: 3, floor: [7.5, 4.5] },
  { body: fp({ hand: [0.9, 3.0, 16.4], pole: [-0.6, 1, 0.6] }), gear: fpGear, yaw: -15, center: [3, 0, 10], floorX: 3, floor: [7.5, 4.5] });

// ── 업라이트 로우(바벨 / 케이블)
const ur = (arm: LimbSpec): BodySpec => stand({ arm });
const UR_LO: LimbSpec = { hand: [1.0, 1.4, 9.8], pole: [-0.3, 1, 0] };
const UR_HI: LimbSpec = { hand: [1.2, 1.4, 14.0], pole: [-0.4, 1, 1] };
export const BARBELL_UPRIGHT_ROW = art('barbell-upright-row',
  { body: ur(UR_LO), gear: (p) => barbell(mid(p), 1, 7.25, 1.45), yaw: -55 },
  { body: ur(UR_HI), gear: (p) => barbell(mid(p), 1, 7.25, 1.45), yaw: -55 });
const curGear = (p: P): Shape[] => { const h = mid(p); return [cylA(h, [0, 1, 0], 0.2, 2.0, 'bar'), ...cable(h, [3.4, 0, 1.0]), ...tower(4.0, 0, 1.0)]; };
export const CABLE_UPRIGHT_ROW = art('cable-upright-row',
  { body: ur(UR_LO), gear: curGear, yaw: -20, center: [1.5, 0, 9.5], floorX: 1.5, floor: [7, 4.5] },
  { body: ur(UR_HI), gear: curGear, yaw: -20, center: [1.5, 0, 9.5], floorX: 1.5, floor: [7, 4.5] });

// ── 케이블 익스터널 로테이션: 팔꿈치 옆구리에 붙이고 아래팔만 바깥으로 (오른팔)
const er = (hand: V): BodySpec => stand({ arm: { L: { ua: [4, 4], fa: [4, 4] }, R: { hand, pole: [-0.2, -0.3, -1] } } });
const erGear = (p: P): Shape[] => [...tower(1.6, 5.6, 10.6), ...cable(p.hands.R, [2.2, 5.6, 10.6]), ...grip(p.hands.R)];
export const EXTERNAL_ROTATION = art('cable-external-rotation',
  { body: er([2.2, 0.2, 10.6]), gear: erGear, yaw: -95, center: [0.5, 1.5, 9.5] },
  { body: er([1.4, -4.2, 10.8]), gear: erGear, yaw: -95, center: [0.5, 1.5, 9.5] });

// ── 슈러그(바벨 / 덤벨)
const shrug = (up: number, hy: number): BodySpec => stand({ shrug: up, arm: { hand: [0.6, hy, 9.6 + up], pole: [-1, 0.3, 0] } });
export const BARBELL_SHRUG = art('barbell-shrug',
  { body: shrug(0, 2.5), gear: (p) => barbell(mid(p)), yaw: -55 },
  { body: shrug(0.9, 2.5), gear: (p) => barbell(mid(p)), yaw: -55 });
export const DB_SHRUG = art('dumbbell-shrug',
  { body: shrug(0, 2.3), gear: dbs([1, 0, 0]), yaw: -75 },
  { body: shrug(0.9, 2.3), gear: dbs([1, 0, 0]), yaw: -75 });

export const ARTS = [DB_SHOULDER_PRESS, ARNOLD_PRESS, MACHINE_SHOULDER_PRESS, CABLE_SHOULDER_PRESS, CABLE_LATERAL_RAISE, MACHINE_LATERAL_RAISE, DB_FRONT_RAISE, CABLE_FRONT_RAISE, MACHINE_REAR_DELT, DB_REAR_DELT, CABLE_REAR_DELT, FACE_PULL, BARBELL_UPRIGHT_ROW, CABLE_UPRIGHT_ROW, EXTERNAL_ROTATION, BARBELL_SHRUG, DB_SHRUG];
