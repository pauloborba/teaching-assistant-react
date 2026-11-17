import { When } from '@cucumber/cucumber';
import { cpfOf } from './support/api';
import { page } from './support/browser';

/**
 * Steps of the grades the professor assigns in the Evaluations page. The
 * self-assessment shown below each student is checked by the steps of
 * features/student-grade-management.feature (self-assessment-steps.ts).
 */

When('I assign the professor grade {string} to the goal {string} of the student {string}',
  async function (grade: string, goal: string, student: string) {
    const select = `[data-testid="evaluation-row-${cpfOf(student)}"] [data-testid="evaluation-grade-${goal}"]`;
    await page().waitForSelector(select, { timeout: 10000 });
    // Changing a grade saves it, loads the classes again and asks for the discrepancies again
    await Promise.all([
      page().waitForResponse(response => response.request().method() === 'PUT' && response.url().includes('/evaluation'), { timeout: 10000 }),
      page().waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith('/discrepancies'), { timeout: 10000 }),
      page().select(select, grade)
    ]);
    // The panel is loaded again once it stops telling it is loading
    await page().waitForFunction(
      () => document.querySelector('[data-testid="discrepancy-panel"]')?.getAttribute('data-loading') === 'false',
      { timeout: 10000 }
    );
  });
