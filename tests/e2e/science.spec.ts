import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
test.describe.configure({ timeout: 150_000 });

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

test('science lab: experiments by real taps, bricks via autoPlay', async ({ page }, info) => {
  const proj = info.project.name;
  await toHub(page);
  await page.getByTestId('zone-science').click();
  await expect(page.getByTestId('zone-screen-science')).toBeVisible();
  await expect(page.getByTestId('exp-potion')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('menu-hud')).toContainText('Earn Birthday Bricks');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENS}/science-lab-${proj}.png` });

  // Color potion: stir, then lemon turns it pink and Julian explains acids.
  await page.getByTestId('exp-potion').click();
  await page.getByTestId('ing-lemon').click(); // too early: Julian asks for a stir first
  await expect(page.getByTestId('caption')).toContainText(/Stir first/);
  await page.getByTestId('stir-btn').click();
  await page.getByTestId('ing-lemon').click();
  await expect(page.getByTestId('caption')).toContainText(/acid/i);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SCREENS}/science-experiment-${proj}.png` });
  await expect(page.getByTestId('experiment-counter')).toContainText('1/5');

  // Sink or float: any guess is celebrated, then the density "why".
  await page.getByTestId('back-to-lab').click();
  await page.getByTestId('exp-float').click();
  await page.getByTestId('obj-cork').click();
  await page.getByTestId('guess-sink').click();
  await expect(page.getByTestId('caption')).toContainText(/Great guess|good thinking/i);
  await expect(page.getByTestId('float-badge')).toHaveText('It floats!', { timeout: 8000 });
  await expect(page.getByTestId('caption')).toContainText(/lighter than water/i);
  // second distinct experiment: the first brick
  await expect(page.getByTestId('brick-celebration')).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('celebration-text')).toHaveText('You earned a Birthday Brick!');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SCREENS}/science-brick-${proj}.png` });
  expect((await state(page)).bricks.science).toBe(1);
  await page.getByTestId('keep-going').click();

  // Rocket: add fuel, launch, it lands and Julian explains.
  await page.getByTestId('exp-rocket').click();
  await page.getByTestId('fuel-add').click();
  await page.getByTestId('fuel-add').click();
  await page.getByTestId('fuel-add').click();
  await page.getByTestId('launch-btn').click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SCREENS}/science-rocket-${proj}.png` });
  await expect(page.getByTestId('caption')).toContainText(/more push/i, { timeout: 15000 });

  // Crystals: six taps fill the jar.
  await page.getByTestId('back-to-lab').click();
  await page.getByTestId('exp-crystal').click();
  for (let i = 0; i < 6; i++) { await page.getByTestId('grow-btn').click(); await page.waitForTimeout(150); }
  await expect(page.getByTestId('caption')).toContainText(/evaporation/i);

  // Seed: all three needs, any order.
  await page.getByTestId('back-to-lab').click();
  await page.getByTestId('exp-seed').click();
  await page.getByTestId('seed-soil').click();
  await page.getByTestId('seed-light').click();
  await page.getByTestId('seed-water').click();
  await expect(page.getByTestId('caption')).toContainText(/sprouted/i);
  await expect(page.getByTestId('experiment-counter')).toContainText('5/5');
  await expect(page.getByTestId('brick-celebration')).toBeVisible({ timeout: 8000 });
  expect((await state(page)).bricks.science).toBe(2);
  await page.getByTestId('keep-going').click();
  await expect(page.getByTestId('challenge-btn')).toBeVisible();
  await expect(page.getByTestId('challenge-btn')).toContainText('Coupon challenge: win the Video Game Day coupon!');
});

test('science lab: autoPlay earns both bricks, then the Mystery Potion challenge', async ({ page }, info) => {
  const proj = info.project.name;
  await toHub(page);
  await page.getByTestId('zone-science').click();
  await expect(page.getByTestId('exp-potion')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('challenge-btn')).toHaveCount(0);
  await page.evaluate(() => window.__game!.autoPlay('science'));
  await expect(page.getByTestId('brick-celebration')).toBeVisible({ timeout: 10000 });
  expect((await state(page)).bricks.science).toBe(2);
  await page.getByTestId('keep-going').click();
  await expect(page.getByTestId('challenge-btn')).toBeVisible();
  await page.getByTestId('challenge-btn').click();
  await expect(page.getByTestId('challenge-screen-science')).toBeVisible();
  await expect(page.getByTestId('challenge-intro')).toContainText('Coupon challenge: win the Video Game Day coupon!');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/science-challenge-intro-${proj}.png` });
  await page.getByTestId('challenge-start').click();

  // A wrong mix is funny, then the right recipe (read from the swatch) wins the round.
  const recipe = async () => (await page.getByTestId('target-swatch').getAttribute('data-recipe'))!.split(',');
  const wrong = (await recipe()).includes('white') ? 'glitter' : 'white';
  await page.getByTestId(`mix-${wrong}`).click();
  await page.getByTestId('brew-btn').click();
  await expect(page.getByTestId('caption')).toContainText(/potion|goo|swamp|Bloop|opinions/i);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENS}/science-challenge-${proj}.png` });

  await expect(page.getByTestId('round-progress')).toHaveText('Potion 1 of 3');
  await page.waitForTimeout(2500); // goo clears and the tray resets
  for (const ing of await recipe()) await page.getByTestId(`mix-${ing}`).click();
  await page.getByTestId('brew-btn').click();
  await expect(page.getByTestId('round-progress')).toHaveText('Potion 2 of 3', { timeout: 6000 });

  // Finish via autoPlay: coupon challenge complete, back on the island.
  await page.evaluate(() => window.__game!.autoPlay('science'));
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('videogames');
  expect(s.challengesDone.science).toBe(true);
});

test('science lab: three potions in a row light up the arcade', async ({ page }, info) => {
  const proj = info.project.name;
  await page.addInitScript(() => {
    const z = (v: number | boolean) => ({ story: v, science: v, tennis: v, music: v, woods: v });
    localStorage.setItem('brick-birthday:progress', JSON.stringify({
      version: 1,
      data: { bricks: { ...z(0), science: 2 }, storiesFinished: 0, familyHeroStoryDone: false, experimentsDone: ['potion', 'float', 'rocket', 'crystal', 'seed'], rallies: 0, instrumentsPlayed: [], treesPlanted: 0, teaPartyDone: false, closetUnlocked: [], finaleSeen: false, challengesDone: z(false) },
    }));
  });
  await toHub(page);
  await page.evaluate(() => window.__game!.setScreen({ kind: 'challenge', zone: 'science' }));
  await page.getByTestId('challenge-start').click();
  for (let round = 1; round <= 3; round++) {
    await expect(page.getByTestId('round-progress')).toHaveText(`Potion ${round} of 3`, { timeout: 8000 });
    const recipe = (await page.getByTestId('target-swatch').getAttribute('data-recipe'))!.split(',');
    for (const ing of recipe) await page.getByTestId(`mix-${ing}`).click();
    await page.getByTestId('brew-btn').click();
    if (round < 3) await page.waitForTimeout(500);
  }
  await expect(page.getByTestId('challenge-done')).toContainText('Something is buried near the Science Lab');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SCREENS}/science-arcade-${proj}.png` });
  await page.getByTestId('to-island').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  const s = await state(page);
  expect(s.coupons.challengeComplete).toContain('videogames');
});
