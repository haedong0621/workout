// 실제 브라우저(아이폰 크기)에서 주요 흐름 확인
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const v1 = JSON.parse(readFileSync(new URL('../fixtures/v1-backup.json', import.meta.url), 'utf8'));

/** 이전 앱(v1.x)이 IndexedDB에 저장하던 모양 그대로 넣기 */
async function seedOldAppDB(page: Page) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async (data) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('workout-log', 1);
      r.onupgradeneeded = () => {
        for (const s of ['exercises', 'routines', 'sessions', 'body', 'images']) r.result.createObjectStore(s, { keyPath: 'id' });
        r.result.createObjectStore('meta', { keyPath: 'key' });
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const blobs = await Promise.all(data.images.map(async (im: { data: string }) => (await fetch(im.data)).blob()));
    const tx = db.transaction(['exercises', 'routines', 'sessions', 'body', 'images', 'meta'], 'readwrite');
    for (const s of ['exercises', 'routines', 'sessions', 'body'] as const) for (const o of data[s]) tx.objectStore(s).put(o);
    data.images.forEach((im: { id: string; type: string }, i: number) => tx.objectStore('images').put({ id: im.id, blob: blobs[i], type: im.type }));
    for (const [key, value] of Object.entries(data.settings)) tx.objectStore('meta').put({ key, value });
    await new Promise((r) => { tx.oncomplete = r; });
    db.close();
  }, v1.data);
}

const sheet = (page: Page) => page.locator('.sheet.open').last();

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('첫 실행: 기본 운동 54개, 탭 이동', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('운동 기록용');
  await page.click('#tabbar >> text=종목');
  await expect(page.locator('.page-head .sub')).toHaveText('54개');
  await page.fill('input[type=search]', 'ㅂㅊㅍㄹㅅ');
  await expect(page.locator('.list .li-title')).toHaveCount(4);
  await expect(page.locator('.list .li-title', { hasText: /^벤치 프레스$/ })).toBeVisible();
  for (const [tab, title] of [['기록', '기록'], ['내 몸', '내 몸'], ['설정', '설정']]) {
    await page.click(`#tabbar >> text=${tab}`);
    await expect(page.locator('h1')).toHaveText(title!);
  }
});

test('루틴 만들기 → 운동 → 세트 체크(휴식 타이머) → 완료 → 캘린더', async ({ page }) => {
  await page.goto('/');
  await page.click('text=첫 루틴 만들기');
  await page.fill('.title-input', '가슴날');
  await page.click('text=운동 추가');
  await sheet(page).locator('input[type=search]').fill('벤치');
  await sheet(page).locator('.pick-item').filter({ has: page.locator('.pick-name', { hasText: /^벤치 프레스$/ }) }).click();
  await sheet(page).locator('text=1개 추가').click();
  await expect(page.locator('.ritem-name')).toHaveText(['벤치 프레스']);
  await page.click('.topbar >> text=저장');
  await expect(page.locator('.routine-card')).toContainText('가슴날');

  await page.click('.routine-card');
  await sheet(page).locator('text=운동 시작').click();
  await expect(page).toHaveURL(/#\/workout$/);
  await expect(page.locator('.set-row')).toHaveCount(3);

  // 세트 편집: 무게 60, 횟수 8
  await page.locator('.set-row').first().locator('.cell').first().click();
  const ed = sheet(page);
  await ed.locator('.big-input').first().fill('60');
  await ed.locator('.big-input').nth(1).fill('8');
  await ed.locator('text=모든 세트에 적용').click();
  await page.locator('.sheet-back').last().click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.set-row .num').first()).toHaveText('60');

  await page.locator('.set-row .check').first().click();
  await expect(page.locator('.restbar.show')).toBeVisible();
  await expect(page.locator('.bb-main')).toHaveText('480 kg');
  await page.locator('.set-row .check').nth(1).click();
  await expect(page.locator('.bb-stats .sub')).toHaveText('2/3 세트 완료');

  await page.click('text=운동 완료');
  await expect(sheet(page)).toContainText('체크하지 않은 1세트는 기록에서 빠져요');
  await sheet(page).locator('text=저장하고 종료').click();
  await expect(page).toHaveURL(/#\/session\//);
  await expect(page.locator('.sess-stats')).toContainText('960');

  await page.goto('/#/history');
  await expect(page.locator('.day.today')).toHaveClass(/has/);
  await page.goto('/#/home');
  await expect(page.locator('.list-item').first()).toContainText('960 kg');
});

test('진행 중이던 운동은 앱을 다시 열면 이어서', async ({ page }) => {
  await page.goto('/');
  await page.click('text=빈 운동 시작');
  await expect(page).toHaveURL(/#\/workout$/);
  await expect(page.locator('.wk-name')).toBeVisible();
  await page.waitForTimeout(500); // 기기 저장(IndexedDB)이 끝날 시간
  await page.goto('/');
  await expect(page).toHaveURL(/#\/workout$/);
  await page.click('[aria-label="홈으로(운동은 계속돼요)"]');
  await expect(page.locator('.minibar.show')).toBeVisible();
  await expect(page.locator('.banner.active')).toContainText('진행 중인 운동');
});

test('이전 앱이 저장한 기록을 그대로 보여 줌', async ({ page }) => {
  await seedOldAppDB(page);
  await page.goto('/#/session/s2');
  await expect(page.locator('.sess-stats')).toContainText('2,606');
  await expect(page.locator('.ex-sum').first()).toContainText('▲ 160 kg');
  await page.goto('/#/exercise/seed-0');
  await expect(page.locator('.hero-img img')).toBeVisible();
  await expect(page.locator('.memo-area')).toHaveValue('시트 4번');
  await expect(page.locator('.stat-row')).toContainText('82.5');
  await page.goto('/#/settings');
  await expect(page.locator('.mini-stepper b').first()).toHaveText('75초');
  await expect(page.locator('.card').nth(2)).toContainText('운동 기록 2개 · 루틴 1개 · 종목 55개');
});

test('백업 파일 불러오기(합치기)', async ({ page }) => {
  await page.goto('/#/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.click('text=백업 파일 불러오기');
  await (await chooser).setFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1)) });
  await sheet(page).locator('text=지금 기록에 합치기').click();
  await expect(page.locator('.toast.show')).toHaveText('불러왔어요');
  await expect(page.locator('.card').nth(2)).toContainText('운동 기록 2개 · 루틴 1개 · 종목 55개');
});

test('잘못된 파일은 거부', async ({ page }) => {
  await page.goto('/#/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.click('text=백업 파일 불러오기');
  await (await chooser).setFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.locator('.toast.show')).toContainText('이 앱의 백업 파일이 아니에요');
});
