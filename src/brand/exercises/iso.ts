// 쿼터뷰(아이소메트릭) 픽셀 렌더러
// 3D 도형(공·막대·둥근 상자·원기둥)으로 장면을 만들고, 비스듬히 위(2:1 등각)에서 본 모습을
// 칸마다 광선을 쏘아 그린 뒤 3단 명암 + 검은 테두리로 픽셀아트처럼 만든다. (z = 위쪽)
import { blank, type Grid } from '../pixelArt.ts';

export type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));

/** 재질 = [빛, 기본, 그늘] 팔레트 글자 */
export type Mat = readonly [string, string, string];
export interface Shape { sdf: (p: V) => number; mat: Mat | ((p: V) => Mat); id: number }

let nextId = 1;
const shape = (sdf: (p: V) => number, mat: Shape['mat'], id?: number): Shape => ({ sdf, mat, id: id ?? nextId++ });

export function sphere(c: V, r: number, mat: Shape['mat'], id?: number) { return shape((p) => len(sub(p, c)) - r, mat, id); }
export function capsule(a: V, b: V, r: number, mat: Shape['mat'], id?: number) {
  const ba = sub(b, a); const bb = dot(ba, ba) || 1;
  return shape((p) => { const pa = sub(p, a); const t = Math.max(0, Math.min(1, dot(pa, ba) / bb)); return len(sub(pa, mul(ba, t))) - r; }, mat, id);
}
/** 축 정렬 둥근 상자: 가운데 c, 반 크기 h, 모서리 r */
export function rbox(c: V, h: V, r: number, mat: Shape['mat'], id?: number) {
  return shape((p) => {
    const q = sub(p, c).map((v, i) => Math.abs(v) - h[i]! + r) as V;
    const o: V = [Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)];
    return len(o) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r;
  }, mat, id);
}
/** 원기둥: 가운데 c, 축 방향 axis(0=x,1=y,2=z), 반지름 r, 반 길이 h */
export function cyl(c: V, axis: 0 | 1 | 2, r: number, h: number, mat: Shape['mat'], id?: number) {
  return shape((p) => {
    const d = sub(p, c); const a = Math.abs(d[axis]) - h;
    const radial = Math.hypot(...d.filter((_, i) => i !== axis)) - r;
    return Math.min(Math.max(radial, a), 0) + Math.hypot(Math.max(radial, 0), Math.max(a, 0));
  }, mat, id);
}
/** 두 도형을 부드럽게 이어 붙임 (몸통처럼) */
export function blend(a: Shape, b: Shape, k: number, mat: Shape['mat'], id?: number) {
  return shape((p) => { const d1 = a.sdf(p), d2 = b.sdf(p); const h = Math.max(k - Math.abs(d1 - d2), 0) / k; return Math.min(d1, d2) - h * h * k * 0.25; }, mat, id);
}

export interface Camera { size: number; scale: number; center: V; az?: number; el?: number }
export interface Marker { at: V; color: string }

/** 장면을 size×size 픽셀 격자로 그린다 */
export function renderIso(shapes: Shape[], cam: Camera, markers: Marker[] = []): Grid {
  const { size, scale, center } = cam;
  const az = ((cam.az ?? -45) * Math.PI) / 180, el = ((cam.el ?? 30) * Math.PI) / 180;
  const toCam: V = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const fwd = mul(toCam, -1);
  const right = norm(cross(fwd, [0, 0, 1]));
  const up = cross(right, fwd);
  // 빛: 화면 왼쪽 위 + 하늘
  const L = norm(add(add(mul(up, 0.9), mul(right, -0.55)), mul(toCam, 0.45)));
  const scene = (p: V) => { let d = Infinity, s: Shape | null = null; for (const sh of shapes) { const v = sh.sdf(p); if (v < d) { d = v; s = sh; } } return { d, s }; };

  const g = blank(size, size);
  const depth: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));
  const ids: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const FAR = 60;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const sx = (i + 0.5 - size / 2) / scale, sy = (size / 2 - (j + 0.5)) / scale;
    const o = add(add(add(center, mul(right, sx)), mul(up, sy)), mul(toCam, FAR));
    let t = 0, hit: Shape | null = null;
    for (let k = 0; k < 200 && t < FAR * 2; k++) {
      const { d, s } = scene(add(o, mul(fwd, t)));
      if (d < 0.004) { hit = s; break; }
      t += Math.max(d, 0.004);
    }
    if (!hit) continue;
    const p = add(o, mul(fwd, t));
    const e = 0.01;
    const n = norm([hit.sdf(add(p, [e, 0, 0])) - hit.sdf(sub(p, [e, 0, 0])), hit.sdf(add(p, [0, e, 0])) - hit.sdf(sub(p, [0, e, 0])), hit.sdf(add(p, [0, 0, e])) - hit.sdf(sub(p, [0, 0, e]))]);
    const mat = typeof hit.mat === 'function' ? hit.mat(p) : hit.mat;
    // 그림자: 위쪽으로 막히면 그늘
    let shadow = false;
    if (n[2] > 0.5) { let st = 0.15; for (let k = 0; k < 60 && st < 20; k++) { const d = scene(add(p, [0, 0, st])).d; if (d < 0.02) { shadow = true; break; } st += Math.max(d, 0.02); } }
    const lit = dot(n, L);
    g[j]![i] = shadow ? mat[2] : lit > 0.62 ? mat[0] : lit > 0.12 ? mat[1] : mat[2];
    depth[j]![i] = t; ids[j]![i] = hit.id;
  }
  // 눈 같은 점 찍기 (보일 때만)
  for (const m of markers) {
    const rel = sub(m.at, center);
    const i = Math.floor(dot(rel, right) * scale + size / 2), j = Math.floor(size / 2 - dot(rel, up) * scale);
    const dd = FAR - dot(rel, toCam);
    if (i >= 0 && j >= 0 && i < size && j < size && depth[j]![i]! < Infinity && Math.abs(depth[j]![i]! - dd) < 0.6) g[j]![i] = m.color;
  }
  // 테두리: 바깥(배경 쪽) + 안쪽(가까운 도형에 가려지는 경계)
  const out = g.map((r) => [...r]);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const nb: [number, number][] = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]];
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && depth[y]![x]! < Infinity;
    if (!inside(i, j)) { if (nb.some(([x, y]) => inside(x, y))) out[j]![i] = 'K'; continue; }
    if (nb.some(([x, y]) => inside(x, y) && ids[y]![x] !== ids[j]![i] && depth[y]![x]! < depth[j]![i]! - 0.9)) out[j]![i] = 'K';
  }
  return out;
}
