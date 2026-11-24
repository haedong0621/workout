// 운동 그림 공용 도구: 자세 계산(관절 각도 → 관절 위치), 장면 회전, 장비 부품.
// 좌표: 사람 기준(앞 = +x, 왼쪽 = +y, 위 = +z, 바닥 z = 0)으로 만들고 place()로 돌려서 카메라에 맞춘다.
import type { Grid } from '../pixelArt.ts';
import { add, capsule, cross, cyl, dot, len, lerp, mul, norm, rbox, renderIso, sphere, sub, type MatFn, type Marker, type Shape, type V } from './iso.ts';
import { floor, human, type HumanOptions, type Pose } from './rig.ts';
import type { MatName } from './palette.ts';

export const SIZE = 128;
const rad = (d: number) => (d * Math.PI) / 180;

/** 몸 치수 (벤치 프레스 사람과 같음) */
export const BODY = { shW: 1.65, hipW: 0.8, torso: 5.4, ua: 2.5, fa: 2.3, th: 3.9, shin: 4.6, foot: 1.43 } as const;

/** 방향: flex = 아래(0)에서 앞(90)·위(180)로, abd = 옆으로 벌림, side = 왼쪽 1 / 오른쪽 -1 */
export function dir(flex: number, abd = 0, side: 1 | -1 = 1): V {
  const f = rad(flex), a = rad(abd);
  return [Math.sin(f) * Math.cos(a), side * Math.sin(a), -Math.cos(f) * Math.cos(a)];
}

type Ang = [number, number] | number;
const ang = (a: Ang): [number, number] => (typeof a === 'number' ? [a, 0] : a);
/** 팔: 각도로 주거나, 손 위치(왼쪽 기준, 오른쪽은 거울)로 주면 팔꿈치를 계산 */
export type LimbSpec =
  | { /** 위팔 [앞, 옆] */ ua: Ang; /** 아래팔 [앞, 옆] */ fa: Ang }
  | { /** 손 위치 */ hand: V; /** 팔꿈치가 향할 방향 */ pole?: V; /** torso: 손 위치를 [몸 앞, 왼쪽, 몸통 위] 기준(어깨 가운데에서)으로 */ rel?: 'torso' };
/** 다리: 각도로 주거나, 발목 위치로 주면 무릎을 계산 */
export type LegSpec =
  | { /** 허벅지 [앞, 옆] */ th: Ang; /** 종아리 [앞, 옆] (무릎 굽히면 음수 = 뒤로) */ sh: Ang; /** 발 방향(아래에서 앞으로, 서 있으면 65) */ ft?: number }
  | { ankle: V; pole?: V; ft?: number };
export interface BodySpec {
  /** 골반 가운데 */ pelvis: V;
  /** 몸통 기울기: 0 = 서 있음, 앞으로 숙이면 +, 뒤로 누우면 −(−90 = 바로 누움) */ lean?: number;
  /** 고개: 얼굴을 몸통 위쪽으로 드는 각도 */ head?: number;
  arm: LimbSpec | { L: LimbSpec; R: LimbSpec };
  leg: LegSpec | { L: LegSpec; R: LegSpec };
  /** 어깨 들썩(슈러그) */ shrug?: number;
}

/** 두 마디 IK: 시작 a, 목표 t, 길이 la·lb, 굽는 방향 pole → 가운데 관절 */
export function ik(a: V, t: V, la: number, lb: number, pole: V): V {
  const d0 = sub(t, a);
  const d = Math.min(len(d0), (la + lb) * 0.999);
  const u = norm(d0);
  const cosA = Math.max(-1, Math.min(1, (la * la + d * d - lb * lb) / (2 * la * d)));
  const pp = sub(pole, mul(u, dot(pole, u)));
  const pn = len(pp) > 1e-6 ? norm(pp) : norm(cross(u, [0, 1, 0]));
  return add(add(a, mul(u, la * cosA)), mul(pn, la * Math.sqrt(1 - cosA * cosA)));
}
const mirror = (v: V, s: 1 | -1): V => [v[0], v[1] * s, v[2]];

/** 관절 각도·목표 → Pose (사람 기준 좌표) */
export function pose(b: BodySpec): Pose & { hands: { L: V; R: V }; shMid: V; spine: V; front: V } {
  const lean = rad(b.lean ?? 0);
  const spine: V = [Math.sin(lean), 0, Math.cos(lean)];
  const front: V = [Math.cos(lean), 0, -Math.sin(lean)];
  const shMid = add(add(b.pelvis, mul(spine, BODY.torso)), [0, 0, b.shrug ?? 0]);
  const h = rad(b.head ?? 0);
  const face = norm(add(mul(front, Math.cos(h)), mul(spine, Math.sin(h))));
  const neck = add(shMid, mul(spine, 1.0));
  const head = add(add(shMid, mul(spine, 2.05)), mul(face, 0.05));
  const side = (s: 1 | -1) => {
    const arm = 'L' in b.arm ? (s === 1 ? b.arm.L : b.arm.R) : b.arm;
    const leg = 'L' in b.leg ? (s === 1 ? b.leg.L : b.leg.R) : b.leg;
    const single = !('L' in b.arm);
    const singleLeg = !('L' in b.leg);
    const sh = add(shMid, [0, BODY.shW * s, 0]);
    let el: V, ha: V;
    if ('hand' in arm) {
      const m = single ? s : 1;
      const tgt = arm.rel === 'torso' ? add(shMid, add(add(mul(front, arm.hand[0]), [0, arm.hand[1] * m, 0]), mul(spine, arm.hand[2]))) : mirror(arm.hand, m as 1 | -1);
      ha = tgt;
      el = ik(sh, tgt, BODY.ua, BODY.fa, mirror(arm.pole ?? [-0.3, 1, -0.4], m as 1 | -1));
      ha = add(el, mul(norm(sub(tgt, el)), BODY.fa));
    } else {
      const [uf, ua] = ang(arm.ua), [ff, fa] = ang(arm.fa);
      el = add(sh, mul(dir(uf, ua, s), BODY.ua));
      ha = add(el, mul(dir(ff, fa, s), BODY.fa));
    }
    const hip = add(b.pelvis, [0, BODY.hipW * s, 0]);
    let kn: V, an: V, ftDir: V;
    if ('ankle' in leg) {
      const m = (singleLeg ? s : 1) as 1 | -1;
      const tgt = mirror(leg.ankle, m);
      kn = ik(hip, tgt, BODY.th, BODY.shin, mirror(leg.pole ?? [1, 0.15, 0], m));
      an = add(kn, mul(norm(sub(tgt, kn)), BODY.shin));
      ftDir = dir(leg.ft ?? 65, 0, s);
    } else {
      const [tf, ta] = ang(leg.th), [sf, sa] = ang(leg.sh);
      kn = add(hip, mul(dir(tf, ta, s), BODY.th));
      an = add(kn, mul(dir(sf, sa, s), BODY.shin));
      ftDir = dir(leg.ft ?? 65, sa * 0.3, s);
    }
    const toe = add(an, mul(ftDir, BODY.foot));
    return { sh, el, ha, hip, kn, an, toe };
  };
  const L = side(1), R = side(-1);
  return { head, neck, face, chest: front, L, R, hands: { L: L.ha, R: R.ha }, shMid, spine, front };
}

/** 발이 바닥(z = 0)에 닿게 골반 높이를 맞춤 */
export function grounded(b: BodySpec): BodySpec {
  const p = pose(b);
  const low = Math.min(p.L.an[2], p.R.an[2], p.L.toe[2] + 0.6, p.R.toe[2] + 0.6);
  return { ...b, pelvis: add(b.pelvis, [0, 0, 1.0 - low]) };
}

// ── 장면 회전: 사람 기준 좌표를 z축으로 yaw만큼 돌리고 옮김
const rotZ = (p: V, a: number): V => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
export function place(shapes: Shape[], marks: Marker[], yawDeg: number, at: V = [0, 0, 0]) {
  const a = rad(yawDeg);
  const inv = (p: V) => rotZ(sub(p, at), -a);
  return {
    shapes: shapes.map((s): Shape => ({ id: s.id, sdf: (p) => s.sdf(inv(p)), mat: typeof s.mat === 'function' ? ((m) => (p: V) => m(inv(p)))(s.mat) : s.mat })),
    marks: marks.map((m) => ({ ...m, at: add(rotZ(m.at, a), at) })),
  };
}

// ── 도형 더하기: 아무 방향 원기둥 · 기울어진 상자
let oid = 900000;
export function cylA(c: V, axis: V, r: number, h: number, mat: MatFn): Shape {
  const ax = norm(axis);
  return { id: oid++, mat, sdf: (p) => { const d = sub(p, c); const t = dot(d, ax); const a = Math.abs(t) - h; const radial = len(sub(d, mul(ax, t))) - r; return Math.min(Math.max(radial, a), 0) + Math.hypot(Math.max(radial, 0), Math.max(a, 0)); } };
}
/** 기울어진 둥근 상자: u·v·w = 상자의 세 축(서로 직각), h = 반 크기 */
export function obox(c: V, u: V, v: V, h: V, r: number, mat: MatFn): Shape {
  const U = norm(u), Vv = norm(v), W = norm(cross(U, Vv));
  return { id: oid++, mat, sdf: (p) => {
    const d = sub(p, c);
    const q = [Math.abs(dot(d, U)) - h[0] + r, Math.abs(dot(d, Vv)) - h[1] + r, Math.abs(dot(d, W)) - h[2] + r];
    return Math.hypot(Math.max(q[0]!, 0), Math.max(q[1]!, 0), Math.max(q[2]!, 0)) + Math.min(Math.max(q[0]!, q[1]!, q[2]!), 0) - r;
  } };
}
/** x축 둘레로 각도 a(도) 기운 상자 축 (등받이 등). a = 0이면 바닥과 나란함 */
export const tiltX = (a: number): [V, V] => [[Math.cos(rad(a)), 0, Math.sin(rad(a))], [0, 1, 0]];

// ── 장비
/** 바벨: 가운데 c, 좌우(y)로 놓임 */
export function barbell(c: V, plates = 2, sleeve = 7.25, pr = 1.75): Shape[] {
  const [x, y, z] = c;
  const out: Shape[] = [cyl([x, y, z], 1, 0.15, 7.9, 'bar')];
  for (const s of [-1, 1]) {
    const gap = 0.45;
    for (let k = 0; k < plates; k++) out.push(cyl([x, y + (6.0 + gap * k) * s, z], 1, pr, 0.18, 'plate'));
    out.push(cyl([x, y + (6.0 + gap * (plates - 1) / 2) * s, z], 1, pr - 0.3, 0.2 + gap * (plates - 1) / 2, 'plate'));
    out.push(cyl([x, y + 6.0 * s, z], 1, 0.55, 0.9, 'steel'));
    out.push(cyl([x, y + sleeve * s, z], 1, 0.3, 0.6, 'bar'), cyl([x, y + 5.55 * s, z], 1, 0.36, 0.12, 'steel'));
  }
  return out;
}
/** 덤벨: 가운데 c, 손잡이 방향 axis */
export function dumbbell(c: V, axis: V = [0, 1, 0], k = 1): Shape[] {
  const ax = norm(axis);
  return [
    cylA(c, ax, 0.17, 0.75 * k, 'bar'),
    ...[-1, 1].flatMap((s) => [
      cylA(add(c, mul(ax, 0.95 * k * s)), ax, 0.62 * k, 0.24 * k, 'plate'),
      cylA(add(c, mul(ax, 0.62 * k * s)), ax, 0.3 * k, 0.09, 'steel'),
    ]),
  ];
}
/** 케이블 줄 + 손잡이 */
export function cable(from: V, to: V): Shape[] { return [capsule(from, to, 0.11, 'plate')]; }
export function dHandle(c: V, axis: V = [0, 1, 0]): Shape[] { return [cylA(c, axis, 0.16, 0.5, 'steel'), sphere(c, 0.26, 'plate')]; }
export function rope(c: V, spread: number, down: V = [0, 0, -1]): Shape[] {
  return [-1, 1].map((s) => capsule(c, add(add(c, [0, spread * s, 0]), mul(down, 1.2)), 0.18, 'shoe'));
}
/** 도르래 */
export function pulley(c: V, axis: V = [1, 0, 0]): Shape[] { return [cylA(c, axis, 0.55, 0.18, 'plate'), cylA(c, axis, 0.2, 0.3, 'steel')]; }
/** 케이블 기둥 (x, y 위치, 높이 h) */
export function cableTower(x: number, y: number, h = 19): Shape[] {
  return [
    rbox([x, y, h / 2], [0.55, 0.55, h / 2], 0.1, 'steel'),
    rbox([x, y, 0.25], [1.6, 1.6, 0.25], 0.08, 'plate'),
    rbox([x - 0.9, y, 3.2], [0.4, 0.9, 2.2], 0.06, (p) => (Math.abs(((p[2] - 1) % 0.55) - 0.27) < 0.04 ? { mat: 'plate', line: true } : 'plate')), // 중량 스택
  ];
}
/** 평평한 벤치 (가운데 x, 길이 반 hx, 패드 윗면 높이 top) */
export function flatBench(cx: number, hx = 5.2, top = 4.7): Shape[] {
  return [
    rbox([cx, 0, top - 0.4], [hx, 1.35, 0.4], 0.22, 'pad'),
    rbox([cx, 0, top - 0.95], [hx - 0.4, 0.5, 0.18], 0.05, 'steel'),
    ...[cx - hx + 0.8, cx + hx - 0.8].flatMap((x) => [rbox([x, 0, (top - 1) / 2], [0.28, 0.28, (top - 1) / 2], 0.08, 'steel'), rbox([x, 0, 0.18], [0.35, 1.5, 0.18], 0.08, 'steel')]),
  ];
}
/** 기울어진 패드 (등받이 등): 아래 끝 a, 위 끝 b, 폭 반 w, 두께 반 t */
export function pad(a: V, b: V, w = 1.35, t = 0.4, mat: MatName = 'pad'): Shape {
  const u = sub(b, a);
  return obox(lerp(a, b, 0.5), u, [0, 1, 0], [len(u) / 2, w, t], 0.22, mat);
}
/** 앉는 의자 (좌판 + 등받이 각도) */
export function seat(x: number, top = 4.6, back = 75, backLen = 6.5): Shape[] {
  const [bu] = tiltX(180 - back);
  const b0: V = [x - 1.6, 0, top + 0.3];
  return [
    rbox([x, 0, top - 0.4], [1.8, 1.4, 0.4], 0.22, 'pad'),
    pad(b0, add(b0, mul(bu, backLen))),
    rbox([x, 0, (top - 0.8) / 2], [0.3, 0.3, (top - 0.8) / 2], 0.08, 'steel'),
    rbox([x, 0, 0.2], [2.2, 1.6, 0.2], 0.08, 'steel'),
  ];
}
/** 철봉·프레임 기둥 */
export function post(a: V, b: V, r = 0.32): Shape { return capsule(a, b, r, 'steel'); }

// ── 한 장 그리기
export interface Scene {
  body: BodySpec;
  /** 사람 기준 좌표의 장비 */ gear?: (p: ReturnType<typeof pose>) => Shape[];
  /** 얼굴이 보는 방향(도): −20 = 화면 오른쪽 옆모습, −110 = 정면 */ yaw?: number;
  /** 카메라가 보는 가운데(사람 기준 좌표) */ center?: V;
  scale?: number;
  /** 바닥 타일 반 크기(사람 기준 x, y) */ floor?: [number, number] | false;
  /** 바닥 타일 가운데 x (기본: 골반) */ floorX?: number;
  opts?: HumanOptions;
}
export function draw(sc: Scene): Grid {
  const p = pose(sc.body);
  const h = human(p, sc.opts);
  const yaw = sc.yaw ?? -40;
  const placed = place([...h.shapes, ...(sc.gear?.(p) ?? [])], h.marks, yaw);
  const fl = sc.floor === false ? [] : (() => { const [fx, fy] = sc.floor ?? [5.5, 4.5]; const c = rotZ([sc.floorX ?? sc.body.pelvis[0], 0, 0], rad(yaw)); return [floor(c[0], c[1], fx, fy)]; })();
  const center = rotZ(sc.center ?? [sc.body.pelvis[0], 0, 8.6], rad(yaw));
  return renderIso([...fl, ...placed.shapes], { size: SIZE, scale: sc.scale ?? 5.6, center, az: -112 }, placed.marks);
}

export interface ExArt { id: string; frames: (() => Grid)[]; size: number }
export const art = (id: string, a: Scene, b: Scene): ExArt => ({ id, frames: [() => draw(a), () => draw(b)], size: SIZE });
