import { chromium, expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { passwords } from '../../src/config/passwords';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
// The 3D hub is slow under CPU software GL (CI, parallel runs): give every test room.
test.beforeEach(() => {
  test.setTimeout(120_000);
});

const phone = (page: Page) => page.viewportSize()!.height < 500;
const minTap = (page: Page) => (phone(page) ? 52 : 64);
// Full dig flow runs on Chromium (desktop) and the iPhone project; the iPad project covers the same UI via screenshots.
const skipDig = (browserName: string, project: string) => browserName !== 'chromium' && project !== 'iphone-webkit';

async function toHub(page: Page, query = '?test=1') {
  await page.goto(`./${query}`);
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-screen')).toBeVisible();
  await expect(page.getByTestId('hub-ready')).toBeAttached();
  await page.waitForTimeout(600);
}

async function gotoScreen(page: Page, kind: 'hub') {
  await page.evaluate((k) => window.__game!.setScreen({ kind: k }), kind);
  if (kind === 'hub') await expect(page.getByTestId('hub-ready')).toBeAttached();
}

/** Tap the dig spot until the coupon card opens (extra taps are harmless). */
async function digUntilCard(page: Page, coupon: string) {
  for (let i = 0; i < 5 && (await page.getByTestId('coupon-card').count()) === 0; i++) {
    await page.getByTestId(`dig-spot-${coupon}`).click({ timeout: 6000 }).catch(() => undefined);
  }
  await expect(page.getByTestId('coupon-card')).toBeVisible({ timeout: 15000 });
}

test('title shows Luna waving next to the heading', async ({ page }, info) => {
  await page.goto('./?test=1');
  await expect(page.getByTestId('title-avatar').locator('canvas')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/title-avatar-${info.project.name}.png` });
});

test('hub renders the scene and every HUD button meets the tap-target minimum', async ({ page }, info) => {
  await toHub(page);
  await page.screenshot({ path: `${SCREENS}/hub-scene-${info.project.name}.png` });
  for (const id of ['home-button', 'mute-button', 'coupon-box-open', 'closet-open', 'zone-story', 'zone-science', 'zone-tennis', 'zone-music', 'zone-woods']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.height, id).toBeGreaterThanOrEqual(minTap(page));
    expect(box.width, id).toBeGreaterThanOrEqual(minTap(page));
  }
  await expect(page.getByTestId('brick-counter')).toContainText('Birthday Bricks');
});

test('hub birthday mode screenshot', async ({ page }, info) => {
  await toHub(page, '?test=1&birthday=1');
  await page.screenshot({ path: `${SCREENS}/hub-birthday-${info.project.name}.png` });
});

test('tapping the ground, characters and dragging the camera raises no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await toHub(page);
  const vp = page.viewportSize()!;
  for (const [fx, fy] of [[0.5, 0.62], [0.42, 0.7], [0.6, 0.55], [0.35, 0.5]]) {
    await page.mouse.click(vp.width * fx, vp.height * fy);
    await page.waitForTimeout(150);
  }
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.width / 2 + 160, vp.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('closet shows locked items, unlocks after bricks, and equips', async ({ page }, info) => {
  await toHub(page);
  await page.getByTestId('closet-open').click();
  await expect(page.getByTestId('closet')).toBeVisible();
  await expect(page.getByTestId('closet-item-bow')).toHaveAttribute('data-locked', 'true');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/closet-locked-${info.project.name}.png` });
  await page.getByTestId('closet-close').click();
  await page.evaluate(() => window.__game!.unlockAll());
  await gotoScreen(page, 'hub');
  await page.getByTestId('closet-open').click();
  await expect(page.getByTestId('closet-item-bow')).toHaveAttribute('data-locked', 'false');
  for (const id of ['bow', 'dress', 'cape', 'visor', 'labcoat', 'boots', 'sunglasses', 'pethats']) {
    await page.getByTestId(`closet-item-${id}`).click();
    await expect(page.getByTestId(`closet-item-${id}`)).toHaveAttribute('data-equipped', 'true');
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/closet-${info.project.name}.png` });
});

test('finale button appears once the brick goal is reached', async ({ page }) => {
  await toHub(page);
  await expect(page.getByTestId('finale-button')).toHaveCount(0);
  await page.evaluate(() => window.__game!.unlockAll());
  await gotoScreen(page, 'hub');
  await expect(page.getByTestId('finale-button')).toContainText('Time for the party');
});

test('coupon box starts locked; a dug coupon shows its configured password', async ({ page }, info) => {
  await toHub(page);
  await page.getByTestId('coupon-box-open').click();
  await expect(page.getByTestId('coupon-box')).toBeVisible();
  for (const id of ['movies', 'videogames', 'shopping', 'icecream']) {
    await expect(page.getByTestId(`coupon-item-${id}`)).toHaveAttribute('data-status', 'locked');
  }
  await expect(page.getByTestId('coupon-item-movies')).toContainText('Story Tower Coupon Challenge');
  await expect(page.getByTestId('coupon-how-movies')).toContainText('Earn 2 more bricks first');
  await page.screenshot({ path: `${SCREENS}/coupon-box-locked-${info.project.name}.png` });
  await page.getByTestId('coupon-box-close').click();
  await page.evaluate(() => window.__game!.completeChallenge('story'));
  await expect(page.getByTestId('dig-spot-movies')).toBeVisible();
  await digUntilCard(page, 'movies');
  await expect(page.getByTestId('coupon-password')).toHaveText(passwords.movies);
});

test('challenge, dig, coupon card and box', async ({ page, browserName }, info) => {
  test.skip(skipDig(browserName, info.project.name), 'full dig flow runs in Chromium and the iPhone project');
  await toHub(page);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game!.completeChallenge('story'));
  await expect(page.getByTestId('dig-spot-movies')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/dig-spot-${info.project.name}.png` });
  await page.getByTestId('dig-spot-movies').click();
  await page.getByTestId('dig-spot-movies').click();
  await page.getByTestId('dig-spot-movies').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/dig-progress-${info.project.name}.png` });
  await digUntilCard(page, 'movies');
  await expect(page.getByTestId('coupon-password')).toHaveText(passwords.movies);
  const pwBox = (await page.getByTestId('coupon-password').boundingBox())!;
  expect(pwBox.height).toBeGreaterThanOrEqual(56);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SCREENS}/coupon-card-movies-${info.project.name}.png` });
  expect((await page.getByTestId('coupon-close').boundingBox())!.height).toBeGreaterThanOrEqual(minTap(page));
  await page.getByTestId('coupon-close').click();
  await expect(page.getByTestId('coupon-card')).toHaveCount(0);
  await expect(page.getByTestId('dig-spot-movies')).toHaveCount(0);

  await page.getByTestId('coupon-box-open').click();
  await expect(page.getByTestId('coupon-item-movies')).toContainText(passwords.movies);
  await expect(page.getByTestId('coupon-item-movies')).toHaveAttribute('data-status', 'dug');
  await page.screenshot({ path: `${SCREENS}/coupon-box-${info.project.name}.png` });
  await page.getByTestId('coupon-box-close').click();
});

test('a coupon card for every built zone (screenshots)', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'chromium only');
  await toHub(page);
  for (const [zone, coupon] of [['story', 'movies'], ['woods', 'icecream']] as const) {
    await page.evaluate((z) => window.__game!.completeChallenge(z), zone);
    await expect(page.getByTestId(`dig-spot-${coupon}`)).toBeVisible();
    await digUntilCard(page, coupon);
    await page.waitForTimeout(3300);
    await page.screenshot({ path: `${SCREENS}/coupon-card-${coupon}-${info.project.name}.png` });
    await page.getByTestId('coupon-close').click();
  }
});

test('perf smoke: average frame time in the hub', async ({ browserName }, info) => {
  test.skip(browserName !== 'chromium', 'chromium only');
  test.setTimeout(90_000);
  // Headless Chromium defaults to a CPU software renderer (SwiftShader); ask for the real GPU where there is one.
  const args = process.platform === 'win32' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: 1366, height: 1024 }, baseURL: info.project.use.baseURL });
  try {
    await toHub(page);
    await page.waitForTimeout(5000);
    const perf = await page.evaluate(() => ({ ms: window.__game!.perf!.avgFrameMs(), calls: window.__game!.perf!.drawCalls() }));
    const renderer = await page.evaluate(() => {
      const g = document.createElement('canvas').getContext('webgl2');
      const e = g?.getExtension('WEBGL_debug_renderer_info');
      return g && e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unknown';
    });
    console.log(`hub avg frame ms=${perf.ms.toFixed(2)} drawCalls=${perf.calls} renderer=${renderer}`);
    expect(perf.calls).toBeLessThan(200);
    // Software rasterisers (CI) cannot hit 60fps; only enforce the budget when a real GPU is present.
    if (!/SwiftShader|llvmpipe|Software/i.test(renderer)) expect(perf.ms).toBeLessThan(25);
  } finally {
    await browser.close();
  }
});
