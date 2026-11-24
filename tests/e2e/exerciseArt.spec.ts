// 운동 그림: 토글 옵션에 맞는 그림, 기본 운동은 사진 바꾸기 없음
import { expect, test, type Page } from '@playwright/test';

const sheet = (page: Page) => page.locator('.sheet.open').last();

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('운동 카드 토글을 바꾸면 그림도 바뀜 (바벨 → 스미스)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('바벨 스쿼트');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^바벨 스쿼트$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();
  const art = page.locator('.ex-card .ex-head .ex-art').first();
  await expect(art).toHaveAttribute('style', /barbell-squat\.png/);
  await page.locator('.ex-toggle .seg-btn', { hasText: '스미스' }).first().click();
  await expect(art).toHaveAttribute('style', /barbell-squat-smith\.png/);
  // 그림 파일이 실제로 있음
  const ok = await page.evaluate(async () => (await fetch('./exercises/barbell-squat-smith.png')).ok);
  expect(ok).toBe(true);
});

test('기본 운동 수정 화면에는 사진 선택이 없음', async ({ page }) => {
  await page.goto('/#/exercise/seed-5');
  await expect(page.locator('.hero-img .ex-art')).toBeVisible();
  await expect(page.locator('button.hero-img')).toHaveCount(0);
});
