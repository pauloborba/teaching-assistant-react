import request from 'supertest';
import { app } from '../server';

describe('POST /api/response-time-report', () => {
  test('returns statistics for the responses of one roteiro', async () => {
    const response = await request(app)
      .post('/api/response-time-report')
      .send({
        responses: [
          { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 },
          { studentId: '2', name: 'Bruno', grade: 7, responseTime: 20 },
          { studentId: '3', name: 'Carla', grade: 5, responseTime: 30 }
        ]
      })
      .expect(200);

    expect(response.body).toEqual({
      averageResponseTime: 20,
      averageGrade: 7,
      standardDeviationResponseTime: 8.16,
      standardDeviationGrade: 1.63,
      correlationCoefficient: -1,
      correlationClassification: 'perfect negative correlation',
      correlationError: null
    });
  });

  test('returns the correlation error when there is only one response', async () => {
    const response = await request(app)
      .post('/api/response-time-report')
      .send({
        responses: [
          { studentId: '1', name: 'Ana', grade: 9, responseTime: 10 }
        ]
      })
      .expect(200);

    expect(response.body.correlationCoefficient).toBeNull();
    expect(response.body.correlationError).toBe(
      'Insufficient data to calculate correlation'
    );
  });

  test('rejects a request without a responses array', async () => {
    const response = await request(app)
      .post('/api/response-time-report')
      .send({})
      .expect(400);

    expect(response.body.error).toBe('Responses must be an array');
  });

  test('rejects an empty responses array', async () => {
    const response = await request(app)
      .post('/api/response-time-report')
      .send({ responses: [] })
      .expect(400);

    expect(response.body.error).toBe('No student response data provided');
  });

  test('rejects a grade outside the range from 0 to 10', async () => {
    const response = await request(app)
      .post('/api/response-time-report')
      .send({
        responses: [
          { studentId: '1', name: 'Ana', grade: 11, responseTime: 10 }
        ]
      })
      .expect(400);

    expect(response.body.error).toBe('Grade must be a number between 0 and 10');
  });
});
