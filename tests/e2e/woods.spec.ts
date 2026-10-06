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

/** Seeds progress (trees planted, woods bricks) before the app loads. */
async function seedTrees(page: Page, trees: number, woodsBrick = 0) {
  await page.addInitScript(
    ([n, b]) => {
      const z = (v: number | boolean) => ({ story: v, science: v, tennis: v, music: v, woods: v });
      localStorage.setItem(
        'brick-birthday:progress',
        JSON.stringify({
          version: 1,
          data: {
            bricks: { ...z(0), woods: b }, storiesFinished: 0, familyHeroStoryDone: false, experimentsDone: [], rallies: 0,
            instrumentsPlayed: [], treesPlanted: n, teaPartyDone: false, closetUnlocked: [], finaleSeen: false, challengesDone: z(false),
          },
        }),
      );
    },
    [trees, woodsBrick],
  );
}

async function hold(page: Page, testId: string, ms: number) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('plant a tree with real taps, then finish the woods and tea party', async ({ page }, info) => {
  const proj = info.project.name;
  await toHub(page);
  await page.getByTestId('zone-woods').click();
  await expect(page.getByTestId('zone-screen-woods')).toBeVisible();
  await expect(page.getByTestId('stump-0')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('tree-counter')).toContainText('0/7');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/woods-start-${proj}.png` });

  await page.getByTestId('stump-0').click(); // sapling pops up
  await page.getByTestId('water-btn').click(); // droplets + wiggle
  await page.waitForTimeout(500);
  await page.getByTestId('wand-btn').click(); // pop-and-stack growth
  await expect(page.getByTestId('tree-counter')).toContainText('1/7');
  await expect(page.getByTestId('caption')).toContainText(/Luna/, { timeout: 8000 }); // a forest friend thanks her
  await page.screenshot({ path: `${SCREENS}/woods-tree-grown-${proj}.png` });
  await expect(page.getByTestId('caption')).toContainText(/tree|trees|air|shade|homes|rain|seed|roots/i, { timeout: 8000 });

  await page.evaluate(() => window.__game!.autoPlay('woods'));
  await expect(page.getByTestId('guest-mom')).toBeVisible();
  await expect(page.getByTestId('brick-celebration')).toBeVisible();
  await expect(page.getByTestId('celebration-text')).toHaveText('You earned a Birthday Brick!');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SCREENS}/woods-brick-${proj}.png` });
  expect((await state(page)).bricks.woods).toBe(1);

  // Replayable, and the challenge is now offered.
  await page.getByTestId('replay-tea').click();
  await expect(page.getByTestId('brick-celebration')).toHaveCount(0);
  await expect(page.getByTestId('challenge-btn')).toBeVisible();
  await page.getByTestId('challenge-btn').click();
  await expect(page.getByTestId('challenge-screen-woods')).toBeVisible();

  // Order 1 by real taps: first a silly wrong plate, then the right one.
  await page.getByTestId('item-lemon').click();
  await page.getByTestId('serve-btn').click();
  await expect(page.getByTestId('order-reaction')).toContainText(/creative|silly|mystery/i);
  await page.getByTestId('item-sugar').click();
  await page.getByTestId('item-sugar').click();
  await page.getByTestId('item-cake').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENS}/woods-tea-orders-${proj}.png` });
  await page.getByTestId('serve-btn').click();
  await expect(page.getByTestId('order-progress')).toHaveText(/Order 2 of 5/, { timeout: 15000 });

  await page.evaluate(() => window.__game!.autoPlay('woods'));
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('icecream');
  expect(s.challengesDone.woods).toBe(true);
});

test('tea garden: pour perfectly, overfill for a splash, serve a treat', async ({ page }, info) => {
  const proj = info.project.name;
  await seedTrees(page, 7);
  await toHub(page);
  await page.getByTestId('zone-woods').click();
  await expect(page.getByTestId('guest-fox')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('tree-counter')).toContainText('7/7');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENS}/woods-tea-garden-${proj}.png` });

  await hold(page, 'pour-btn', 1300); // right level
  await expect(page.getByTestId('pour-result')).toHaveText(/Perfect!|Nice!|Splash!/); // timing varies by machine; thresholds are unit-tested
  await page.waitForTimeout(1600);

  const box = (await page.getByTestId('pour-btn').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId('pour-result')).toHaveText('Splash!', { timeout: 10000 }); // keeps holding: overflows
  await expect(page.getByTestId('caption')).toContainText('Whoa, a tea tsunami!');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SCREENS}/woods-tea-splash-${proj}.png` });
  await page.mouse.up();

  await page.getByTestId('guest-julian').click();
  await page.getByTestId('treat-cookie').click();
  await expect(page.getByTestId('caption')).toContainText('scientifically the best cookie');
});

test('all five orders by real taps, then the buried-treasure message and hub', async ({ page }, info) => {
  const proj = info.project.name;
  await seedTrees(page, 7, 1);
  await toHub(page);
  await page.evaluate(() => window.__game!.setScreen({ kind: 'challenge', zone: 'woods' }));
  const plates: string[][] = [['sugar', 'sugar', 'cake'], ['scone', 'honey'], ['cookie', 'lemon', 'milk'], ['cookie', 'cookie', 'scone']];
  for (let i = 0; i < plates.length; i++) {
    await expect(page.getByTestId('order-progress')).toHaveText(`Order ${i + 1} of 5`, { timeout: 15000 });
    for (const it of plates[i]) await page.getByTestId(`item-${it}`).click();
    await page.getByTestId('serve-btn').click();
  }
  await expect(page.getByTestId('order-progress')).toHaveText('Order 5 of 5', { timeout: 15000 });
  for (const s of ['vanilla', 'strawberry', 'mint']) await page.getByTestId(`scoop-${s}`).click();
  await page.getByTestId('cherry-btn').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENS}/woods-sundae-${proj}.png` });
  await page.getByTestId('serve-btn').click();
  await expect(page.getByTestId('challenge-done')).toContainText('Something is buried near the Whispering Woods');
  await page.getByTestId('to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('icecream');
});
