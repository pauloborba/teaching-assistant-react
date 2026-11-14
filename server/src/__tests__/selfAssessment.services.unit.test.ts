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
 * today's date. The rules themselves are tested in the domain classes.
 */

describe('Services (unit, with stubs)', () => {
  const enrollment = {} as Enrollment;
  const request = {} as SelfAssessmentRequest;
  let classStub: jest.Mocked<Pick<Class, 'requestSelfAssessment' | 'cancelSelfAssessmentRequest' | 'setSelfAssessment' | 'removeSelfAssessment'>>;
  let classesStub: { findClassById: jest.Mock };
  let services: Services;

  beforeEach(() => {
    classStub = {
      requestSelfAssessment: jest.fn().mockReturnValue(request),
      cancelSelfAssessmentRequest: jest.fn().mockReturnValue(true),
      setSelfAssessment: jest.fn().mockReturnValue(enrollment),
      removeSelfAssessment: jest.fn().mockReturnValue(enrollment)
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

  test('setSelfAssessment and removeSelfAssessment pass the clean CPF and today', () => {
    expect(services.setSelfAssessment('123.456.789-01', 'ESS-2026-2', 'Tests', 'MA')).toBe(enrollment);
    expect(classStub.setSelfAssessment).toHaveBeenCalledWith('12345678901', 'Tests', 'MA', '2026-10-15');
    expect(services.removeSelfAssessment('123.456.789-01', 'ESS-2026-2', 'Tests')).toBe(enrollment);
    expect(classStub.removeSelfAssessment).toHaveBeenCalledWith('12345678901', 'Tests', '2026-10-15');
  });

  test('an unknown class is not found, and the class is never asked', () => {
    expect(() => services.setSelfAssessment('12345678901', 'Nope-2026-2', 'Tests', 'MA'))
      .toThrow(new NotFoundError('Class not found'));
    expect(classStub.setSelfAssessment).not.toHaveBeenCalled();
  });
});
