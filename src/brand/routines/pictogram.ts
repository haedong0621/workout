// 루틴 그림: 2D 도트 근육 지도 (81×128칸, 배경 투명)
// 남색 몸, 근육 사이는 흰 선, 머리·손·발은 흰색 + 회색 테두리. 운동하는 부위만 색칠.
// 근육은 왼쪽 반(가운데 x = 40)의 조절점을 부드러운 곡선(캣멀롬)으로 이어 만들고 거울로 복사한다.
// 근육 사이 얇은 틈은 흰 선으로 메운다.
import { blank, type Grid } from '../pixelArt.ts';

export const PICTO_W = 81;
export const PICTO_H = 128;
const MID = 40;

export const PICTO_PALETTE: Record<string, string> = {
  m: '#56708c',   // 근육(남색)
  w: '#ffffff',   // 근육 사이 선
  h: '#ffffff',   // 머리·손·발
  o: '#aebbc8',   // 머리·손·발 테두리
  c: '#f2595d',   // 강조: 가슴
  k: '#4f86ee',   // 강조: 등
  s: '#22c7b2',   // 강조: 어깨
  a: '#a77bfa',   // 강조: 팔
  l: '#f7b733',   // 강조: 하체
  b: '#fb8f45',   // 강조: 복근
};

export type Group = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs';
const GROUP_COLOR: Record<Group, string> = { chest: 'c', back: 'k', shoulders: 's', biceps: 'a', triceps: 'a', forearms: 'a', abs: 'b', legs: 'l' };

type Pt = [number, number];
interface Part { id: string; group: Group | null; skin?: boolean; pts: Pt[]; sharp?: boolean }

/** 닫힌 캣멀롬 곡선으로 조절점을 촘촘한 다각형으로 */
function smooth(pts: Pt[], n = 8): Pt[] {
  const out: Pt[] = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N]!, p1 = pts[i]!, p2 = pts[(i + 1) % N]!, p3 = pts[(i + 2) % N]!;
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

// ── 공통 부분 ─────────────────────────────────────────────
const HEAD: Part = { id: 'head', group: null, skin: true, pts: [[40, 0.6], [44.6, 1.8], [47.4, 6], [47.8, 11.5], [46.6, 16.4], [43.6, 20], [40, 21.4], [36.4, 20], [33.4, 16.4], [32.2, 11.5], [32.6, 6], [35.4, 1.8]] };
const NECK: Part = { id: 'neck', group: null, pts: [[35.4, 19], [40.6, 20.6], [40.6, 28.6], [33.6, 28.2], [34.4, 23]] };
const HAND: Part = {
  id: 'hand', group: null, skin: true,
  pts: [[14.2, 74.2], [20.2, 74], [21.8, 77.4], [22.4, 81.6], [21, 82.4], [20.2, 79.8], [20.4, 85], [18.6, 88.4], [15.4, 88.2], [13.4, 84.6], [12.8, 79.2]],
};
const FOOT: Part = { id: 'foot', group: null, skin: true, pts: [[31.4, 119.6], [35.6, 119.4], [36.6, 123.2], [37.4, 127], [28.2, 127.2], [29.4, 123.4]] };
const KNEE: Part = { id: 'knee', group: 'legs', pts: [[30.4, 98.6], [35.6, 98.2], [37, 101.4], [35.8, 104.6], [31, 104.6], [29.4, 101.6]] };

const FRONT: Part[] = [
  HEAD, NECK, HAND, FOOT, KNEE,
  { id: 'trap', group: 'back', pts: [[26.8, 28.4], [33.4, 23.6], [34.2, 28.6]] },
  { id: 'delt', group: 'shoulders', pts: [[18.4, 35.6], [20.2, 30.8], [24.6, 28], [30.4, 27.8], [30.2, 30.6], [27.4, 34.4], [25, 40.2], [21.4, 43.6], [18.6, 41.8]] },
  { id: 'pec', group: 'chest', pts: [[30.6, 28.6], [36, 28.8], [40.6, 29], [40.6, 43.4], [36, 45.2], [31.2, 44.2], [28, 41.8], [26.8, 38], [27.8, 33.4]] },
  { id: 'serratus', group: 'abs', pts: [[26.6, 41.4], [29.2, 43.6], [29.6, 49.6], [27.6, 51.8], [26.4, 47]] },
  { id: 'oblique', group: 'abs', pts: [[29.4, 44.4], [34.6, 45.6], [34.6, 66.4], [31.2, 68.8], [29, 62], [28, 55], [27.8, 50.6], [29.6, 49.6]] },
  { id: 'abs', group: 'abs', pts: [[34.6, 45.4], [40.6, 44.2], [40.6, 67.6], [34.6, 67.6]], sharp: true },
  { id: 'biceps', group: 'biceps', pts: [[21.8, 43.8], [25.2, 41], [26.6, 46], [26, 52.6], [24.2, 56.8], [20.2, 57], [19, 51.6], [19.6, 46.4]] },
  { id: 'triceps', group: 'triceps', pts: [[18.4, 42.4], [21.6, 44.2], [19.6, 47], [18.8, 52], [20, 57], [17.2, 56.2], [16.6, 50], [17.2, 45]] },
  { id: 'brachio', group: 'forearms', pts: [[16.8, 57.4], [20.4, 57.6], [19.6, 62], [17.6, 68], [15.4, 73.6], [14, 70], [14.6, 63]] },
  { id: 'flexor', group: 'forearms', pts: [[20.6, 57.4], [24.4, 57.2], [25.2, 60.6], [23.6, 66.6], [20.6, 73.6], [15.8, 73.6], [18, 67.6], [20, 62]] },
  { id: 'hip', group: null, pts: [[30.8, 66.8], [34.6, 68], [40.6, 68], [40.6, 75], [37.4, 77], [33, 73.6], [30.6, 70.6]] },
  { id: 'vLat', group: 'legs', pts: [[29.6, 69.4], [32.6, 73], [33.6, 82], [33.4, 92], [32, 98.4], [29.4, 98.2], [27.4, 90], [27.4, 80]] },
  { id: 'rectus', group: 'legs', pts: [[32.8, 73.2], [36.6, 76.6], [37.4, 84], [36.4, 92.4], [35.2, 98], [32.4, 98.2], [33.8, 91], [34, 82]] },
  { id: 'adductor', group: 'legs', pts: [[36.8, 76.8], [39.6, 77.2], [39.4, 84], [38, 89.6], [37.4, 84]] },
  { id: 'vmo', group: 'legs', pts: [[37.8, 90], [39.4, 89.4], [38.6, 95.4], [36.4, 98.4], [35.6, 98], [36.6, 93.4]] },
  { id: 'tibialis', group: 'legs', pts: [[29.8, 104.8], [33.4, 104.8], [33.2, 111], [32.4, 119.4], [30.6, 119.4], [29.2, 112]] },
  { id: 'calfIn', group: 'legs', pts: [[33.6, 104.8], [36.4, 104.8], [37.6, 108.6], [37, 113], [35.4, 119.4], [32.8, 119.4], [33.4, 111]] },
];

const BACK: Part[] = [
  HEAD, NECK, HAND, FOOT, KNEE,
  { id: 'trap', group: 'back', pts: [[26.8, 28.4], [33.4, 23], [40.6, 22], [40.6, 56], [36.4, 46], [33, 38], [30.4, 33], [28.2, 31]] },
  { id: 'delt', group: 'shoulders', pts: [[18.4, 35.6], [20.2, 30.8], [24.6, 28], [28.2, 29.4], [29.6, 32.4], [27.2, 36.8], [25, 40.2], [21.4, 43.6], [18.6, 41.8]] },
  { id: 'infra', group: 'back', pts: [[29.8, 33.4], [32.8, 38.4], [35.2, 44], [32, 45.2], [28.4, 42.6], [27.6, 38]] },
  { id: 'teres', group: 'back', pts: [[25.4, 40.6], [27.6, 38.6], [28.4, 42.8], [27.2, 45.2], [25.2, 44]] },
  { id: 'lat', group: 'back', pts: [[25.4, 44.6], [28.6, 43.4], [32.2, 45.6], [35.6, 45], [37, 49], [40.6, 57.6], [40.6, 60.4], [36, 61.8], [32.4, 64.6], [29.4, 62], [27.6, 55], [26, 49]] },
  { id: 'erector', group: 'back', pts: [[36.2, 62], [40.6, 60.8], [40.6, 68.6], [35, 68.6], [33, 66]] },
  { id: 'triLong', group: 'triceps', pts: [[21.8, 43.8], [25.2, 41], [26.6, 46], [26, 52.6], [24.2, 56.8], [21.2, 57], [21, 51], [21.4, 46.4]] },
  { id: 'triLat', group: 'triceps', pts: [[18.4, 42.4], [21.6, 44.2], [21, 48], [20.8, 53], [21, 57], [17.2, 56.2], [16.6, 50], [17.2, 45]] },
  { id: 'brachio', group: 'forearms', pts: [[16.8, 57.4], [20.4, 57.6], [19.6, 62], [17.6, 68], [15.4, 73.6], [14, 70], [14.6, 63]] },
  { id: 'flexor', group: 'forearms', pts: [[20.6, 57.4], [24.4, 57.2], [25.2, 60.6], [23.6, 66.6], [20.6, 73.6], [15.8, 73.6], [18, 67.6], [20, 62]] },
  { id: 'gMed', group: 'legs', pts: [[30.4, 66.2], [34.6, 68.8], [33.6, 72.6], [30, 73], [28.8, 69.6]] },
  { id: 'gMax', group: 'legs', pts: [[34.8, 69], [40.6, 69], [40.6, 82.4], [36.4, 84.4], [31.6, 83.2], [29.2, 79], [29.6, 74.2], [33.6, 73]] },
  { id: 'hamOut', group: 'legs', pts: [[28.2, 80.8], [31.6, 83.6], [33.6, 85], [33.6, 92], [32.4, 98.2], [29.4, 98.2], [27.4, 90]] },
  { id: 'hamIn', group: 'legs', pts: [[33.8, 85], [36.6, 84.6], [39.6, 83.2], [39.2, 89.6], [37, 95.4], [35.4, 98.2], [32.8, 98.2], [34, 92]] },
  { id: 'calfOut', group: 'legs', pts: [[29.6, 104.8], [33.2, 104.8], [33.4, 109.6], [32.8, 114.4], [31.6, 117], [29.2, 112], [28.8, 108]] },
  { id: 'calfIn', group: 'legs', pts: [[33.4, 104.8], [36.4, 104.8], [37.8, 108.6], [37.2, 113], [35.4, 117], [33, 114.4], [33.6, 109.6]] },
  { id: 'achilles', group: 'legs', pts: [[30.6, 116.8], [35.4, 116.8], [34.8, 119.4], [31.4, 119.4]], sharp: true },
];

/** 근육 안쪽 흰 선 */
interface Inner { mid: [number, number]; across: [x0: number, x1: number, y: number][]; diag: Pt[][] }
const INNER: Record<'front' | 'back', Inner> = {
  front: {
    mid: [29, 67],
    across: [[35, 40, 51], [35, 40, 57], [35, 40, 62.5]],
    diag: [[[26.8, 46], [29, 45.2]], [[27.2, 49], [29.4, 48.4]]],        // 전거근 톱니
  },
  back: { mid: [22, 84], across: [], diag: [] },
};

const inPoly = (x: number, y: number, p: Pt[]) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]!, [xj, yj] = p[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export interface PictoSpec { view: 'front' | 'back'; hl: Group[] }

const cache = new Map<string, Pt[]>();
const shapeOf = (view: string, p: Part) => {
  const key = view + p.id;
  if (!cache.has(key)) cache.set(key, p.sharp ? p.pts : smooth(p.pts));
  return cache.get(key)!;
};

export function drawPicto(spec: PictoSpec): Grid {
  const parts = spec.view === 'front' ? FRONT : BACK;
  const at: (Part | null)[][] = Array.from({ length: PICTO_H }, () => Array(PICTO_W).fill(null));
  for (let y = 0; y < PICTO_H; y++) for (let x = 0; x <= MID; x++) {
    const p = parts.find((q) => inPoly(x + 0.5, y + 0.5, shapeOf(spec.view, q))) ?? null;
    at[y]![x] = p; at[y]![2 * MID - x] = p;
  }
  const get = (x: number, y: number) => at[y]?.[x] ?? null;
  // 근육 사이 얇은 틈(1~2칸)은 흰 선
  const GAP: Part = { id: 'gap', group: null, pts: [] };
  const muscle = (q: Part | null) => !!q && !q.skin && q !== GAP;
  for (let y = 0; y < PICTO_H; y++) for (let x = 0; x < PICTO_W; x++) {
    if (at[y]![x]) continue;
    const near = (dx: number, dy: number) => { for (let k = 1; k <= 2; k++) { const q = get(x + dx * k, y + dy * k); if (q) return q; } return null; };
    if ((muscle(near(-1, 0)) && muscle(near(1, 0))) || (muscle(near(0, -1)) && muscle(near(0, 1)))) at[y]![x] = GAP;
  }
  const on = new Set(spec.hl);
  const g = blank(PICTO_W, PICTO_H);
  for (let y = 0; y < PICTO_H; y++) for (let x = 0; x < PICTO_W; x++) {
    const p = at[y]![x];
    if (!p) continue;
    if (p === GAP) { g[y]![x] = 'w'; continue; }
    if (p.skin) {
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(x + dx!, y + dy!) !== p);
      g[y]![x] = edge ? 'o' : 'h';
      continue;
    }
    const side = x < MID ? get(x + 1, y) : x > MID ? get(x - 1, y) : null;
    const down = get(x, y + 1);
    const differs = (q: Part | null) => muscle(q) && q !== p;
    g[y]![x] = differs(side) || differs(down) ? 'w' : p.group && on.has(p.group) ? GROUP_COLOR[p.group] : 'm';
  }
  const inner = INNER[spec.view];
  const paintW = (x: number, y: number) => { if (at[y]?.[x] && !at[y]![x]!.skin) g[y]![x] = 'w'; };
  for (let y = inner.mid[0]; y <= inner.mid[1]; y++) paintW(MID, y);
  for (const [x0, x1, yy] of inner.across) for (let x = Math.round(x0); x <= Math.round(2 * MID - x0); x++) { if (x > x1 && x < 2 * MID - x1) continue; paintW(x, Math.floor(yy)); }
  for (const seg of inner.diag) {
    const [[ax, ay], [bx, by]] = seg as [Pt, Pt];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let i = 0; i <= n; i++) { const x = Math.floor(ax + ((bx - ax) * i) / n), y = Math.floor(ay + ((by - ay) * i) / n); paintW(x, y); paintW(2 * MID - x, y); }
  }
  return g;
}
