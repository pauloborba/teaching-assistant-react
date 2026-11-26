import {
  ResponseTimeReport,
  StudentResponseData
} from '../models/ResponseTimeReport';

describe('ResponseTimeReport', () => {
  test('calculates averages and population standard deviations', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 7, responseTime: 20 },
      { studentId: '3', name: 'Carla', grade: 5, responseTime: 30 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.averageResponseTime).toBe(20);
    expect(report.averageGrade).toBe(7);
    expect(report.standardDeviationResponseTime).toBe(8.16);
    expect(report.standardDeviationGrade).toBe(1.63);
  });

  test('calculates perfect negative correlation', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 7, responseTime: 20 },
      { studentId: '3', name: 'Carla', grade: 5, responseTime: 30 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.correlationCoefficient).toBe(-1);
    expect(report.correlationClassification).toBe('perfect negative correlation');
    expect(report.correlationError).toBeNull();
  });

  test('calculates perfect positive correlation', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 5, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 7, responseTime: 20 },
      { studentId: '3', name: 'Carla', grade: 9, responseTime: 30 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.correlationCoefficient).toBe(1);
    expect(report.correlationClassification).toBe('perfect positive correlation');
  });

  test('identifies no linear correlation', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 5, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 9, responseTime: 20 },
      { studentId: '3', name: 'Carla', grade: 5, responseTime: 30 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.correlationCoefficient).toBe(0);
    expect(report.correlationClassification).toBe('no linear correlation');
  });

  test('returns an error when there is only one student response', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.correlationCoefficient).toBeNull();
    expect(report.correlationClassification).toBeNull();
    expect(report.correlationError).toBe(
      'Insufficient data to calculate correlation'
    );
  });

  test('does not modify the received student data', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 7, responseTime: 20 }
    ];
    const originalStudents = students.map((student) => ({ ...student }));

    new ResponseTimeReport(students).generate();

    expect(students).toEqual(originalStudents);
  });

  test('rejects grades outside the 0 to 10 range', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 11, responseTime: 10 }
    ];

    expect(() => new ResponseTimeReport(students)).toThrow(
      'Grade must be a number between 0 and 10'
    );
  });

  test('returns no correlation when all response times are equal', () => {
    const students: StudentResponseData[] = [
      { studentId: '1', name: 'Ana', grade: 5, responseTime: 10 },
      { studentId: '2', name: 'Bruno', grade: 7, responseTime: 10 }
    ];

    const report = new ResponseTimeReport(students).generate();

    expect(report.correlationCoefficient).toBeNull();
    expect(report.correlationError).toBe(
      'Correlation cannot be calculated when all response times or grades are equal'
    );
  });
});
