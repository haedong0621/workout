// 머신 운동 28개 × 2버전: 핀(중량 스택 + 케이블) / 플레이트(레버에 원판).
// 같은 운동은 사람 자세·카메라 각도가 같고 장비만 다르다. 레버는 한 덩어리로 회전축에서 돌기만 한다(lever.ts).
import type { Shape, V } from './iso.ts';
import { add, lerp, mul, norm, sub } from './iso.ts';
import { art, cylA, type BodySpec, type ExArt, type LegSpec, type LimbSpec, type Scene } from './kit.ts';
import { backPad, pelvisOf, seatPad, type P } from './gear.ts';
import { leverArt, type LeverDef, type LeverParts } from './lever.ts';
import { baseFrame, cushion, horn, roll, rope, tube, weightStack } from './machine.ts';
import { SIT, stand } from './poses.ts';

type Var = 'pin' | 'plate';
type Cam = Omit<Scene, 'body' | 'gear'>;
const mir = (v: V, s: number): V => [v[0], v[1] * s, v[2]];

// ── 공통 정적 장비
/** 좌판 + 기둥 + (등받이) + 바닥틀 */
function seatBase(p: P, o: { x0: number; x1: number; w?: number; back?: boolean; backUp?: number; seatLen?: number }): Shape[] {
  const pel = pelvisOf(p);
  const out: Shape[] = [...baseFrame(o.x0, o.x1, o.w ?? 2.6), ...seatPad(p, o.seatLen ?? 3.0), tube([pel[0] + 0.3, 0, pel[2] - 1.9], [pel[0] + 0.3, 0, 0.3], 0.3)];
  if (o.back !== false) {
    const mid = add(lerp(pel, p.shMid, 0.45), mul(p.front, -1.95));
    out.push(...backPad(p, o.backUp ?? 1.5, 0.3), tube(mid, [mid[0] - 0.6, 0, 0.3], 0.28));
  }
  return out;
}
/** 핀: 중량 스택 기둥 (x, y), 높이 h, 위 도르래 위치 반환 */
function pinStack(x: number, y: number, h: number, face: 1 | -1 = 1): { shapes: Shape[]; top: V } {
  return { shapes: weightStack(x, y, h, face), top: [x, y, h - 0.6] };
}
/** 레버 끝 손잡이 연결: 손잡이 축 g, 레버 평면 y = py */
function gripEnd(T: V, g: V, py: number, s: number): { end: V; parts: LeverParts } {
  const gn = norm(g);
  const along = Math.abs(gn[1]) > 0.7 ? mul(gn, 0.65 * s * Math.sign(gn[1] || 1)) : mul(gn, -0.65);
  const attach = add(T, along);
  const end: V = [attach[0], py, attach[2]];
  return { end, parts: { tubes: Math.abs(end[1] - attach[1]) > 0.05 ? [[end, attach]] : [], handles: [[T, gn]] } };
}
const merge = (...ps: LeverParts[]): LeverParts => ({
  tubes: ps.flatMap((p) => p.tubes ?? []), handles: ps.flatMap((p) => p.handles ?? []), horns: ps.flatMap((p) => p.horns ?? []),
  pads: ps.flatMap((p) => p.pads ?? []), cables: ps.flatMap((p) => p.cables ?? []), rolls: ps.flatMap((p) => p.rolls ?? []),
});
/** 표준 팔 레버: 축 P → 꺾임 E → 손잡이. 플레이트면 축 가까이 원판 뿔, 핀이면 축 뒤 연장 끝에 케이블 */
function armLever(P: V, T: V, s: number, v: Var, o: { bend: V; g: V; anchor?: V; hornAt?: number; tail?: number }): LeverParts {
  const E = add(lerp(P, T, 0.5), [o.bend[0], 0, o.bend[2]]);
  const Ep: V = [E[0], P[1], E[2]];
  const { end, parts } = gripEnd(T, o.g, P[1], s);
  const base: LeverParts = { tubes: [[P, Ep, end]] };
  if (v === 'plate') {
    const hp = lerp(P, Ep, o.hornAt ?? 0.45);
    return merge(base, parts, { horns: [[hp, [0, s, 0], 2]] });
  }
  const back = add(P, mul(norm(sub(P, Ep)), o.tail ?? 1.3));
  return merge(base, parts, { tubes: [[P, back]], cables: o.anchor ? [[mir(o.anchor, s), back]] : [] });
}
/** 두 버전 그림 만들기 */
function pair(id: string, a: BodySpec, b: BodySpec, cam: Cam, stat: (p: P, v: Var) => Shape[], lever: (v: Var) => LeverDef): [ExArt, ExArt] {
  const mk = (v: Var, suffix: string) => leverArt(id + suffix, { body: a, gear: (p) => stat(p, v), ...cam }, { body: b, gear: (p) => stat(p, v), ...cam }, lever(v));
  return [mk('pin', ''), mk('plate', '-plate')];
}
/** 레버 없이(썰매·레일) 두 버전 */
function pairStatic(id: string, a: BodySpec, b: BodySpec, cam: Cam, gear: (p: P, v: Var) => Shape[]): [ExArt, ExArt] {
  const mk = (v: Var, suffix: string) => art(id + suffix, { body: a, gear: (p) => gear(p, v), ...cam }, { body: b, gear: (p) => gear(p, v), ...cam });
  return [mk('pin', ''), mk('plate', '-plate')];
}

// ── 몸 자세
const seated = (arm: LimbSpec, lean = -10, leg: LegSpec = SIT): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: 5, arm, leg });

// 1~3. 체스트 프레스(일반·인클라인·디클라인)
const PRESS_CAM: Cam = { yaw: -76, center: [-0.4, 0, 8.8], floor: [7, 5.8], floorX: -0.5, scale: 5.2 };
function pressStat(p: P, v: Var): Shape[] {
  const pel = pelvisOf(p);
  if (v === 'plate') return seatBase(p, { x0: -3.6, x1: 6.0, w: 4.0 });
  const st = pinStack(pel[0] - 5.0, 0, 16, 1);
  return [...seatBase(p, { x0: -6.0, x1: 2.6 }), ...st.shapes, ...[-1, 1].flatMap((s) => [tube([pel[0] - 3.0, 2.6 * s, 0.3], [pel[0] - 3.0, 2.6 * s, 16.6], 0.3)]), tube([pel[0] - 3.0, -2.6, 16.6], [pel[0] - 3.0, 2.6, 16.6], 0.3)];
}
const pressLever = (pinPivot: V, platePivot: V) => (v: Var): LeverDef => v === 'pin'
  ? { prefer: pinPivot, base: (P, s) => [tube([-3.0, 2.6 * s, P[2]], P, 0.26)], build: (P, T, s) => armLever(P, T, s, v, { bend: [-1.4, 0, 2.6], g: [0, 0, 1], anchor: [-5.0, 0, 15.4] }) }
  : { prefer: platePivot, base: (P) => [tube([P[0], P[1], 0.3], P, 0.34), tube([P[0] - 1.6, P[1], 0.3], add(P, [0, 0, 0.5]), 0.26)], build: (P, T, s) => armLever(P, T, s, v, { bend: [-0.9, 0, 0.6], g: [0, 0, 1], hornAt: 0.3 }) };
export const [CHEST_PRESS, CHEST_PRESS_PLATE] = pair('machine-chest-press',
  seated({ hand: [1.1, 3.1, -0.9], pole: [-1, 1, -0.4], rel: 'torso' }), seated({ hand: [4.4, 2.6, -1.0], pole: [-0.3, 1, -1], rel: 'torso' }),
  PRESS_CAM, pressStat, pressLever([-2.2, 3.5, 14.6], [3.4, 4.0, 1.1]));
export const [INCLINE_PRESS, INCLINE_PRESS_PLATE] = pair('machine-incline-chest-press',
  seated({ hand: [1.1, 3.1, -0.3], pole: [-1, 1, -0.4], rel: 'torso' }), seated({ hand: [3.4, 2.5, 2.6], pole: [-0.3, 1, -1], rel: 'torso' }),
  PRESS_CAM, pressStat, pressLever([-2.6, 3.5, 9.5], [-3.6, 4.0, 3.0]));
export const [DECLINE_PRESS, DECLINE_PRESS_PLATE] = pair('machine-decline-chest-press',
  seated({ hand: [1.1, 3.1, -1.5], pole: [-1, 1, -0.4], rel: 'torso' }), seated({ hand: [4.1, 2.6, -3.0], pole: [-0.3, 1, -1], rel: 'torso' }),
  PRESS_CAM, pressStat, pressLever([-2.0, 3.5, 16.0], [2.6, 4.0, 1.2]));

// 4. 머신 플라이(펙덱) / 13. 리어 델트: 어깨 위 세로축에서 팔이 좌우로 돎
const TOP = 16.8;
function flyStat(p: P, v: Var, rear: boolean): Shape[] {
  const pel = pelvisOf(p);
  const rx = rear ? pel[0] + 3.4 : pel[0] - 3.0;
  const out: Shape[] = [...seatBase(p, { x0: Math.min(rx, pel[0] - 2) - 1, x1: Math.max(rx, pel[0] + 2) + 1, back: !rear }), ...[-1, 1].map((s) => tube([rx, 2.6 * s, 0.3], [rx, 2.6 * s, TOP + 0.4], 0.3)), tube([rx, -2.6, TOP + 0.4], [rx, 2.6, TOP + 0.4], 0.3)];
  if (rear) out.push(...cushion([pel[0] + 2.3, 0, pel[2] + 4.0], [0, 0, 1], [0, 1, 0], [2.0, 1.4]));
  if (v === 'pin') out.push(...pinStack(rx + (rear ? 2.0 : -2.0), 0, TOP - 0.4, rear ? -1 : 1).shapes);
  return out;
}
const flyLever = (rear: boolean) => (v: Var): LeverDef => ({
  prefer: [rear ? 0.6 : 0.2, 1.7, TOP], axis: 'z',
  base: (P, s) => [tube([rear ? pelvisX + 3.4 : pelvisX - 3.0, P[1] + 0.9 * s, TOP + 0.4], P, 0.26)],
  build: (P, T, s) => {
    const over: V = [T[0], T[1], P[2]];
    const parts: LeverParts = { tubes: [[P, over, add(T, [0, 0, 0.66])]], handles: [[T, [0, 0, 1]]] };
    if (v === 'plate') parts.horns = [[lerp(P, over, 0.35), [0, 0, 1], 1]];
    else parts.cables = [[[rear ? pelvisX + 5.4 : pelvisX - 5.0, 0, TOP - 1.0], P]];
    void s;
    return parts;
  },
});
const pelvisX = 0;
const FLY_CAM: Cam = { yaw: -82, center: [-0.4, 0, 9.4], floorX: -0.8, floor: [6.8, 5.6], scale: 5.2 };
export const [PEC_DECK, PEC_DECK_PLATE] = pair('machine-fly',
  seated({ hand: [0.4, 5.4, 0.3], pole: [-0.2, 0.3, -1], rel: 'torso' }, -6), seated({ hand: [3.9, 1.0, 0.1], pole: [0, 1, -0.6], rel: 'torso' }, -6),
  FLY_CAM, (p, v) => flyStat(p, v, false), flyLever(false));
const rdBody = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: 6, head: 0, arm, leg: SIT });
export const [REAR_DELT, REAR_DELT_PLATE] = pair('machine-rear-delt-fly',
  rdBody({ hand: [4.4, 1.0, 0.2], pole: [0, 1, 0], rel: 'torso' }), rdBody({ hand: [0.6, 5.8, 0.4], pole: [0, 0.2, 1], rel: 'torso' }),
  { yaw: 62, center: [0.8, 0, 9.4], floorX: 1, floor: [6.8, 5.6], scale: 5.2 }, (p, v) => flyStat(p, v, true), flyLever(true));

// 5. 머신 딥스: 옆 손잡이를 아래로
export const [MDIPS, MDIPS_PLATE] = pair('machine-dips',
  seated({ hand: [0.6, 3.2, 9.6], pole: [-1, 0.3, 0.4] }, -6), seated({ hand: [0.8, 3.1, 6.9], pole: [-1, 0.3, 0] }, -6),
  PRESS_CAM, pressStat,
  (v) => v === 'pin'
    ? { prefer: [-3.6, 3.6, 10.0], base: (P, s) => [tube([-3.0, 2.6 * s, P[2]], P, 0.26)], build: (P, T, s) => armLever(P, T, s, v, { bend: [0, 0, 0.6], g: [1, 0, 0], anchor: [-5.0, 0, 15.4] }) }
    : { prefer: [-3.8, 3.8, 9.0], base: (P) => [tube([P[0], P[1], 0.3], P, 0.34)], build: (P, T, s) => armLever(P, T, s, v, { bend: [0, 0, 0.6], g: [1, 0, 0], hornAt: 0.25 }) });

// 6. 티바 로우: 숙여서 가운데 레버 당김 (바닥 뒤 축)
const tbarBody = (arm: LimbSpec): BodySpec => stand({ pelvis: [-0.8, 0, 8], lean: 55, head: 40, arm, leg: { th: [24, 10], sh: [-14, 8] } });
export const [TBAR, TBAR_PLATE] = pair('machine-tbar-row',
  tbarBody({ hand: [5.2, 0.9, 3.8], pole: [-1, 0.6, 0] }), tbarBody({ hand: [1.3, 0.9, -2.2], pole: [-1, 0.6, 1], rel: 'torso' }),
  { yaw: -30, center: [0, 0, 7], floor: [8.5, 4.5], floorX: -1.5 },
  (p, v) => [rbase(), ...(v === 'pin' ? pinStack(8.6, 0, 12, -1).shapes : [])],
  (v) => ({
    prefer: [-8.0, 0, 1.0], single: true, at: (p) => [p.hands.L[0], 0, p.hands.L[2]],
    base: (P) => [tube([P[0], 0, 0.3], P, 0.4), tube([P[0] - 0.8, -1, 0.3], [P[0] - 0.8, 1, 0.3], 0.3)],
    build: (P, T) => {
      const dir = norm(sub(T, P));
      const tip = add(T, mul(dir, 1.8));
      const parts: LeverParts = { tubes: [[P, tip], [[T[0], -1.4, T[2]], [T[0], 1.4, T[2]]]], handles: [[[T[0], 0.9, T[2]], [0, 1, 0]], [[T[0], -0.9, T[2]], [0, 1, 0]]] };
      if (v === 'plate') parts.horns = [[add(T, mul(dir, 0.6)), dir, 2]];
      else parts.cables = [[[8.6, 0, 11.4], tip]];
      return parts;
    },
  }));
function rbase(): Shape { return tube([-8.8, 0, 0.3], [-6.0, 0, 0.3], 0.3); }

// 7. 시티드 로우: 가슴 패드, 앞 아래 축
const ROW_CAM: Cam = { yaw: -58, center: [1.2, 0, 9.2], floorX: 1.6, floor: [7.2, 5.4], scale: 5.0 };
function rowStat(p: P, v: Var): Shape[] {
  const pel = pelvisOf(p);
  const out = [...seatBase(p, { x0: -2.4, x1: 8.6, w: 3.8, back: false }), ...cushion([pel[0] + 3.0, 0, pel[2] + 3.6], [0, 0, 1], [0, 1, 0], [1.7, 1.4]), tube([pel[0] + 3.6, 0, pel[2] + 3.6], [pel[0] + 3.6, 0, 0.3], 0.3)];
  if (v === 'pin') out.push(...pinStack(8.0, 0, 15, -1).shapes);
  return out;
}
export const [SEATED_ROW, SEATED_ROW_PLATE] = pair('machine-seated-row',
  seated({ hand: [5.3, 2.1, 9.6], pole: [-0.3, 1, -0.4] }, -4), seated({ hand: [1.2, 2.5, 9.2], pole: [-1, 0.5, 0] }, -4),
  ROW_CAM, rowStat,
  (v) => ({ prefer: [3.4, 3.4, 1.0], base: (P) => [tube([P[0], P[1], 0.3], P, 0.34)], build: (P, T, s) => armLever(P, T, s, v, { bend: [0.8, 0, 0], g: [0, 0, 1], hornAt: 0.3, anchor: [8.0, 0, 14.4], tail: 1.2 }) }));

// 8. 하이 로우: 앞 위 축에서 내려온 손잡이를 아래·뒤로
const kneeLegs: LegSpec = SIT;
function highStat(p: P, v: Var): Shape[] {
  const pel = pelvisOf(p);
  const out: Shape[] = [...seatBase(p, { x0: -2.4, x1: 7.6, w: 3.8, back: false }), ...roll([pel[0] + 2.4, 0, pel[2] + 1.5], 2.2), tube([pel[0] + 2.4, 0, pel[2] + 1.5], [pel[0] + 2.4, 0, 0.3], 0.26)];
  for (const s of [-1, 1]) out.push(tube([6.8, 3.8 * s, 0.3], [6.8, 3.8 * s, 21.0], 0.32));
  out.push(tube([6.8, -3.8, 21.0], [6.8, 3.8, 21.0], 0.32));
  if (v === 'pin') out.push(...pinStack(8.8, 0, 16, -1).shapes);
  return out;
}
export const [HIGH_ROW, HIGH_ROW_PLATE] = pair('machine-high-row',
  { ...seated({ hand: [3.6, 2.8, 16.8], pole: [-0.2, 1, 0] }, -4, kneeLegs), head: 15 }, { ...seated({ hand: [0.6, 2.9, 11.4], pole: [-1, 0.4, -0.5] }, -4, kneeLegs), head: 8 },
  { ...ROW_CAM, center: [1.2, 0, 10.5], scale: 4.7 }, highStat,
  (v) => ({ prefer: [5.8, 3.6, 19.6], base: (P, s) => [tube([6.8, 3.8 * s, P[2]], P, 0.26)], build: (P, T, s) => armLever(P, T, s, v, { bend: [0.6, 0, 0.8], g: [0.3, 0, 1], hornAt: 0.35, anchor: [8.8, 0, 15.4] }) }));

// 9~10. 머신 랫 풀다운(넓게 / 리버스): 뒤 위 축에서 앞으로 나온 손잡이를 아래로
function latStat(p: P, v: Var): Shape[] {
  const pel = pelvisOf(p);
  const out: Shape[] = [...seatBase(p, { x0: -6.0, x1: 3.6, w: 3.8, back: false }), ...roll([pel[0] + 2.4, 0, pel[2] + 1.5], 2.2), tube([pel[0] + 2.4, 0, pel[2] + 1.5], [pel[0] + 2.4, 0, 0.3], 0.26)];
  for (const s of [-1, 1]) out.push(tube([-3.6, 3.8 * s, 0.3], [-3.6, 3.8 * s, 21.4], 0.32));
  out.push(tube([-3.6, -3.8, 21.4], [-3.6, 3.8, 21.4], 0.32));
  if (v === 'pin') out.push(...pinStack(-5.6, 0, 16, 1).shapes);
  return out;
}
const latLever = (y: number) => (v: Var): LeverDef => ({ prefer: [-3.2, y, 20.4], base: (P, s) => [tube([-3.6, 3.8 * s, P[2]], P, 0.26)], build: (P, T, s) => armLever(P, T, s, v, { bend: [0.2, 0, 1.4], g: [0.2, 1, 0], hornAt: 0.2, anchor: [-5.6, 0, 15.4] }) });
const LAT_CAM: Cam = { yaw: -55, center: [-0.4, 0, 11.2], floorX: -1, floor: [6.5, 5.4], scale: 4.6 };
export const [LAT_MACHINE, LAT_MACHINE_PLATE] = pair('machine-lat-pulldown',
  { ...seated({ hand: [0.6, 4.6, 19.3], pole: [0, 1, 0] }, -4), head: 15 }, { ...seated({ hand: [1.2, 4.0, 14.4], pole: [-0.6, 0.7, -1] }, -14), head: 15 },
  LAT_CAM, latStat, latLever(5.0));
export const [REV_LAT, REV_LAT_PLATE] = pair('machine-reverse-grip-lat-pulldown',
  { ...seated({ hand: [0.8, 2.6, 19.4], pole: [0.3, 0.5, 0] }, -4), head: 15 }, { ...seated({ hand: [1.5, 2.6, 14.0], pole: [-1, 0.2, -1] }, -14), head: 15 },
  LAT_CAM, latStat, latLever(3.4));

// 11. 머신 숄더 프레스: 뒤 축에서 앞으로 나온 손잡이를 위로
export const [MSP, MSP_PLATE] = pair('machine-shoulder-press',
  seated({ hand: [0.6, 3.5, 0.6], pole: [0, 1, -1], rel: 'torso' }, -6), seated({ hand: [0.3, 2.7, 4.7], pole: [0, 1, 0], rel: 'torso' }, -6),
  { ...PRESS_CAM, center: [-0.6, 0, 10] }, pressStat,
  (v) => ({ prefer: [-5.2, 3.6, 14.0], base: (P, s) => [tube([-3.0, 2.6 * s, P[2]], P, 0.26), ...(v === 'plate' ? [tube([P[0], P[1], 0.3], P, 0.34)] : [])], build: (P, T, s) => armLever(P, T, s, v, { bend: [0, 0, 0.5], g: [1, 0, 0], hornAt: 0.2, anchor: [-5.0, 0, 15.4] }) }));

// 12. 머신 사이드 레터럴: 팔꿈치 패드, 어깨 옆 앞뒤축
const mlat = (abd: number): BodySpec => seated({ ua: [10, abd], fa: [60, abd * 0.6] }, 0);
export const [MLAT, MLAT_PLATE] = pair('machine-lateral-raise', mlat(8), mlat(82),
  { yaw: -80, center: [-0.4, 0, 9.6], floorX: -0.6, floor: [6.5, 5.6], scale: 5.2 },
  (p, v) => { const pel = pelvisOf(p); return [...seatBase(p, { x0: -4.6, x1: 3.0, back: false }), ...cushion([pel[0] + 1.8, 0, pel[2] + 3.6], [0, 0, 1], [0, 1, 0], [1.8, 1.3]), tube([pel[0] + 2.4, 0, pel[2] + 3.6], [pel[0] + 2.4, 0, 0.3], 0.28), tube([-2.0, 0, 0.3], [-2.0, 0, 11.6], 0.34), ...(v === 'pin' ? pinStack(-4.2, 0, 14, 1).shapes : [])]; },
  (v) => ({ prefer: [-1.2, 1.7, 11.0], axis: 'x', at: (p) => p.L.el,
    base: (P) => [tube([-2.0, 0, P[2]], P, 0.26)],
    build: (P, T, s) => {
      const parts: LeverParts = { tubes: [[P, add(T, [-0.3, 0, 0.2])]], pads: [[add(T, [0.1, 0, 0.6]), norm(sub(T, P)), [1, 0, 0], [1.0, 0.6]]] };
      if (v === 'plate') parts.horns = [[lerp(P, T, 0.3), [-1, 0, 0], 1]];
      else parts.cables = [[[-4.2, 0, 13.4], P]];
      void s; return parts;
    } }));

// 14. 머신 컬 / 15. 머신 트라이셉스: 팔꿈치 축
const prBody = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 6.0], lean: 14, head: 10, arm, leg: SIT });
function preacherStat(p: P, v: Var): Shape[] {
  const pel = pelvisOf(p);
  const sm = p.shMid;
  const out: Shape[] = [...seatBase(p, { x0: -1.8, x1: 7.4, back: false, seatLen: 2.6 }),
    ...cushion([sm[0] + 1.8, 0, sm[2] - 2.6], [0.7, 0, -0.7], [0, 1, 0], [1.6, 3.0]), tube([sm[0] + 2.6, 0, sm[2] - 3.6], [sm[0] + 2.6, 0, 0.3], 0.32)];
  if (v === 'pin') out.push(...pinStack(pel[0] + 6.6, 0, 13, -1).shapes);
  return out;
}
const elbowLever = (anchor: V) => (v: Var): LeverDef => ({
  prefer: [2.0, 3.6, 9.0], at: (p) => p.hands.L,
  base: () => [],
  build: (P, T, s) => {
    const end: V = [T[0], P[1], T[2]];
    const parts: LeverParts = { tubes: [[P, end], [end, add(T, [0, 0.65 * s, 0])]], handles: [[T, [0, 1, 0]]] };
    if (v === 'plate') parts.horns = [[add(P, mul(norm(sub(P, end)), 1.0)), [0, s, 0], 1], ], parts.tubes!.push([P, add(P, mul(norm(sub(P, end)), 1.2))]);
    else { const back = add(P, mul(norm(sub(P, end)), 1.2)); parts.tubes!.push([P, back]); parts.cables = [[anchor, back]]; }
    return parts;
  },
});
// 회전축을 팔꿈치(왼쪽)에 고정
const atElbow = (lv: (v: Var) => LeverDef, body: BodySpec) => (v: Var): LeverDef => { const d = lv(v); const el = poseEl(body); return { ...d, prefer: [el[0], 3.6, el[2]] }; };
import { pose } from './kit.ts';
const poseEl = (b: BodySpec): V => pose(b).L.el;
const PR_A = prBody({ hand: [4.4, 2.3, -3.8], pole: [-0.2, 0.2, 1], rel: 'torso' });
const PR_B = prBody({ hand: [2.0, 2.3, -0.6], pole: [0.5, 0.2, -1], rel: 'torso' });
export const [MCURL, MCURL_PLATE] = pair('machine-curl', PR_A, PR_B, { yaw: -30, center: [1.4, 0, 8], floorX: 2.2, floor: [6.8, 5] }, preacherStat, atElbow(elbowLever([6.6, 0, 12.4]), PR_A));
const mteBody = (arm: LimbSpec): BodySpec => ({ pelvis: [0, 0, 5.7], lean: 4, head: 5, arm, leg: SIT });
const MTE_A = mteBody({ hand: [2.6, 2.4, 13.3], pole: [1, 0.3, -1] });
const MTE_B = mteBody({ hand: [5.6, 2.4, 9.6], pole: [1, 0.3, -1] });
function mteStat(p: P, v: Var): Shape[] {
  const el = p.L.el;
  const out: Shape[] = [...seatBase(p, { x0: -4.6, x1: 7.0, backUp: 0.6 }), ...cushion([el[0] + 0.5, 0, el[2] - 0.8], [1, 0, 0], [0, 1, 0], [1.0, 3.2]), tube([el[0] + 0.5, 0, el[2] - 1.3], [el[0] + 0.5, 0, 0.3], 0.32)];
  if (v === 'pin') out.push(...pinStack(-3.8, 0, 14, 1).shapes);
  return out;
}
export const [MTRI, MTRI_PLATE] = pair('machine-triceps-extension', MTE_A, MTE_B, { yaw: -40, center: [1.2, 0, 9], floorX: 1, floor: [6.8, 5] }, mteStat, atElbow(elbowLever([-3.8, 0, 13.4]), MTE_A));

// 16. 핵 스쿼트 (썰매가 레일 위로)
const FEET: V = [3.6, 1.6, 2.2];
const hack = (z: number, lean: number): BodySpec => ({ pelvis: [0, 0, z], lean, head: 10, arm: { hand: [-0.3, 2.6, 0.3], pole: [0, 1, -1], rel: 'torso' }, leg: { ankle: FEET, pole: [1, 0.3, 0.2], ft: 60 } });
const HACK_A = hack(9.0, -22), HACK_B = hack(5.4, -32);
function hackGear(p: P, v: Var): Shape[] {
  const railDir = norm([-0.55, 0, 1]);
  const out: Shape[] = [...baseFrame(-8.0, 5.8, 3.2), ...[-1, 1].map((s) => tube([2.2, 2.6 * s, 0.4], add([2.2, 2.6 * s, 0.4], mul(railDir, 17)), 0.28))];
  out.push(...backPad(p, 1.4, 0.6), ...[-1, 1].map((s) => capsuleTube(add(p.shMid, [0.2, 1.6 * s, 1.0]), add(p.shMid, [1.2, 1.6 * s, 1.0]))));
  const sled = add(add(pelvisOf(p), mul(p.front, -1.95)), mul(p.spine, 2.5));
  out.push(...[-1, 1].map((s) => tube([sled[0], 2.6 * s, sled[2] - 3], [sled[0] - 0.2, 2.6 * s, sled[2] + 3.5], 0.24)), tube([sled[0], -2.6, sled[2]], [sled[0], 2.6, sled[2]], 0.24));
  out.push(...cushion([FEET[0] + 0.6, 0, 1.25], [1, 0, 0.35], [0, 1, 0], [1.8, 2.8], 0.18));
  if (v === 'plate') out.push(...[-1, 1].flatMap((s) => horn([sled[0], 2.6 * s, sled[2] - 1.5], [0, s, 0], 2)));
  else out.push(...weightStack(-9.0, 0, 15, 1), rope([-9.0, 0, 14.4], [sled[0], 0, sled[2] + 3.5]));
  return out;
}
const capsuleTube = (a: V, b: V): Shape => cylA(lerp(a, b, 0.5), sub(b, a), 0.42, 0.5, 'pad');
export const [HACK, HACK_PLATE] = pairStatic('machine-hack-squat', HACK_A, HACK_B, { yaw: -30, center: [-1.5, 0, 8.4], floorX: -1.5, floor: [7.5, 4.8] }, hackGear);

// 17. 펜듈럼 스쿼트: 뒤 위 축에서 내려온 레버가 어깨를 누름
const PEND_A = hack(9.0, -12), PEND_B = hack(5.2, -20);
export const [PENDULUM, PENDULUM_PLATE] = pair('machine-pendulum-squat', PEND_A, PEND_B, { yaw: -30, center: [-1.5, 0, 8.4], floorX: -1.5, floor: [7.5, 4.8] },
  (p, v) => [...baseFrame(-7.0, 5.8, 3.2), ...cushion([FEET[0] + 0.6, 0, 1.25], [1, 0, 0.35], [0, 1, 0], [1.8, 2.8], 0.18), ...[-1, 1].map((s) => tube([-6.0, 2.8 * s, 0.3], [-6.0, 2.8 * s, 18.2], 0.32)), tube([-6.0, -2.8, 18.2], [-6.0, 2.8, 18.2], 0.32), ...(v === 'pin' ? weightStack(-8.0, 0, 15, 1) : [])],
  (v) => ({ prefer: [-5.6, 0, 17.4], single: true, at: (p) => add(p.shMid, mul(p.front, -1.6)),
    build: (P, T) => {
      const parts: LeverParts = { tubes: [[P, T], [[T[0], -1.8, T[2] + 1.0], [T[0], 1.8, T[2] + 1.0]]],
        pads: [[add(T, [0.6, 0, -2.0]), norm(sub(P, T)), [0, 1, 0], [2.6, 1.3]]],
        rolls: [[[T[0] + 1.2, 1.6, T[2] + 1.6], [1, 0, 0], 0.55], [[T[0] + 1.2, -1.6, T[2] + 1.6], [1, 0, 0], 0.55]] };
      if (v === 'plate') parts.horns = [[lerp(P, T, 0.35), [0, 1, 0], 2], [lerp(P, T, 0.35), [0, -1, 0], 2]];
      else parts.cables = [[[-8.0, 0, 14.4], lerp(P, T, 0.2)]];
      return parts;
    } }));

// 18. 레그 프레스: 플레이트 = 45도 썰매, 핀 = 같은 자세로 발판 레버
const lp = (ankle: V): BodySpec => ({ pelvis: [0, 0, 3.2], lean: -62, head: 35, arm: { hand: [0.8, 2.6, 2.8], pole: [-1, 0.5, 0] }, leg: { ankle, pole: [0, 0.4, 1], ft: 150 } });
function lpGear(p: P, v: Var): Shape[] {
  const a = p.L.an;
  const plate: V = [a[0] + 0.5, 0, a[2] + 0.4];
  const out: Shape[] = [...baseFrame(-4.2, 12.4, 3.4), ...backPad(p, 1.4, 0.4), ...seatPad(p, 1.8), tube([-1.0, 0, 2.0], [-1.0, 0, 0.3], 0.4),
    ...cushion(plate, [-0.7, 0, 0.7], [0, 1, 0], [1.7, 2.8], 0.22)];
  if (v === 'plate') {
    out.push(...[-1, 1].map((s) => tube([3.4, 3.0 * s, 0.6], [11.6, 3.0 * s, 8.8], 0.3)));
    out.push(...[-1, 1].flatMap((s) => [tube(add(plate, [0.6, 2.2 * s, -0.6]), add(plate, [0.6, 3.0 * s, -0.6]), 0.24), ...horn(add(plate, [1.2, 3.0 * s, -0.4]), [0, s, 0], 2)]));
  } else {
    out.push(tube([plate[0] + 0.4, 0, plate[2] - 0.4], [plate[0] + 3.0, 0, 1.0], 0.3), ...weightStack(10.8, 0, 13, -1), rope([10.8, 0, 12.4], add(plate, [0.6, 0, 0])));
  }
  return out;
}
export const [LEG_PRESS, LEG_PRESS_PLATE] = pairStatic('machine-leg-press', lp([7.4, 1.5, 7.8]), lp([4.6, 1.5, 5.4]), { yaw: -30, center: [3, 0, 5.4], floorX: 3.6, floor: [9, 4.8] }, lpGear);

// 19~22. 레그 익스텐션·싱글·라잉 컬·시티드 컬: 무릎 축 레버
const ext = (L: LegSpec, R: LegSpec): BodySpec => ({ pelvis: [0.2, 0, 5.7], lean: -12, arm: { hand: [0.6, 2.4, 5.4], pole: [-1, 0.4, 0] }, leg: { L, R } });
const BENT: LegSpec = { th: [86, 4], sh: [-6, 3], ft: 60 };
const STRAIGHT: LegSpec = { th: [86, 4], sh: [78, 3], ft: 140 };
function legStat(p: P, v: Var, back = true): Shape[] {
  const out: Shape[] = [...seatBase(p, { x0: -5.2, x1: 5.8, back, seatLen: 3.6 }), tube([-1.2, 2.8, 0.3], [-1.2, 2.8, 6.0], 0.3), capsuleTube2([0.6, 2.3, 5.2], [0.6, 2.9, 5.2])];
  if (v === 'pin') out.push(...weightStack(-3.6, 2.8, 11, 1));
  return out;
}
const capsuleTube2 = (a: V, b: V): Shape => cylA(lerp(a, b, 0.5), sub(b, a), 0.2, 0.3, 'shoe');
const kneeLever = (rollerAt: (T: V) => V, anchor: V) => (v: Var, side: 'L' | 'R' = 'L'): LeverDef => ({
  prefer: [0, 2.7, 0], single: side === 'R', side: side === 'R' ? -1 : 1, at: (p) => (side === 'R' ? mir(p.R.an, -1) : p.L.an),
  build: (P, T, s) => {
    const r = rollerAt(T);
    const parts: LeverParts = { tubes: [[P, [r[0], P[1], r[2]]], [[r[0], P[1], r[2]], [r[0], 0.4 * s, r[2]]]], rolls: [[[r[0], 1.0 * s, r[2]], [0, 1, 0], 0.9]] };
    const back = add(P, mul(norm(sub(P, [r[0], P[1], r[2]])), 1.3));
    parts.tubes!.push([P, back]);
    if (v === 'plate') parts.horns = [[back, [0, s, 0], 1]];
    else parts.cables = [[mir(anchor, s), back]];
    return parts;
  },
});
// 무릎 축: 왼쪽 무릎 옆에 고정
const atKnee = (lv: LeverDef, body: BodySpec, side: 'L' | 'R' = 'L'): LeverDef => { const k = side === 'R' ? mir(pose(body).R.kn, -1) : pose(body).L.kn; return { ...lv, prefer: [k[0], 2.7, k[2]] }; };
const EXT_A = ext(BENT, BENT), EXT_B = ext(STRAIGHT, STRAIGHT);
const EXT_CAM: Cam = { yaw: -32, center: [1.2, 0, 6.6], floorX: 0.6, floor: [7, 4.8] };
const extLever = kneeLever((T) => add(T, [0.55, 0, -0.1]), [-3.6, 2.8, 10.4]);
export const [LEG_EXT, LEG_EXT_PLATE] = pair('machine-leg-extension', EXT_A, EXT_B, EXT_CAM, legStat, (v) => atKnee(extLever(v), EXT_A));
const SEXT_A = ext(BENT, BENT), SEXT_B = ext(BENT, STRAIGHT);
export const [SLEG_EXT, SLEG_EXT_PLATE] = pair('machine-single-leg-extension', SEXT_A, SEXT_B, { ...EXT_CAM, yaw: -60 },
  (p, v) => [...legStat(p, v), ...roll([p.L.an[0] + 0.55, 1.0, p.L.an[2] - 0.1], 0.9)],
  (v) => atKnee(extLever(v, 'R'), SEXT_A, 'R'));
const lyingCurl = (sh: number, ft: number): BodySpec => ({ pelvis: [0, 0, 5.4], lean: 92, head: 40, arm: { hand: [6.4, 2.2, 4.6], pole: [0, 1, 0.3] }, leg: { th: [-92, 4], sh: [sh, 3], ft } });
const LC_A = lyingCurl(-92, -60), LC_B = lyingCurl(170, 40);
export const [LYING_CURL, LYING_CURL_PLATE] = pair('machine-lying-leg-curl', LC_A, LC_B, { yaw: -25, center: [0, 0, 5.6], floor: [8.5, 4.8] },
  (p, v) => [...baseFrame(-6.0, 7.6, 2.4), ...cushion([2.4, 0, 4.0], [1, 0, 0], [0, 1, 0], [4.8, 1.45], 0.4), ...cushion([6.6, 0, 3.4], [1, 0, -0.2], [0, 1, 0], [1.0, 1.45], 0.35), ...[5.6, -1.6].map((x) => tube([x, 0, 3.4], [x, 0, 0.3], 0.3)), ...[-1, 1].map((s) => capsuleTube2([6.4, 2.2 * s, 4.4], [6.4, 2.8 * s, 4.4])), ...(v === 'pin' ? weightStack(-6.8, 2.2, 10, 1) : [])],
  (v) => atKnee(kneeLever((T) => add(T, [-0.45, 0, 0.55]), [-6.8, 2.2, 9.4])(v), LC_A));
const sc = (sh: number, ft: number): BodySpec => ({ pelvis: [0.2, 0, 5.7], lean: -14, arm: { hand: [0.6, 2.4, 5.4], pole: [-1, 0.4, 0] }, leg: { th: [84, 4], sh: [sh, 3], ft } });
const SC_A = sc(80, 140), SC_B = sc(-22, 50);
export const [SEATED_CURL, SEATED_CURL_PLATE] = pair('machine-seated-leg-curl', SC_A, SC_B, EXT_CAM,
  (p, v) => [...legStat(p, v), ...roll([p.L.kn[0] - 0.4, 0, p.L.kn[2] + 0.9], 1.9)],
  (v) => atKnee(kneeLever((T) => add(T, [0.1, 0, -0.6]), [-3.6, 2.8, 10.4])(v), SC_A));

// 23. 머신 힙 쓰러스트: 엉덩이 위 벨트 패드 레버(앞 아래 축)
const ht = (up: boolean): BodySpec => { const lean = up ? -88 : -58, pelZ = up ? 5.6 : 2.8, px = up ? 1.6 : 0.8; return { pelvis: [px, 0, pelZ], lean, head: up ? 40 : 30, arm: { hand: [px + 0.2, 2.9, pelZ + 0.7], pole: [-0.3, 1, 0.6] }, leg: { ankle: [5.2, 1.8, 1.0], pole: [1, 0.2, 1] } }; };
export const [HIP_THRUST, HIP_THRUST_PLATE] = pair('machine-hip-thrust', ht(false), ht(true), { yaw: -30, center: [0.4, 0, 5], floor: [8, 4.8], floorX: 0.4 },
  (p, v) => [...baseFrame(-6.0, 7.6, 3.2), ...cushion([-4.6, 0, 4.3], [0, 0, 1], [0, 1, 0], [0.4, 3.2], 1.0), tube([-4.6, 0, 3.4], [-4.6, 0, 0.3], 0.5), ...(v === 'pin' ? weightStack(8.4, 0, 9, -1) : [])],
  (v) => ({ prefer: [6.6, 3.2, 1.6], at: (p) => add(pelvisOf(p), [0, 2.6, 1.15]),
    base: (P) => [tube([P[0], P[1], 0.3], P, 0.34)],
    build: (P, T, s) => {
      const parts: LeverParts = { tubes: [[P, [T[0], P[1], T[2]]]], rolls: [[[T[0], 1.4 * s, T[2]], [0, 1, 0], 1.3]] };
      if (v === 'plate') parts.horns = [[lerp(P, [T[0], P[1], T[2]], 0.4), [0, s, 0], 2]];
      else parts.cables = [[[8.4, 0, 8.4], lerp(P, [T[0], P[1], T[2]], 0.3)]];
      return parts;
    } }));

// 24~25. 힙 어브덕션 / 어덕션: 무릎 패드 레버(골반 아래 세로축)
const hipBody = (abd: number): BodySpec => ({ pelvis: [0, 0, 5.7], lean: -14, head: 5, arm: { hand: [0.4, 2.6, 5.4], pole: [-1, 0.5, 0] }, leg: { th: [84, abd], sh: [-4, abd * 0.8], ft: 70 } });
const hipLever = (outside: boolean) => (v: Var): LeverDef => ({
  prefer: [0.4, 0.9, 2.6], axis: 'z', at: (p) => p.L.kn,
  base: (P) => [tube([P[0], P[1], 0.3], P, 0.3)],
  build: (P, T, s) => {
    const k: V = [T[0], T[1], P[2] + 1.0];
    const off = outside ? 0.75 : -0.75;
    const padC: V = [T[0] - 0.3, T[1] + off * s, T[2]];
    const parts: LeverParts = { tubes: [[P, [P[0], P[1], P[2] + 1.0], k, [padC[0], padC[1], P[2] + 1.0], [padC[0], padC[1], padC[2] - 0.8]]], pads: [[padC, [1, 0, 0], [0, 0, 1], [1.2, 0.8]]] };
    if (v === 'plate') parts.horns = [[[P[0] - 1.2, P[1], P[2] + 1.0], [0, s, 0], 1]], parts.tubes!.push([[P[0], P[1], P[2] + 1.0], [P[0] - 1.2, P[1], P[2] + 1.0]]);
    else parts.cables = [[[-4.4, 0, 8.4], [P[0], P[1], P[2] + 1.0]]];
    return parts;
  },
});
const HIP_CAM: Cam = { yaw: -82, center: [0.2, 0, 6.4], floorX: -0.4, floor: [6.5, 5] };
const hipStat = (p: P, v: Var) => [...seatBase(p, { x0: -4.8, x1: 4.6, seatLen: 3.2 }), ...(v === 'pin' ? weightStack(-4.4, 0, 9, 1) : [])];
export const [ABDUCT, ABDUCT_PLATE] = pair('machine-hip-abduction', hipBody(6), hipBody(36), HIP_CAM, hipStat, hipLever(true));
export const [ADDUCT, ADDUCT_PLATE] = pair('machine-hip-adduction', hipBody(36), hipBody(6), HIP_CAM, hipStat, hipLever(false));

// 26. 머신 카프 레이즈(서서): 어깨 패드 레버(뒤 축)
const STEP = 1.0;
const calf = (up: boolean): BodySpec => { const b = stand({ pelvis: [0, 0, 10], arm: { hand: [0.3, 2.3, 15.4], pole: [-1, 1, -0.4] }, leg: { th: [0, 5], sh: [0, 4], ft: up ? 18 : 95 } }); return { ...b, pelvis: add(b.pelvis, [0, 0, STEP]), arm: { hand: [0.3, 2.3, b.pelvis[2] + STEP + 5.9], pole: [-1, 1, -0.6] } }; };
export const [CALF, CALF_PLATE] = pair('machine-calf-raise', calf(false), calf(true), { yaw: -35, center: [-0.8, 0, 9.4], floorX: -1.4, floor: [7, 4.8] },
  (_p, v) => [...baseFrame(-7.4, 2.6, 2.8), ...cushion([0.9, 0, STEP / 2 + 0.05], [1, 0, 0], [0, 1, 0], [1.0, 2.6], STEP / 2), ...[-1, 1].map((s) => tube([-5.6, 2.6 * s, 0.3], [-5.6, 2.6 * s, 17.4], 0.32)), tube([-5.6, -2.6, 17.4], [-5.6, 2.6, 17.4], 0.32), ...(v === 'pin' ? weightStack(-7.0, 0, 14, 1) : [])],
  (v) => ({ prefer: [-5.2, 1.6, 15.0], at: (p) => add(p.shMid, [-0.2, 1.6, 0.75]),
    base: (P, s) => [tube([-5.6, 2.6 * s, P[2]], P, 0.26)],
    build: (P, T, s) => {
      const parts: LeverParts = { tubes: [[P, [T[0] - 1.2, P[1], T[2] + 0.2], [T[0] - 0.4, T[1], T[2] + 0.2]]], rolls: [[add(T, [0.4, 0, 0]), [1, 0, 0], 0.9]] };
      if (v === 'plate') parts.horns = [[lerp(P, [T[0] - 1.2, P[1], T[2]], 0.4), [0, s, 0], 2]];
      else parts.cables = [[[-7.0, 0, 13.4], P]];
      return parts;
    } }));

// 27. 시티드 카프 레이즈: 무릎 위 패드 레버(뒤 아래 축)
const scalf = (up: boolean): BodySpec => ({ pelvis: [0, 0, 5.7], lean: 6, head: 0, arm: { hand: [3.0, 2.0, 7.6 + (up ? 0.9 : 0)], pole: [-1, 0.5, 0] }, leg: { th: [86, 6], sh: [-2, 5], ft: up ? 18 : 95 } });
const scalfBody = (up: boolean): BodySpec => { const b = scalf(up); return up ? { ...b, pelvis: [0, 0, 5.7 + 0.0] } : b; };
export const [SCALF, SCALF_PLATE] = pair('machine-seated-calf-raise', scalfBody(false), scalfBody(true), { yaw: -35, center: [1.2, 0, 6.2], floorX: 1, floor: [7, 4.8] },
  (p, v) => [...seatBase(p, { x0: -2.6, x1: 6.6, back: false }), ...cushion([p.L.kn[0] - 0.2, 0, STEP / 2 + 0.05], [1, 0, 0], [0, 1, 0], [1.0, 2.6], STEP / 2), ...(v === 'pin' ? weightStack(-2.4, 0, 9, 1) : [])],
  (v) => ({ prefer: [-1.6, 2.8, 2.2], at: (p) => add(p.L.kn, [-0.9, -0.9, 0.85]),
    base: (P) => [tube([P[0], P[1], 0.3], P, 0.3)],
    build: (P, T, s) => {
      const parts: LeverParts = { tubes: [[P, [T[0], P[1], T[2]]]], pads: [[[T[0], 0.0, T[2] + 0.2], [1, 0, 0], [0, 1, 0], [1.1, 1.4]]] };
      if (v === 'plate') parts.horns = [[lerp(P, [T[0], P[1], T[2]], 0.3), [0, s, 0], 2]];
      else parts.cables = [[[-2.4, 0, 8.4], P]];
      return parts;
    } }));

// 28. 머신 크런치: 골반 옆 축, 몸통과 같이 도는 손잡이
const mc = (lean: number): BodySpec => ({ pelvis: [0, 0, 5.7], lean, head: lean > 10 ? -10 : 5, arm: { hand: [0.5, 2.4, 0.6], pole: [1, 1, -0.6], rel: 'torso' }, leg: SIT });
export const [MCRUNCH, MCRUNCH_PLATE] = pair('machine-crunch', mc(-8), mc(36), { yaw: -55, center: [-0.2, 0, 8.6], floorX: -0.6, floor: [6.5, 5] },
  (p, v) => [...seatBase(p, { x0: -5.0, x1: 3.6, backUp: 1.0 }), ...(v === 'pin' ? weightStack(-4.4, 0, 14, 1) : [])],
  (v) => ({ prefer: [0, 3.2, 5.7], base: (P) => [tube([P[0], P[1], 0.3], P, 0.3)],
    build: (P, T, s) => armLever(P, T, s, v, { bend: [-1.0, 0, 0.6], g: [0, 0, 1], hornAt: 0.25, anchor: [-4.4, 0, 13.4] }) }));

export const MACHINE_ARTS: ExArt[] = [
  CHEST_PRESS, CHEST_PRESS_PLATE, INCLINE_PRESS, INCLINE_PRESS_PLATE, DECLINE_PRESS, DECLINE_PRESS_PLATE, PEC_DECK, PEC_DECK_PLATE, MDIPS, MDIPS_PLATE,
  TBAR, TBAR_PLATE, SEATED_ROW, SEATED_ROW_PLATE, HIGH_ROW, HIGH_ROW_PLATE, LAT_MACHINE, LAT_MACHINE_PLATE, REV_LAT, REV_LAT_PLATE,
  MSP, MSP_PLATE, MLAT, MLAT_PLATE, REAR_DELT, REAR_DELT_PLATE, MCURL, MCURL_PLATE, MTRI, MTRI_PLATE,
  HACK, HACK_PLATE, PENDULUM, PENDULUM_PLATE, LEG_PRESS, LEG_PRESS_PLATE, LEG_EXT, LEG_EXT_PLATE, SLEG_EXT, SLEG_EXT_PLATE,
  LYING_CURL, LYING_CURL_PLATE, SEATED_CURL, SEATED_CURL_PLATE, HIP_THRUST, HIP_THRUST_PLATE, ABDUCT, ABDUCT_PLATE, ADDUCT, ADDUCT_PLATE,
  CALF, CALF_PLATE, SCALF, SCALF_PLATE, MCRUNCH, MCRUNCH_PLATE,
];
export const ARTS = MACHINE_ARTS;
