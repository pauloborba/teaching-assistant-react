import { Given, When } from '@cucumber/cucumber';
import { classRef } from './support/api';
import { openTab, page } from './support/browser';

/**
 * Steps that take the browser to a page of a class, for the pages that show
 * the data of the class chosen in a selector. To make another page of this
 * kind reachable, add it to PAGES.
 */

interface ClassPage {
  /** Test id of the tab that shows the page */
  tab: string;
  /** Test id of the selector where the class is chosen */
  classSelect: string;
  /** Test id of an element that is shown once the class is chosen and its data loaded */
  loaded: string;
}

const PAGES: Record<string, ClassPage> = {
  Evaluations: { tab: 'evaluations-tab', classSelect: 'evaluations-class-select', loaded: 'evaluation-matrix' }
};

async function openClassPage(pageName: string, className: string): Promise<void> {
  const target = PAGES[pageName];
  if (!target) {
    throw new Error(`Unknown page "${pageName}": known pages are ${Object.keys(PAGES).join(', ')}`);
  }
  await openTab(target.tab);
  const classSelect = `[data-testid="${target.classSelect}"]`;
  await page().waitForSelector(`${classSelect} option[value="${classRef(className).id}"]`, { timeout: 10000 });
  await page().select(classSelect, classRef(className).id);
  await page().waitForSelector(`[data-testid="${target.loaded}"]`, { timeout: 10000 });
}

Given('I am at the {string} page of the class {string}', openClassPage);

When('I open the {string} page of the class {string}', openClassPage);
