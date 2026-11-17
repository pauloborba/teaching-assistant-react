import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { Evaluation } from '../models/Evaluation';
import { SelfAssessmentRequest } from '../models/SelfAssessmentRequest';
import { formatDate, isIsoDate } from '../models/Dates';
import { DomainError, NotFoundError } from '../models/DomainError';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';

/**
 * Class (unit) tests of the domain objects of the self-assessment grades
 * feature. Not derived from the scenarios: they check the rules and
 * boundary cases of each method.
 */

const bruno = () => new Student('Bruno Tavares', '123.456.789-01', 'bruno@cin.ufpe.br');
const BRUNO_CPF = '12345678901';
const newClass = () => new Class('ESS', 2, 2026, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION);

describe('Dates', () => {
  test('recognises existing dates written yyyy-mm-dd', () => {
    expect(isIsoDate('2026-10-20')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  test('rejects other formats, impossible dates and non strings', () => {
    for (const value of ['20/10/2026', '2026-10-2', '2026-13-01', '2026-02-30', '2025-02-29', '', null, 20261020]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });

  test('formats dates as dd/mm/yyyy', () => {
    expect(formatDate('2026-10-20')).toBe('20/10/2026');
  });
});

describe('SelfAssessmentRequest', () => {
  test('keeps the deadline and the date it was sent', () => {
    const request = new SelfAssessmentRequest('2026-10-20', '2026-10-08');
    expect(request.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(SelfAssessmentRequest.fromJSON(request.toJSON())).toEqual(request);
  });

  test('is open before and on the deadline, and closed after it', () => {
    const request = new SelfAssessmentRequest('2026-10-20', '2026-10-08');
    expect(request.isOpenOn('2026-10-08')).toBe(true);
    expect(request.isOpenOn('2026-10-20')).toBe(true);
    expect(request.isOpenOn('2026-10-21')).toBe(false);
    expect(request.isOpenOn('2027-01-01')).toBe(false);
  });

  test('rejects dates that are not ISO dates', () => {
    expect(() => new SelfAssessmentRequest('20/10/2026', '2026-10-08')).toThrow(DomainError);
    expect(() => new SelfAssessmentRequest('2026-10-20', 'today')).toThrow(DomainError);
  });
});

describe('Enrollment self-assessment', () => {
  let enrollment: Enrollment;
  beforeEach(() => { enrollment = new Enrollment(bruno()); });

  const evaluations = (grades: Record<string, 'MANA' | 'MPA' | 'MA'>) =>
    Object.entries(grades).map(([goal, grade]) => new Evaluation(goal, grade));

  test('starts with no self-assessment grade', () => {
    expect(enrollment.getSelfAssessments()).toEqual([]);
    expect(enrollment.toJSON().selfAssessments).toEqual([]);
  });

  test('a submission replaces the whole self-assessment', () => {
    enrollment.submitSelfAssessment(evaluations({ Requirements: 'MPA', Tests: 'MANA' }));
    enrollment.submitSelfAssessment(evaluations({ Tests: 'MA', Design: 'MPA' }));
    expect(enrollment.toJSON().selfAssessments).toEqual([
      { goal: 'Tests', grade: 'MA' },
      { goal: 'Design', grade: 'MPA' }
    ]);
  });

  test('keeps the self-assessment apart from the professor grades', () => {
    enrollment.addOrUpdateEvaluation('Requirements', 'MA');
    enrollment.submitSelfAssessment(evaluations({ Requirements: 'MANA' }));
    expect(enrollment.toJSON().evaluations).toEqual([{ goal: 'Requirements', grade: 'MA' }]);
    expect(enrollment.toJSON().selfAssessments).toEqual([{ goal: 'Requirements', grade: 'MANA' }]);
  });

  test('is not changed by changes to the list it was given', () => {
    const submitted = evaluations({ Tests: 'MA' });
    enrollment.submitSelfAssessment(submitted);
    submitted.push(new Evaluation('Design', 'MPA'));
    expect(enrollment.getSelfAssessments()).toHaveLength(1);
  });

  test('is rebuilt from its JSON, also from JSON written before self-assessments existed', () => {
    enrollment.submitSelfAssessment(evaluations({ Design: 'MPA' }));
    const rebuilt = Enrollment.fromJSON(enrollment.toJSON(), bruno());
    expect(rebuilt.toJSON().selfAssessments).toEqual([{ goal: 'Design', grade: 'MPA' }]);
    const { selfAssessments, ...older } = enrollment.toJSON();
    expect(Enrollment.fromJSON(older as any, bruno()).getSelfAssessments()).toEqual([]);
  });
});

describe('Class self-assessment request', () => {
  let classObj: Class;
  beforeEach(() => { classObj = newClass(); });

  test('has no request initially', () => {
    expect(classObj.getSelfAssessmentRequest()).toBeNull();
    expect(classObj.toJSON().selfAssessmentRequest).toBeNull();
  });

  test('keeps the request until it is cancelled', () => {
    const request = classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    expect(request.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classObj.toJSON().selfAssessmentRequest).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classObj.cancelSelfAssessmentRequest()).toBe(true);
    expect(classObj.cancelSelfAssessmentRequest()).toBe(false);
    expect(classObj.getSelfAssessmentRequest()).toBeNull();
  });

  test('a class rebuilt from its JSON keeps the request', () => {
    classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    const rebuilt = Class.fromJSON(classObj.toJSON() as any, [bruno()]);
    expect(rebuilt.getSelfAssessmentRequest()?.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
  });
});

describe('Class self-assessment submission', () => {
  let classObj: Class;
  beforeEach(() => {
    classObj = newClass();
    classObj.addEnrollment(bruno());
  });

  const stored = () => classObj.findEnrollmentByStudentCPF(BRUNO_CPF)!.toJSON().selfAssessments;
  const ALL_GOALS = {
    Requirements: 'MA', 'Configuration Management': 'MPA', 'Project Management': 'MANA',
    Design: 'MA', Tests: 'MPA', Refactoring: 'MANA'
  };

  test('an enrolled student submits without any request', () => {
    expect(classObj.getSelfAssessmentRequest()).toBeNull();
    const enrollment = classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: 'MPA' });
    expect(enrollment.getStudent().getCPF()).toBe(BRUNO_CPF);
    expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
  });

  test('the request and its deadline never prevent a submission', () => {
    classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    classObj.submitSelfAssessment(BRUNO_CPF, { Tests: 'MA' });
    expect(stored()).toEqual([{ goal: 'Tests', grade: 'MA' }]);
  });

  test('a submission with a grade for each of the six goals is stored in the order of the goals', () => {
    // Sent in the reverse order of the goals
    classObj.submitSelfAssessment(BRUNO_CPF, Object.fromEntries(Object.entries(ALL_GOALS).reverse()));
    expect(stored()).toEqual(Object.entries(ALL_GOALS).map(([goal, grade]) => ({ goal, grade })));
  });

  test('updating a grade and leaving a goal without grade removes it', () => {
    classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: 'MPA', Tests: 'MANA' });
    classObj.submitSelfAssessment(BRUNO_CPF, { Tests: 'MA' });
    expect(stored()).toEqual([{ goal: 'Tests', grade: 'MA' }]);
  });

  test('goals given an empty grade, or null, are goals without grade', () => {
    classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: '', Tests: 'MA', Design: null });
    expect(stored()).toEqual([{ goal: 'Tests', grade: 'MA' }]);
  });

  describe('rejects, changing nothing', () => {
    const empty = new DomainError('Assign a grade to at least one goal');
    beforeEach(() => classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: 'MPA' }));

    test('an empty submission', () => {
      expect(() => classObj.submitSelfAssessment(BRUNO_CPF, {})).toThrow(empty);
      expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
    });

    test('a submission whose goals are all without grade, which would remove the last grade', () => {
      expect(() => classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: '' })).toThrow(empty);
      expect(() => classObj.submitSelfAssessment(BRUNO_CPF, { Requirements: null, Tests: '' })).toThrow(empty);
      expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
    });

    test('grades that are not given by goal', () => {
      for (const grades of [undefined, null, 'MA', ['MA'], 10]) {
        expect(() => classObj.submitSelfAssessment(BRUNO_CPF, grades))
          .toThrow(new DomainError('Grades must map each goal to its grade'));
      }
      expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
    });

    test('a grade that is not MANA, MPA or MA, even with valid grades in the same submission', () => {
      for (const grade of ['XYZ', 'ma', ' MA', 10, true]) {
        expect(() => classObj.submitSelfAssessment(BRUNO_CPF, { Tests: 'MA', Design: grade }))
          .toThrow(new DomainError('Invalid grade. Must be MANA, MPA, or MA'));
      }
      expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
    });

    test('a goal that is not evaluated in the class', () => {
      expect(() => classObj.submitSelfAssessment(BRUNO_CPF, { Tests: 'MA', Databases: 'MA' }))
        .toThrow(new DomainError('Databases is not a goal of the class'));
      expect(() => classObj.submitSelfAssessment(BRUNO_CPF, { tests: 'MA' }))
        .toThrow(new DomainError('tests is not a goal of the class'));
      expect(stored()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
    });

    test('a student not enrolled in the class', () => {
      expect(() => classObj.submitSelfAssessment('98765432100', { Tests: 'MA' }))
        .toThrow(new NotFoundError('Student not enrolled in this class'));
    });
  });
});
