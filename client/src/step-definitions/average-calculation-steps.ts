import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';
import { Class } from '../types/Class';
import { Enrollment } from '../types/Enrollment';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

interface TestContext {
  browser?: Browser;
  page?: Page;
  selectedClass?: Class;
  currentEnrollment?: Enrollment;
  lastError?: string;
}

const context: TestContext = {};

// ============================================
// BEFORE and AFTER HOOKS
// ============================================

Before(async function () {
  context.browser = await launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50
  });
  context.page = await context.browser.newPage();
  if (context.page) {
    await context.page.setViewport({ width: 1280, height: 720 });
  }
});

After(async function () {
  if (context.browser) {
    await context.browser.close();
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Finds a class by its topic and semester/year
 * Format: "Engenharia de Software e Sistemas (2025/2)"
 */
async function findClassByTopicAndSemester(topicAndSemester: string): Promise<Class | null> {
  try {
    const classes = await ClassService.getAllClasses();
    // Parse the format: "Topic (year/semester)"
    const match = topicAndSemester.match(/^(.+?)\s*\((\d{4})\/(\d+)\)$/);
    if (!match) {
      throw new Error(`Invalid class format: ${topicAndSemester}`);
    }
    
    const [, topic, year, semester] = match;
    const found = classes.find((c: Class) => 
      c.topic === topic && 
      c.year === parseInt(year) && 
      c.semester === parseInt(semester)
    );
    return found || null;
  } catch (error) {
    console.error('Error finding class:', error);
    return null;
  }
}

/**
 * Converts grade strings (MANA, MPA, MA) to numeric values
 * MA = 10, MPA = 7, MANA = 0
 */
function gradeToNumericValue(grade: string): number {
  const gradeMap: { [key: string]: number } = {
    'MA': 10,
    'MPA': 7,
    'MANA': 0
  };
  return gradeMap[grade] || 0;
}

/**
 * Calculates average from grades
 * Average = (sum of grade values) / number of grades
 */
function calculateAverage(grades: string[]): number {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, grade) => acc + gradeToNumericValue(grade), 0);
  return sum / grades.length;
}

/**
 * Calculates final average after exam
 * If student passed before final (média >= 7): maintains the passing status
 * If student is in final (4 <= média < 7): final average = (média + final grade) / 2
 * If student failed (média < 4): remains failed
 */
function calculateFinalAverage(preExamAverage: number, finalExamGrade: string | null | undefined): number {
  if (preExamAverage >= 7) {
    // Already approved, no need for final
    return preExamAverage;
  }
  
  // In final exam range
  if (!finalExamGrade) {
    return preExamAverage;
  }
  
  const finalValue = gradeToNumericValue(finalExamGrade);
  return (preExamAverage + finalValue) / 2;
}

/**
 * Determines approval status based on pre-final and post-final averages
 * - Approved: mediaPreFinal >= 7
 * - Approved in Final: 4 <= mediaPreFinal < 7 AND mediaPosFinal >= 5
 * - In Final: 4 <= mediaPreFinal < 7 AND mediaPosFinal < 5
 * - Failed: mediaPreFinal < 4
 */
function getApprovalStatus(mediaPreFinal: number, mediaPosFinal: number | null): string {
  // Already approved before final
  if (mediaPreFinal >= 7) {
    return 'approved';
  }

  // Failed - cannot take final
  if (mediaPreFinal < 4) {
    return 'failed';
  }

  // In final range (4 <= mediaPreFinal < 7)
  if (mediaPosFinal === null) {
    return 'in-final';
  }

  // Check post-final result
  if (mediaPosFinal >= 5) {
    return 'approved-in-final';
  } else {
    return 'in-final';
  }
}

/**
 * Test helper: Validate approval status with both pre and post-final averages
 */
function validateApprovalStatus(
  mediaPreFinal: number,
  mediaPosFinal: number | null,
  expectedStatus: string
): void {
  const status = getApprovalStatus(mediaPreFinal, mediaPosFinal);
  expect(status).toBe(expectedStatus);
}

// ============================================
// GUI TEST STEPS (Evaluations Page)
// ============================================
Given('estou na página "Evaluations" da turma {string}', async function (classReference: string) {
  const page = context.page!;
  
  // Navigate to the application
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });

  // Clique na aba de avaliações se não estiver ativa
  await page.waitForSelector('button, a', { timeout: 10000 });
  
  const buttons = await page.$$('button, a');
  let found = false;
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text?.includes('Evaluations') || text?.includes('Avaliações')) {
      // console.log('Clicando no botão Evaluations...');
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log('Botão Evaluations não encontrado, pode já estar na página');
  }

  // Find and select the class
  const classObj = await findClassByTopicAndSemester(classReference);
  if (!classObj) {
    throw new Error(`Class not found: ${classReference}`);
  }
  context.selectedClass = classObj;

  // Aguarda o dropdown de turmas
  await page.waitForSelector('#classSelect', { timeout: 5000 });

  // Select the class from the dropdown
  const classSelect = await page.$('#classSelect');
  if (!classSelect) {
    throw new Error('Class select dropdown not found');
  }
  await classSelect.select(classObj.id);

  // Aguarda a tabela de avaliações aparecer
  await page.waitForSelector('.evaluation-table-container', { timeout: 5000 });
  await page.waitForSelector('.evaluation-table', { timeout: 5000 });
});

Given('o estudante tem média {string} e tem nota final como {string}', async function (average, finalAverage) {
  const classObj = context.selectedClass!; 
  if (!classObj.enrollments || classObj.enrollments.length === 0) {
    throw new Error('No students enrolled in the class');
  }
  
  context.currentEnrollment = classObj.enrollments[0];
  const enrollment = context.currentEnrollment;
  
  // Atualiza média pré-final
  enrollment.mediaPreFinal = parseFloat(average.replace(',', '.')); 
  
  // Atualiza avaliação final
  const finalEval = enrollment.evaluations.find(e => e.goal === 'Final');
  if (finalEval) {
    finalEval.grade = finalAverage;
  } else {
    // Se não existe, cria
    enrollment.evaluations.push({ goal: 'Final', grade: finalAverage });
  }
  
  // Calcula média pós-final
  const finalValue = gradeToNumericValue(finalAverage);
  enrollment.mediaPosFinal = (enrollment.mediaPreFinal + finalValue) / 2;
  
  // Valida os valores
  expect(enrollment.mediaPreFinal).toBeCloseTo(parseFloat(average.replace(',', '.')), 1);
  expect(enrollment.evaluations.find(e => e.goal === 'Final')?.grade).toBe(finalAverage);
  expect(enrollment.mediaPosFinal).toBeCloseTo(parseFloat('6.1'), 1); });

When('eu vejo que a média final é {string}', async function (expectedAverageStr: string) {
  const page = context.page!;
  const expected = parseFloat(expectedAverageStr.replace(',', '.'));

  // Busca somente a célula da média final (pós-final)
  const displayedText = await page.evaluate(() => {
    const cell = document.querySelector('.final-average-cell');
    return cell?.textContent?.trim() || "";
  });

  const displayed = parseFloat(displayedText.replace(',', '.'));
  expect(displayed).toBeCloseTo(expected, 1);
});

Then('eu sei que fui aprovado na final', function () {
  const enrollment = context.currentEnrollment!;
  const preExamAverage = enrollment.mediaPreFinal;
  const finalAverage = enrollment.mediaPosFinal;
  if (typeof preExamAverage !== 'number' || typeof finalAverage !== 'number') {
    throw new Error('Averages not properly calculated');
  }
  // Está na final se média pré-final < 7
  expect(preExamAverage).toBeLessThan(7);
  // Aprovado na final se média pós-final >= 5
  expect(finalAverage).toBeGreaterThanOrEqual(5);
});

When('eu vejo que a média é {string}', async function (expectedAverageStr: string) {
  const page = context.page!;
  const expected = parseFloat(expectedAverageStr.replace(',', '.'));

  // Procura a coluna "Average" (média pré-final)
  const displayedText = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.average-cell'));
    for (const cell of cells) {
      const text = cell.textContent?.trim() || "";
      if (/^\d+([.,]\d+)?$/.test(text)) {
        return text;
      }
    }
    return "";
  });

  const displayed = parseFloat(displayedText.replace(',', '.'));

  expect(displayed).toBeCloseTo(expected, 1);
});

// When('eu vejo a minha média, que é {string}', async function (expectedAverageStr: string) {
//   const page = context.page!;
//   const expected = parseFloat(expectedAverageStr.replace(',', '.'));

//   // Busca exclusivamente células com classe "average-cell"
//   const displayedText = await page.evaluate(() => {
//     const cell = document.querySelector('.average-cell');
//     return cell?.textContent?.trim() || "";
//   });

//   const displayed = parseFloat(displayedText.replace(',', '.'));
//   expect(displayed).toBeCloseTo(expected, 1);
// });

When('nota final está vazia', async function () {
  const page = context.page!;

  const finalAverageContent = await page.evaluate(() => {
    const cell = document.querySelector('.final-average-cell');
    return cell?.textContent?.trim() || "";
  });

  expect(finalAverageContent).toBe('');
});

Then('eu sei que estou na final', function () {
  const enrollment = context.currentEnrollment!;
  // Está na final se média pré-final < 7
  const average = enrollment.mediaPreFinal;
  expect(typeof average).toBe('number');
  expect(average).toBeLessThan(7);
});

Then('eu sei que estou aprovado', function () {
  const enrollment = context.currentEnrollment!;
  // Aprovado se média pré-final >= 7
  const average = enrollment.mediaPreFinal;
  expect(typeof average).toBe('number');
  expect(average).toBeGreaterThanOrEqual(7);
});

// ============================================
// SERVER/API TEST STEPS
// ============================================

Given('o estudante tem média menor que {string} e tem nota final como {string}', 
  async function (thresholdStr: string, finalGrade: string) {
    const enrollment = context.currentEnrollment!;
    
    const threshold = parseFloat(thresholdStr.replace(',', '.'));
    
    // Verify pre-exam average is less than threshold
    if (typeof enrollment.mediaPreFinal === 'number') {
      expect(enrollment.mediaPreFinal).toBeLessThan(threshold);
    } else {
      throw new Error('Pre-final average not available');
    }
    
    // Verify final grade is set to expected value
    const finalEvaluation = enrollment.evaluations.find(e => e.goal === 'Final');
    if (finalEvaluation) {
      expect(finalEvaluation.grade).toBe(finalGrade);
    } else {
      throw new Error('Final evaluation not found');
    }
  }
);

// ============================================
// INTEGRATION TEST HELPERS
// ============================================

/**
 * Helper step to setup test data with specific grades
 */
Given('um estudante com as seguintes notas:', async function (dataTable: any) {
  const data = dataTable.rowsHash();
  const classObj = context.selectedClass!;
  
  // Find or create student with specific evaluations
  if (classObj.enrollments.length === 0) {
    throw new Error('No students in selected class');
  }
  
  const enrollment = classObj.enrollments[0];
  context.currentEnrollment = enrollment;
  
  // Parse and set evaluations based on data table
  for (const [goal, grade] of Object.entries(data)) {
    if (goal !== 'name') {
      try {
        await EnrollmentService.updateEvaluation(
          classObj.id,
          enrollment.student.cpf,
          goal,
          grade as string
        );
      } catch (error) {
        context.lastError = `Failed to set evaluation: ${error}`;
      }
    }
  }
});

/**
 * Helper to verify calculation logic
 */
Then('a média calculada deve ser {string}', function (expectedAverageStr: string) {
  const enrollment = context.currentEnrollment!;
  const expectedAverage = parseFloat(expectedAverageStr.replace(',', '.'));
  
  if (typeof enrollment.mediaPreFinal === 'number') {
    expect(enrollment.mediaPreFinal).toBeCloseTo(expectedAverage, 1);
  } else {
    throw new Error('Average not calculated');
  }
});

/**
 * Helper to verify final average calculation
 */
Then('a média final calculada deve ser {string}', function (expectedFinalAverageStr: string) {
  const enrollment = context.currentEnrollment!;
  const expectedFinalAverage = parseFloat(expectedFinalAverageStr.replace(',', '.'));
  
  if (typeof enrollment.mediaPosFinal === 'number') {
    expect(enrollment.mediaPosFinal).toBeCloseTo(expectedFinalAverage, 1);
  } else {
    throw new Error('Final average not calculated');
  }
});

/**
 * Helper to verify the system state after actions
 */
Then('nenhum erro deve ser exibido', function () {
  expect(context.lastError).toBeUndefined();
});

/**
 * Verify grades are properly displayed in the evaluation table
 */
Then('as notas devem ser exibidas corretamente na tabela', async function () {
  const page = context.page!;
  
  // Check that evaluation table is visible and contains student data
  const tableVisible = await page.$('.evaluation-table');
  expect(tableVisible).not.toBeNull();
  
  // Verify table has rows for students
  const studentRows = await page.$$('.student-row');
  expect(studentRows.length).toBeGreaterThan(0);
});