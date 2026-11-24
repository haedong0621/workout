// 기본 운동 그림: 바벨 숄더 프레스 · 덤벨 사이드 레터럴 레이즈 · 바벨 컬 · 덤벨 로우 · 푸시업
import type { Shape, V } from './iso.ts';
import { add, capsule, cyl, mul, rbox } from './iso.ts';
import { art, barbell, cable, cableTower, dumbbell, flatBench, grounded, pad, post, pulley, seat, type BodySpec } from './kit.ts';
import { STAND, stand } from './poses.ts';

// ── 바벨 숄더 프레스: 쇄골 앞 → 머리 위
const ohp = (hand: V, pole: V): BodySpec => stand({ arm: { hand, pole } });
export const SHOULDER_PRESS = art('barbell-shoulder-press',
  { body: ohp([1.4, 3.6, 15.4], [0.3, 1, -1]), gear: (p) => barbell([p.hands.L[0], 0, p.hands.L[2]]), yaw: -55, center: [0, 0, 10.5] },
  { body: ohp([0.6, 3.3, 20.5], [0, 1, 0]), gear: (p) => barbell([p.hands.L[0], 0, p.hands.L[2]]), yaw: -55, center: [0, 0, 10.5] });

// ── 덤벨 사이드 레터럴 레이즈: 옆구리 → 어깨높이로 옆으로
const lateral = (hand: V, pole: V): BodySpec => stand({ arm: { hand, pole } });
const dbs = (p: { hands: { L: V; R: V } }) => [...dumbbell(p.hands.L, [1, 0, 0]), ...dumbbell(p.hands.R, [1, 0, 0])];
export const LATERAL_RAISE = art('dumbbell-lateral-raise',
  { body: lateral([0.3, 2.3, 9.9], [-1, 0.3, 0]), gear: dbs, yaw: -95 },
  { body: lateral([0.5, 6.3, 14.0], [-0.2, 0, 1]), gear: dbs, yaw: -95 });

// ── 바벨 컬: 허벅지 앞 → 가슴 앞 (팔꿈치는 옆구리에)
const curl = (hand: V, pole: V): BodySpec => stand({ arm: { hand, pole } });
export const BARBELL_CURL = art('barbell-curl',
  { body: curl([1.2, 2.4, 10.0], [-1, 0.2, 0]), gear: (p) => barbell([p.hands.L[0], 0, p.hands.L[2]], 1), yaw: -30 },
  { body: curl([1.8, 2.4, 14.2], [-1, 0.2, -0.6]), gear: (p) => barbell([p.hands.L[0], 0, p.hands.L[2]], 1), yaw: -30 });

// ── 덤벨 로우: 한쪽 무릎·손은 벤치, 반대 팔로 당김
const row = (hand: V, pole: V): BodySpec => ({
  pelvis: [0, 0, 9.0], lean: 80, head: 45,
  arm: { L: { hand: [5.6, 1.6, 5.0], pole: [-1, 0, 0] }, R: { hand, pole } },
  leg: { L: { ankle: [-4.0, 1.0, 5.6], pole: [1, 0, -1], ft: 10 }, R: { ankle: [0.6, -2.4, 1.0], pole: [1, 0, 0] } },
});
const rowGear = (p: { hands: { L: V; R: V } }): Shape[] => [...flatBench(0.8, 5.6, 4.7).map((s) => s), ...dumbbell(p.hands.R, [1, 0, 0])];
// 벤치는 왼쪽(무릎·손 쪽)으로 옮김
import { place } from './kit.ts';
const rowGearShift = (p: { hands: { L: V; R: V } }): Shape[] => [...place(flatBench(0.8, 5.6, 4.7), [], 0, [0, 1.2, 0]).shapes, ...dumbbell(p.hands.R, [1, 0, 0])];
void rowGear;
export const DUMBBELL_ROW = art('dumbbell-row',
  { body: row([5.6, -2.0, 4.3], [-1, 0, 0]), gear: rowGearShift, yaw: -40, center: [2, 0, 6], floor: [8, 5] },
  { body: row([3.6, -2.2, 8.4], [-1, 0, 1]), gear: rowGearShift, yaw: -40, center: [2, 0, 6], floor: [8, 5] });

// ── 푸시업: 팔 편 자세 → 가슴을 바닥 가까이
const pushup = (lean: number, pole: V): BodySpec => {
  const b = grounded({ pelvis: [0, 0, 4], lean, head: 20, arm: { ua: 0, fa: 0 }, leg: { th: -lean, sh: -lean, ft: -15 } });
  const shx = b.pelvis[0] + 5.4 * Math.sin((lean * Math.PI) / 180);
  return { ...b, arm: { hand: [shx + 0.4, 2.3, 0.45], pole } };
};
export const PUSHUP = art('pushup',
  { body: pushup(70, [-0.6, 1, 0.3]), yaw: -25, center: [1, 0, 3], floor: [8, 4] },
  { body: pushup(83, [-0.6, 1, 0.6]), yaw: -25, center: [1, 0, 3], floor: [8, 4] });

export const ARTS = [SHOULDER_PRESS, LATERAL_RAISE, BARBELL_CURL, DUMBBELL_ROW, PUSHUP];
void STAND; void pad;
