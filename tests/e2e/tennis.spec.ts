import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
test.describe.configure({ timeout: 120_000 });

interface GameState {
  screen: { kind: string };
  bricks: Record<string, number>;
  challengesDone: Record<string, boolean>;
  coupons: { challengeComplete: string[] };
}
const state = (page: Page) => page.evaluate(() => window.__game!.getState() as GameState);

async function toHub(page: Page) {
  await page.goto('./?test=1');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
}

/** Waits until the ball is about to reach Luna, then taps the court like a kid would. */
async function tapOnArrival(page: Page) {
  await page.waitForFunction(() => {
    const g = window.__game as unknown as { tennis?: { nextArrivalMs: () => number } };
    const t = g.tennis?.nextArrivalMs() ?? -1;
    return t > 0 && t < 300;
  }, undefined, { timeout: 60000, polling: 16 });
  const box = (await page.getByTestId('court-tap').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
}

/** Taps on arrival until the counter shows `n` (a software-rendered browser can occasionally lag a flight; that is just a silly miss). */
async function rallyTo(page: Page, n: number) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await tapOnArrival(page);
    const hit = await expect(page.getByTestId('rally-counter')).toContainText(`Rally: ${n}`, { timeout: 4000 }).then(() => true, () => false);
    if (hit) return;
    if (attempt === 0 && n === 2) n = 1; // a miss restarted the streak: count again from one
  }
  throw new Error(`never reached rally ${n}`);
}

test('rally with real taps, earn the brick, then the Super Rally coupon challenge', async ({ page }, info) => {
  const proj = info.project.name;
  await toHub(page);
  await page.getByTestId('zone-tennis').click();
  await expect(page.getByTestId('zone-screen-tennis')).toBeVisible();
  await expect(page.getByTestId('goal-banner')).toContainText('Earn a Birthday Brick: 7 rallies in a row');
  await expect(page.getByTestId('rally-counter')).toContainText('Rally: 0');
  await expect(page.getByTestId('challenge-btn')).toHaveCount(0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCREENS}/tennis-court-${proj}.png` });

  // two real, well-timed taps
  await rallyTo(page, 1);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SCREENS}/tennis-hit-${proj}.png` });
  await rallyTo(page, 2);

  // a silly miss restarts the count (no tap at all)
  await expect(page.getByTestId('rally-counter')).toContainText('Rally: 0', { timeout: 60000 });
  await expect(page.getByTestId('caption')).toContainText('Nice try! Again!');

  await page.evaluate(() => window.__game!.autoPlay('tennis'));
  await expect(page.getByTestId('brick-celebration')).toBeVisible();
  await expect(page.getByTestId('celebration-text')).toHaveText('You earned a Birthday Brick!');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SCREENS}/tennis-brick-${proj}.png` });
  expect((await state(page)).bricks.tennis).toBe(1);

  // replayable, and the coupon challenge is now offered
  await page.getByTestId('replay-rally').click();
  await expect(page.getByTestId('brick-celebration')).toHaveCount(0);
  await expect(page.getByTestId('challenge-btn')).toBeVisible();
  await expect(page.getByTestId('challenge-btn')).toContainText('Coupon challenge: win the Shopping coupon!');
  await page.getByTestId('challenge-btn').click();
  await expect(page.getByTestId('challenge-screen-tennis')).toBeVisible();
  await expect(page.getByTestId('challenge-intro')).toContainText('Coupon challenge: win the Shopping coupon!');
  await expect(page.getByTestId('coupon-sticker').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/tennis-challenge-${proj}.png` });
  await page.getByTestId('challenge-start').click();
  await expect(page.getByTestId('challenge-intro')).toHaveCount(0);
  await page.waitForTimeout(500);

  await page.evaluate(() => window.__game!.autoPlay('tennis'));
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('shopping');
  expect(s.challengesDone.tennis).toBe(true);
});
