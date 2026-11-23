// 기본 운동 그림 PNG 만들기: npm run ex-art
// 원본은 src/brand/exercises/*.ts. 프레임들을 가로로 이어 붙인 스프라이트 한 장(배경 투명)으로 저장해요.
// 앱은 CSS로 프레임을 번갈아 보여 줘요(움짤처럼). 3배로 키워 저장 → 작게 줄여도 또렷.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { EX_ARTS } from '../src/brand/exercises/index.ts';
import { EX_PALETTE } from '../src/brand/exercises/palette.ts';

const SCALE = 3;
const OUT = new URL('../public/exercises/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w: number, h: number, rgba: Uint8Array) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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
