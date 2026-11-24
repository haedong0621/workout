// 단단한 레버(지렛대) 머신: 레버는 회전축에 걸린 한 덩어리라 두 장면에서 모양이 같고 각도만 바뀐다.
// 회전축은 두 장면의 끝점(손·어깨 패드 등)에서 거리가 같은 자리(수직 이등분선 위)로 계산한다.
import type { Grid } from '../pixelArt.ts';
import { add, cross, dot, len, mul, norm, sub, type Shape, type V } from './iso.ts';
import { draw, pose, SIZE, type ExArt, type Scene } from './kit.ts';
import { cushion, handle, horn, hub, tube } from './machine.ts';
import type { P } from './gear.ts';

/** 레버 부품(1장면 기준 좌표) */
export interface LeverParts {
  tubes?: V[][];
  handles?: [V, V][];          // [가운데, 축]
  horns?: [V, V, number?][];   // [뿌리, 축, 원판 수]
  pads?: [V, V, V, [number, number]][]; // [가운데, 길이축, 폭축, 반 크기]
}
export interface LeverDef {
  /** 회전축이 있었으면 하는 자리(왼쪽 기준). 실제 축은 이 점을 수직 이등분선에 내린 곳 */
  prefer: V;
  /** 회전 방향 축: 'y' = 옆에서 본 앞뒤·위아래 흔들림(기본), 'z' = 위에서 본 좌우 벌림 */
  axis?: 'y' | 'z';
  /** 레버 끝이 따라가는 점(왼쪽): 기본 = 왼손 */
  at?: (p: P) => V;
  /** 레버 모양 (축 piv, 끝 t, 쪽 s) */
  build: (piv: V, t: V, s: 1 | -1) => LeverParts;
  /** 양쪽에 하나씩(기본) / 가운데 하나 */
  single?: boolean;
  /** 움직이지 않는 받침(축 기둥 등) */
  base?: (piv: V, s: 1 | -1) => Shape[];
}

/** c를 지나는 axis 축으로 ang만큼 돌림 (로드리게스) */
export function rotAround(p: V, c: V, axis: V, ang: number): V {
  const k = norm(axis), v = sub(p, c);
  const cs = Math.cos(ang), sn = Math.sin(ang);
  const r = add(add(mul(v, cs), mul(cross(k, v), sn)), mul(k, dot(k, v) * (1 - cs)));
  return add(c, r);
}
const rotDir = (d: V, axis: V, ang: number): V => rotAround(d, [0, 0, 0], axis, ang);

/** 두 점 a, b에서 거리가 같고 prefer에 가장 가까운 축 위치 (axis에 수직인 평면에서) */
export function pivotFor(a: V, b: V, prefer: V, axis: V): V {
  const ax = norm(axis);
  const flat = (v: V): V => sub(v, mul(ax, dot(v, ax)));
  const m = mul(add(a, b), 0.5);
  const n = norm(flat(sub(b, a)));                    // 이등분선 법선
  const q = sub(prefer, mul(n, dot(sub(prefer, m), n)));
  return q;
}
function signedAngle(u: V, v: V, axis: V): number {
  const ax = norm(axis);
  const fu = norm(sub(u, mul(ax, dot(u, ax)))), fv = norm(sub(v, mul(ax, dot(v, ax))));
  return Math.atan2(dot(cross(fu, fv), ax), dot(fu, fv));
}
function shapes(parts: LeverParts, f: (v: V) => V, g: (d: V) => V): Shape[] {
  const out: Shape[] = [];
  for (const pl of parts.tubes ?? []) for (let i = 1; i < pl.length; i++) out.push(tube(f(pl[i - 1]!), f(pl[i]!), 0.24));
  for (const [c, a] of parts.handles ?? []) out.push(...handle(f(c), g(a), 0.6));
  for (const [c, a, n] of parts.horns ?? []) out.push(...horn(f(c), g(a), n ?? 1));
  for (const [c, u, v, h] of parts.pads ?? []) out.push(...cushion(f(c), g(u), g(v), h));
  return out;
}

/** 레버 머신 그림 2장: 정적 장비 stat + 레버 */
export function leverArt(id: string, a: Scene, b: Scene, def: LeverDef): ExArt {
  const axis: V = def.axis === 'z' ? [0, 0, 1] : [0, 1, 0];
  const at = def.at ?? ((p: P) => p.hands.L);
  const pa = pose(a.body), pb = pose(b.body);
  const ta = at(pa), tb = at(pb);
  const piv = pivotFor(ta, tb, def.prefer, axis);
  const ang = signedAngle(sub(ta, piv), sub(tb, piv), axis);
  const sides: (1 | -1)[] = def.single ? [1] : [1, -1];
  const mir = (v: V, s: number): V => [v[0], v[1] * s, v[2]];
  const lever = (k: 0 | 1) => (): Shape[] => {
    const out: Shape[] = [];
    for (const s of sides) {
      const P = mir(piv, s), T = mir(ta, s);
      const parts = def.build(P, T, s);
      // 오른쪽은 거울: y축 회전은 같은 각, z축 회전은 반대 각
      const an = k === 0 ? 0 : def.axis === 'z' ? ang * s : ang;
      out.push(...(def.base?.(P, s) ?? []), ...hub(P, axis, 0.5), ...shapes(parts, (v) => rotAround(v, P, axis, an), (d) => rotDir(d, axis, an)));
    }
    return out;
  };
  const withLever = (sc: Scene, k: 0 | 1): Scene => ({ ...sc, gear: (p) => [...(sc.gear?.(p) ?? []), ...lever(k)()] });
  return { id, frames: [(): Grid => draw(withLever(a, 0)), (): Grid => draw(withLever(b, 1))], size: SIZE };
}
export { len };
