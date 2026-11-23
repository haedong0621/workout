// 앱 아이콘·이름 픽셀아트 원본 (한 곳에서만 관리)
// - 앱 아이콘 PNG: scripts/make-icons.ts 가 이 파일로 만들어요 (npm run icons)
// - 스플래시: 빌드할 때 index.html 에 SVG로 들어가요 (build/splash-plugin.ts)
// - 피그마 '00 브랜드' 페이지의 그림도 이 파일에서 뽑은 SVG예요
// 칸 하나 = 문자 하나. '.' = 빈칸(배경)

export type Grid = string[][];

const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => Array<string>(w).fill('.'));
const rect = (g: Grid, x: number, y: number, w: number, h: number, c: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const row = g[j]; if (row && i >= 0 && i < row.length) row[i] = c; }
};
const px = (g: Grid, x: number, y: number, c: string) => rect(g, x, y, 1, 1, c);

// ---------------- 앱 아이콘 (36×36) ----------------
export const ICON_SIZE = 36;
export const ICON_BG = '#0b8f62';
export const ICON_PALETTE: Record<string, string> = {
  O: '#0a3d2c', // 노트 테두리
  P: '#fffaf0', // 종이
  p: '#efe5cf', // 종이 그늘
  S: '#077352', // 노트 그림자
  R: '#f2f5f8', // 고리 밝은 면
  m: '#b8c2cc', // 고리 중간
  r: '#6f7c89', // 고리 어두운 면
  B: '#e5384a', // 책갈피
  b: '#b8233a', // 책갈피 그늘
  D: '#23292f', // 덤벨
  d: '#3d4752', // 덤벨 안쪽 원판
  e: '#7b8794', // 덤벨 빛
  g: '#56616d', // 손잡이 무늬
  C: '#0b8f62', // 체크
  X: '#9fb3aa', // 빈 칸 테두리
  L: '#d5ddd8', // 줄
  w: '#a7e8cd', // 반짝임
};

export function iconGrid(): Grid {
  const g = blank(ICON_SIZE, ICON_SIZE);
  // 반짝임
  for (const [x, y] of [[5, 3], [31, 28]] as const) { px(g, x, y - 1, 'w'); px(g, x - 1, y, 'w'); px(g, x, y, 'w'); px(g, x + 1, y, 'w'); px(g, x, y + 1, 'w'); }
  px(g, 4, 30, 'w'); px(g, 32, 6, 'w');
  // 노트: 그림자 → 테두리 → 종이
  rect(g, 11, 6, 21, 29, 'S');
  rect(g, 9, 4, 21, 29, 'O');
  rect(g, 10, 5, 19, 27, 'P');
  rect(g, 28, 5, 1, 27, 'p'); rect(g, 10, 31, 19, 1, 'p');
  px(g, 9, 4, '.'); px(g, 29, 4, '.'); px(g, 9, 32, '.'); px(g, 29, 32, 'S');
  // 스프링 고리
  // 속이 빈 고리: 위 = 밝게, 왼쪽·오른쪽 = 중간, 아래 = 그늘, 종이엔 구멍
  for (const y of [8, 14, 20, 26]) {
    rect(g, 7, y - 1, 3, 1, 'R');
    px(g, 6, y, 'R'); px(g, 9, y, 'm'); px(g, 10, y, 'r'); px(g, 11, y, 'O');
    rect(g, 6, y + 1, 3, 1, 'r');
  }
  // 책갈피 (위로 살짝 튀어나옴, 끝은 V 홈)
  rect(g, 23, 2, 3, 9, 'B'); rect(g, 25, 2, 1, 9, 'b'); px(g, 24, 10, 'P');
  // 덤벨
  rect(g, 12, 11, 2, 7, 'D'); rect(g, 25, 11, 2, 7, 'D');
  px(g, 12, 12, 'e'); px(g, 12, 13, 'e'); px(g, 25, 12, 'e'); px(g, 25, 13, 'e');
  rect(g, 14, 12, 1, 5, 'd'); rect(g, 24, 12, 1, 5, 'd');
  rect(g, 15, 14, 9, 1, 'D'); for (const x of [17, 19, 21]) px(g, x, 14, 'g');
  // 체크 목록
  [20, 24, 28].forEach((y, i) => {
    // ✓ 모양 (5×4)
    if (i < 2) { px(g, 16, y - 1, 'C'); px(g, 15, y, 'C'); px(g, 12, y + 1, 'C'); px(g, 14, y + 1, 'C'); px(g, 13, y + 2, 'C'); }
    else { rect(g, 12, y, 3, 3, 'X'); px(g, 13, y + 1, 'P'); }
    rect(g, 17, y + 1, [9, 7, 8][i]!, 1, 'L');
  });
  return g;
}

// ---------------- 앱 이름 '운동 일지' (획 2칸) ----------------
export const TITLE_COLOR = '#14181d';
export const TITLE_SHADOW = '#9fd9c2';
const CELL_W = 14, CELL_H = 16, GAP = 2, SPACE = 6;

type Draw = (g: Grid, ox: number) => void;
const ring = (g: Grid, x: number, y: number, w: number, h: number, c: string) => {
  rect(g, x + 1, y, w - 2, 2, c); rect(g, x + 1, y + h - 2, w - 2, 2, c);
  rect(g, x, y + 1, 2, h - 2, c); rect(g, x + w - 2, y + 1, 2, h - 2, c);
};
const GLYPHS: Record<string, (c: string) => Draw> = {
  운: (c) => (g, o) => { ring(g, o + 3, 0, 8, 6, c); rect(g, o, 7, 14, 2, c); rect(g, o + 6, 9, 2, 2, c); rect(g, o + 1, 12, 2, 4, c); rect(g, o + 1, 14, 12, 2, c); },
  동: (c) => (g, o) => { rect(g, o + 1, 0, 11, 2, c); rect(g, o + 1, 0, 2, 5, c); rect(g, o + 1, 3, 11, 2, c); rect(g, o + 6, 5, 2, 2, c); rect(g, o, 7, 14, 2, c); ring(g, o + 3, 10, 8, 6, c); },
  일: (c) => (g, o) => { ring(g, o, 0, 8, 6, c); rect(g, o + 11, 0, 2, 7, c); rect(g, o + 2, 8, 11, 2, c); rect(g, o + 11, 8, 2, 4, c); rect(g, o + 2, 11, 11, 2, c); rect(g, o + 2, 11, 2, 4, c); rect(g, o + 2, 14, 11, 2, c); },
  지: (c) => (g, o) => {
    rect(g, o, 1, 9, 2, c); rect(g, o + 4, 3, 2, 2, c);
    for (let k = 0; k < 5; k++) { rect(g, o + 3 - k, 5 + k, 2, 1, c); rect(g, o + 5 + k, 5 + k, 2, 1, c); }
    rect(g, o + 11, 0, 2, 16, c);
  },
};
const WORD = ['운', '동', ' ', '일', '지'];

export function titleGrid(): Grid {
  const w = WORD.reduce((a, ch) => a + (ch === ' ' ? SPACE : CELL_W + GAP), 0) - GAP + 1; // +1: 그림자
  const g = blank(w, CELL_H + 1);
  for (const [color, off] of [['s', 1], ['t', 0]] as const) {
    let x = 0;
    for (const ch of WORD) {
      if (ch === ' ') { x += SPACE; continue; }
      const draw = GLYPHS[ch]!(color);
      const layer = blank(w, CELL_H + 1);
      draw(layer, x);
      layer.forEach((row, y) => row.forEach((v, i) => { if (v !== '.') { const tr = g[y + off]; if (tr && i + off < tr.length) tr[i + off] = v; } }));
      x += CELL_W + GAP;
    }
  }
  return g;
}
export const TITLE_PALETTE: Record<string, string> = { t: TITLE_COLOR, s: TITLE_SHADOW };

// ---------------- SVG로 ----------------
/** 같은 색이 이어진 칸은 한 사각형으로 합쳐서 그려요 */
export function gridToSvg(g: Grid, palette: Record<string, string>, opts: { scale: number; size?: number; bg?: string; offset?: number } ): string {
  const { scale, bg, offset = 0 } = opts;
  const w = opts.size ?? (g[0]?.length ?? 0) * scale + offset * 2;
  const h = opts.size ?? g.length * scale + offset * 2;
  let out = bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '';
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x]!; let e = x;
      while (e < row.length && row[e] === c) e++;
      const fill = palette[c];
      if (c !== '.' && fill) out += `<rect x="${offset + x * scale}" y="${offset + y * scale}" width="${(e - x) * scale}" height="${scale}" fill="${fill}"/>`;
      x = e;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${out}</svg>`;
}

export const iconSvg = (scale: number, opts: { size?: number; offset?: number } = {}): string =>
  gridToSvg(iconGrid(), ICON_PALETTE, { scale, bg: ICON_BG, ...opts });
export const titleSvg = (scale: number): string => gridToSvg(titleGrid(), TITLE_PALETTE, { scale });
