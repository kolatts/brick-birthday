import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

test.describe.configure({ timeout: 90_000 });
const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });

async function toHub(page: Page) {
  await page.goto('./?test=1');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
}

const state = (page: Page) =>
  page.evaluate(() => window.__game!.getState() as { bricks: Record<string, number>; coupons: { challengeComplete: string[] }; screen: { kind: string } });

test('Story Tower: pick four tiles, hear the story, earn bricks', async ({ page }, info) => {
  await toHub(page);
  await page.getByTestId('zone-story').click();
  await expect(page.getByTestId('zone-screen-story')).toBeVisible();
  await page.getByTestId('tile-hero-mom').click();
  await page.getByTestId('tile-place-teagarden').click();
  await page.getByTestId('tile-problem-teapot').click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SCREENS}/story-picks-${info.project.name}.png` });
  const box = await page.getByTestId('tile-power-giggle').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height < 500 ? 52 : 64);
  expect(box!.width).toBeGreaterThanOrEqual(52);
  await page.getByTestId('tile-power-giggle').click();
  await page.screenshot({ path: `${SCREENS}/story-ready-${info.project.name}.png` });
  await page.getByTestId('tell-story').click();
  await expect(page.getByTestId('story-page')).toBeVisible();
  await page.screenshot({ path: `${SCREENS}/story-playing-${info.project.name}.png` });
  const text = await page.getByTestId('story-text').innerText();
  expect(text).toContain('Mom');
  expect(text).not.toMatch(/undefined|TODO|\{/);
  await expect(page.getByTestId('brick-celebration')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('You earned a Birthday Brick!')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SCREENS}/story-brick-${info.project.name}.png` });
  expect((await state(page)).bricks.story).toBe(2);
  await page.getByTestId('back-to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
});

test('wand moment adds a bonus sentence', async ({ page }) => {
  await page.goto('./?test=1');
  await page.evaluate(() => window.__game!.setScreen({ kind: 'zone', zone: 'story' }));
  await page.getByTestId('tile-hero-julian').click();
  await page.getByTestId('tile-place-island').click();
  await page.getByTestId('tile-problem-sock').click();
  await page.getByTestId('tile-power-bubble').click();
  await page.getByTestId('tell-story').click();
  await page.getByTestId('wand-button').click();
  await expect(page.getByTestId('sparkle-burst')).toBeAttached();
  await expect(page.getByTestId('again')).toBeVisible({ timeout: 15_000 });
  const sentences = (await page.getByTestId('story-text').innerText()).split(/(?<=[.!?])\s+/).length;
  expect(sentences).toBeGreaterThanOrEqual(5);
});

test('Movie Night: solve by taps, silly wrong order, 3 stories, buried coupon', async ({ page }, info) => {
  await page.goto('./?test=1');
  // The zone module is lazy-loaded; it registers autoPlay when first opened.
  await page.evaluate(() => window.__game!.setScreen({ kind: 'zone', zone: 'story' }));
  await expect(page.getByTestId('zone-screen-story')).toBeVisible();
  await page.evaluate(() => window.__game!.autoPlay('story'));
  expect((await state(page)).bricks.story).toBe(2);
  await page.evaluate(() => window.__game!.setScreen({ kind: 'hub' }));
  await page.evaluate(() => window.__game!.setScreen({ kind: 'zone', zone: 'story' }));
  await expect(page.getByTestId('zone-screen-story')).toBeVisible();
  await page.getByTestId('movie-night-button').click();
  await expect(page.getByTestId('challenge-screen-story')).toBeVisible();
  await expect(page.getByTestId('movie-progress')).toHaveText('0/3');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCREENS}/movie-night-${info.project.name}.png` });

  // Wrong order first: reversed -> silly message, then retry.
  for (const n of [3, 2, 1, 0]) await page.locator(`[data-order="${n}"]`).click();
  await page.getByTestId('play-movie').click();
  await expect(page.getByTestId('silly-message')).toContainText("that's not right");
  await expect(page.getByTestId('play-movie')).toBeVisible({ timeout: 15_000 });

  // Slot removal works.
  await page.locator('[data-order="0"]').click();
  await page.getByTestId('slot-0').click();
  await expect(page.locator('[data-order="0"]')).toBeVisible();

  for (let story = 0; story < 3; story++) {
    for (const n of [0, 1, 2, 3]) await page.locator(`[data-order="${n}"]`).click();
    await page.getByTestId('play-movie').click();
    await expect(page.getByTestId('curtains')).toBeVisible();
    if (story === 0) await page.waitForTimeout(150);
    if (story === 0) await page.screenshot({ path: `${SCREENS}/movie-night-curtains-${info.project.name}.png` });
    if (story < 2) {
      await expect(page.getByTestId('next-story')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('movie-progress')).toHaveText(`${story + 1}/3`);
      await page.getByTestId('next-story').click();
    }
  }
  await expect(page.getByText('Something is buried near the Story Tower')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('hub-screen')).toBeVisible({ timeout: 20_000 });
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('movies');
});

test('autoPlay completes the challenge from the challenge screen', async ({ page }) => {
  await toHub(page);
  await page.evaluate(() => window.__game!.setScreen({ kind: 'challenge', zone: 'story' }));
  await expect(page.getByTestId('challenge-screen-story')).toBeVisible();
  await page.evaluate(() => window.__game!.autoPlay('story'));
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  expect((await state(page)).coupons.challengeComplete).toContain('movies');
});
