// Screenshots a route of the running app and the matching PoC page at three widths, and reports
// horizontal overflow and console errors.
//   bun scripts/shots.mjs <name> <app path> [poc file]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [name, path = '/', poc] = process.argv.slice(2);
const app = process.env.APP_URL ?? 'http://localhost:5173';
const pocRoot = process.env.POC_ROOT ?? 'C:/Users/Aochi/rosu-redesign';
const widths = [360, 800, 1440];
const reduced = process.env.REDUCED === '1';

mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch();

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${app}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  // Rows reveal against the viewport, so it is made as tall as the page for the full-page shot.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshots/${name}-${width}-app.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  console.log(`${width}px overflow=${overflow} errors=${errors.length}`);
  for (const error of errors) console.log(`  ${error.slice(0, 200)}`);

  if (poc) {
    await page.goto(`file:///${pocRoot}/${poc}`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/${name}-${width}-poc.png`, fullPage: true });
  }
  await context.close();
}
await browser.close();
