// 운동 그림용 픽셀 도구: 모양(마스크)을 만들고, 테두리·명암을 자동으로 넣어 칠한다.
import { blank, type Grid } from '../pixelArt.ts';

export type Mask = (x: number, y: number) => boolean;

export const disc = (cx: number, cy: number, r: number): Mask => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
export const ellipse = (cx: number, cy: number, rx: number, ry: number): Mask => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const box = (x0: number, y0: number, w: number, h: number): Mask => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
/** 두 점을 잇는 둥근 막대(팔·다리) */
export const limb = (x0: number, y0: number, x1: number, y1: number, r: number): Mask => (x, y) => {
  const dx = x1 - x0, dy = y1 - y0; const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L)) : 0;
  return (x - (x0 + t * dx)) ** 2 + (y - (y0 + t * dy)) ** 2 <= r * r;
};
export const union = (...ms: Mask[]): Mask => (x, y) => ms.some((m) => m(x, y));
export const minus = (a: Mask, b: Mask): Mask => (x, y) => a(x, y) && !b(x, y);

export interface Tone { fill: string; shade?: string; light?: string; outline?: string | null }

/** 마스크를 칠한다: 바깥 테두리(1칸) → 채움 → 아래·오른쪽 그늘 → 위쪽 빛 */
export function paint(g: Grid, m: Mask, t: Tone) {
  const H = g.length, W = g[0]!.length;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && m(x, y);
  const outline = t.outline === undefined ? 'K' : t.outline;
  if (outline) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (inside(x, y)) continue;
      if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) g[y]![x] = outline;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    let c = t.fill;
    if (t.shade && (!inside(x, y + 1) || !inside(x + 1, y))) c = t.shade;
    else if (t.light && !inside(x, y - 1) && inside(x, y + 1)) c = t.light;
    g[y]![x] = c;
  }
}

export const canvas = (size: number): Grid => blank(size, size);
