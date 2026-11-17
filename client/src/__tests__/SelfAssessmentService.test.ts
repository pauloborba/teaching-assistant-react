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
  const selfAssessmentUrl = 'http://localhost:3005/api/classes/ESS-2026-2/enrollments/123.456.789-01/self-assessment';

  test('submit PUTs the whole self-assessment, by goal', async () => {
    respond(200, { selfAssessments: [{ goal: 'Configuration Management', grade: 'MA' }] });
    await expect(selfAssessmentService.submit('ESS-2026-2', '123.456.789-01', { 'Configuration Management': 'MA' }))
      .resolves.toEqual({ selfAssessments: [{ goal: 'Configuration Management', grade: 'MA' }] });
    expect(fetchMock).toHaveBeenCalledWith(selfAssessmentUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grades: { 'Configuration Management': 'MA' } })
    });
  });

  test('submit rejects with the message the server sends', async () => {
    respond(400, { error: 'Assign a grade to at least one goal' });
    await expect(selfAssessmentService.submit('ESS-2026-2', '123.456.789-01', {}))
      .rejects.toThrow('Assign a grade to at least one goal');
  });
});
