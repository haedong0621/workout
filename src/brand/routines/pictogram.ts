// 루틴 그림: 픽셀 근육 지도 (81×128칸, 배경 투명) — "퍼즐" 방식
// 1) 사람 몸 실루엣(머리·몸통+다리·팔·손·발)을 흰 바탕 + 회색 테두리로 깔고
// 2) 그 안을 근육 조각으로 빈틈없이 나눈 뒤(어느 조각에도 안 들어간 칸은 가장 가까운 조각으로)
// 3) 조각 사이, 테두리와 조각 사이를 어디서나 1칸씩 비운다. 운동하는 부위 조각만 색칠.
// 모든 모양은 왼쪽 반(칸 좌표, 가운데 = 40)으로 정의하고 거울로 복사.
import { blank, type Grid } from '../pixelArt.ts';

export const PICTO_W = 81;
export const PICTO_H = 128;
const CX = 40;

export type Group = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs';

export const PICTO_PALETTE: Record<string, string> = {
  o: '#aebbc8',   // 몸 테두리
  h: '#ffffff',   // 몸 바탕·간격·머리·손·발
  m: '#56708c',   // 근육
  c: '#f2595d', k: '#4f86ee', s: '#22c7b2', a: '#a77bfa', l: '#f7b733', b: '#fb8f45',
};
const GROUP_COLOR: Record<Group, string> = { chest: 'c', back: 'k', shoulders: 's', biceps: 'a', triceps: 'a', forearms: 'a', abs: 'b', legs: 'l' };

type Pt = [number, number];
const inPoly = (x: number, y: number, p: Pt[]) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]!, [xj, yj] = p[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// ── 실루엣 ─────────────────────────────────────────
const inHead = (x: number, y: number) => ((x - 40) / 6.6) ** 2 + ((y - 9.2) / 8.2) ** 2 <= 1;
const BODY: Pt[] = [
  [36, 15], [36, 21], [31, 22.4], [26, 24.2], [22.4, 26.4], [20.6, 29.4], [21.2, 34], [24.2, 38], [26.4, 41.2],
  [27.4, 49], [28.7, 58], [28, 66], [25.6, 74], [25, 84], [26, 96], [26.8, 101], [26, 106], [26, 113], [27.6, 121.4],
  [36.2, 121.4], [36.6, 113], [37.6, 106], [38, 101], [38.6, 93], [39.2, 84], [39.8, 78], [40.6, 76.6], [40.6, 15],
];
const ARM: Pt[] = [[21.4, 27.2], [17.2, 31.2], [15.8, 39], [15.4, 47], [14.4, 55], [14, 62], [21.6, 62], [22.6, 56], [24, 48.4], [24.9, 41], [24.6, 35], [23.4, 30]];
const HAND: Pt[] = [[13.6, 61.6], [21.8, 61.6], [23, 65.6], [22.4, 69.8], [20, 73.2], [15.8, 72.8], [13, 68.4]];
const FOOT: Pt[] = [[27.4, 120.8], [36.2, 120.8], [37.2, 124.4], [38, 127.4], [25.6, 127.4], [26.2, 124.4]];

// ── 근육 조각 ──────────────────────────────────────
interface Piece { group: Group | null; poly: Pt[]; bands?: number[] }
const P = (group: Group | null, poly: Pt[], bands?: number[]): Piece => ({ group, poly, bands });

const NECK = P(null, [[35, 14], [40.6, 14], [40.6, 23.4], [35, 23.4]]);
const DELT = P('shoulders', [[17, 30.4], [21, 26.6], [25.4, 25], [30.4, 24.4], [28.8, 28.4], [25.8, 33], [23, 38], [17.4, 37]]);
const FOREARM = P('forearms', [[14.8, 48.6], [24.4, 48.6], [22.8, 56], [21.8, 62], [13.8, 62], [14.2, 55]]);
const KNEE = P('legs', [[26, 97], [38.4, 97], [38.2, 103], [26, 103]]);
const SHIN_OUT = P('legs', [[25.8, 103], [32, 103], [32, 121.4], [27.4, 121.4], [26, 113]]);
const SHIN_IN = P('legs', [[32, 103], [38.2, 103], [37, 113], [36.4, 121.4], [32, 121.4]]);

const FRONT: Piece[] = [
  NECK, DELT, FOREARM, KNEE, SHIN_OUT, SHIN_IN,
  P('back', [[30.6, 22.6], [35.4, 21], [35.4, 24.6], [30.4, 24.8]]),                                                   // 승모(앞)
  P('chest', [[29, 24.8], [40.6, 24.8], [40.6, 41.2], [35, 42.6], [30, 41.6], [27, 38.4], [26.2, 34], [27, 29]]),        // 가슴
  P('abs', [[35, 42.4], [40.6, 41.4], [40.6, 66], [35, 66]], [48.5, 54.5, 60.5]),                                      // 복근(4칸)
  P('abs', [[26.4, 40.2], [35, 42.6], [35, 66.2], [30, 68], [28.6, 58], [27.4, 49]]),                                  // 옆구리
  P(null, [[28, 66.2], [35, 66.2], [40.6, 66.2], [40.6, 76.6], [35.4, 72.4], [30, 70.4]]),                             // 아랫배
  P('biceps', [[18.6, 37.2], [25, 38.4], [24.6, 44], [23.8, 48.4], [18.4, 48.4], [17.4, 42]]),
  P('triceps', [[15.4, 35.6], [18.6, 37.2], [17.4, 42], [18.4, 48.4], [15, 48], [15.2, 41]]),
  P('legs', [[25.4, 74], [31.2, 72], [33, 84], [32.6, 97], [26, 97], [24.8, 84]]),                                     // 허벅지 바깥
  P('legs', [[31.2, 72], [40.6, 76.8], [39.4, 84], [38.6, 93], [38.4, 97], [32.6, 97], [33, 84]]),                     // 허벅지 안쪽
];
const BACK: Piece[] = [
  NECK, DELT, FOREARM, KNEE, SHIN_OUT, SHIN_IN,
  P('back', [[30.6, 22.6], [35.4, 21], [40.6, 20.4], [40.6, 48], [36.4, 40.2], [32.4, 32], [29.2, 26.4]]),             // 승모
  P('back', [[29.4, 30], [32.6, 34.4], [35.6, 40.2], [32, 43.2], [28, 40], [27, 35]]),                                 // 견갑골
  P('back', [[25.6, 38.2], [28, 40.2], [32, 43.4], [35.6, 40.6], [40.6, 48.4], [40.6, 58.2], [35, 61.2], [30, 64], [28.6, 56], [27.2, 46]]), // 광배
  P('back', [[35, 61.4], [40.6, 58.4], [40.6, 67], [29, 67], [30, 64.2]]),                                             // 허리
  P('triceps', [[15.4, 35.6], [25, 38.4], [24.6, 44], [23.8, 48.4], [15, 48], [15.2, 41]]),
  P('legs', [[28, 67.2], [40.6, 67.2], [40.6, 80.4], [34, 82], [28.4, 79.4], [27, 73]]),                               // 엉덩이
  P('legs', [[25.2, 78.4], [32.6, 82], [32.6, 97], [26, 97], [24.8, 86]]),                                             // 햄스트링 바깥
  P('legs', [[32.6, 82], [40.6, 80.6], [39.4, 86], [38.6, 95], [38.4, 97], [32.6, 97]]),                               // 햄스트링 안쪽
];

export interface PictoSpec { view: 'front' | 'back'; hl: Group[] }

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export function drawPicto(spec: PictoSpec): Grid {
  const W = PICTO_W, H = PICTO_H;
  const pieces = spec.view === 'front' ? FRONT : BACK;
  // 실루엣: 0 = 밖, 1 = 근육 자리(몸통·팔), 2 = 흰 부분(머리·손·발)
  const sil: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  // 조각 번호: 왼쪽 짝수 / 오른쪽 홀수 (가운데 칸 40은 왼쪽) → 가운데에서도 갈라짐
  const lab: number[][] = Array.from({ length: H }, () => Array(W).fill(-1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const right = x > CX;
    const mx = right ? 2 * CX - x + 0.5 : x + 0.5, my = y + 0.5;
    if (inHead(mx, my) || inPoly(mx, my, HAND) || inPoly(mx, my, FOOT)) { sil[y]![x] = 2; continue; }
    if (!(inPoly(mx, my, BODY) || inPoly(mx, my, ARM))) continue;
    sil[y]![x] = 1;
    const i = pieces.findIndex((p) => inPoly(mx, my, p.poly));
    if (i >= 0) { const band = pieces[i]!.bands?.filter((b) => my > b).length ?? 0; lab[y]![x] = (i * 8 + band) * 2 + (right ? 1 : 0); }
  }
  // 조각에 안 들어간 근육 자리 → 가장 가까운 조각 (한 칸씩 번져 나감)
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    const next = lab.map((r) => [...r]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (sil[y]![x] !== 1 || lab[y]![x]! >= 0) continue;
      for (const [dx, dy] of N4) { const o = lab[y + dy]?.[x + dx]; if (o !== undefined && o >= 0 && (x > CX) === (x + dx > CX)) { next[y]![x] = o; changed = true; break; } }
    }
    for (let y = 0; y < H; y++) lab[y] = next[y]!;
    if (!changed) break;
  }
  const inBody = (x: number, y: number) => (sil[y]?.[x] ?? 0) > 0;
  const isOutline = (x: number, y: number) => inBody(x, y) && N4.some(([dx, dy]) => !inBody(x + dx, y + dy));
  const on = new Set(spec.hl);
  const g = blank(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inBody(x, y)) continue;
    if (isOutline(x, y)) { g[y]![x] = 'o'; continue; }
    const l = lab[y]![x]!;
    if (sil[y]![x] === 2 || l < 0) { g[y]![x] = 'h'; continue; }
    const piece = pieces[Math.floor(l / 16)]!;
    // 간격 1칸: 테두리 옆 칸이거나, 다른 조각과 맞닿은 쪽(바깥 → 안쪽 옆 칸, 아래 칸)
    const right = x > CX;
    const sx = right ? x - 1 : x + 1;
    const other = (xx: number, yy: number) => { const o = lab[yy]?.[xx]; return o !== undefined && sil[yy]![xx] === 1 && o !== l; };
    const nearOutline = N4.some(([dx, dy]) => isOutline(x + dx, y + dy) || sil[y + dy]?.[x + dx] === 2);
    const gap = nearOutline || (!(right && sx <= CX) && other(sx, y)) || other(x, y + 1);
    g[y]![x] = gap ? 'h' : piece.group && on.has(piece.group) ? GROUP_COLOR[piece.group] : 'm';
  }
  return g;
}
