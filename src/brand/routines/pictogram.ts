// 루틴 그림: 2D 도트 픽토그램 (32×32칸, 배경 투명)
// 얼굴 없는 단순한 사람 실루엣(회색)에 운동하는 부위만 앱의 부위 색으로 칠한다.
// 사람은 좌우 대칭: 왼쪽 반(가운데 칸 포함 16칸)만 그리고 거울처럼 복사한다(전체 31칸).
import { blank, type Grid } from '../pixelArt.ts';

export const PICTO_SIZE = 32;

/** 칸 글자 → 색. 몸(회색) + 부위 색(앱 PART_COLOR) + 각 부위의 진한 선 */
export const PICTO_PALETTE: Record<string, string> = {
  b: '#aeb8c3', d: '#929eaa',           // 몸 / 몸 선
  c: '#ff6b6b', C: '#d94a4a',           // 가슴
  k: '#5b8def', K: '#3f6fcc',           // 등
  s: '#2dd4bf', S: '#1aa897',           // 어깨
  a: '#b388ff', A: '#8f62e0',           // 팔
  l: '#ffc14d', L: '#dc9b25',           // 하체
  o: '#ff9f5a', O: '#dc7a35',           // 복근
  r: '#4dc3ff', R: '#2a9ad6',           // 유산소
};

export type Region = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'legs';

/**
 * 왼쪽 절반(16칸) 몸 모양. 오른쪽은 거울로 복사.
 *  # 몸  S 어깨  C 가슴  B 위팔(앞=이두)  T 위팔(뒤=삼두)  F 아래팔  A 복근  K 등  G 엉덩이  L 다리  . 빈칸
 */
const FRONT = [
  '................',
  '.............###',
  '............####',
  '............####',
  '............####',
  '............####',
  '............####',
  '.............###',
  '..............##',
  '...........#####',
  '.........SS#####',
  '........SSS#CCCC',
  '.......SSSSCCCCC',
  '.......SSS.CCCCC',
  '......BBB..#CCCC',
  '......BBB..##CCC',
  '......BBB..##AAA',
  '......BBB...#AAA',
  '.....FFF....#AAA',
  '.....FFF....#AAA',
  '.....FFF....#AAA',
  '.....FFF...#####',
  '.....###..######',
  '.....##...LLLLL.',
  '..........LLLLL.',
  '..........LLLLL.',
  '..........LLLL..',
  '...........LLL..',
  '...........LLL..',
  '...........LLL..',
  '...........LLL..',
  '..........####..',
];
const BACK = [
  '................',
  '.............###',
  '............####',
  '............####',
  '............####',
  '............####',
  '............####',
  '.............###',
  '..............##',
  '...........KKKKK',
  '.........SSKKKKK',
  '........SSSKKKKK',
  '.......SSSSKKKKK',
  '.......SSS.KKKKK',
  '......TTT..KKKKK',
  '......TTT..KKKKK',
  '......TTT..#KKKK',
  '......TTT...##KK',
  '.....FFF....####',
  '.....FFF....####',
  '.....FFF....####',
  '.....FFF...GGGGG',
  '.....###..GGGGGG',
  '.....##...LLLLL.',
  '..........LLLLL.',
  '..........LLLLL.',
  '..........LLLL..',
  '...........LLL..',
  '...........LLL..',
  '...........LLL..',
  '...........LLL..',
  '..........####..',
];
const CODE: Record<string, Region | '#' | '.'> = { '#': '#', '.': '.', S: 'shoulders', C: 'chest', B: 'biceps', T: 'triceps', F: 'forearms', A: 'abs', K: 'back', G: 'legs', L: 'legs' };
function leftHalf(view: 'front' | 'back'): (Region | '#' | '.')[][] {
  return (view === 'front' ? FRONT : BACK).map((row) => [...row].map((ch) => CODE[ch] ?? '.'));
}

const FILL: Record<Region, string> = { chest: 'c', back: 'k', shoulders: 's', biceps: 'a', triceps: 'a', forearms: 'a', abs: 'o', legs: 'l' };

export interface PictoSpec { view: 'front' | 'back'; hl: Region[] }

/** 픽토그램 그리기: 강조 부위는 색, 나머지는 회색 몸 */
export function drawPicto(spec: PictoSpec): Grid {
  const half = leftHalf(spec.view);
  const on = new Set(spec.hl);
  const g = blank(PICTO_SIZE, PICTO_SIZE);
  for (let y = 0; y < PICTO_SIZE; y++) {
    for (let x = 0; x < 16; x++) {
      const v = half[y]![x]!;
      if (v === '.') continue;
      const c = v !== '#' && on.has(v) ? FILL[v] : 'b';
      g[y]![x] = c; g[y]![30 - x] = c;   // 가운데 = 15번 칸(한 칸)
    }
  }
  // 진한 선: 앞 = 가슴 가르기·가슴 아랫선·복근 칸 / 뒤 = 척추
  const dark = (c: string) => (c === 'b' ? 'd' : c.toUpperCase());
  const line = (x: number, y: number) => { const c = g[y]![x]!; if (c !== '.') g[y]![x] = dark(c); };
  if (spec.view === 'front') {
    for (let y = 11; y <= 20; y++) line(15, y);
    for (const y of [18, 20]) for (let x = 13; x <= 17; x++) line(x, y);
  } else {
    for (let y = 9; y <= 20; y++) line(15, y);
  }
  return g;
}
