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

// ── 실루엣: 보디빌더 체형(넓은 어깨 · 잘록한 허리 · 큰 허벅지 · 마름모 종아리), 각지게 ──
const inHead = (x: number, y: number) => ((x - 40) / 5.4) ** 2 + ((y - 7.8) / 6.8) ** 2 <= 1;
const BODY: Pt[] = [
  [35.6, 11], [35.6, 16.6], [28, 19.4], [23, 22.4], [21, 25], [22.4, 31], [24.6, 36.4], [23.6, 42], [25.4, 50], [28.4, 58],
  [30, 62], [29.4, 66], [26.4, 71], [24.6, 78], [25, 86], [26.4, 92], [28, 96.6], [27.6, 101], [26.2, 106], [27.4, 112],
  [29.6, 118.6], [35.6, 118.6], [37, 112], [38.2, 105], [37.4, 100], [37.6, 93], [38.6, 84], [39.4, 76], [40.6, 70.6], [40.6, 11],
];
const ARM: Pt[] = [
  [21.4, 22.2], [16, 24.8], [12.6, 29.4], [11.4, 35], [10.8, 42], [11.2, 49.4], [10, 55], [11.2, 61], [12.6, 66.2],
  [18, 66.2], [19, 58], [19.8, 51], [20.6, 45], [21.4, 38.6], [23.4, 36],
];
const HAND: Pt[] = [[12.2, 65.6], [18.6, 65.6], [19.6, 69.2], [19, 73.2], [16.8, 76.2], [13.4, 75.8], [11.8, 71.2]];
const FOOT: Pt[] = [[28.8, 118.2], [36, 118.2], [37, 122], [37.8, 127.4], [26.4, 127.4], [27.4, 122]];

// ── 근육 조각 ──────────────────────────────────────
interface Piece { group: Group | null; poly: Pt[]; bands?: number[] }
const P = (group: Group | null, poly: Pt[], bands?: number[]): Piece => ({ group, poly, bands });

const NECK = P(null, [[35, 10], [40.6, 10], [40.6, 20.4], [35, 20.4]]);
const DELT = P('shoulders', [[11.2, 35.4], [12.4, 29], [16, 24.8], [21.6, 22.2], [27, 21.6], [25.4, 26], [22.6, 31.4], [20.8, 37.8], [11.4, 38.4]]);
const FOREARM = P('forearms', [[9.8, 50.4], [20, 50.4], [19.2, 58], [18.2, 66.2], [12.4, 66.2], [10, 55]]);
const KNEE = P('legs', [[27.6, 96.6], [37.8, 96.6], [37.6, 101.4], [27.4, 101.4]]);

const FRONT: Piece[] = [
  NECK, DELT, FOREARM, KNEE,
  P('back', [[27, 20], [35, 17.2], [35, 21.4], [28, 22.4]]),                                                           // 승모(앞)
  P('chest', [[26.6, 22.2], [40.6, 22.4], [40.6, 38], [34, 39.6], [27.4, 38.6], [23.8, 35.4], [23.4, 29.4]]),          // 가슴
  P('abs', [[35, 39.6], [40.6, 38.2], [40.6, 62.4], [35, 62.4]], [45.2, 50.8, 56.4]),                                  // 복근(4칸)
  P('abs', [[23.4, 36], [27.4, 38.6], [35, 39.8], [35, 62.4], [30.4, 62.4], [28.4, 57], [25.4, 49], [23.4, 42]]),      // 옆구리
  P(null, [[29.4, 62.4], [40.6, 62.4], [40.6, 70.8], [33, 66.8]]),                                                     // 아랫배
  P('triceps', [[10.6, 38.6], [13.6, 38.6], [13, 44], [13.4, 50.2], [10.8, 50], [10.4, 44]]),                          // 삼두(바깥에 보이는 부분)
  P('biceps', [[13.6, 38.4], [21.4, 38.2], [20.6, 45], [19.8, 50.2], [13.4, 50.2], [13, 44]]),
  P('legs', [[26.2, 70.8], [31.8, 68.4], [33.4, 80], [33, 96.6], [28, 96.6], [24.4, 86], [24.4, 78]]),                 // 허벅지 바깥
  P('legs', [[31.8, 68.4], [40.6, 70.8], [39.4, 78], [38.6, 86], [37.8, 93], [37.6, 96.6], [33, 96.6], [33.4, 80]]),   // 허벅지 안쪽
  P('legs', [[27.4, 101.4], [32.2, 101.4], [32.2, 118.6], [29.6, 118.6], [26, 106]]),                                  // 정강이 바깥
  P('legs', [[32.2, 101.4], [37.8, 101.4], [38.4, 105], [37.2, 112], [35.6, 118.6], [32.2, 118.6]]),                   // 종아리 안쪽
];
const BACK: Piece[] = [
  NECK, DELT, FOREARM, KNEE,
  P('back', [[27, 20], [35, 17.2], [40.6, 16.4], [40.6, 44], [36.6, 36.6], [32, 29], [28.2, 23.8]]),                    // 승모
  P('back', [[28.6, 26.4], [32, 29.4], [35.4, 36.4], [31.6, 39.4], [27, 37], [26.4, 31]]),                              // 견갑골
  P('back', [[23.4, 36.4], [27, 37.2], [31.6, 39.8], [35.6, 36.8], [40.6, 44.4], [40.6, 54], [35.4, 57.4], [30.6, 61], [28.4, 56.6], [25.4, 49], [23.4, 42]]), // 광배
  P('back', [[35.4, 57.6], [40.6, 54.2], [40.6, 63.6], [29.4, 63.6], [30.6, 61.2]]),                                   // 허리
  P('triceps', [[10.6, 38.4], [21.4, 38.2], [20.6, 45], [19.8, 50.2], [10.8, 50], [10.4, 44]]),
  P('legs', [[29.4, 63.8], [40.6, 63.8], [40.6, 76], [34, 77.6], [27.6, 75.4], [26.4, 70]]),                            // 엉덩이
  P('legs', [[24.8, 75], [32.4, 77.8], [33, 96.6], [28, 96.6], [24.4, 86]]),                                            // 햄스트링 바깥
  P('legs', [[32.4, 77.8], [40.6, 76.2], [39.4, 80], [38.6, 86], [37.6, 96.6], [33, 96.6]]),                            // 햄스트링 안쪽
  P('legs', [[27.4, 101.4], [32.2, 101.4], [32.2, 112], [30, 116], [26, 106]]),                                         // 종아리 바깥
  P('legs', [[32.2, 101.4], [37.8, 101.4], [38.4, 105], [37.2, 111], [34.6, 116], [32.2, 112]]),                        // 종아리 안쪽
  P('legs', [[29.6, 116], [35.2, 116], [35.6, 118.6], [29.6, 118.6]]),                                                  // 아킬레스
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
