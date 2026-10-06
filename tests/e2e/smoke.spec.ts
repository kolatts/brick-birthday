import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });

async function toHub(page: Page) {
  await page.goto('./?test=1');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  await expect(page.getByTestId('zone-story')).toBeVisible();
}

test('title loads with the computed age heading', async ({ page }, info) => {
  await page.goto('./?test=1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Happy \d+(st|nd|rd|th) Birthday, Luna!/);
  await expect(page.getByTestId('play-button')).toBeVisible();
  const box = await page.getByTestId('play-button').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height < 500 ? 52 : 64);
  await expect(page.getByTestId('title-avatar').locator('canvas')).toBeVisible();
  await page.waitForTimeout(900); // let the 3D hero finish loading before the screenshot
  await page.screenshot({ path: `${SCREENS}/title-${info.project.name}.png` });
});

test('title shows Daddy\'s note, the explainer and the four coupons', async ({ page }, info) => {
  await page.goto('./?test=1');
  const phone = page.viewportSize()!.height < 500;
  if (phone) {
    await page.getByTestId('note-open').click();
    await expect(page.getByTestId('note-overlay')).toBeVisible();
    expect((await page.getByTestId('note-open').count())).toBe(1);
  }
  await expect(page.getByTestId('note-card')).toContainText('A note from Daddy');
  await expect(page.getByTestId('note-body')).toContainText('so very proud of your creativity');
  await expect(page.getByTestId('note-card')).toContainText('Love, Daddy');
  const read = (await page.getByTestId('read-note').boundingBox())!;
  expect(read.height).toBeGreaterThanOrEqual(52);
  await page.getByTestId('read-note').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/title-note-${info.project.name}.png` });
  if (phone) {
    await page.getByTestId('note-close').click();
    await expect(page.getByTestId('note-overlay')).toHaveCount(0);
  }
  await expect(page.getByTestId('explainer')).toHaveText('Beat the minigames to earn Daddy-Daughter Date coupons!');
  await expect(page.getByTestId('coupon-row').locator('img, svg')).toHaveCount(4);
});

test('tapping Play opens the hub', async ({ page }, info) => {
  await toHub(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/hub-${info.project.name}.png` });
});

test('hub canvas renders non-uniform pixels', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebGL pixel sampling runs in Chromium only');
  await toHub(page);
  await page.waitForTimeout(1000);
  const distinct = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    await img.decode();
    const off = document.createElement('canvas');
    off.width = 64;
    off.height = 64;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 64, 64);
    const d = ctx.getImageData(0, 0, 64, 64).data;
    const colors = new Set<string>();
    for (let i = 0; i < d.length; i += 4) colors.add(`${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`);
    return colors.size;
  });
  expect(distinct).toBeGreaterThanOrEqual(3);
});

test('portrait viewport shows the rotate screen', async ({ page }) => {
  await page.goto('./?test=1');
  await page.setViewportSize({ width: 800, height: 1100 });
  await expect(page.getByTestId('rotate-screen')).toBeVisible();
  await expect(page.getByText('Turn me sideways!')).toBeVisible();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(page.getByTestId('rotate-screen')).toHaveCount(0);
});

test('unbuilt zone shows Coming soon; built zone opens and returns', async ({ page }) => {
  await toHub(page);
  await page.getByTestId('zone-science').click();
  await expect(page.getByText('Coming soon!')).toBeVisible();
  await page.getByTestId('coming-soon-close').click();
  await expect(page.getByText('Coming soon!')).toHaveCount(0);

  await page.getByTestId('zone-story').click();
  await expect(page.getByTestId('zone-screen-story')).toBeVisible();
  await page.getByTestId('back-to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
});

test('test hooks unlock bricks and ?reset=1 clears progress', async ({ page }) => {
  await page.goto('./?test=1');
  expect(await page.evaluate(() => (window.__game!.getState() as { totalBricks: number }).totalBricks)).toBe(0);
  await page.evaluate(() => window.__game!.unlockAll());
  expect(await page.evaluate(() => (window.__game!.getState() as { goalReached: boolean }).goalReached)).toBe(true);
  await page.goto('./?test=1&reset=1');
  expect(await page.evaluate(() => (window.__game!.getState() as { totalBricks: number }).totalBricks)).toBe(0);
  expect(page.url()).not.toContain('reset=1');
});

test('no console errors and no non-localhost network requests', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url());
  });
  await toHub(page);
  await page.waitForTimeout(1500);
  await page.getByTestId('zone-science').click();
  await page.getByTestId('coming-soon-close').click();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
