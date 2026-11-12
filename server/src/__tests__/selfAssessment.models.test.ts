import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
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

  test('starts with no self-assessment grade', () => {
    expect(enrollment.getSelfAssessments()).toEqual([]);
    expect(enrollment.toJSON().selfAssessments).toEqual([]);
  });

  test('registers, updates and removes grades, one per goal', () => {
    enrollment.setSelfAssessment('Requirements', 'MPA');
    enrollment.setSelfAssessment('Tests', 'MANA');
    enrollment.setSelfAssessment('Tests', 'MA');
    expect(enrollment.toJSON().selfAssessments).toEqual([
      { goal: 'Requirements', grade: 'MPA' },
      { goal: 'Tests', grade: 'MA' }
    ]);
    expect(enrollment.removeSelfAssessment('Requirements')).toBe(true);
    expect(enrollment.removeSelfAssessment('Requirements')).toBe(false);
    expect(enrollment.toJSON().selfAssessments).toEqual([{ goal: 'Tests', grade: 'MA' }]);
  });

  test('keeps the self-assessment apart from the professor grades', () => {
    enrollment.addOrUpdateEvaluation('Requirements', 'MA');
    enrollment.setSelfAssessment('Requirements', 'MANA');
    enrollment.removeSelfAssessment('Requirements');
    expect(enrollment.toJSON().evaluations).toEqual([{ goal: 'Requirements', grade: 'MA' }]);
    expect(enrollment.toJSON().selfAssessments).toEqual([]);
  });

  test('is rebuilt from its JSON, also from JSON written before self-assessments existed', () => {
    enrollment.setSelfAssessment('Design', 'MPA');
    const rebuilt = Enrollment.fromJSON(enrollment.toJSON(), bruno());
    expect(rebuilt.toJSON().selfAssessments).toEqual([{ goal: 'Design', grade: 'MPA' }]);
    const { selfAssessments, ...older } = enrollment.toJSON();
    expect(Enrollment.fromJSON(older as any, bruno()).getSelfAssessments()).toEqual([]);
  });
});

describe('Class self-assessment', () => {
  let classObj: Class;
  beforeEach(() => {
    classObj = newClass();
    classObj.addEnrollment(bruno());
  });

  const grades = () => classObj.findEnrollmentByStudentCPF(BRUNO_CPF)!.toJSON().selfAssessments;

  test('has no self-assessment request initially, so the self-assessment is closed', () => {
    expect(classObj.getSelfAssessmentRequest()).toBeNull();
    expect(classObj.isSelfAssessmentOpen('2026-10-15')).toBe(false);
    expect(classObj.toJSON().selfAssessmentRequest).toBeNull();
  });

  test('a request opens the self-assessment until its deadline', () => {
    const request = classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    expect(request.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classObj.toJSON().selfAssessmentRequest).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classObj.isSelfAssessmentOpen('2026-10-20')).toBe(true);
    expect(classObj.isSelfAssessmentOpen('2026-10-21')).toBe(false);
  });

  test('cancelling the request closes the self-assessment', () => {
    classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    expect(classObj.cancelSelfAssessmentRequest()).toBe(true);
    expect(classObj.cancelSelfAssessmentRequest()).toBe(false);
    expect(classObj.isSelfAssessmentOpen('2026-10-15')).toBe(false);
  });

  describe('while the self-assessment is open', () => {
    beforeEach(() => classObj.requestSelfAssessment('2026-10-20', '2026-10-08'));

    test('an enrolled student registers, updates and removes grades', () => {
      classObj.setSelfAssessment(BRUNO_CPF, 'Requirements', 'MPA', '2026-10-15');
      classObj.setSelfAssessment(BRUNO_CPF, 'Requirements', 'MA', '2026-10-20');
      expect(grades()).toEqual([{ goal: 'Requirements', grade: 'MA' }]);
      classObj.removeSelfAssessment(BRUNO_CPF, 'Requirements', '2026-10-15');
      expect(grades()).toEqual([]);
    });

    test('rejects a grade that is not MANA, MPA or MA', () => {
      for (const grade of ['XYZ', 'ma', '', null, undefined, 10]) {
        expect(() => classObj.setSelfAssessment(BRUNO_CPF, 'Tests', grade, '2026-10-15'))
          .toThrow(new DomainError('Invalid grade. Must be MANA, MPA, or MA'));
      }
      expect(grades()).toEqual([]);
    });

    test('rejects a goal that is not evaluated in the class', () => {
      expect(() => classObj.setSelfAssessment(BRUNO_CPF, 'Databases', 'MA', '2026-10-15'))
        .toThrow(new DomainError('Databases is not a goal of the class'));
      expect(() => classObj.removeSelfAssessment(BRUNO_CPF, 'Databases', '2026-10-15'))
        .toThrow(new DomainError('Databases is not a goal of the class'));
      expect(grades()).toEqual([]);
    });

    test('rejects a student not enrolled in the class', () => {
      expect(() => classObj.setSelfAssessment('98765432100', 'Tests', 'MA', '2026-10-15'))
        .toThrow(new NotFoundError('Student not enrolled in this class'));
    });
  });

  test('rejects any change when the self-assessment was not requested', () => {
    expect(() => classObj.setSelfAssessment(BRUNO_CPF, 'Tests', 'MA', '2026-10-15'))
      .toThrow(new DomainError('The self-assessment of the class was not requested'));
    expect(grades()).toEqual([]);
  });

  test('rejects any change after the deadline, keeping the stored grades', () => {
    classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    classObj.setSelfAssessment(BRUNO_CPF, 'Requirements', 'MPA', '2026-10-15');
    const closed = new DomainError('The self-assessment deadline 20/10/2026 has passed');
    expect(() => classObj.setSelfAssessment(BRUNO_CPF, 'Requirements', 'MA', '2026-10-21')).toThrow(closed);
    expect(() => classObj.removeSelfAssessment(BRUNO_CPF, 'Requirements', '2026-10-21')).toThrow(closed);
    expect(grades()).toEqual([{ goal: 'Requirements', grade: 'MPA' }]);
  });

  test('a class rebuilt from its JSON keeps the request', () => {
    classObj.requestSelfAssessment('2026-10-20', '2026-10-08');
    const rebuilt = Class.fromJSON(classObj.toJSON() as any, [bruno()]);
    expect(rebuilt.getSelfAssessmentRequest()?.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
  });
});
