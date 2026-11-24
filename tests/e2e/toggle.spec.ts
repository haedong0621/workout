// 장비 토글: 운동 카드에서 바벨 ↔ 스미스, 제목이 바뀌고 기록은 옵션별로
import { expect, test, type Page } from '@playwright/test';

const sheet = (page: Page) => page.locator('.sheet.open').last();

test('운동 카드 토글: 바벨 → 스미스, 상세에서 옵션별 기록', async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.goto('/');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await expect(page).toHaveURL(/#\/workout$/);
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('벤치');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^바벨 벤치 프레스$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();

  const card = page.locator('.ex-card').first();
  await expect(card.locator('.ex-name')).toHaveText('바벨 벤치 프레스');
  await expect(card.locator('.ex-toggle .seg-btn')).toHaveText(['바벨', '스미스']);
  await card.locator('.ex-toggle .seg-btn', { hasText: '스미스' }).click();
  await expect(card.locator('.ex-name')).toHaveText('스미스 벤치 프레스');

  // 세트 하나 하고 완료
  await card.locator('.set-row').first().locator('.cell').first().click();
  await sheet(page).locator('.big-input').first().fill('70');
  await page.locator('.sheet-back').last().click({ position: { x: 20, y: 20 } });
  await card.locator('.set-row .check').first().click();
  await page.click('text=운동 완료');
  await sheet(page).locator('text=저장하고 종료').click();
  await expect(page).toHaveURL(/#\/session\//);
  await expect(page.locator('.ex-sum').first()).toContainText('스미스 벤치 프레스');

  // 상세: 기본은 마지막 쓴 옵션(스미스), 바벨로 바꾸면 기록 없음
  await page.goto('/#/exercise/seed-0');
  await expect(page.locator('.opt-row .seg-btn.active')).toHaveText('스미스');
  await expect(page.locator('.stat-row')).toContainText('70');
  await page.locator('.opt-row .seg-btn', { hasText: '바벨' }).click();
  await expect(page.locator('.stat-row')).not.toContainText('70');

  // 목록에는 마지막 쓴 옵션 이름으로 보임
  await page.goto('/#/library');
  await expect(page.locator('.li-title', { hasText: /^스미스 벤치 프레스$/ })).toBeVisible();

  // 다음 운동은 마지막 쓴 옵션으로 시작
  await page.goto('/');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('벤치');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^스미스 벤치 프레스$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();
  await expect(page.locator('.ex-card .ex-name').first()).toHaveText('스미스 벤치 프레스');
});

test('이지바 토글: 바벨 컬 ↔ 이지바 컬', async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.goto('/');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('이지바 컬');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^바벨 컬$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();
  const card = page.locator('.ex-card').first();
  await expect(card.locator('.ex-toggle .seg-btn')).toHaveText(['바벨', '이지바']);
  await card.locator('.ex-toggle .seg-btn', { hasText: '이지바' }).click();
  await expect(card.locator('.ex-name')).toHaveText('이지바 컬');
});
