// 기본 운동 그림(벤치 프레스)이 목록·상세에 보이는지
import { expect, test } from '@playwright/test';

test('벤치 프레스 기본 그림 표시', async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.goto('/');
  await page.click('#tabbar >> text=종목');
  const art = page.locator('.ex-art').first();
  await expect(art).toBeVisible();
  // 이미지가 실제로 불러와지는지
  const ok = await page.evaluate(async () => {
    const el = document.querySelector('.ex-art') as HTMLElement;
    const url = getComputedStyle(el).backgroundImage.slice(5, -2);
    const r = await fetch(url); return r.ok && (r.headers.get('content-type') ?? '').includes('png');
  });
  expect(ok).toBe(true);
  // 그림은 벤치 프레스 하나에만
  await expect(page.locator('.ex-art')).toHaveCount(1);
});
