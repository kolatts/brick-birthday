import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
test.describe.configure({ timeout: 150_000 });

const phone = (page: Page) => page.viewportSize()!.height < 500;

async function toFinale(page: Page) {
  await page.goto('./?test=1');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  await page.evaluate(() => window.__game!.unlockAll());
  await expect(page.getByTestId('finale-button')).toBeVisible();
  // the button pulses forever, so Playwright's stability wait would never finish
  await page.getByTestId('finale-button').dispatchEvent('click');
  await expect(page.getByTestId('finale-screen')).toBeVisible();
}

test('finale: cake, candles, fireworks, album, message, back to the island', async ({ page }, info) => {
  await toFinale(page);
  const shot = (name: string) => page.screenshot({ path: `${SCREENS}/${name}-${info.project.name}.png` });

  // bricks fly in and stack, then the candles appear
  await expect(page.getByTestId('blow-candles')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByTestId('finale-caption')).toContainText('Tap to blow out the candles!');
  await page.waitForTimeout(1200);
  await shot('finale-cake');
  const box = (await page.getByTestId('blow-candles').boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(phone(page) ? 52 : 64);

  // tap until the last candle goes out
  for (let i = 0; i < 12 && (await page.getByTestId('fireworks').count()) === 0; i++) {
    await page.getByTestId('blow-candles').dispatchEvent('click').catch(() => undefined);
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId('fireworks')).toBeAttached();
  await page.waitForTimeout(1800);
  await shot('finale-fireworks');

  await page.getByTestId('finale-next').click();
  await expect(page.getByTestId('album')).toBeVisible();
  await page.waitForTimeout(2500);
  await shot('finale-album');
  await page.getByTestId('say-cheese').click();
  await expect(page.getByTestId('flash')).toBeAttached();

  await page.getByTestId('finale-next').click();
  await expect(page.getByTestId('finale-message')).toBeVisible();
  await page.waitForTimeout(600);
  await shot('finale-message');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('brick-birthday:progress')!).data.finaleSeen)).toBe(true);

  // replay restarts from the cake, then back to the island
  await page.getByTestId('finale-replay').click();
  await expect(page.getByTestId('finale-message')).toHaveCount(0);
  await expect(page.getByTestId('blow-candles')).toBeVisible({ timeout: 40_000 });
  await page.evaluate(() => window.__game!.finale!.skipToEnd());
  await page.getByTestId('finale-back').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  await expect(page.getByTestId('finale-button')).toContainText('Party again');
});
