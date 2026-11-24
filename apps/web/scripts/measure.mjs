// Measures what spec 01 §6 asks of the web app, by hand, against a build that is being served:
//
//   npm run build -w @arda/web && npm run preview -w @arda/web -- --port 4173 &
//   NODE_PATH=$(npm root -g) node apps/web/scripts/measure.mjs http://localhost:4173
//
// It needs Playwright with Chromium, which the repository does not depend on; it is not run
// in CI, where timings flap. CI holds the first load by its size (scripts/budget.mjs) and the
// page turn by a test that it reloads nothing (tests/mushaf.test.tsx). The numbers in the
// technical spec (§8, §9) come from this script.
//
// The profile is Lighthouse's for a mid-range phone: the CPU four times slower, and for the
// first load 1.6 Mbit/s down, 750 kbit/s up, 150 ms round trip. It is a desktop machine made
// slow, not a phone: the numbers order builds and are not a promise.

// The functions handed to the page run in the browser.
/* global window, document, localStorage, requestAnimationFrame */
/* global KeyboardEvent */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:4173';
const CPU = 4;
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function open(
  browser,
  { language = 'de', script = 'indopak', serviceWorkers = 'allow' }
) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 },
    serviceWorkers,
  });
  const page = await context.newPage();
  await page.addInitScript(
    ([l, s]) => {
      localStorage.setItem('arda.language', l);
      localStorage.setItem('arda.mushafScript', s);
    },
    [language, script]
  );
  // Nobody is signed in: the api answers at once and is not what is measured.
  await page.route(/\/api\/v1\//, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: '{"error":"unauthorized"}',
    })
  );
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp };
}

/** Largest contentful paint of `/` on a first visit: no service worker, nothing cached. */
async function firstLoad(browser, language) {
  const paints = [];
  for (let run = 0; run < 5; run++) {
    const { context, page, cdp } = await open(browser, {
      language,
      serviceWorkers: 'block',
    });
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await page.goto(`${base}/`);
    await page.locator('h1').first().waitFor();
    await page.waitForTimeout(1500);
    paints.push(Math.round(await page.evaluate(() => window.__lcp)));
    await context.close();
  }
  console.log(
    `first load (${language}): median ${median(paints)} ms of ${paints.join(', ')}`
  );
}

/**
 * From the arrow key until the next page has been drawn: its number is on screen and two
 * frames have passed, so its lines are laid out and fitted. (The address changes and the old
 * page's words are still there for a moment: neither says the new page is drawn.)
 */
async function pageTurns(browser, script, sura, pause) {
  const { context, page, cdp } = await open(browser, { script });
  await page.goto(`${base}/mushaf/${sura}`);
  await page.locator('.mushaf-word').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const turns = [];
  // Twelve pages on, then back over them: the way back shows pages drawn before.
  for (let turn = 0; turn < 24; turn++) {
    turns.push(
      Math.round(
        await page.evaluate(
          (key) =>
            new Promise((resolve) => {
              const number = () =>
                document.querySelector('.mushaf-page-number')?.textContent;
              const before = number();
              const start = performance.now();
              const look = () => {
                if (number() !== before) {
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve(performance.now() - start))
                  );
                } else requestAnimationFrame(look);
              };
              window.dispatchEvent(new KeyboardEvent('keydown', { key }));
              look();
            }),
          turn < 12 ? 'ArrowLeft' : 'ArrowRight'
        )
      )
    );
    await page.waitForTimeout(pause);
  }
  const first = turns.slice(0, 12);
  const again = turns.slice(12);
  console.log(
    `page turn (${script}, from sūra ${sura}, every ${pause} ms): new pages median ${median(first)} ms, ` +
      `slowest ${Math.max(...first)} ms; pages seen before median ${median(again)} ms, ` +
      `slowest ${Math.max(...again)} ms`
  );
  await context.close();
}

const browser = await chromium.launch();
await firstLoad(browser, 'de');
await firstLoad(browser, 'ar');
// Leafing through (a turn every 0.4 s) and reading (every 2 s): between turns the app
// measures the neighbouring pages, which leafing leaves it little time for.
for (const pause of [400, 2000]) {
  for (const script of ['indopak', 'uthmani']) {
    await pageTurns(browser, script, 2, pause);
    await pageTurns(browser, script, 78, pause);
  }
}
await browser.close();
