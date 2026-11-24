// 루틴 그림 PNG 만들기: npm run routine-art
// 원본은 src/brand/routines/pictogram.ts(그리는 법) + src/domain/routineArt.ts(11종 목록).
// public/routines/<id>.png 로 저장(배경 투명, 2배). 앱에서는 작게 줄여 보여 줘요.
import { mkdirSync, writeFileSync } from 'node:fs';
import { drawPicto, PICTO_PALETTE } from '../src/brand/routines/pictogram.ts';
import { ROUTINE_ARTS } from '../src/domain/routineArt.ts';
import { png, rgb } from './png.ts';

const SCALE = 2;
const OUT = new URL('../public/routines/', import.meta.url);
mkdirSync(OUT, { recursive: true });

for (const art of ROUTINE_ARTS) {
  const g = drawPicto(art);
  const W = g[0]!.length * SCALE, H = g.length * SCALE;
  const px = new Uint8Array(W * H * 4);
  g.forEach((row, y) => row.forEach((c, x) => {
    const hex = PICTO_PALETTE[c]; if (!hex) return;
    const [r, gg, b] = rgb(hex);
    for (let j = 0; j < SCALE; j++) for (let i = 0; i < SCALE; i++) {
      const o = ((y * SCALE + j) * W + x * SCALE + i) * 4;
      px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = 255;
    }
  }));
  writeFileSync(new URL(`${art.id}.png`, OUT), png(W, H, px));
  console.log('만듦', `${art.id}.png`, `${W}×${H}`);
}
