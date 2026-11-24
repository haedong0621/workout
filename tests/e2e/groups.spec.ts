// 홈: 루틴 ⋯ 메뉴(그룹으로 관리·이름 변경·삭제), 그룹 접기, 꾹 눌러 끌어서 순서 바꾸기
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => { page.on('pageerror', (e) => { throw e; }); });
const sheet = (page: Page) => page.locator('.sheet.open').last();

async function makeRoutine(page: Page, name: string, exercise: string) {
  await page.locator('.section-title .btn', { hasText: '새 루틴' }).click();
  await page.fill('.title-input', name);
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill(exercise);
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: new RegExp(`^${exercise}$`) }) }).click();
  await sheet(page).locator('.sheet-foot .btn').click();
  await expect(page.locator('.sheet')).toHaveCount(0);
  await page.click('.topbar >> text=저장');
  await expect(page.locator('.routine-card', { hasText: name })).toBeVisible();
}
const names = (page: Page) => page.locator('.routine-card .routine-name');

test('⋯ 메뉴: 그룹으로 관리 → 새 그룹, 접기, 이름 변경, 삭제', async ({ page }) => {
  await page.goto('/');
  await makeRoutine(page, '가슴날', '바벨 벤치 프레스');
  await makeRoutine(page, '등날', '바벨 데드리프트');
  await makeRoutine(page, '하체날', '바벨 스쿼트');

  await page.click('[aria-label="가슴날 메뉴"]');
  await expect(page.locator('.pop-menu .pop-item')).toHaveText(['그룹으로 관리', '이름 변경', '삭제']);
  await page.click('.pop-item:has-text("그룹으로 관리")');
  await sheet(page).locator('input[placeholder="새 그룹 이름"]').fill('상체');
  await sheet(page).locator('text=추가').click();
  await expect(sheet(page).locator('.pick-item.on')).toContainText('상체');
  await sheet(page).locator('text=저장').click();
  await expect(page.locator('.group-head')).toContainText('상체');
  await expect(page.locator('.group-head .sub')).toHaveText('루틴 1개');
  await expect(page.locator('.group-label')).toHaveText('그룹 없음');

  // 등날도 같은 그룹에
  await page.click('[aria-label="등날 메뉴"]');
  await page.click('.pop-item:has-text("그룹으로 관리")');
  await sheet(page).locator('.pick-item', { hasText: '상체' }).click();
  await sheet(page).locator('text=저장').click();
  await expect(page.locator('.group-head .sub')).toHaveText('루틴 2개');

  // 접기 → 그룹 안 카드 숨김, 다시 펴기
  await page.click('.group-head');
  await expect(names(page)).toHaveText(['하체날']);
  await page.click('.group-head');
  await expect(names(page)).toHaveCount(3);

  // 이름 변경
  await page.click('[aria-label="하체날 메뉴"]');
  await page.click('.pop-item:has-text("이름 변경")');
  await sheet(page).locator('input').fill('하체 데이');
  await sheet(page).locator('text=저장').click();
  await expect(page.locator('.routine-card', { hasText: '하체 데이' })).toBeVisible();

  // 삭제
  await page.click('[aria-label="하체 데이 메뉴"]');
  await page.click('.pop-item:has-text("삭제")');
  await sheet(page).locator('.btn.danger').click();
  await expect(page.locator('.routine-card', { hasText: '하체 데이' })).toHaveCount(0);
  // 그룹 밖 루틴이 없어도 '그룹 없음' 자리는 남아 있음(끌어 놓을 곳)
  await expect(page.locator('.group-label')).toHaveCount(1);
});

test('홈: 꾹 눌러 끌어서 순서 바꾸고, 그룹 밖으로 빼기', async ({ page }) => {
  await page.goto('/');
  await makeRoutine(page, 'A', '바벨 벤치 프레스');
  await makeRoutine(page, 'B', '바벨 데드리프트');
  // 새로 만든 루틴이 위 → B, A
  await expect(names(page)).toHaveText(['B', 'A']);
  const drag = async (fromName: string, toY: (box: { y: number; height: number }) => number, target: string) => {
    const from = await page.locator('.routine-card', { hasText: fromName }).boundingBox();
    const t = await page.locator(target).last().boundingBox();
    await page.mouse.move(from!.x + 60, from!.y + 20);
    await page.mouse.down();
    await page.waitForTimeout(550);
    await expect(page.locator('.routine-card.sort-lifted')).toHaveCount(1);
    await page.mouse.move(from!.x + 60, toY(t!), { steps: 10 });
    await page.mouse.up();
  };
  await drag('B', (b) => b.y + b.height - 5, '.routine-card:has-text("A")');
  await expect(names(page)).toHaveText(['A', 'B']);

  // 그룹 만들어 둘 다 넣은 뒤, B를 '그룹 없음' 아래로 끌기
  for (const n of ['A', 'B']) {
    await page.click(`[aria-label="${n} 메뉴"]`);
    await page.click('.pop-item:has-text("그룹으로 관리")');
    if (n === 'A') { await sheet(page).locator('input[placeholder="새 그룹 이름"]').fill('묶음'); await sheet(page).locator('text=추가').click(); }
    else await sheet(page).locator('.pick-item', { hasText: '묶음' }).click();
    await sheet(page).locator('text=저장').click();
    await expect(page.locator('.sheet')).toHaveCount(0);
  }
  await expect(page.locator('.group-head .sub')).toHaveText('루틴 2개');
  await drag('B', (b) => b.y + b.height + 30, '.group-label');
  await expect(page.locator('.group-head .sub')).toHaveText('루틴 1개');
  await expect(page.locator('.routine-list > *').last()).toContainText('B');
});
