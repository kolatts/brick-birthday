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
  expect(box!.height).toBeGreaterThanOrEqual(64);
  await page.screenshot({ path: `${SCREENS}/title-${info.project.name}.png` });
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

test('long-pressing the title opens the grown-up screen, and test hooks work', async ({ page }) => {
  await page.goto('./?test=1');
  const h = page.getByTestId('title-heading');
  const box = (await h.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  await expect(page.getByTestId('grownup-screen')).toBeVisible();
  const state = await page.evaluate(() => (window.__game!.getState() as { totalBricks: number }).totalBricks);
  expect(state).toBe(0);
  await page.getByTestId('unlock-bricks').click();
  expect(await page.evaluate(() => (window.__game!.getState() as { goalReached: boolean }).goalReached)).toBe(true);
});

test('family pack fixture imports through the file chooser', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'flow covered once in Chromium');
  await page.goto('./?test=1');
  await page.evaluate(() => window.__game!.setScreen({ kind: 'grownup' }));
  await page.getByTestId('pack-file-input').setInputFiles('tests/e2e/fixtures/family-pack.fixture.json');
  await expect(page.getByTestId('pack-status')).toHaveText(/loaded/);
  await page.getByTestId('remove-pack').click();
  await expect(page.getByTestId('pack-status')).toHaveText(/No family pack/);
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
