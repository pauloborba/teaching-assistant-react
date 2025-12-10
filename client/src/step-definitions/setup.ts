import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';

setDefaultTimeout(30 * 1000);

export const scope = {
  browser: null as unknown as Browser,
  page: null as unknown as Page,
};

Before({ tags: '@gui' }, async function () {
  scope.browser = await launch({ 
    headless: false, 
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const pages = await scope.browser.pages();
  scope.page = pages.length > 0 ? pages[0] : await scope.browser.newPage();
  await scope.page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  if (scope.browser) {
    await scope.browser.close();
  }
});
