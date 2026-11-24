// 루틴 그림: 운동 부위로 자동 추천, 11종 중 직접 고르기
import { expect, test, type Page } from '@playwright/test';

const sheet = (page: Page) => page.locator('.sheet.open').last();

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('루틴 그림: 추천 → 직접 고르기 → 홈에 보임', async ({ page }) => {
  await page.goto('/');
  await page.click('text=첫 루틴 만들기');
  await page.fill('.title-input', '등날');
  // 운동이 없으면 전신
  await expect(page.locator('.routine-head .routine-art img')).toHaveAttribute('src', './routines/full.png');
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('랫 풀다운');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^케이블 랫 풀다운$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();
  // 등 운동만 → 등 추천
  await expect(page.locator('.routine-head .routine-art img')).toHaveAttribute('src', './routines/back.png');

  await page.click('.thumb-btn');
  await expect(sheet(page).locator('.art-cell')).toHaveCount(11);
  await expect(sheet(page).locator('.art-cell.on .art-label')).toHaveText('등');
  await expect(sheet(page).locator('.art-cell', { has: page.locator('.art-rec') }).locator('.art-label')).toHaveText('등');
  await sheet(page).locator('.art-cell', { hasText: '상체 전체' }).click();
  await expect(page.locator('.routine-head .routine-art img')).toHaveAttribute('src', './routines/upper.png');

  await page.click('.topbar >> text=저장');
  await expect(page.locator('.routine-card .routine-art img')).toHaveAttribute('src', './routines/upper.png');
  // 그림 파일이 실제로 열림
  const ok = await page.locator('.routine-card .routine-art img').evaluate((img: HTMLImageElement) => img.decode().then(() => img.naturalWidth));
  expect(ok).toBeGreaterThan(0);
});
