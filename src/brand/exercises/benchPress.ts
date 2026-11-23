// 벤치 프레스 — 옆에서 본 픽셀아트 2프레임 (32×32칸, 배경 투명)
// 1프레임: 팔을 편 상태(바벨 위) / 2프레임: 가슴까지 내린 상태
import { blank, px, rect, type Grid } from '../pixelArt.ts';

const SIZE = 32;

/** 둥근 원판(옆에서 본 바벨 끝). 가운데 (cx, cy) */
function plate(g: Grid, cx: number, cy: number) {
  rect(g, cx - 2, cy - 4, 5, 9, 'W'); rect(g, cx - 3, cy - 3, 7, 7, 'W'); rect(g, cx - 4, cy - 2, 9, 5, 'W');
  px(g, cx - 2, cy - 3, 'w'); px(g, cx - 3, cy - 2, 'w'); px(g, cx - 1, cy - 4, 'w'); // 빛
  rect(g, cx - 1, cy - 1, 3, 3, 'R'); px(g, cx, cy, 'r');                          // 가운데 봉
}

function base(): Grid {
  const g = blank(SIZE, SIZE);
  // 바닥
  rect(g, 1, 30, 30, 1, 'G');
  // 벤치: 패드 + 다리
  rect(g, 5, 21, 20, 2, 'B'); rect(g, 5, 23, 20, 1, 'b');
  rect(g, 7, 24, 2, 6, 'b'); rect(g, 21, 24, 2, 6, 'b'); rect(g, 6, 29, 4, 1, 'b'); rect(g, 20, 29, 4, 1, 'b');
  // 머리 (왼쪽)
  rect(g, 3, 16, 4, 5, 'S'); rect(g, 2, 17, 1, 3, 'S'); rect(g, 3, 15, 4, 1, 'H'); rect(g, 2, 16, 1, 1, 'H'); px(g, 7, 17, 'S');
  px(g, 5, 18, 'K'); // 눈
  // 몸통(티셔츠) + 반바지
  rect(g, 7, 17, 11, 4, 'T'); rect(g, 8, 16, 6, 1, 'T'); rect(g, 7, 20, 11, 1, 't');
  rect(g, 18, 17, 4, 4, 'P');
  // 허벅지 → 무릎 → 정강이 → 신발 (무릎 굽혀 발은 바닥)
  rect(g, 22, 17, 4, 3, 'S'); rect(g, 22, 19, 4, 1, 's');
  rect(g, 25, 18, 2, 11, 'S'); rect(g, 26, 18, 1, 11, 's');
  rect(g, 25, 29, 4, 1, 'F'); rect(g, 25, 28, 3, 1, 'F');
  return g;
}

/** 1프레임: 팔을 위로 쭉 (손 = 원판 가운데) */
export function benchFrameUp(): Grid {
  const g = base();
  rect(g, 10, 8, 2, 9, 'S'); rect(g, 11, 8, 1, 9, 's');   // 팔(위팔+아래팔 일직선)
  plate(g, 11, 6);
  return g;
}

/** 2프레임: 가슴까지 내림 (팔꿈치는 벤치 옆으로 내려감) */
export function benchFrameDown(): Grid {
  const g = base();
  // 위팔: 어깨(10,18) → 팔꿈치(13,23) 대각선
  for (let i = 0; i < 5; i++) { rect(g, 10 + Math.round(i * 0.75), 18 + i, 2, 1, 'S'); }
  rect(g, 13, 23, 2, 1, 's');
  // 아래팔: 팔꿈치 → 손(바벨) 수직
  rect(g, 13, 15, 2, 8, 'S'); rect(g, 14, 15, 1, 8, 's');
  plate(g, 13, 12);
  return g;
}

export const BENCH_PRESS = { id: 'bench-press', frames: [benchFrameUp, benchFrameDown], size: SIZE } as const;
