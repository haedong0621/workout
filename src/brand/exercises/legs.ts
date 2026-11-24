// 하체 운동 그림
import type { Shape, V } from './iso.ts';
import { add, capsule,  mul } from './iso.ts';
import { art, barbell, cable,  dumbbell, flatBench, grounded,  pad, place, type BodySpec, type LegSpec, type LimbSpec } from './kit.ts';
import {  box, grip,  lever, pelvisOf,     tower, type P } from './gear.ts';
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

// ── 레그 프레스(45도): 뒤로 기대 앉아 발판을 밀어 올림

// ── 레그 익스텐션(양다리 / 한 다리)

// ── 라잉 레그 컬: 엎드려 발목 롤러를 엉덩이 쪽으로

// ── 시티드 레그 컬: 앉아서 다리를 앞 → 아래로 접음

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

// ── 힙 어브덕션 / 어덕션: 앉아서 무릎을 벌림 / 모음

// ── 카프 레이즈(서서 / 앉아서): 발판 끝에서 뒤꿈치 내림 → 까치발

// ── 케이블 글루트 킥백: 기둥을 보고 서서 한 다리를 뒤로
const gk = (L: LegSpec): BodySpec => grounded({ pelvis: [0, 0, 9], lean: 28, head: 15, arm: { hand: [4.6, 1.6, 12.6], pole: [-0.5, 1, -0.5] }, leg: { L, R: { th: [4, 5], sh: [-2, 4] } } });
const gkGear = (p: P): Shape[] => [...tower(5.6, 0, 1.0), capsule([4.8, -1.8, 12.6], [4.8, 1.8, 12.6], 0.2, 'steel'), ...cable(p.L.an, [6.2, 0, 1.0])];
export const GLUTE_KICKBACK = art('cable-glute-kickback',
  { body: gk({ th: [10, 5], sh: [-10, 4], ft: 40 }), gear: gkGear, yaw: -20, center: [1.5, 0, 9], floorX: 2, floor: [7, 4.5] },
  { body: gk({ th: [-48, 5], sh: [-62, 4], ft: 0 }), gear: gkGear, yaw: -20, center: [1.5, 0, 9], floorX: 2, floor: [7, 4.5] });

export const ARTS = [SQUAT, FRONT_SQUAT, GOBLET_SQUAT, RDL, DB_RDL, STIFF_DL, BARBELL_LUNGE, DB_LUNGE, BARBELL_SPLIT, DB_SPLIT, BARBELL_HIP_THRUST, GLUTE_KICKBACK];
void pad; void lever; void grip; void SIT;
