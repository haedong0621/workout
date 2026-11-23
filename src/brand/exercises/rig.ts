// 사람 인형: 관절 위치(자세)만 주면 몸을 도형으로 만든다. 모든 운동이 같은 사람을 쓴다.
// 옷: 검정 나시 · 회색 반바지 · 검정 운동화(흰 밑창)
import { add, blend, capsule, dot, ellipsoid, len, lerp, mul, newId, norm, rbox, sphere, sub, type Marker, type Shape, type V } from './iso.ts';
import type { MatName } from './palette.ts';

type Side = { sh: V; el: V; ha: V; hip: V; kn: V; an: V; toe: V };
/** face: 얼굴이 보는 방향, chest: 가슴이 향하는 방향(생략하면 face) */
export interface Pose { head: V; neck: V; face: V; chest?: V; L: Side; R: Side }

/** 장비 도형 만들 때도 쓰는 재질 이름 */
export const MAT = { skin: 'skin', hair: 'hair', tank: 'tank', shorts: 'shorts', shoe: 'shoe', sole: 'sole', pad: 'pad', steel: 'steel', plate: 'plate', bar: 'bar', floor: 'floor' } as const satisfies Record<string, MatName>;

const hash = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };

export function human(pose: Pose): { shapes: Shape[]; marks: Marker[] } {
  const s: Shape[] = [];
  const { head, neck, face } = pose;
  const front = norm(pose.chest ?? face);
  const pelvis = lerp(pose.L.hip, pose.R.hip, 0.5);
  const shMid = lerp(pose.L.sh, pose.R.sh, 0.5);
  const across = norm(sub(pose.L.sh, pose.R.sh));             // 오른쪽 → 왼쪽
  const spine = norm(sub(shMid, pelvis));
  const neckBase = add(shMid, mul(spine, 0.25));

  // ── 몸통(나시): 좌우 막대 + 가슴 두 덩이 + 배를 한 덩어리로
  const inset = (a: V, m: V, k: number) => lerp(a, m, k);
  const torsoParts = [
    capsule(inset(pose.L.hip, pelvis, 0.3), inset(pose.L.sh, shMid, 0.3), 0.92, 'tank'),
    capsule(inset(pose.R.hip, pelvis, 0.3), inset(pose.R.sh, shMid, 0.3), 0.92, 'tank'),
    ...[pose.L.sh, pose.R.sh].map((sh) => sphere(add(lerp(inset(sh, shMid, 0.45), pelvis, 0.2), mul(front, 0.38)), 0.78, 'tank')), // 가슴
    sphere(add(lerp(shMid, pelvis, 0.62), mul(front, 0.12)), 0.92, 'tank'),                                                       // 배
  ];
  const torsoId = newId();
  s.push(blend(torsoParts, 0.7, (p) => {
    const t = dot(sub(p, pelvis), spine) / len(sub(shMid, pelvis));
    if (t < 0.1) return 'shorts';
    if (t < 0.16) return { mat: 'shorts', line: true };                 // 허리 밴드 선
    // 나시 목둘레(앞쪽 파임)
    const toNeck = sub(p, neckBase);
    if (len(toNeck) < 0.95 && dot(toNeck, front) > -0.2) return 'skin';
    return 'tank';
  }, torsoId));
  // 골반(반바지)
  s.push(capsule(pose.L.hip, pose.R.hip, 0.9, 'shorts', torsoId));

  // ── 목·승모근·머리
  s.push(capsule(shMid, neck, 0.44, 'skin'));
  for (const sh of [pose.L.sh, pose.R.sh]) s.push(capsule(neckBase, lerp(neckBase, sh, 0.75), 0.38, 'skin', torsoId)); // 승모근(나시 어깨끈 옆)
  const top = norm(sub(head, neck));
  const headId = newId();
  s.push(blend([
    sphere(head, 0.98, 'skin'),
    sphere(add(add(head, mul(top, -0.42)), mul(face, 0.35)), 0.62, 'skin'),   // 턱
  ], 0.5, (p) => {
    const d = sub(p, head);
    const upv = dot(d, top), fr = dot(d, face);
    if (upv * 0.9 - fr * 0.7 > 0.12 && upv > -0.35) return hash(Math.round(p[0] * 9), Math.round(p[1] * 9), Math.round(p[2] * 9)) > 0.82 ? { mat: 'hair', line: true } : 'hair';
    return 'skin';
  }, headId));
  s.push(sphere(add(add(head, mul(face, 0.95)), mul(top, -0.05)), 0.2, 'skin', headId));                 // 코
  for (const o of [1, -1]) s.push(ellipsoid(add(add(head, mul(across, 0.92 * o)), mul(face, -0.05)), [0.22, 0.22, 0.22], 'skin', headId)); // 귀

  // ── 팔·다리
  for (const side of [pose.L, pose.R]) {
    const id = newId();
    s.push(sphere(lerp(side.sh, side.el, 0.08), 0.66, 'skin', id));                                      // 삼각근
    s.push(capsule(side.sh, side.el, 0.5, 'skin', id, 0.42));
    s.push(capsule(lerp(side.sh, side.el, 0.3), lerp(side.sh, side.el, 0.72), 0.56, 'skin', id));         // 이두 볼륨
    s.push(capsule(side.el, lerp(side.el, side.ha, 0.4), 0.46, 'skin', id, 0.44));                        // 팔뚝
    s.push(capsule(lerp(side.el, side.ha, 0.4), side.ha, 0.44, 'skin', id, 0.33));
    s.push(sphere(side.ha, 0.42, 'skin', id));                                                           // 주먹
    const lid = newId();
    const hem = lerp(side.hip, side.kn, 0.48);
    s.push(capsule(side.hip, hem, 0.86, 'shorts', lid, 0.8));                                            // 반바지 다리
    s.push(capsule(lerp(side.hip, side.kn, 0.4), side.kn, 0.7, 'skin', lid, 0.52));                       // 허벅지
    s.push(sphere(side.kn, 0.5, 'skin', lid));                                                           // 무릎
    s.push(capsule(side.kn, lerp(side.kn, side.an, 0.4), 0.52, 'skin', lid, 0.5));                        // 종아리 볼륨
    s.push(capsule(lerp(side.kn, side.an, 0.4), side.an, 0.5, 'skin', lid, 0.32));
    // 운동화: 발목 → 발끝, 위는 검정, 바닥은 흰 밑창
    const heel: V = [side.an[0], side.an[1], 0.42];
    const toe: V = [side.toe[0], side.toe[1], 0.38];
    const dir = norm(sub(toe, heel));
    s.push(blend([
      capsule(add(heel, mul(dir, -0.1)), toe, 0.42, 'shoe', undefined, 0.36),
      sphere([side.an[0], side.an[1], 0.75], 0.42, 'shoe'),
    ], 0.3, (p) => (p[2] < 0.14 ? 'sole' : p[2] < 0.2 ? { mat: 'sole', line: true } : 'shoe'), lid));
  }
  // 얼굴 점: 눈·눈썹 (보일 때만 찍힘)
  const marks: Marker[] = [];
  for (const o of [-0.36, 0.36]) {
    const eye = add(add(add(head, mul(face, 0.93)), mul(across, o)), mul(top, 0.12));
    marks.push({ at: eye, mat: 'hair', tone: 4 });
    marks.push({ at: add(eye, mul(top, 0.22)), mat: 'hair', tone: 2 });
  }
  return { shapes: s, marks };
}

/** 바닥 타일(마름모로 보임) */
export const floor = (cx: number, cy: number, hx: number, hy: number) => rbox([cx, cy, -0.3], [hx, hy, 0.3], 0.05, 'floor', 1);
