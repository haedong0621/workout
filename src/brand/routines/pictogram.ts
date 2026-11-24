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

// ── 실루엣: 매스 보디빌더 체형 — 거대한 삼각근, 높은 승모, 넓은 가슴, 크게 퍼진 광배, 잘록한 허리, 큰 허벅지 ──
const inHead = (x: number, y: number) => ((x - 40) / 5.6) ** 2 + ((y - 8.4) / 7.2) ** 2 <= 1;
const BODY: Pt[] = [
  [35.4, 11.5], [34.6, 14], [30, 15.6], [24, 17.8], [19, 20.4], [17.6, 28], [18, 34], [16.6, 38], [18.4, 46], [23, 54],
  [27.4, 59], [27, 64], [24, 70], [20.6, 78], [21.4, 88], [25, 96], [26.6, 99], [25, 103], [23.6, 108], [25.6, 114],
  [28.6, 120], [35.6, 120], [37.2, 113], [38.6, 106], [37.8, 101], [38, 95], [39, 86], [39.6, 78], [40.6, 72], [40.6, 11.5],
];
const ARM: Pt[] = [
  [19.4, 19.6], [12, 21.4], [7, 25.6], [4.6, 31], [4.4, 37], [5, 44], [5.4, 50], [4.6, 56], [5.6, 63], [7.6, 69],
  [13, 69], [14.4, 62], [15.2, 55], [15.6, 49], [16, 43], [16.6, 37.4], [17.8, 33],
];
const HAND: Pt[] = [[7, 68.6], [14, 68.6], [15.2, 72.6], [14.6, 77], [12.2, 80], [8.4, 79.6], [6.4, 74.6]];
const FOOT: Pt[] = [[28, 119.6], [36, 119.6], [37, 123.2], [37.8, 127.4], [25.8, 127.4], [26.6, 123.2]];

// ── 근육 조각 ──────────────────────────────────────
interface Piece { group: Group | null; poly: Pt[]; bands?: number[] }
const P = (group: Group | null, poly: Pt[], bands?: number[]): Piece => ({ group, poly, bands });

const NECK = P(null, [[35, 10], [40.6, 10], [40.6, 17], [35, 17]]);
const DELT = P('shoulders', [[4.4, 33], [5.6, 27.6], [9.6, 22.6], [15, 20.2], [21.4, 19.2], [24.6, 19.4], [21.4, 23.4], [18.2, 28], [16.4, 35], [10, 37.4], [4.6, 37.8]]);
const FOREARM = P('forearms', [[4.6, 50.8], [15.8, 50.8], [15.2, 55], [14.2, 62], [13.2, 69], [7.4, 69], [5.4, 62], [4.4, 56]]);
const KNEE = P('legs', [[25.4, 96.6], [38, 96.6], [37.8, 102], [25, 102]]);

const FRONT: Piece[] = [
  NECK, DELT, FOREARM, KNEE,
  P('back', [[24.6, 17.6], [34.6, 14.4], [35, 18.4], [26, 19.6]]),                                                     // 승모(앞)
  P('chest', [[23, 19.6], [40.6, 19.8], [40.6, 36], [33.4, 38.2], [25, 37.2], [19.6, 33], [18, 28], [20, 22.6]]),      // 가슴
  P('abs', [[34.4, 38], [40.6, 36.2], [40.6, 61.6], [34.4, 61.6]], [44, 50, 55.6]),                                    // 복근(4칸)
  P('abs', [[17.6, 31], [19.6, 33.4], [25, 37.4], [34.4, 38.4], [34.4, 61.6], [28, 61.6], [23, 54], [18.4, 46], [16.6, 38]]), // 옆구리·전거근
  P(null, [[27.2, 61.6], [40.6, 61.6], [40.6, 72.4], [32, 67]]),                                                       // 아랫배
  P('triceps', [[4.4, 38], [7.6, 38], [7.4, 44], [8, 50.4], [5.2, 50.2], [4.6, 44]]),                                  // 삼두(바깥에 보이는 부분)
  P('biceps', [[7.6, 37.8], [16.8, 37.4], [16, 43], [15.6, 50.4], [8, 50.4], [7.4, 44]]),
  P('legs', [[24, 70], [31.6, 67.6], [33, 80], [32.8, 96.6], [26.4, 96.6], [21, 88], [20.4, 78]]),                      // 허벅지 바깥
  P('legs', [[31.6, 67.6], [40.6, 72.6], [39.6, 78], [39, 86], [38, 93], [37.8, 96.6], [32.8, 96.6], [33, 80]]),         // 허벅지 안쪽
  P('legs', [[25, 102], [31.8, 102], [31.8, 120], [28.6, 120], [25.6, 114], [23.4, 108]]),                              // 정강이 바깥
  P('legs', [[31.8, 102], [38, 102], [38.8, 106], [37.4, 113], [35.8, 120], [31.8, 120]]),                              // 종아리 안쪽
];
const BACK: Piece[] = [
  NECK, DELT, FOREARM, KNEE,
  P('back', [[24.6, 17.6], [34.6, 14.4], [40.6, 13.6], [40.6, 44], [36, 35], [31, 27], [27, 21.4]]),                   // 승모
  P('back', [[27, 22.6], [31, 27.2], [35.4, 35.6], [30.4, 38.8], [24, 35.4], [23, 28]]),                               // 견갑골
  P('back', [[16.6, 34], [24, 35.6], [30.4, 39], [35.6, 36], [40.6, 44.4], [40.6, 53], [34.4, 57], [28.6, 60.6], [23, 54], [18.4, 46], [16.6, 38]]), // 광배
  P('back', [[34.4, 57.2], [40.6, 53.2], [40.6, 62.8], [27.2, 62.8], [28.6, 60.8]]),                                  // 허리
  P('triceps', [[4.4, 37.8], [16.8, 37.4], [16, 43], [15.6, 50.4], [5.2, 50.2], [4.6, 44]]),
  P('legs', [[27.2, 63], [40.6, 63], [40.6, 77], [33.6, 78.6], [24.6, 75.8], [23.8, 70]]),                              // 엉덩이
  P('legs', [[20.6, 76], [32.2, 78.8], [32.8, 96.6], [26.4, 96.6], [21, 88]]),                                         // 햄스트링 바깥
  P('legs', [[32.2, 78.8], [40.6, 77.2], [39.6, 80], [39, 86], [37.8, 96.6], [32.8, 96.6]]),                           // 햄스트링 안쪽
  P('legs', [[25, 102], [31.8, 102], [31.8, 112.4], [29.6, 116.6], [25.6, 114], [23.4, 108]]),                          // 종아리 바깥
  P('legs', [[31.8, 102], [38, 102], [38.8, 106], [37.4, 111.4], [34.6, 116.6], [31.8, 112.4]]),                        // 종아리 안쪽
  P('legs', [[29, 116.6], [35.4, 116.6], [35.8, 120], [28.6, 120]]),                                                    // 아킬레스
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
