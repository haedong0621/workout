// 앱 아이콘 PNG 만들기: npm run icons
// 원본은 src/brand/pixelArt.ts. 픽셀이 흐려지지 않게 정수 배율 + 가운데 여백(배경색)으로 맞춰요.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { iconSvg } from '../src/brand/pixelArt.ts';

const OUT = new URL('../public/icons/', import.meta.url);
const targets: { file: string; svg: string; size: number }[] = [
  { file: 'apple-touch-icon.png', svg: iconSvg(5), size: 180 },                               // 36×5 = 180
  { file: 'icon-192.png', svg: iconSvg(5, { size: 192, offset: 6 }), size: 192 },              // 180 + 여백 6
  { file: 'icon-512.png', svg: iconSvg(14, { size: 512, offset: 4 }), size: 512 },             // 504 + 여백 4
  { file: 'icon-maskable-512.png', svg: iconSvg(11, { size: 512, offset: 58 }), size: 512 },   // 안전 영역(가운데 80%) 안에
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0">${t.svg}</body></html>`);
  const png = await page.locator('svg').screenshot({ omitBackground: true });
  writeFileSync(new URL(t.file, OUT), png);
  console.log('만듦', t.file);
}
await browser.close();
