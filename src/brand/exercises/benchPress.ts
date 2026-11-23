// 벤치 프레스 — 옆모습 픽셀아트 2프레임 (48×48칸, 배경 투명)
// 1프레임: 팔을 편 상태(바벨 위) / 2프레임: 가슴까지 내린 상태
import type { Grid } from '../pixelArt.ts';
import { box, canvas, disc, ellipse, limb, minus, paint, union } from './kit.ts';

const SIZE = 48;
const SKIN = { fill: 'S', shade: 's', light: 'L' };

/** 바벨 끝(옆에서 본 원판 + 봉) */
function barbell(g: Grid, cx: number, cy: number) {
  paint(g, disc(cx, cy, 6.2), { fill: 'W', shade: 'w', light: 'X' });
  paint(g, minus(disc(cx, cy, 4.2), disc(cx, cy, 3.2)), { fill: 'X', outline: null }); // 원판 홈
  paint(g, disc(cx, cy, 1.6), { fill: 'R', shade: 'r' });                             // 봉 끝
}

function body(g: Grid) {
  // 바닥
  paint(g, box(2, 45, 44, 2), { fill: 'G', outline: null });
  // 벤치: 다리 → 패드
  paint(g, union(box(12, 33, 2, 11), box(30, 33, 2, 11)), { fill: 'M', shade: 'm' });
  paint(g, union(box(9, 43, 8, 2), box(27, 43, 8, 2)), { fill: 'M', shade: 'm' });
  paint(g, box(8, 30, 27, 3), { fill: 'B', shade: 'b', light: 'V' });
  // 다리(무릎 세우고 발은 바닥): 허벅지 → 정강이 → 신발
  paint(g, limb(36, 23, 37, 40, 1.9), SKIN);
  paint(g, limb(30, 25.5, 36, 22.5, 2.3), SKIN);
  paint(g, union(box(34, 40, 7, 3), box(38, 39, 3, 1)), { fill: 'F', shade: 'f' });
  paint(g, box(34, 43, 8, 1), { fill: 'Q', outline: 'K' });
  // 반바지
  paint(g, union(ellipse(28.5, 27, 3.2, 3.2), limb(28.5, 26.5, 31, 25, 2.6)), { fill: 'P', shade: 'p' });
  // 목 → 몸통(가슴 볼록) → 머리
  paint(g, limb(11, 26, 15, 26, 2), SKIN);
  paint(g, union(ellipse(20.5, 26.5, 7.5, 3.6), ellipse(18.5, 25, 4.8, 3.3)), { fill: 'T', shade: 't', light: 'U' });
  paint(g, disc(9.5, 25, 4.3), SKIN);
  // 머리카락(뒤통수 = 벤치 쪽 왼편)
  for (let y = 19; y < 31; y++) for (let x = 3; x < 15; x++) {
    if (disc(9.5, 25, 4.3)(x, y) && (x - 9.5) * 0.9 + (y - 25) * 0.45 < -1.2) g[y]![x] = (x + y) % 5 === 0 ? 'h' : 'H';
  }
  g[22]![11] = 'K'; // 눈
  g[21]![13] = 'K'; // 코 끝
  g[25]![9] = 's';  // 귀
}

/** 1프레임: 팔을 위로 쭉 */
export function benchFrameUp(): Grid {
  const g = canvas(SIZE); body(g);
  paint(g, limb(17, 25, 17, 11, 1.6), SKIN);
  barbell(g, 17, 10);
  return g;
}

/** 2프레임: 가슴까지 내림 (팔꿈치는 몸 아래로) */
export function benchFrameDown(): Grid {
  const g = canvas(SIZE); body(g);
  paint(g, limb(16, 25, 18.5, 31, 1.7), SKIN);   // 위팔
  paint(g, limb(19.5, 31, 20, 19, 1.6), SKIN);   // 아래팔
  barbell(g, 20, 18);
  return g;
}

export const BENCH_PRESS = { id: 'bench-press', frames: [benchFrameUp, benchFrameDown], size: SIZE } as const;
