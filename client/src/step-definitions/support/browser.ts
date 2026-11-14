import { AfterAll, Before } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';

/**
 * The browser used by the GUI scenarios (tagged @gui), shared by all their
 * step definitions. One browser is launched for the whole run, and each GUI
 * scenario gets a new page, so that no scenario sees what another one left.
 *
 * Set HEADLESS=true to run without showing the browser (e.g. in CI).
 */

/** Where the client listens; CLIENT_URL changes it when port 3004 is taken. */
export const clientUrl = process.env.CLIENT_URL || 'http://localhost:3004';

let browser: Browser | undefined;
let currentPage: Page | undefined;

/** The page of the current GUI scenario. */
export function page(): Page {
  if (!currentPage) {
    throw new Error('No browser page: is the scenario tagged @gui?');
  }
  return currentPage;
}

Before({ tags: '@gui' }, async function () {
  if (!browser) {
    const headless = process.env.HEADLESS === 'true';
    browser = await launch({ headless, slowMo: headless ? 0 : 50 });
  }
  if (currentPage) {
    await currentPage.close();
  }
  currentPage = await browser.newPage();
  await currentPage.setViewport({ width: 1280, height: 720 });
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});

/** Text of the element with the given test id, waiting for it to appear. */
export async function textOf(testId: string): Promise<string> {
  const element = await page().waitForSelector(`[data-testid="${testId}"]`, { timeout: 10000 });
  return page().evaluate(el => el?.textContent ?? '', element);
}

/** Opens the client and the tab with the given test id. */
export async function openTab(tabTestId: string): Promise<void> {
  await page().goto(clientUrl);
  const tab = await page().waitForSelector(`[data-testid="${tabTestId}"]`, { timeout: 10000 });
  await tab!.click();
}
