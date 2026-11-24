// 루틴 그림: 2D 도트 근육 지도 (61×96칸, 배경 투명)
// 남색 몸, 근육 사이는 흰 선, 머리·손·발은 흰색 + 회색 테두리. 운동하는 부위만 색칠.
// 근육은 왼쪽 반(가운데 x = 30)의 다각형으로 정의하고 거울로 복사한다.
// 다각형 사이에 생긴 얇은 틈은 흰 선으로 메운다.
import { blank, type Grid } from '../pixelArt.ts';

export const PICTO_W = 61;
export const PICTO_H = 96;
const MID = 30;

export const PICTO_PALETTE: Record<string, string> = {
  m: '#5b7189',   // 근육(남색)
  w: '#ffffff',   // 근육 사이 선
  h: '#ffffff',   // 머리·손·발
  o: '#b3bfcb',   // 머리·손·발 테두리
  c: '#ff6b6b',   // 강조: 가슴
  k: '#5b8def',   // 강조: 등
  s: '#2dd4bf',   // 강조: 어깨
  a: '#b388ff',   // 강조: 팔
  l: '#ffc14d',   // 강조: 하체
  b: '#ff9f5a',   // 강조: 복근
};

export type Group = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs';
const GROUP_COLOR: Record<Group, string> = { chest: 'c', back: 'k', shoulders: 's', biceps: 'a', triceps: 'a', forearms: 'a', abs: 'b', legs: 'l' };

type Pt = [number, number];
interface Part { id: string; group: Group | null; skin?: boolean; poly?: Pt[]; ellipse?: [number, number, number, number] }

const HEAD: Part = { id: 'head', group: null, skin: true, ellipse: [30, 8.6, 6.1, 7.6] };
const NECK: Part = { id: 'neck', group: null, poly: [[25.6, 15], [30.5, 15], [30.5, 20.6], [24.6, 20.6]] };
const FOREARM: Part = { id: 'forearm', group: 'forearms', poly: [[11.8, 41.8], [18.8, 41.4], [18.9, 45], [16.7, 55.2], [12.5, 55.2], [10.9, 48]] };
const HAND: Part = { id: 'hand', group: null, skin: true, poly: [[12.2, 55.8], [17, 55.8], [17.6, 60], [16.2, 64.2], [12.9, 63.8], [11.6, 60]] };
const KNEE: Part = { id: 'knee', group: 'legs', poly: [[21.9, 73.4], [27.1, 72.9], [27.3, 77.6], [22.3, 77.6]] };
const FOOT: Part = { id: 'foot', group: null, skin: true, poly: [[22.9, 90.4], [26.3, 90.4], [27.1, 95.6], [21.5, 95.6]] };

const FRONT: Part[] = [
  HEAD, NECK, HAND, FOOT,
  { id: 'trap', group: 'back', poly: [[19.6, 20.4], [25.6, 17.4], [25.6, 20.8]] },
  { id: 'delt', group: 'shoulders', poly: [[12.8, 24.4], [15, 21], [19, 19.8], [23.4, 20.4], [22.2, 23.2], [19.6, 28], [16.6, 31], [13.4, 30.2]] },
  { id: 'pec', group: 'chest', poly: [[22.4, 20.9], [30.5, 21.4], [30.5, 33.2], [26.2, 34.2], [22, 32.6], [19.6, 29.6], [20, 25.4]] },
  { id: 'oblique', group: 'abs', poly: [[19.8, 30.4], [22, 32.8], [26.2, 34.4], [26.2, 49.2], [23, 51.2], [21, 45], [20.4, 38]] },
  { id: 'abs', group: 'abs', poly: [[26.2, 34.2], [30.5, 33.4], [30.5, 50.4], [26.2, 50.4]] },
  { id: 'biceps', group: 'biceps', poly: [[14.4, 30.4], [18.6, 29.4], [19.7, 34], [18.7, 41.2], [14.9, 41.6], [13.5, 36]] },
  { id: 'triceps', group: 'triceps', poly: [[12.4, 28.8], [14.4, 30.4], [13.5, 36], [14.9, 41.6], [12.2, 41.2], [11.4, 35]] },
  FOREARM,
  { id: 'hip', group: null, poly: [[20.8, 48.8], [26.2, 50.6], [30.5, 50.6], [30.5, 56.2], [26.6, 57.7], [22.4, 55]] },
  { id: 'quadOut', group: 'legs', poly: [[20.8, 51.8], [23.5, 55.2], [24.6, 73.1], [21.9, 73.5], [20, 64]] },
  { id: 'quadMid', group: 'legs', poly: [[23.5, 55.2], [27.3, 57.7], [26.9, 73], [24.6, 73.1]] },
  { id: 'adductor', group: 'legs', poly: [[27.3, 57.7], [29.7, 57.9], [29.1, 68], [26.9, 73]] },
  KNEE,
  { id: 'shin', group: 'legs', poly: [[21.9, 77.9], [27.3, 77.9], [26.7, 85], [25.7, 90.2], [23.3, 90.2], [21.5, 84]] },
];

const BACK: Part[] = [
  HEAD, NECK, HAND, FOOT,
  { id: 'trap', group: 'back', poly: [[19.6, 20.4], [25.6, 16.6], [30.5, 16], [30.5, 40.4], [27, 33], [23.8, 26.4]] },
  { id: 'delt', group: 'shoulders', poly: [[12.8, 24.4], [15, 21], [19, 19.8], [22.6, 20.8], [23.6, 24.4], [20, 28.4], [16.6, 31], [13.4, 30.2]] },
  { id: 'lat', group: 'back', poly: [[19.9, 28.6], [23.8, 26.6], [27, 33.2], [30.5, 40.6], [30.5, 46.2], [25, 47.2], [21.6, 41], [20.2, 34]] },
  { id: 'lowBack', group: 'back', poly: [[25, 47.4], [30.5, 46.4], [30.5, 51.6], [23, 51.6], [22.3, 49]] },
  { id: 'triceps', group: 'triceps', poly: [[12.4, 28.8], [18.6, 29.4], [19.7, 34], [18.7, 41.2], [12.2, 41.2], [11.4, 35]] },
  FOREARM,
  { id: 'glute', group: 'legs', poly: [[22.1, 51.8], [30.5, 51.8], [30.5, 61], [26, 62.4], [21.9, 60], [21.1, 55]] },
  { id: 'hamOut', group: 'legs', poly: [[20.5, 59.8], [24.8, 62.4], [24.8, 73.1], [21.9, 73.5], [20, 66]] },
  { id: 'hamIn', group: 'legs', poly: [[24.8, 62.4], [29.7, 61.4], [29.1, 68], [26.9, 73], [24.8, 73.1]] },
  KNEE,
  { id: 'calf', group: 'legs', poly: [[21.5, 77.9], [27.3, 77.9], [26.9, 82], [25.7, 90.2], [23.3, 90.2], [21.3, 83]] },
];

/** 근육 안쪽 흰 선: 가운데 줄(앞 = 가슴·복근 / 뒤 = 척추) + 앞 복근 가로줄 */
const INNER: Record<'front' | 'back', { mid: [number, number]; across: [x0: number, y: number][] }> = {
  front: { mid: [21, 50], across: [[26, 38], [26, 42], [26, 46]] },
  back: { mid: [16, 51], across: [] },
};

const inPoly = (x: number, y: number, p: Pt[]) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]!, [xj, yj] = p[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPart = (x: number, y: number, p: Part) =>
  p.ellipse ? ((x - p.ellipse[0]) / p.ellipse[2]) ** 2 + ((y - p.ellipse[1]) / p.ellipse[3]) ** 2 <= 1 : inPoly(x, y, p.poly!);

export interface PictoSpec { view: 'front' | 'back'; hl: Group[] }

export function drawPicto(spec: PictoSpec): Grid {
  const parts = spec.view === 'front' ? FRONT : BACK;
  const at: (Part | null)[][] = Array.from({ length: PICTO_H }, () => Array(PICTO_W).fill(null));
  for (let y = 0; y < PICTO_H; y++) for (let x = 0; x <= MID; x++) {
    const p = parts.find((q) => inPart(x + 0.5, y + 0.5, q)) ?? null;
    at[y]![x] = p; at[y]![2 * MID - x] = p;
  }
  const get = (x: number, y: number) => at[y]?.[x] ?? null;
  // 근육 사이 얇은 틈(1~2칸)은 흰 선으로 메울 칸으로 표시
  const GAP: Part = { id: 'gap', group: null };
  for (let y = 0; y < PICTO_H; y++) for (let x = 0; x < PICTO_W; x++) {
    if (at[y]![x]) continue;
    const near = (dx: number, dy: number) => { for (let k = 1; k <= 2; k++) { const q = get(x + dx * k, y + dy * k); if (q) return q; } return null; };
    const l = near(-1, 0), r = near(1, 0), u = near(0, -1), d = near(0, 1);
    const muscle = (q: Part | null) => !!q && !q.skin && q !== GAP;
    if ((muscle(l) && muscle(r)) || (muscle(u) && muscle(d))) at[y]![x] = GAP;
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
    // 근육 경계: 바깥 → 안쪽 옆 칸, 아래 칸이 다른 근육이면 흰 선 (좌우 대칭)
    const side = x < MID ? get(x + 1, y) : x > MID ? get(x - 1, y) : null;
    const down = get(x, y + 1);
    const differs = (q: Part | null) => !!q && !q.skin && q !== GAP && q !== p;
    g[y]![x] = differs(side) || differs(down) ? 'w' : p.group && on.has(p.group) ? GROUP_COLOR[p.group] : 'm';
  }
  const inner = INNER[spec.view];
  for (let y = inner.mid[0]; y <= inner.mid[1]; y++) if (at[y]![MID]) g[y]![MID] = 'w';
  for (const [x0, y] of inner.across) for (let x = x0; x <= 2 * MID - x0; x++) if (at[y]![x]) g[y]![x] = 'w';
  return g;
}
