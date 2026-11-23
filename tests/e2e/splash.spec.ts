import { expect, test } from '@playwright/test';

test('앱을 열면 스플래시가 보였다가 사라지고 홈이 나옴', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#splash')).toBeVisible();
  await expect(page.locator('#splash .s-title')).toHaveAttribute('aria-label', '운동 일지');
  await expect(page.locator('#splash')).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator('h1')).toHaveText('운동 일지');
  await expect(page).toHaveTitle('운동 일지');
});

test('앱 이름·아이콘 정보', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.name).toBe('운동 일지');
  expect(m.short_name).toBe('운동 일지');
  for (const ic of m.icons) expect((await request.get(ic.src)).status()).toBe(200);
  expect((await request.get('/icons/apple-touch-icon.png')).status()).toBe(200);
});
