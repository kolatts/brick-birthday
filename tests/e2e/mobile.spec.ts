import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const SCREENS = 'test-results/screens';
fs.mkdirSync(SCREENS, { recursive: true });
test.describe.configure({ timeout: 120_000 });

// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'iphone-webkit', 'phone layout checks run on the iPhone project only');
});

/** data-testid elements must sit inside the viewport; buttons must be at least 52px; no horizontal overflow. */
async function checkLayout(page: Page, label: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENS}/mobile-${label.replace(/\s+/g, '-')}.png` });
  const res = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clipped: string[] = [];
    const small: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid]'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // elements inside a scroll container may legitimately extend past it; only the unscrolled part is checked
      let scrolled = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowY;
        if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) scrolled = true;
      }
      const id = el.getAttribute('data-testid')!;
      if (!scrolled && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) clipped.push(`${id} (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`);
      if (el.tagName === 'BUTTON' && (r.height < 51.5 || r.width < 51.5) && !scrolled) small.push(`${id} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { clipped, small, overflow: document.documentElement.scrollWidth - vw, bodyOverflow: document.body.scrollWidth - vw };
  });
  expect(res.clipped, `${label}: clipped`).toEqual([]);
  expect(res.small, `${label}: small tap targets`).toEqual([]);
  expect(res.overflow, `${label}: horizontal overflow`).toBeLessThanOrEqual(0);
  expect(res.bodyOverflow, `${label}: body overflow`).toBeLessThanOrEqual(0);
}

test('phone layout: title, hub, overlays, story, movie night and woods fit', async ({ page }) => {
  await page.goto('./?test=1');
  await expect(page.getByTestId('play-button')).toBeVisible();
  await checkLayout(page, 'title');
  await page.getByTestId('note-open').click();
  await expect(page.getByTestId('note-card')).toBeVisible();
  await checkLayout(page, 'title note');
  await page.screenshot({ path: `${SCREENS}/mobile-title-note.png` });
  await page.getByTestId('note-close').click();
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hub-ready')).toBeAttached();
  await checkLayout(page, 'hub');

  await page.getByTestId('closet-open').click();
  await expect(page.getByTestId('closet')).toBeVisible();
  await checkLayout(page, 'closet');
  await page.getByTestId('closet-close').click();
  await page.getByTestId('coupon-box-open').click();
  await expect(page.getByTestId('coupon-box')).toBeVisible();
  await checkLayout(page, 'coupon box');
  await page.getByTestId('coupon-box-close').click();

  await page.getByTestId('zone-story').click();
  await expect(page.getByTestId('zone-screen-story')).toBeVisible();
  await checkLayout(page, 'story pick');
  await page.getByTestId('tile-hero-mom').click();
  await page.getByTestId('tile-place-teagarden').click();
  await page.getByTestId('tile-problem-teapot').click();
  await page.getByTestId('tile-power-giggle').click();
  await checkLayout(page, 'story ready');
  await page.getByTestId('tell-story').click();
  await expect(page.getByTestId('story-page')).toBeVisible();
  await checkLayout(page, 'story playing');
  await page.evaluate(() => window.__game!.setScreen({ kind: 'hub' }));

  await page.evaluate(() => window.__game!.setScreen({ kind: 'challenge', zone: 'story' }));
  await expect(page.getByTestId('challenge-screen-story')).toBeVisible();
  await checkLayout(page, 'movie night');

  await page.evaluate(() => window.__game!.setScreen({ kind: 'zone', zone: 'woods' }));
  await expect(page.getByTestId('zone-screen-woods')).toBeVisible();
  await expect(page.getByTestId('stump-0')).toBeVisible({ timeout: 15000 });
  await checkLayout(page, 'woods');
  await page.getByTestId('stump-0').click();
  await page.getByTestId('water-btn').click();
  await page.getByTestId('wand-btn').click();
  await expect(page.getByTestId('caption')).toBeVisible({ timeout: 8000 });
  await checkLayout(page, 'woods caption');
});

test('phone layout: tea garden and orders fit', async ({ page }) => {
  await page.goto('./?test=1');
  await page.evaluate(() => window.__game!.setScreen({ kind: 'zone', zone: 'woods' }));
  await expect(page.getByTestId('stump-0')).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => window.__game!.autoPlay('woods'));
  await expect(page.getByTestId('brick-celebration')).toBeVisible();
  await page.screenshot({ path: `${SCREENS}/mobile-woods-brick.png` });
  await page.getByTestId('replay-tea').click();
  await expect(page.getByTestId('guest-luna')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await checkLayout(page, 'tea garden');
  await page.getByTestId('challenge-btn').click();
  await expect(page.getByTestId('challenge-screen-woods')).toBeVisible();
  await page.waitForTimeout(500);
  await checkLayout(page, 'orders');
});
