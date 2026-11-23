// 쿼터뷰(아이소메트릭) 픽셀 렌더러
// 3D 도형(공·타원체·막대·둥근 상자·원기둥)으로 장면을 만들고, 비스듬히 위(2:1 등각)에서 본 모습을
// 칸마다 광선을 쏘아 그린 뒤 4단 명암 + 접힘 그늘(AO) + 테두리로 픽셀아트처럼 만든다. (z = 위쪽)
import { blank, type Grid } from '../pixelArt.ts';
import { KEY, type MatName } from './palette.ts';

export type V = [number, number, number];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
export const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));

export type MatFn = MatName | ((p: V) => MatName | { mat: MatName; line?: boolean });
export interface Shape { sdf: (p: V) => number; mat: MatFn; id: number }

let nextId = 1;
export const newId = () => nextId++;
const shape = (sdf: (p: V) => number, mat: MatFn, id?: number): Shape => ({ sdf, mat, id: id ?? nextId++ });

export function sphere(c: V, r: number, mat: MatFn, id?: number) { return shape((p) => len(sub(p, c)) - r, mat, id); }
/** 축 정렬 타원체 (반지름 rx, ry, rz) */
export function ellipsoid(c: V, r: V, mat: MatFn, id?: number) {
  return shape((p) => {
    const d = sub(p, c); const k0 = len([d[0] / r[0], d[1] / r[1], d[2] / r[2]]); const k1 = len([d[0] / r[0] ** 2, d[1] / r[1] ** 2, d[2] / r[2] ** 2]);
    return k1 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
  }, mat, id);
}
/** 두 점을 잇는 막대. 끝 반지름이 다르면 가늘어짐(팔뚝·종아리) */
export function capsule(a: V, b: V, ra: number, mat: MatFn, id?: number, rb = ra) {
  const ba = sub(b, a); const bb = dot(ba, ba) || 1;
  return shape((p) => { const pa = sub(p, a); const t = Math.max(0, Math.min(1, dot(pa, ba) / bb)); return len(sub(pa, mul(ba, t))) - (ra + (rb - ra) * t); }, mat, id);
}
/** 축 정렬 둥근 상자: 가운데 c, 반 크기 h, 모서리 r */
export function rbox(c: V, h: V, r: number, mat: MatFn, id?: number) {
  return shape((p) => {
    const q = sub(p, c).map((v, i) => Math.abs(v) - h[i]! + r) as V;
    return len([Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)]) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r;
  }, mat, id);
}
/** 원기둥: 가운데 c, 축(0=x,1=y,2=z), 반지름 r, 반 길이 h */
export function cyl(c: V, axis: 0 | 1 | 2, r: number, h: number, mat: MatFn, id?: number) {
  return shape((p) => {
    const d = sub(p, c); const a = Math.abs(d[axis]) - h;
    const radial = Math.hypot(...d.filter((_, i) => i !== axis)) - r;
    return Math.min(Math.max(radial, a), 0) + Math.hypot(Math.max(radial, 0), Math.max(a, 0));
  }, mat, id);
}
/** 여러 도형을 부드럽게 이어 붙여 한 덩어리로 (몸통 등) */
export function blend(parts: Shape[], k: number, mat: MatFn, id?: number) {
  return shape((p) => {
    let d = parts[0]!.sdf(p);
    for (let i = 1; i < parts.length; i++) { const d2 = parts[i]!.sdf(p); const h = Math.max(k - Math.abs(d - d2), 0) / k; d = Math.min(d, d2) - h * h * k * 0.25; }
    return d;
  }, mat, id);
}

export interface Camera { size: number; scale: number; center: V; az?: number; el?: number }
export interface Marker { at: V; mat: MatName; tone?: number }

export function renderIso(shapes: Shape[], cam: Camera, markers: Marker[] = []): Grid {
  const { size, scale, center } = cam;
  const az = ((cam.az ?? -45) * Math.PI) / 180, el = ((cam.el ?? 30) * Math.PI) / 180;
  const toCam: V = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const fwd = mul(toCam, -1);
  const right = norm(cross(fwd, [0, 0, 1]));
  const up = cross(right, fwd);
  const L = norm(add(add(mul(up, 0.85), mul(right, -0.6)), mul(toCam, 0.55)));
  const scene = (p: V) => { let d = Infinity, s: Shape | null = null; for (const sh of shapes) { const v = sh.sdf(p); if (v < d) { d = v; s = sh; } } return { d, s }; };
  const sceneD = (p: V) => { let d = Infinity; for (const sh of shapes) { const v = sh.sdf(p); if (v < d) d = v; } return d; };

  const g = blank(size, size);
  const depth: number[][] = Array.from({ length: size }, () => Array(size).fill(Infinity));
  const ids: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const lineKey: string[][] = Array.from({ length: size }, () => Array(size).fill('K'));
  const FAR = 80;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const sx = (i + 0.5 - size / 2) / scale, sy = (size / 2 - (j + 0.5)) / scale;
    const o = add(add(add(center, mul(right, sx)), mul(up, sy)), mul(toCam, FAR));
    let t = 0, hit: Shape | null = null;
    for (let k = 0; k < 260 && t < FAR * 2; k++) {
      const { d, s } = scene(add(o, mul(fwd, t)));
      if (d < 0.003) { hit = s; break; }
      t += Math.max(d * 0.9, 0.003);
    }
    if (!hit) continue;
    const p = add(o, mul(fwd, t));
    const e = 0.008;
    const n = norm([hit.sdf(add(p, [e, 0, 0])) - hit.sdf(sub(p, [e, 0, 0])), hit.sdf(add(p, [0, e, 0])) - hit.sdf(sub(p, [0, e, 0])), hit.sdf(add(p, [0, 0, e])) - hit.sdf(sub(p, [0, 0, e]))]);
    const m = typeof hit.mat === 'function' ? hit.mat(p) : hit.mat;
    const mat = typeof m === 'string' ? m : m.mat;
    const keys = KEY[mat];
    if (typeof m !== 'string' && m.line) { g[j]![i] = keys[4]; depth[j]![i] = t; ids[j]![i] = hit.id; lineKey[j]![i] = keys[4]; continue; }
    // 접힘 그늘(AO)
    let occ = 0;
    for (let s = 1; s <= 4; s++) { const h = 0.12 * s; occ += (h - sceneD(add(p, mul(n, h)))) / 2 ** s; }
    occ = Math.max(0, Math.min(1, occ * 3.2));
    // 그림자: 위가 막히면
    let shadow = false;
    if (n[2] > 0.5) { let st = 0.12; for (let k = 0; k < 80 && st < 25; k++) { const d = sceneD(add(p, [0, 0, st])); if (d < 0.02) { shadow = true; break; } st += Math.max(d, 0.02); } }
    let lit = 0.5 + 0.5 * dot(n, L);
    lit -= occ * 0.45;
    if (shadow) lit = Math.min(lit, 0.3);
    const tone = lit > 0.9 ? 0 : lit > 0.72 ? 1 : lit > 0.46 ? 2 : 3;
    g[j]![i] = keys[tone];
    depth[j]![i] = t; ids[j]![i] = hit.id; lineKey[j]![i] = keys[4];
  }
  for (const mk of markers) {
    const rel = sub(mk.at, center);
    const i = Math.floor(dot(rel, right) * scale + size / 2), j = Math.floor(size / 2 - dot(rel, up) * scale);
    const dd = FAR - dot(rel, toCam);
    if (i >= 0 && j >= 0 && i < size && j < size && Math.abs(depth[j]![i]! - dd) < 0.35) g[j]![i] = KEY[mk.mat][mk.tone ?? 4]!;
  }
  // 테두리: 바깥은 검정(K), 안쪽(가까운 도형에 가려지는 경계)은 가려지는 쪽 재질의 짙은 선
  const out = g.map((r) => [...r]);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && depth[y]![x]! < Infinity;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const nb: [number, number][] = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]];
    if (!inside(i, j)) { if (nb.some(([x, y]) => inside(x, y))) out[j]![i] = 'K'; continue; }
    if (nb.some(([x, y]) => inside(x, y) && ids[y]![x] !== ids[j]![i] && depth[y]![x]! < depth[j]![i]! - 0.6)) out[j]![i] = lineKey[j]![i]!;
  }
  return out;
}
