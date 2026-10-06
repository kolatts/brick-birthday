// Dev helper: screenshot the figure turntable. Usage: node scripts/models/shot.mjs <out.png> "<query>" [width] [height] [base]
import { chromium } from '@playwright/test';
const [out, query = 'turntable=luna', w = '900', h = '1000', base = 'http://localhost:5199/'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${base}?${query}`);
await page.waitForTimeout(3500);
await page.screenshot({ path: out });
if (errs.length) console.log('ERRORS', errs.slice(0, 5).join('\n'));
await browser.close();
