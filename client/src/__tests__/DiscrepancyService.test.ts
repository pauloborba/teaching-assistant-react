import { discrepancyService } from '../services/DiscrepancyService';

/** Records the HTTP contract the discrepancy service relies on. */
describe('DiscrepancyService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
  });

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

  test('getDiscrepancies GETs the discrepancies of the class', async () => {
    const report = { discrepancyThreshold: 2, students: [], uncomputable: [], discrepantCount: 0, computableCount: 0, discrepantPercentage: 0 };
    respond(200, report);
    await expect(discrepancyService.getDiscrepancies('ESS-2026-2')).resolves.toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/ESS-2026-2/discrepancies', undefined);
  });

  test('changeThreshold PUTs the threshold', async () => {
    respond(200, { discrepancyThreshold: 1 });
    await expect(discrepancyService.changeThreshold('ESS-2026-2', 1)).resolves.toEqual({ discrepancyThreshold: 1 });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/ESS-2026-2/discrepancy-threshold', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threshold: 1 })
    });
  });

  test('both reject with the message the server sends', async () => {
    respond(400, { error: 'The threshold must be a non-negative integer' });
    await expect(discrepancyService.changeThreshold('ESS-2026-2', -1)).rejects.toThrow('The threshold must be a non-negative integer');
    respond(404, { error: 'Class not found' });
    await expect(discrepancyService.getDiscrepancies('Nope-2030-1')).rejects.toThrow('Class not found');
  });
});
