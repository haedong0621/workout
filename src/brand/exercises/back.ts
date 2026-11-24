// 등 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule, cyl, mul } from './iso.ts';
import { art, barbell, cable, cylA, dumbbell, grounded, pulley, type BodySpec, type LimbSpec } from './kit.ts';
import { backPad, box, grip, legs, lever, pelvisOf, plateOn, pullupFrame, roller, seatPad, stack, tower, type P } from './gear.ts';
import { lie } from './chest.ts';
import { SIT, stand } from './poses.ts';

const mid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const barAt = (p: P) => barbell(mid(p));
const HANG: LimbSpec = { ua: 0, fa: 0 };

// ── 바벨 데드리프트: 바닥 → 선 자세
const dlDown = (arm: LimbSpec = HANG): BodySpec => grounded({ pelvis: [-1.2, 0, 6], lean: 58, head: 40, arm, leg: { th: [62, 9], sh: [-22, 7], ft: 68 } });
const dlUp = (arm: LimbSpec = HANG): BodySpec => stand({ lean: 2, head: 0, arm, leg: { th: [0, 8], sh: [0, 6] } });
export const DEADLIFT = art('barbell-deadlift',
  { body: dlDown({ ua: [4, 6], fa: [4, 6] }), gear: barAt, yaw: -30 },
  { body: dlUp({ ua: [8, 6], fa: [8, 6] }), gear: barAt, yaw: -30 });

// ── 바벨 로우: 숙인 자세에서 배꼽 쪽으로 당김
const bent = (arm: LimbSpec): BodySpec => grounded({ pelvis: [-0.8, 0, 8], lean: 62, head: 45, arm, leg: { th: [22, 8], sh: [-14, 6] } });
const ROW_UP: LimbSpec = { hand: [0.9, 2.6, -3.0], pole: [-1, 0.4, 1], rel: 'torso' };
export const BARBELL_ROW = art('barbell-row',
  { body: bent({ ua: [3, 4], fa: [3, 4] }), gear: barAt, yaw: -30 },
  { body: bent(ROW_UP), gear: barAt, yaw: -30 });

// ── 머신 티바 로우: 숙여서 T자 손잡이 당김
const tbar = (arm: LimbSpec): BodySpec => grounded({ pelvis: [-0.8, 0, 8], lean: 55, head: 40, arm, leg: { th: [24, 10], sh: [-14, 8] } });
const tbarGear = (p: P): Shape[] => { const h = mid(p); const pivot: V = [-7.5, 0, 0.8]; const end = add(h, [1.5, 0, -0.2]); return [capsule(pivot, end, 0.2, 'steel'), cylA(h, [0, 1, 0], 0.2, 1.3, 'shoe'), ...plateOn(end, [1, 0, 0.2], 1.6), box([-7.5, 0, 0.4], [0.8, 0.8, 0.4], 'plate')]; };
export const TBAR_ROW = art('machine-tbar-row',
  { body: tbar({ hand: [5.2, 0.9, 3.8], pole: [-1, 0.6, 0] }), gear: tbarGear, yaw: -30, center: [0, 0, 7] },
  { body: tbar({ hand: [1.3, 0.9, -2.2], pole: [-1, 0.6, 1], rel: 'torso' }), gear: tbarGear, yaw: -30, center: [0, 0, 7] });

// ── 케이블 시티드 로우: 앉아서 발판 밀고, 손잡이를 배 쪽으로
const crow = (lean: number, arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 2.6], lean, head: lean > 0 ? 20 : 0, arm, leg: { ankle: [7.0, 1.3, 2.2], pole: [0, 0.3, 1], ft: 160 } });
const crowGear = (p: P): Shape[] => { const h = mid(p); return [box([0.4, 0, 0.8], [3.0, 1.2, 0.8], 'pad'), box([8.0, 0, 2.2], [0.3, 1.8, 1.6]), ...cable(h, [9.6, 0, 2.6]), ...pulley([9.6, 0, 2.6], [0, 1, 0]), box([10.3, 0, 5], [0.6, 1.2, 5]), grip(h, [0, 1, 0], 0.7)]; };
export const CABLE_SEATED_ROW = art('cable-seated-row',
  { body: crow(22, { hand: [7.0, 0.7, 6.2], pole: [-0.3, 1, 0] }), gear: crowGear, yaw: -30, center: [3, 0, 5], floor: [9, 4.5] },
  { body: crow(-8, { hand: [2.0, 0.7, 6.0], pole: [-1, 0.4, 0] }), gear: crowGear, yaw: -30, center: [3, 0, 5], floor: [9, 4.5] });

// ── 앉아서 당기는 머신(시티드 로우·하이 로우·랫 풀다운)
const sitM = (arm: LimbSpec, lean = -4): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: 8, arm, leg: SIT });
function pullMachine(pivot: V, chestPad: boolean, kneePad = false) {
  return (p: P): Shape[] => {
    const pel = pelvisOf(p);
    const out: Shape[] = [seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), ...stack(pel[0] - 3.4, 0, 16)];
    if (chestPad) out.push(box([pel[0] + 2.9, 0, pel[2] + 3.6], [0.35, 1.5, 1.8], 'pad'), capsule([pel[0] + 3.3, 0, pel[2] + 3.6], [pel[0] + 3.3, 0, 0.3], 0.25, 'steel'));
    if (kneePad) out.push(roller([pel[0] + 2.4, 0, pel[2] + 1.5], 2.2));
    for (const h of [p.hands.L, p.hands.R]) { const s = Math.sign(h[1]); out.push(...lever([pivot[0], pivot[1] * s, pivot[2]], h), grip(h, [0, 0, 1], 0.5)); }
    return out;
  };
}
const machine = (id: string, a: LimbSpec, b: LimbSpec, pivot: V, chest: boolean, knee = false, la = -4, lb = -4, yaw = -60) =>
  art(id, { body: sitM(a, la), gear: pullMachine(pivot, chest, knee), yaw, center: [0.5, 0, 9.5], scale: 5.0 }, { body: sitM(b, lb), gear: pullMachine(pivot, chest, knee), yaw, center: [0.5, 0, 9.5], scale: 5.0 });
export const MACHINE_SEATED_ROW = machine('machine-seated-row', { hand: [5.3, 2.0, 9.6], pole: [-0.3, 1, -0.4] }, { hand: [1.2, 2.4, 9.2], pole: [-1, 0.5, 0] }, [6.5, 2.2, 3.5], true);
export const MACHINE_HIGH_ROW = machine('machine-high-row', { hand: [3.6, 2.8, 16.8], pole: [-0.2, 1, 0] }, { hand: [0.6, 2.9, 11.4], pole: [-1, 0.4, -0.5] }, [-2.8, 2.9, 19.5], false, true);
export const MACHINE_LAT_PULLDOWN = machine('machine-lat-pulldown', { hand: [0.6, 4.6, 19.3], pole: [0, 1, 0] }, { hand: [1.2, 4.0, 14.4], pole: [-0.6, 0.7, -1] }, [-3.0, 4.2, 19.8], false, true, -4, -14);
export const MACHINE_REVERSE_PULLDOWN = machine('machine-reverse-grip-lat-pulldown', { hand: [0.8, 2.6, 19.4], pole: [0.3, 0.5, 0] }, { hand: [1.5, 2.6, 14.0], pole: [-1, 0.2, -1] }, [-3.0, 2.8, 19.8], false, true, -4, -14);

// ── 케이블 랫 풀다운 (넓은 바 / 좁은 V 손잡이)
const latSeat = (p: P): Shape[] => { const pel = pelvisOf(p); return [seatPad(p, 3.0), ...legs([pel[0] + 0.4], pel[2] - 1.7), roller([pel[0] + 2.4, 0, pel[2] + 1.5], 2.2), capsule([pel[0] + 2.4, 0, pel[2] + 1.5], [pel[0] + 2.4, 0, 0.3], 0.22, 'steel'), capsule([-3.4, 0, 0.2], [-3.4, 0, 23], 0.36, 'steel'), capsule([-3.4, 0, 23], [0.6, 0, 23], 0.36, 'steel'), ...stack(-4.4, 0, 6)]; };
const wideBar = (p: P): Shape[] => { const [x, , z] = p.hands.L; return [capsule([x, -4.2, z], [x, 4.2, z], 0.2, 'bar'), ...[-1, 1].map((s) => capsule([x, 4.2 * s, z], [x, 5.4 * s, z - 0.7], 0.2, 'bar')), ...[-1, 1].map((s) => cylA([x, 3.9 * s, z], [0, 1, 0], 0.25, 0.8, 'shoe')), ...cable([x, 0, z], [0.4, 0, 22.4]), ...pulley([0.4, 0, 22.8])]; };
const vBar = (p: P): Shape[] => { const h = mid(p); return [cylA(h, [0, 1, 0], 0.22, 1.1, 'shoe'), capsule(add(h, [0, 0, 0.3]), add(h, [0, 0, 1.4]), 0.2, 'steel'), ...cable(add(h, [0, 0, 1.4]), [0.4, 0, 22.4]), ...pulley([0.4, 0, 22.8])]; };
const lat = (hand: V, pole: V, lean: number): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: 15, arm: { hand, pole }, leg: SIT });
const latArt = (id: string, a: [V, V, number], b: [V, V, number], bar: (p: P) => Shape[]) =>
  art(id, { body: lat(...a), gear: (p) => [...latSeat(p), ...bar(p)], yaw: -50, center: [0, 0, 11.5], scale: 4.7 }, { body: lat(...b), gear: (p) => [...latSeat(p), ...bar(p)], yaw: -50, center: [0, 0, 11.5], scale: 4.7 });
export const CABLE_LAT_PULLDOWN = latArt('cable-lat-pulldown', [[0.4, 4.7, 19.4], [0, 1, 0], -4], [[1.2, 4.1, 15.0], [-0.7, 0.7, -1], -16], wideBar);
export const CABLE_CLOSE_PULLDOWN = latArt('cable-close-grip-lat-pulldown', [[0.8, 0.6, 19.6], [0, 1, 0.2], -4], [[1.9, 0.6, 14.6], [-0.4, 1, -1], -18], vBar);

// ── 풀업·친업: 철봉에 매달림 → 턱이 바 위로
const BAR_Z = 21.5;
const hang = (z: number, hy: number, pole: V, lean = 6): BodySpec => ({ pelvis: [-0.3, 0, z], lean, head: 15, arm: { hand: [0.2, hy, BAR_Z], pole }, leg: { th: [8, 4], sh: [-30, 3], ft: 25 } });
const bar = () => pullupFrame(BAR_Z, 0.2, 6.2);
export const PULLUP = art('pullup',
  { body: hang(BAR_Z - 10.3, 4.4, [0, 1, 0]), gear: bar, yaw: -50, center: [0, 0, 12.5], scale: 4.6 },
  { body: hang(BAR_Z - 7.0, 4.4, [-0.4, 1, -1]), gear: bar, yaw: -50, center: [0, 0, 12.5], scale: 4.6 });
export const CHINUP = art('chinup',
  { body: hang(BAR_Z - 10.3, 2.2, [0.2, 0.3, 0]), gear: bar, yaw: -50, center: [0, 0, 12.5], scale: 4.6 },
  { body: hang(BAR_Z - 7.0, 2.2, [-1, 0.2, -1], 2), gear: bar, yaw: -50, center: [0, 0, 12.5], scale: 4.6 });

// ── 케이블 스트레이트 암 풀다운: 팔 편 채로 위 → 허벅지 앞
const sap = (flex: number): BodySpec => stand({ lean: 22, head: 15, arm: { ua: flex, fa: flex }, leg: { th: [10, 7], sh: [-8, 5] } });
const sapGear = (p: P): Shape[] => { const h = mid(p); return [cylA(h, [0, 1, 0], 0.2, 2.6, 'bar'), ...cable(h, [9.0, 0, 18.6]), ...tower(8.4, 0, 18.6)]; };
export const STRAIGHT_ARM_PULLDOWN = art('cable-straight-arm-pulldown',
  { body: sap(125), gear: sapGear, yaw: -8, center: [3.8, 0, 10], floorX: 3.5, floor: [7, 4.5] },
  { body: sap(12), gear: sapGear, yaw: -8, center: [3.8, 0, 10], floorX: 3.5, floor: [7, 4.5] });

// ── 덤벨 풀오버: 벤치에 누워 가슴 위 → 머리 뒤로
const pull = (hand: V): BodySpec => lie(0, { hand, pole: [0, 0.6, -0.4], rel: 'torso' });
const pullGear = (p: P): Shape[] => [...lie0Bench(p), ...dumbbell(mid(p), [0, 0, 1])];
import { benchFor } from './gear.ts';
const lie0Bench = (p: P) => benchFor(p);
export const PULLOVER = art('dumbbell-pullover',
  { body: pull([4.6, 0.35, 0.3]), gear: pullGear, yaw: -22, center: [-1, 0, 6], floor: [7, 4.5] },
  { body: pull([0.6, 0.35, 4.4]), gear: pullGear, yaw: -22, center: [-1, 0, 6], floor: [7, 4.5] });

// ── 백 익스텐션: 45도 벤치에서 상체를 숙였다가 펴기
const HY = 10.4;
const hyper = (lean: number): BodySpec => ({ pelvis: [0, 0, HY], lean, head: lean > 90 ? 20 : 10, arm: { hand: [0.9, -0.7, -1.0], pole: [0, 1, -1], rel: 'torso' }, leg: { th: [-45, 5], sh: [-45, 5], ft: 20 } });
const hyperGear = (): Shape[] => [
  box([1.0, 0, HY - 1.0], [0.5, 1.4, 0.9], 'pad'),                           // 허벅지 패드
  roller([-5.4, 0, HY - 5.6], 1.6),                                         // 발목 롤러
  box([-6.7, 0, HY - 6.5], [1.0, 1.6, 0.18], 'plate'),                      // 발판
  capsule([-6.8, 0, 0.4], [-6.6, 0, HY - 6.5], 0.3, 'steel'), capsule([-6.6, 0, HY - 6.5], [1.3, 0, HY - 1.6], 0.3, 'steel'), capsule([1.3, 0, 0.3], [1.3, 0, HY - 1.6], 0.3, 'steel'),
];
export const BACK_EXTENSION = art('back-extension',
  { body: hyper(140), gear: hyperGear, yaw: -28, center: [-0.5, 0, 8] },
  { body: hyper(46), gear: hyperGear, yaw: -28, center: [-0.5, 0, 8] });

export const ARTS = [DEADLIFT, BARBELL_ROW, TBAR_ROW, CABLE_SEATED_ROW, MACHINE_SEATED_ROW, MACHINE_HIGH_ROW, CABLE_LAT_PULLDOWN, CABLE_CLOSE_PULLDOWN, MACHINE_LAT_PULLDOWN, MACHINE_REVERSE_PULLDOWN, PULLUP, CHINUP, STRAIGHT_ARM_PULLDOWN, PULLOVER, BACK_EXTENSION];
void cyl; void backPad;
