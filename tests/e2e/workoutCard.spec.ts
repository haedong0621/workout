// 운동 카드: 높이 고정 · 세트 밀어서 삭제 · 실패 세트 목표 · 대체 운동 · 미실시 · 루틴 반영 묻기
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });

const sheet = (page: Page) => page.locator('.sheet.open').last();
const card = (page: Page, i: number) => page.locator('.ex-page').nth(i);

/** 루틴을 만들고 운동 시작 */
async function startWith(page: Page, names: string[]) {
  await page.goto('/');
  await page.click('text=첫 루틴 만들기');
  await page.fill('.title-input', '카드 테스트');
  await page.click('text=운동 추가');
  for (const n of names) {
    await sheet(page).locator('input[type=search]').fill(n);
    await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: new RegExp(`^${n}$`) }) }).click();
  }
  await sheet(page).locator('.sheet-foot .btn').click();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await page.click('.topbar >> text=저장');
  await page.click('.routine-card');
  await sheet(page).locator('text=운동 시작').click();
  await expect(page.locator('.sheet')).toHaveCount(0);
}

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt({ x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(350);
}

/** 운동 메뉴(⋯)에서 고르고, 운동 고르기 창에서 이름으로 선택 */
async function menuPick(page: Page, i: number, menu: string, exercise: string) {
  await card(page, i).locator('.ex-head .icon-btn').click();
  await sheet(page).locator(`text=${menu}`).first().click();
  await sheet(page).locator('input[type=search]').fill(exercise);
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: new RegExp(`^${exercise}$`) }) }).click();
  await expect(page.locator('.sheet')).toHaveCount(0);
}

test('카드 높이가 모두 같고(운동 추가 카드 포함) 화면은 세로로 안 밀림, 교체 후에도 그대로', async ({ page }) => {
  await startWith(page, ['바벨 벤치 프레스', '덤벨 플라이']);
  const heights = () => page.locator('.ex-page .ex-card').evaluateAll((cs) => cs.map((c) => (c as HTMLElement).offsetHeight));
  const hs = await heights();
  expect(hs).toHaveLength(3);
  expect(new Set(hs).size).toBe(1);
  expect(hs[0]).toBeGreaterThan(300);
  expect(await page.locator('#view').evaluate((v) => v.scrollHeight - v.clientHeight)).toBeLessThanOrEqual(1);
  // 세트를 늘려도 카드 높이는 그대로 (세트 목록만 스크롤)
  for (let k = 0; k < 6; k++) await card(page, 0).locator('text=세트 추가').click();
  expect(await heights()).toEqual(hs);
  // 운동 교체(예전엔 높이 0으로 깨짐) 후에도 그대로
  await menuPick(page, 1, '운동 교체', '바벨 스쿼트');
  await expect(card(page, 1).locator('.ex-name')).toHaveText('바벨 스쿼트');
  expect(await heights()).toEqual(hs);
});

test('세트 줄을 왼쪽으로 밀면 삭제 버튼 → 눌러야 지워짐, 실패 세트는 목표 횟수 표시', async ({ page }) => {
  await startWith(page, ['바벨 벤치 프레스']);
  const rows = card(page, 0).locator('.set-row');
  const n = await rows.count();
  const r = (await rows.nth(1).boundingBox())!;
  await touchDrag(page, { x: r.x + r.width - 40, y: r.y + r.height / 2 }, { x: r.x + r.width - 160, y: r.y + r.height / 2 + 3 });
  await expect(page.locator('.ex-dots .dot').first()).toHaveClass(/on/); // 카드는 안 넘어감
  await expect(rows).toHaveCount(n); // 밀기만 해서는 안 지워짐
  await card(page, 0).locator('.set-del').nth(1).click();
  await expect(rows).toHaveCount(n - 1);
  // 실패(F)로 바꾸면 그때 횟수가 목표로
  const reps = await card(page, 0).locator('.set-row').first().locator('.cell').nth(1).locator('.num').textContent();
  await card(page, 0).locator('.set-label').first().click();
  await sheet(page).locator('text=F · 실패 세트').click();
  await expect(card(page, 0).locator('.set-row').first().locator('.goal')).toHaveText(`목표 ${reps}`);
});

test('대체 운동 → "대체" 표시, 안 한 운동은 미실시로 남고, 운동을 바꿨으면 루틴에 반영할지 물어봄', async ({ page }) => {
  await startWith(page, ['바벨 벤치 프레스', '덤벨 플라이', '바벨 컬']);
  // 1번: 대체 운동 (루틴 변경 아님)
  await menuPick(page, 0, '대체 운동', '덤벨 벤치 프레스');
  await expect(card(page, 0).locator('.sub-tag')).toHaveText('대체');
  await expect(card(page, 0).locator('.sub-of')).toContainText('바벨 벤치 프레스 대신');
  // 2번: 운동 교체 (루틴 변경 = 뺌 + 추가)
  await page.locator('.ex-dots .dot').nth(1).click();
  await menuPick(page, 1, '운동 교체', '케이블 플라이');
  // 1·2번만 한 세트씩, 3번은 안 함 → 미실시
  await card(page, 1).locator('.check').first().click();
  await page.locator('.ex-dots .dot').nth(0).click();
  await card(page, 0).locator('.check').first().click();
  await page.locator('.bottombar .btn.primary').click();
  await expect(sheet(page)).toContainText('"미실시"로 남아요');
  await sheet(page).locator('text=저장하고 종료').click();
  // 루틴 반영 질문: 교체만 나오고, 대체·미실시는 안 나옴
  await expect(sheet(page)).toContainText('루틴에도 반영할까요?');
  await expect(sheet(page)).toContainText('+ 케이블 플라이 (추가)');
  await expect(sheet(page)).toContainText('− 덤벨 플라이 (뺌)');
  await expect(sheet(page)).not.toContainText('덤벨 벤치 프레스');
  await sheet(page).locator('text=루틴에 반영').click();
  // 기록 상세: 대체 표시 + 미실시
  await expect(page.locator('.ex-sum').first()).toContainText('대체');
  await expect(page.locator('.ex-sum.skipped')).toContainText('바벨 컬');
  await expect(page.locator('.ex-sum.skipped')).toContainText('미실시');
  // 루틴: 덤벨 플라이 → 케이블 플라이, 바벨 벤치 프레스·바벨 컬은 그대로
  await page.goto('/#/home');
  await page.click('.routine-card');
  await expect(sheet(page).locator('.rs-item .grow')).toHaveText(['바벨 벤치 프레스', '케이블 플라이', '바벨 컬']);
});
