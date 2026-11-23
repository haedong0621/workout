// 꾹 눌러서 끌어 순서 바꾸기 (마우스 + 아이폰 같은 터치)
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });

const sheet = (page: Page) => page.locator('.sheet.open').last();

async function routineWith(page: Page, names: string[]) {
  await page.goto('/');
  await page.click('text=첫 루틴 만들기');
  await page.fill('.title-input', '순서 테스트');
  await page.click('text=운동 추가');
  for (const n of names) {
    await sheet(page).locator('input[type=search]').fill(n);
    await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: new RegExp(`^${n}$`) }) }).click();
  }
  await sheet(page).locator('.sheet-foot .btn').click();
  await expect(page.locator('.sheet')).toHaveCount(0); // 닫히는 애니메이션이 끝날 때까지
  await expect(page.locator('.ritem-name')).toHaveText(names);
}

/** 크롬 개발자 도구 프로토콜로 진짜 터치 이벤트 보내기 */
async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, holdMs = 550) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
  await page.waitForTimeout(holdMs);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('루틴 편집: 마우스로 꾹 눌러 끌면 순서가 바뀜', async ({ page }) => {
  await routineWith(page, ['벤치 프레스', '스쿼트', '데드리프트']);
  const first = await page.locator('.ritem').nth(0).boundingBox();
  const third = await page.locator('.ritem').nth(2).boundingBox();
  await page.mouse.move(first!.x + 60, first!.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await expect(page.locator('.ritem.sort-lifted')).toHaveCount(1);
  await page.mouse.move(first!.x + 60, third!.y + third!.height - 5, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.ritem-name')).toHaveText(['스쿼트', '데드리프트', '벤치 프레스']);
});

test('루틴 편집: 짧게 누르고 움직이면 끌리지 않음', async ({ page }) => {
  await routineWith(page, ['벤치 프레스', '스쿼트']);
  const first = await page.locator('.ritem').nth(0).boundingBox();
  await page.mouse.move(first!.x + 60, first!.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(first!.x + 60, first!.y + 200, { steps: 5 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(page.locator('.ritem.sort-lifted')).toHaveCount(0);
  await expect(page.locator('.ritem-name')).toHaveText(['벤치 프레스', '스쿼트']);
});

test('운동 중: 터치로 꾹 눌러 카드 순서 바꾸기, 놓을 때 세트 편집이 열리지 않음', async ({ page }) => {
  await routineWith(page, ['벤치 프레스', '스쿼트']);
  await page.click('.topbar >> text=저장');
  await page.click('.routine-card');
  await sheet(page).locator('text=운동 시작').click();
  await expect(page.locator('.ex-card .ex-name')).toHaveText(['벤치 프레스', '스쿼트']);
  await expect(page.locator('.sheet')).toHaveCount(0);
  const a = await page.locator('.ex-card').nth(0).boundingBox();
  const b = await page.locator('.ex-card').nth(1).boundingBox();
  // 세트 칸 위에서 꾹 누름 → 끌기 (놓은 뒤 세트 편집 시트가 열리면 안 됨)
  const cell = await page.locator('.ex-card').nth(0).locator('.set-row .cell').first().boundingBox();
  await touchDrag(page, { x: cell!.x + 20, y: cell!.y + 20 }, { x: cell!.x + 20, y: b!.y + b!.height - 10 + (cell!.y - a!.y) - 40 });
  await expect(page.locator('.ex-card .ex-name')).toHaveText(['스쿼트', '벤치 프레스']);
  await page.waitForTimeout(400);
  await expect(page.locator('.sheet.open')).toHaveCount(0);
  // 짧게 탭하면 세트 편집이 그대로 열림
  await page.locator('.ex-card').nth(0).locator('.set-row .cell').first().tap();
  await expect(page.locator('.sheet.open .seted')).toBeVisible();
});
