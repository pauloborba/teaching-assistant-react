import { Browser, Page, launch } from 'puppeteer';
import { AfterAll } from '@cucumber/cucumber';

let browser: Browser | null = null;
let page: Page | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await launch({
      headless: false,
      slowMo: 50,
      defaultViewport: null,
      args: ['--start-maximized']
    });
  }
  return browser;
}

export async function getPage(): Promise<Page> {
  const b = await getBrowser();
  if (!page) {
    page = await b.newPage();
  }
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

AfterAll(async function () {
  await closeBrowser();
});
