import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
test.describe.configure({ timeout: 120_000 });

interface GameState {
  screen: { kind: string };
  bricks: Record<string, number>;
}
const state = (page: Page) => page.evaluate(() => window.__game!.getState() as GameState);

async function toMusic(page: Page) {
  await page.goto('./?test=1');
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  await page.getByTestId('zone-music').click();
  await expect(page.getByTestId('zone-screen-music')).toBeVisible();
  await expect(page.getByTestId('pad-drums-0')).toBeVisible();
}

test('music stage: jam on two instruments, follow a song, earn the brick', async ({ page }, info) => {
  const proj = info.project.name;
  await toMusic(page);
  await expect(page.getByTestId('goal')).toContainText('Earn a Birthday Brick: play all four instruments');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCREENS}/music-stage-${proj}.png` });

  // Drums: four big pads.
  await expect(page.locator('[data-testid^="pad-drums-"]')).toHaveCount(4);
  for (const i of [0, 1, 2, 3]) await page.getByTestId(`pad-drums-${i}`).click();
  await expect(page.getByTestId('played-drums')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/music-drums-${proj}.png` });

  // Keyboard: eight pads.
  await page.getByTestId('instrument-keyboard').click();
  await expect(page.locator('[data-testid^="pad-keyboard-"]')).toHaveCount(8);
  for (const i of [0, 2, 4, 7]) await page.getByTestId(`pad-keyboard-${i}`).click();
  await expect(page.getByTestId('played-keyboard')).toBeVisible();
  await expect(page.getByTestId('goal-count')).toContainText('2 of 4');

  // Follow: tap the lit pad.
  await page.getByTestId('mode-follow').click();
  await page.getByTestId('song-island').click();
  await expect(page.locator('[data-pad-lit="true"]')).toHaveCount(1);
  await expect(page.getByTestId('follow-progress')).toContainText('Note 1 of 16');
  const litId = async () => page.locator('[data-pad-lit="true"]').getAttribute('data-testid');
  const first = await litId();
  await page.locator('[data-pad-lit="true"]').click();
  await expect(page.getByTestId('follow-progress')).toContainText('Note 2 of 16');
  // A wrong pad still plays, and the light keeps showing the right one.
  const lit = await litId();
  const wrong = lit === 'pad-keyboard-7' ? 'pad-keyboard-6' : 'pad-keyboard-7';
  await page.getByTestId(wrong).click();
  await expect(page.getByTestId('follow-progress')).toContainText('Note 2 of 16');
  expect(await litId()).toBe(lit);
  expect(first).toMatch(/^pad-keyboard-\d$/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENS}/music-follow-${proj}.png` });

  // Finish the whole song by following the light.
  for (let i = 1; i < 16; i++) await page.locator('[data-pad-lit="true"]').click();
  await expect(page.getByTestId('song-celebration')).toBeVisible();
  await page.getByTestId('song-jam').click();

  // Auto-play the rest: all four instruments earn the brick.
  await page.evaluate(() => window.__game!.autoPlay('music'));
  await expect(page.getByTestId('brick-celebration')).toBeVisible();
  await expect(page.getByTestId('celebration-text')).toHaveText('You earned a Birthday Brick!');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SCREENS}/music-brick-${proj}.png` });
  expect((await state(page)).bricks.music).toBe(1);

  // Replayable.
  await page.getByTestId('keep-jamming').click();
  await expect(page.getByTestId('brick-celebration')).toHaveCount(0);
  await page.getByTestId('instrument-guitar').click();
  await expect(page.locator('[data-testid^="pad-guitar-"]')).toHaveCount(6);
  await page.getByTestId('pad-guitar-3').click();
  await page.getByTestId('instrument-xylophone').click();
  await page.getByTestId('pad-xylophone-5').click();
  await page.getByTestId('back-to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
});

test('music challenge placeholder is friendly and has a back button', async ({ page }) => {
  await toMusic(page);
  await page.evaluate(() => window.__game!.setScreen({ kind: 'challenge', zone: 'music' }));
  await expect(page.getByTestId('challenge-screen-music')).toContainText('No coupon challenge here (yet)!');
  await page.getByTestId('back-to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
});
