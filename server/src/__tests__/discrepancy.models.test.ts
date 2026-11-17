import { Student } from '../models/Student';
import { Class, DEFAULT_DISCREPANCY_THRESHOLD, MAX_DISCREPANCY_THRESHOLD } from '../models/Class';
import { DomainError } from '../models/DomainError';
import { Evaluation, Grade, gradeLevel } from '../models/Evaluation';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';
import { DiscrepancyAnalyzer } from '../services/DiscrepancyAnalyzer';

/**
 * Class (unit) tests of the domain objects of the discrepancies feature. Not
 * derived from the scenarios: they check the rules and boundary cases of each
 * method.
 */

type Grades = Record<string, Grade>;

const newClass = () => new Class('ESS', 2, 2026, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION);

let nextCpf = 0;
/** Enrolls a new student with the given professor grades and self-assessment grades, by goal. */
function enroll(classObj: Class, name: string, professor: Grades = {}, self: Grades = {}): void {
  const cpf = String(++nextCpf).padStart(11, '0');
  const local = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.');
  const enrollment = classObj.addEnrollment(new Student(name, cpf, `${local}@cin.ufpe.br`));
  Object.entries(professor).forEach(([goal, grade]) => enrollment.addOrUpdateEvaluation(goal, grade));
  enrollment.submitSelfAssessment(Object.entries(self).map(([goal, grade]) => new Evaluation(goal, grade)));
}

describe('gradeLevel', () => {
  test('orders the grades MANA < MPA < MA', () => {
    expect(['MANA', 'MPA', 'MA'].map(grade => gradeLevel(grade as Grade))).toEqual([0, 1, 2]);
  });
});

describe('Class discrepancy threshold', () => {
  let classObj: Class;
  beforeEach(() => { classObj = newClass(); });

  test('is 2 until it is changed', () => {
    expect(DEFAULT_DISCREPANCY_THRESHOLD).toBe(2);
    expect(classObj.getDiscrepancyThreshold()).toBe(2);
    expect(classObj.toJSON().discrepancyThreshold).toBe(2);
  });

  test('accepts the integers from 0 to the maximum, both included', () => {
    expect(MAX_DISCREPANCY_THRESHOLD).toBe(2);
    for (const threshold of [0, 1, 2]) {
      classObj.setDiscrepancyThreshold(threshold);
      expect(classObj.getDiscrepancyThreshold()).toBe(threshold);
    }
  });

  test('rejects what is not a non-negative integer, keeping the threshold', () => {
    classObj.setDiscrepancyThreshold(1);
    for (const threshold of [-1, 1.5, NaN, Infinity, '2', '', null, undefined, true, [], {}]) {
      expect(() => classObj.setDiscrepancyThreshold(threshold))
        .toThrow(new DomainError('The threshold must be a non-negative integer'));
      expect(classObj.getDiscrepancyThreshold()).toBe(1);
    }
  });

  test('rejects an integer above the maximum, keeping the threshold', () => {
    classObj.setDiscrepancyThreshold(1);
    for (const threshold of [3, 12, 100, Number.MAX_SAFE_INTEGER]) {
      expect(() => classObj.setDiscrepancyThreshold(threshold))
        .toThrow(new DomainError('The threshold must be at most 2'));
      expect(classObj.getDiscrepancyThreshold()).toBe(1);
    }
  });

  test('is rebuilt from the JSON, with the default one when the JSON has none', () => {
    classObj.setDiscrepancyThreshold(1);
    expect(Class.fromJSON(classObj.toJSON() as any, []).getDiscrepancyThreshold()).toBe(1);
    const { discrepancyThreshold, ...older } = classObj.toJSON();
    expect(Class.fromJSON(older as any, []).getDiscrepancyThreshold()).toBe(2);
  });
});

describe('DiscrepancyAnalyzer', () => {
  const analyzer = new DiscrepancyAnalyzer();
  let classObj: Class;
  beforeEach(() => { classObj = newClass(); });

  const discrepancies = () => analyzer.analyze(classObj).students.map(s => [s.student.name, s.discrepancy, s.discrepant]);

  test('sums the levels between the two grades of each goal', () => {
    classObj.setDiscrepancyThreshold(1);
    enroll(classObj, 'Carlos Lima', { Requirements: 'MANA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MA' });
    enroll(classObj, 'Beatriz Souza', { Requirements: 'MA', Tests: 'MPA' }, { Requirements: 'MA', Tests: 'MPA' });
    enroll(classObj, 'Rafael Costa', { Requirements: 'MPA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MPA' });
    expect(discrepancies()).toEqual([['Carlos Lima', 4, true], ['Rafael Costa', 2, true], ['Beatriz Souza', 0, false]]);
  });

  test('does not care which of the two grades is the higher one', () => {
    enroll(classObj, 'Over', { Design: 'MPA' }, { Design: 'MA' });
    enroll(classObj, 'Under', { Design: 'MA' }, { Design: 'MPA' });
    enroll(classObj, 'Far', { Design: 'MA' }, { Design: 'MANA' });
    expect(discrepancies()).toEqual([['Far', 2, false], ['Over', 1, false], ['Under', 1, false]]);
  });

  test('a discrepancy equal to the threshold is not discrepant, one above it is', () => {
    classObj.setDiscrepancyThreshold(2);
    enroll(classObj, 'João Pereira', { Requirements: 'MPA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MPA' });
    enroll(classObj, 'Maria Alves', { Requirements: 'MANA', Tests: 'MPA' }, { Requirements: 'MA', Tests: 'MA' });
    expect(discrepancies()).toEqual([['Maria Alves', 3, true], ['João Pereira', 2, false]]);
  });

  test('with a threshold of zero every divergence is discrepant', () => {
    classObj.setDiscrepancyThreshold(0);
    enroll(classObj, 'Exact', { Design: 'MA' }, { Design: 'MA' });
    enroll(classObj, 'Off by one', { Design: 'MA' }, { Design: 'MPA' });
    expect(discrepancies()).toEqual([['Off by one', 1, true], ['Exact', 0, false]]);
  });

  test('only the goals that have both grades count', () => {
    enroll(classObj, 'Ana Ribeiro',
      { Requirements: 'MANA', Design: 'MA', Tests: 'MPA' },
      { Requirements: 'MA', Refactoring: 'MANA', Tests: 'MPA' });
    // Requirements: 2 + Tests: 0; Design has no self-assessment and Refactoring no professor grade
    expect(discrepancies()).toEqual([['Ana Ribeiro', 2, false]]);
  });

  test('ignores grades of goals that are not goals of the class', () => {
    enroll(classObj, 'Ana Ribeiro', { Requirements: 'MA', Databases: 'MANA' }, { Requirements: 'MA', Databases: 'MA' });
    expect(discrepancies()).toEqual([['Ana Ribeiro', 0, false]]);
  });

  test('tells why the discrepancy of a student could not be computed, in the order of the enrollments', () => {
    enroll(classObj, 'Only self', {}, { Requirements: 'MA' });
    enroll(classObj, 'Only professor', { Requirements: 'MA' }, {});
    enroll(classObj, 'No grades');
    enroll(classObj, 'Nothing in common', { Requirements: 'MA' }, { Tests: 'MA' });
    enroll(classObj, 'Unknown goals only', { Databases: 'MA' }, { Databases: 'MA' });
    const report = analyzer.analyze(classObj);
    expect(report.students).toEqual([]);
    expect(report.uncomputable.map(u => [u.student.name, u.missing])).toEqual([
      ['Only self', 'professor grades'],
      ['Only professor', 'self-assessment grades'],
      ['No grades', 'professor and self-assessment grades'],
      ['Nothing in common', 'goals graded by both'],
      ['Unknown goals only', 'professor and self-assessment grades']
    ]);
  });

  test('the percentage is over the students whose discrepancy could be computed, rounded', () => {
    classObj.setDiscrepancyThreshold(1);
    enroll(classObj, 'Carlos Lima', { Requirements: 'MANA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MA' });
    enroll(classObj, 'Beatriz Souza', { Requirements: 'MA' }, { Requirements: 'MA' });
    enroll(classObj, 'Rafael Costa', { Requirements: 'MPA', Tests: 'MANA' }, { Requirements: 'MA', Tests: 'MPA' });
    let report = analyzer.analyze(classObj);
    expect([report.discrepantCount, report.computableCount, report.discrepantPercentage]).toEqual([2, 3, 67]);

    enroll(classObj, 'Maria Alves', {}, { Requirements: 'MA' });
    enroll(classObj, 'Lucas Rocha', { Requirements: 'MPA' }, {});
    report = analyzer.analyze(classObj);
    expect([report.discrepantCount, report.computableCount, report.discrepantPercentage]).toEqual([2, 3, 67]);
    expect(report.uncomputable).toHaveLength(2);
  });

  test('the percentage is 0 when no student could be computed, and 100 when all are discrepant', () => {
    expect(analyzer.analyze(classObj)).toMatchObject({ discrepantCount: 0, computableCount: 0, discrepantPercentage: 0 });
    enroll(classObj, 'No self', { Requirements: 'MA' });
    expect(analyzer.analyze(classObj).discrepantPercentage).toBe(0);
    classObj.setDiscrepancyThreshold(0);
    enroll(classObj, 'Far', { Requirements: 'MA' }, { Requirements: 'MANA' });
    expect(analyzer.analyze(classObj)).toMatchObject({ discrepantCount: 1, computableCount: 1, discrepantPercentage: 100 });
  });

  test('puts the greatest discrepancy first, and orders ties by name', () => {
    classObj.setDiscrepancyThreshold(0);
    enroll(classObj, 'Zé', { Design: 'MA' }, { Design: 'MANA' });
    enroll(classObj, 'Ana', { Design: 'MA' }, { Design: 'MANA' });
    enroll(classObj, 'Bia', { Design: 'MA' }, { Design: 'MPA' });
    enroll(classObj, 'Caio', { Design: 'MA', Tests: 'MA' }, { Design: 'MANA', Tests: 'MANA' });
    expect(discrepancies().map(([name]) => name)).toEqual(['Caio', 'Ana', 'Zé', 'Bia']);
  });

  test('reports the threshold and the data of the student, and changes nothing', () => {
    classObj.setDiscrepancyThreshold(1);
    enroll(classObj, 'Ana Ribeiro', { Design: 'MA' }, { Design: 'MANA' });
    const before = JSON.stringify(classObj.toJSON());
    const report = analyzer.analyze(classObj);
    expect(report.discrepancyThreshold).toBe(1);
    expect(report.students[0].student).toEqual({ name: 'Ana Ribeiro', cpf: expect.stringMatching(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/), email: 'ana.ribeiro@cin.ufpe.br' });
    expect(JSON.stringify(classObj.toJSON())).toBe(before);
  });

  test('a class with no enrollment has nothing to report', () => {
    expect(analyzer.analyze(classObj)).toEqual({
      discrepancyThreshold: 2, students: [], uncomputable: [], discrepantCount: 0, computableCount: 0, discrepantPercentage: 0
    });
  });
});
