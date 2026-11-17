import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { SelfAssessmentRequest } from '../models/SelfAssessmentRequest';
import { NotFoundError } from '../models/DomainError';
import { Services } from '../services/Services';

/**
 * Unit tests of the Services facade: its dependencies (the class collection,
 * the class and the clock) are replaced by stubs, so that only the facade's
 * own work is checked: finding the class, cleaning the CPF and passing
 * today's date to the request. The rules themselves are tested in the domain classes.
 */

describe('Services (unit, with stubs)', () => {
  const enrollment = {} as Enrollment;
  const request = {} as SelfAssessmentRequest;
  let classStub: jest.Mocked<Pick<Class, 'requestSelfAssessment' | 'cancelSelfAssessmentRequest' | 'submitSelfAssessment'>>;
  let classesStub: { findClassById: jest.Mock };
  let services: Services;

  beforeEach(() => {
    classStub = {
      requestSelfAssessment: jest.fn().mockReturnValue(request),
      cancelSelfAssessmentRequest: jest.fn().mockReturnValue(true),
      submitSelfAssessment: jest.fn().mockReturnValue(enrollment)
    };
    classesStub = { findClassById: jest.fn(id => (id === 'ESS-2026-2' ? classStub : undefined)) };
    services = new Services(classesStub as unknown as Classes, { today: () => '2026-10-15' });
  });

  test('requestSelfAssessment asks the class, with today as the sending date', () => {
    expect(services.requestSelfAssessment('ESS-2026-2', '2026-10-20')).toBe(request);
    expect(classStub.requestSelfAssessment).toHaveBeenCalledWith('2026-10-20', '2026-10-15');
  });

  test('cancelSelfAssessmentRequest asks the class', () => {
    services.cancelSelfAssessmentRequest('ESS-2026-2');
    expect(classStub.cancelSelfAssessmentRequest).toHaveBeenCalled();
  });

  test('submitSelfAssessment passes the clean CPF and the grades as given', () => {
    const grades = { Tests: 'MA', Design: '' };
    expect(services.submitSelfAssessment('123.456.789-01', 'ESS-2026-2', grades)).toBe(enrollment);
    expect(classStub.submitSelfAssessment).toHaveBeenCalledWith('12345678901', grades);
  });

  test('an unknown class is not found, and the class is never asked', () => {
    expect(() => services.submitSelfAssessment('12345678901', 'Nope-2026-2', { Tests: 'MA' }))
      .toThrow(new NotFoundError('Class not found'));
    expect(classStub.submitSelfAssessment).not.toHaveBeenCalled();
  });
});
