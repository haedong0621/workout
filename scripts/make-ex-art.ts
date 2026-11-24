// 기본 운동 그림 PNG 만들기: npm run ex-art
// 원본은 src/brand/exercises/*.ts. 프레임들을 가로로 이어 붙인 스프라이트 한 장(배경 투명)으로 저장해요.
// 앱은 CSS로 프레임을 번갈아 보여 줘요(움짤처럼). 3배로 키워 저장 → 작게 줄여도 또렷.
import { mkdirSync, writeFileSync } from 'node:fs';
import { EX_ARTS } from '../src/brand/exercises/index.ts';
import { EX_PALETTE } from '../src/brand/exercises/palette.ts';
import { png, rgb } from './png.ts';

const SCALE = 3;
const OUT = new URL('../public/exercises/', import.meta.url);
mkdirSync(OUT, { recursive: true });

for (const art of EX_ARTS) {
  const frames = art.frames.map((f) => f());
  const n = art.size, W = n * frames.length * SCALE, H = n * SCALE;
  const px = new Uint8Array(W * H * 4);
  frames.forEach((g, fi) => g.forEach((row, y) => row.forEach((c, x) => {
    const hex = EX_PALETTE[c]; if (!hex) return;
    const [r, gg, b] = rgb(hex);
    for (let j = 0; j < SCALE; j++) for (let i = 0; i < SCALE; i++) {
      const o = ((y * SCALE + j) * W + (fi * n + x) * SCALE + i) * 4;
      px[o] = r!; px[o + 1] = gg!; px[o + 2] = b!; px[o + 3] = 255;
    }
  })));
  writeFileSync(new URL(`${art.id}.png`, OUT), png(W, H, px));
  console.log('만듦', `${art.id}.png`, `${W}×${H}`, `${frames.length}프레임`);
}
