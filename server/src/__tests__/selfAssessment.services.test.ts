import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { Student } from '../models/Student';
import { NotFoundError } from '../models/DomainError';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';
import { Clock, SettableClock, SystemClock } from '../services/Clock';
import { Services } from '../services/Services';

/**
 * Class tests of the services used by the self-assessment grades feature:
 * the clock and the facade. The facade is tested with the real domain
 * objects (integration) and a fixed clock.
 */

describe('SystemClock', () => {
  test('tells the local date of the machine as an ISO date', () => {
    const now = new Date();
    const expected = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((n, i) => String(n).padStart(i === 0 ? 4 : 2, '0')).join('-');
    expect(new SystemClock().today()).toBe(expected);
  });
});

describe('SettableClock', () => {
  const fixedBase: Clock = { today: () => '2026-11-12' };

  test('tells the date of the wrapped clock until a date is fixed', () => {
    const clock = new SettableClock(fixedBase);
    expect(clock.today()).toBe('2026-11-12');
    clock.set('2026-10-19');
    expect(clock.today()).toBe('2026-10-19');
    clock.set(null);
    expect(clock.today()).toBe('2026-11-12');
  });

  test('accepts only ISO dates', () => {
    expect(() => new SettableClock(fixedBase).set('19/10/2026')).toThrow();
  });
});

describe('Services (self-assessment)', () => {
  const CLASS_ID = 'ESS-2026-2';
  let classes: Classes;
  let clock: SettableClock;
  let services: Services;

  beforeEach(() => {
    classes = new Classes();
    const ess = classes.addClass(new Class('ESS', 2, 2026, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    ess.addEnrollment(new Student('Bruno Tavares', '123.456.789-01', 'bruno@cin.ufpe.br'));
    clock = new SettableClock({ today: () => '2026-10-08' });
    services = new Services(classes, clock);
  });

  test('a request is sent today, with the given deadline', () => {
    const request = services.requestSelfAssessment(CLASS_ID, '2026-10-20');
    expect(request.toJSON()).toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classes.findClassById(CLASS_ID)!.getSelfAssessmentRequest()).toBe(request);
  });

  test('cancelling the request leaves the class without one', () => {
    services.requestSelfAssessment(CLASS_ID, '2026-10-20');
    services.cancelSelfAssessmentRequest(CLASS_ID);
    services.cancelSelfAssessmentRequest(CLASS_ID);
    expect(classes.findClassById(CLASS_ID)!.getSelfAssessmentRequest()).toBeNull();
  });

  test('stores a submitted self-assessment, accepting formatted CPFs', () => {
    const enrollment = services.submitSelfAssessment('123.456.789-01', CLASS_ID, { Tests: 'MA' });
    expect(enrollment.toJSON().selfAssessments).toEqual([{ goal: 'Tests', grade: 'MA' }]);
    expect(services.submitSelfAssessment('12345678901', CLASS_ID, { Design: 'MPA' }).toJSON().selfAssessments)
      .toEqual([{ goal: 'Design', grade: 'MPA' }]);
  });

  test('accepts a submission whatever the date, with or without a request', () => {
    services.submitSelfAssessment('12345678901', CLASS_ID, { Tests: 'MA' });
    services.requestSelfAssessment(CLASS_ID, '2026-10-20');
    clock.set('2026-10-21');
    expect(services.submitSelfAssessment('12345678901', CLASS_ID, { Tests: 'MPA' }).toJSON().selfAssessments)
      .toEqual([{ goal: 'Tests', grade: 'MPA' }]);
  });

  test('reports an unknown class as not found', () => {
    for (const operation of [
      () => services.requestSelfAssessment('Nope-2026-2', '2026-10-20'),
      () => services.cancelSelfAssessmentRequest('Nope-2026-2'),
      () => services.submitSelfAssessment('12345678901', 'Nope-2026-2', { Tests: 'MA' })
    ]) {
      expect(operation).toThrow(new NotFoundError('Class not found'));
    }
  });
});
