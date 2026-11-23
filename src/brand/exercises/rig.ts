// 사람 인형: 관절 위치(자세)만 주면 몸을 도형으로 만든다. 모든 운동이 같은 사람을 쓴다.
import { blend, capsule, lerp, rbox, sphere, type Mat, type Shape, type V } from './iso.ts';

export const MAT = {
  skin: ['L', 'S', 's'], hair: ['j', 'H', 'h'], shirt: ['U', 'T', 't'], shorts: ['o', 'P', 'p'],
  shoe: ['e', 'F', 'f'], sole: ['Q', 'Q', 'q'], pad: ['V', 'B', 'b'], steel: ['n', 'M', 'm'],
  plate: ['X', 'W', 'w'], bar: ['Y', 'R', 'r'], floor: ['G', 'G', 'g'],
} as const satisfies Record<string, Mat>;

type Side = { sh: V; el: V; ha: V; hip: V; kn: V; an: V; toe: V };
export interface Pose { head: V; neck: V; face: V; L: Side; R: Side }

const ids = { torso: 100, head: 101, pelvis: 102 };
let limbId = 200;

export function human(pose: Pose): { shapes: Shape[]; eyes: V[] } {
  const s: Shape[] = [];
  const { head, neck, face } = pose;
  const pelvisMid = lerp(pose.L.hip, pose.R.hip, 0.5);
  const shMid = lerp(pose.L.sh, pose.R.sh, 0.5);
  // 몸통: 좌우 두 막대를 부드럽게 이어 납작하고 넓게
  const inset = (a: V, m: V) => lerp(a, m, 0.25);
  const tL = capsule(inset(pose.L.hip, pelvisMid), inset(pose.L.sh, shMid), 0.95, MAT.shirt);
  const tR = capsule(inset(pose.R.hip, pelvisMid), inset(pose.R.sh, shMid), 0.95, MAT.shirt);
  const axis = [shMid[0] - pelvisMid[0], shMid[1] - pelvisMid[1], shMid[2] - pelvisMid[2]] as V;
  const al = Math.hypot(...axis);
  s.push(blend(tL, tR, 1.2, (p) => {
    const t = ((p[0] - pelvisMid[0]) * axis[0] + (p[1] - pelvisMid[1]) * axis[1] + (p[2] - pelvisMid[2]) * axis[2]) / (al * al);
    return t < 0.18 ? MAT.shorts : MAT.shirt;
  }, ids.torso));
  s.push(capsule(pose.L.hip, pose.R.hip, 0.95, MAT.shorts, ids.pelvis));
  // 목·머리 (머리카락은 정수리·뒤통수 쪽)
  s.push(capsule(shMid, neck, 0.45, MAT.skin));
  const top = [head[0] - neck[0], head[1] - neck[1], head[2] - neck[2]] as V;
  const tl = Math.hypot(...top);
  s.push(sphere(head, 1.0, (p) => {
    const d = [p[0] - head[0], p[1] - head[1], p[2] - head[2]];
    const up = (d[0]! * top[0] + d[1]! * top[1] + d[2]! * top[2]) / tl;
    const fr = d[0]! * face[0] + d[1]! * face[1] + d[2]! * face[2];
    return up * 0.85 - fr * 0.75 > 0.05 ? MAT.hair : MAT.skin;
  }, ids.head));
  for (const side of [pose.L, pose.R]) {
    const id = limbId++;
    // 팔: 위팔(소매 = 티셔츠 색) → 아래팔 → 손
    s.push(capsule(side.sh, lerp(side.sh, side.el, 0.4), 0.62, MAT.shirt, id));
    s.push(capsule(side.sh, side.el, 0.5, MAT.skin, id));
    s.push(capsule(side.el, side.ha, 0.44, MAT.skin, id));
    s.push(sphere(side.ha, 0.5, MAT.skin, id));
    // 다리: 허벅지(반바지) → 정강이 → 신발
    const lid = limbId++;
    s.push(capsule(side.hip, lerp(side.hip, side.kn, 0.38), 0.8, MAT.shorts, lid));
    s.push(capsule(side.hip, side.kn, 0.68, MAT.skin, lid));
    s.push(capsule(side.kn, side.an, 0.55, MAT.skin, lid));
    const toe = side.toe;
    const c: V = [(side.an[0] + toe[0]) / 2, (side.an[1] + toe[1]) / 2, 0.4];
    const hx = Math.abs(toe[0] - side.an[0]) / 2 + 0.45, hy = Math.abs(toe[1] - side.an[1]) / 2 + 0.45;
    s.push(rbox(c, [hx, hy, 0.4], 0.3, (p) => (p[2] < 0.22 ? MAT.sole : MAT.shoe), lid));
  }
  // 눈: 얼굴 쪽 앞, 위쪽
  const eyes: V[] = [-0.38, 0.38].map((o) => {
    const side = [pose.L.sh[0] - pose.R.sh[0], pose.L.sh[1] - pose.R.sh[1], pose.L.sh[2] - pose.R.sh[2]] as V;
    const sl = Math.hypot(...side);
    return [head[0] + face[0] * 0.98 + (side[0] / sl) * o + top[0] / tl * 0.1, head[1] + face[1] * 0.98 + (side[1] / sl) * o + top[1] / tl * 0.1, head[2] + face[2] * 0.98 + (side[2] / sl) * o + top[2] / tl * 0.1] as V;
  });
  return { shapes: s, eyes };
}

/** 바닥 타일(마름모로 보임) */
export const floor = (cx: number, cy: number, hx: number, hy: number) => rbox([cx, cy, -0.3], [hx, hy, 0.3], 0.05, MAT.floor, 1);
