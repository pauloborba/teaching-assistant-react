import { selfAssessmentService } from '../services/SelfAssessmentService';

/** Records the HTTP contract the self-assessment service relies on. */
describe('SelfAssessmentService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
  });

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });
  const gradeUrl = 'http://localhost:3005/api/classes/ESS-2026-2/enrollments/123.456.789-01/self-assessment/Configuration%20Management';

  test('setGrade PUTs the grade of a goal', async () => {
    respond(200, { selfAssessments: [{ goal: 'Configuration Management', grade: 'MA' }] });
    await expect(selfAssessmentService.setGrade('ESS-2026-2', '123.456.789-01', 'Configuration Management', 'MA'))
      .resolves.toEqual({ selfAssessments: [{ goal: 'Configuration Management', grade: 'MA' }] });
    expect(fetchMock).toHaveBeenCalledWith(gradeUrl, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: 'MA' })
    });
  });

  test('removeGrade DELETEs the grade of a goal', async () => {
    respond(200, { selfAssessments: [] });
    await expect(selfAssessmentService.removeGrade('ESS-2026-2', '123.456.789-01', 'Configuration Management'))
      .resolves.toEqual({ selfAssessments: [] });
    expect(fetchMock).toHaveBeenCalledWith(gradeUrl, { method: 'DELETE' });
  });

  test('both reject with the message the server sends', async () => {
    respond(400, { error: 'The self-assessment deadline 20/10/2026 has passed' });
    await expect(selfAssessmentService.setGrade('ESS-2026-2', '123.456.789-01', 'Tests', 'MA'))
      .rejects.toThrow('The self-assessment deadline 20/10/2026 has passed');
    await expect(selfAssessmentService.removeGrade('ESS-2026-2', '123.456.789-01', 'Tests'))
      .rejects.toThrow('The self-assessment deadline 20/10/2026 has passed');
  });
});
