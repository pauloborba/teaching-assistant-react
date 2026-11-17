import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscrepancyPanel from '../components/DiscrepancyPanel';
import { discrepancyService } from '../services/DiscrepancyService';
import { DiscrepancyReport } from '../types/Discrepancy';
import { ana, bruno } from '../test-support/fixtures';

jest.mock('../services/DiscrepancyService', () => ({
  discrepancyService: { getDiscrepancies: jest.fn(), changeThreshold: jest.fn() }
}));

/**
 * Class (unit) tests of the discrepancy panel of the Evaluations page: the
 * service is mocked, so only the panel's own behavior is checked.
 */

const report = (overrides: Partial<DiscrepancyReport> = {}): DiscrepancyReport => ({
  discrepancyThreshold: 1,
  students: [
    { student: ana, discrepancy: 4, discrepant: true },
    { student: bruno, discrepancy: 0, discrepant: false }
  ],
  uncomputable: [{ student: { name: 'Maria Alves', cpf: '333.333.333-33', email: 'maria@cin.ufpe.br' }, missing: 'professor grades' }],
  discrepantCount: 1,
  computableCount: 2,
  discrepantPercentage: 50,
  ...overrides
});

const noOneComputed = (discrepancyThreshold: number) =>
  report({ discrepancyThreshold, students: [], uncomputable: [], discrepantCount: 0, computableCount: 0, discrepantPercentage: 0 });

const getDiscrepancies = discrepancyService.getDiscrepancies as jest.Mock;
const changeThreshold = discrepancyService.changeThreshold as jest.Mock;
const thresholdInput = () => screen.getByTestId('discrepancy-threshold-input') as HTMLInputElement;
const panel = () => screen.getByTestId('discrepancy-panel');
const rowsOf = (testId: string) =>
  within(screen.getByTestId(testId)).getAllByRole('row').slice(1).map(row =>
    within(row).getAllByRole('cell').map(cell => cell.textContent));

/** Renders the panel of a class and waits for what the server told. */
async function renderPanel(classId = 'ESS-2026-2', refreshKey: unknown = 'first') {
  const user = userEvent.setup();
  const view = render(<DiscrepancyPanel classId={classId} refreshKey={refreshKey} />);
  await screen.findByTestId('discrepancy-summary');
  return { user, rerender: (nextClassId: string, nextKey: unknown) =>
    view.rerender(<DiscrepancyPanel classId={nextClassId} refreshKey={nextKey} />) };
}

describe('DiscrepancyPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDiscrepancies.mockResolvedValue(report());
  });

  test('asks the server for the discrepancies of the class, and tells when it is loading', async () => {
    render(<DiscrepancyPanel classId="ESS-2026-2" refreshKey="first" />);
    expect(panel()).toHaveAttribute('data-loading', 'true');
    expect(screen.queryByTestId('discrepancy-summary')).not.toBeInTheDocument();
    await screen.findByTestId('discrepancy-summary');
    expect(getDiscrepancies).toHaveBeenCalledWith('ESS-2026-2');
    expect(panel()).toHaveAttribute('data-loading', 'false');
  });

  test('shows only the discrepant students, the ones that could not be computed, the summary and the threshold', async () => {
    await renderPanel();
    expect(rowsOf('discrepant-students')).toEqual([['Ana Lima', '4']]);
    expect(rowsOf('uncomputable-students')).toEqual([['Maria Alves', 'professor grades']]);
    expect(screen.getByTestId('discrepant-count')).toHaveTextContent('1');
    expect(screen.getByTestId('computable-count')).toHaveTextContent('2');
    expect(screen.getByTestId('discrepant-percentage')).toHaveTextContent('50%');
    expect(thresholdInput().value).toBe('1');
    expect(screen.queryByTestId('info-message')).not.toBeInTheDocument();
  });

  test('keeps the order the server sends', async () => {
    getDiscrepancies.mockResolvedValue(report({
      students: [
        { student: bruno, discrepancy: 5, discrepant: true },
        { student: ana, discrepancy: 3, discrepant: true }
      ],
      discrepantCount: 2, discrepantPercentage: 100
    }));
    await renderPanel();
    expect(rowsOf('discrepant-students')).toEqual([['Bruno Melo', '5'], ['Ana Lima', '3']]);
  });

  test('says so when no student is discrepant, still showing the summary', async () => {
    getDiscrepancies.mockResolvedValue(report({
      students: [{ student: ana, discrepancy: 0, discrepant: false }],
      uncomputable: [], discrepantCount: 0, computableCount: 1, discrepantPercentage: 0
    }));
    await renderPanel();
    expect(screen.getByTestId('info-message')).toHaveTextContent('The class has no discrepant students');
    expect(screen.queryByTestId('discrepant-students')).not.toBeInTheDocument();
    expect(screen.queryByTestId('uncomputable-students')).not.toBeInTheDocument();
    expect(screen.getByTestId('discrepant-percentage')).toHaveTextContent('0%');
  });

  test('changes the threshold and shows what the server then reports', async () => {
    const { user } = await renderPanel();
    changeThreshold.mockResolvedValue({ discrepancyThreshold: 0 });
    getDiscrepancies.mockResolvedValue(report({
      discrepancyThreshold: 0,
      students: [{ student: ana, discrepancy: 4, discrepant: true }, { student: bruno, discrepancy: 1, discrepant: true }],
      discrepantCount: 2, discrepantPercentage: 100
    }));
    await user.clear(thresholdInput());
    await user.type(thresholdInput(), '0');
    await user.click(screen.getByTestId('save-discrepancy-threshold'));
    expect(await screen.findByTestId('confirmation-message')).toHaveTextContent('Discrepancy threshold changed');
    expect(changeThreshold).toHaveBeenCalledWith('ESS-2026-2', 0);
    expect(thresholdInput().value).toBe('0');
    expect(rowsOf('discrepant-students')).toEqual([['Ana Lima', '4'], ['Bruno Melo', '1']]);
  });

  test('shows the error of the server and goes back to the threshold it keeps', async () => {
    const { user } = await renderPanel();
    changeThreshold.mockRejectedValue(new Error('The threshold must be at most 2'));
    await user.clear(thresholdInput());
    await user.type(thresholdInput(), '3');
    await user.click(screen.getByTestId('save-discrepancy-threshold'));
    expect(await screen.findByTestId('error-message')).toHaveTextContent('The threshold must be at most 2');
    expect(thresholdInput().value).toBe('1');
    expect(screen.queryByTestId('confirmation-message')).not.toBeInTheDocument();
  });

  test('an empty threshold is not sent as zero', async () => {
    const { user } = await renderPanel();
    changeThreshold.mockRejectedValue(new Error('The threshold must be a non-negative integer'));
    await user.clear(thresholdInput());
    await user.click(screen.getByTestId('save-discrepancy-threshold'));
    await screen.findByTestId('error-message');
    expect(changeThreshold).toHaveBeenCalledWith('ESS-2026-2', NaN);
  });

  test('limits the threshold field to the values the server accepts', async () => {
    await renderPanel();
    expect(thresholdInput()).toHaveAttribute('min', '0');
    expect(thresholdInput()).toHaveAttribute('max', '2');
    expect(thresholdInput()).toHaveAttribute('step', '1');
  });

  test('shows the error when the discrepancies cannot be loaded', async () => {
    getDiscrepancies.mockRejectedValue(new Error('Class not found'));
    render(<DiscrepancyPanel classId="ESS-2026-2" refreshKey="first" />);
    expect(await screen.findByTestId('error-message')).toHaveTextContent('Class not found');
    expect(screen.queryByTestId('discrepancy-summary')).not.toBeInTheDocument();
    await waitFor(() => expect(panel()).toHaveAttribute('data-loading', 'false'));
  });

  test('asks again when the key changes, showing the new discrepancies', async () => {
    const { rerender } = await renderPanel('ESS-2026-2', 'before the grade changed');
    getDiscrepancies.mockResolvedValue(report({
      students: [{ student: ana, discrepancy: 2, discrepant: true }], discrepantCount: 1, computableCount: 1, discrepantPercentage: 100, uncomputable: []
    }));
    rerender('ESS-2026-2', 'after the grade changed');
    await waitFor(() => expect(rowsOf('discrepant-students')).toEqual([['Ana Lima', '2']]));
    expect(getDiscrepancies).toHaveBeenCalledTimes(2);
    expect(getDiscrepancies).toHaveBeenLastCalledWith('ESS-2026-2');
  });

  test('keeps showing the discrepancies, and what was typed in the threshold field, while it asks again', async () => {
    const { user, rerender } = await renderPanel('ESS-2026-2', 'before');
    await user.clear(thresholdInput());
    await user.type(thresholdInput(), '0');
    let resolveSecond: (value: DiscrepancyReport) => void = () => undefined;
    getDiscrepancies.mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));
    rerender('ESS-2026-2', 'after');
    await waitFor(() => expect(panel()).toHaveAttribute('data-loading', 'true'));
    expect(rowsOf('discrepant-students')).toEqual([['Ana Lima', '4']]);
    await act(async () => { resolveSecond(report({ discrepantCount: 2, discrepantPercentage: 100 })); });
    await waitFor(() => expect(panel()).toHaveAttribute('data-loading', 'false'));
    expect(screen.getByTestId('discrepant-count')).toHaveTextContent('2');
    expect(thresholdInput().value).toBe('0');
  });

  test('another class replaces what was shown, threshold field included', async () => {
    const { user, rerender } = await renderPanel('ESS-2026-2', 'first');
    await user.clear(thresholdInput());
    await user.type(thresholdInput(), '0');
    getDiscrepancies.mockResolvedValue(noOneComputed(2));
    rerender('ESS-2027-1', 'second');
    await waitFor(() => expect(thresholdInput().value).toBe('2'));
    expect(getDiscrepancies).toHaveBeenLastCalledWith('ESS-2027-1');
    expect(screen.getByTestId('info-message')).toBeInTheDocument();
    expect(screen.getByTestId('computable-count')).toHaveTextContent('0');
  });

  test('ignores a report that arrives after another class was selected', async () => {
    let resolveFirst: (value: DiscrepancyReport) => void = () => undefined;
    getDiscrepancies.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const view = render(<DiscrepancyPanel classId="ESS-2026-2" refreshKey="first" />);
    getDiscrepancies.mockResolvedValue(noOneComputed(2));
    view.rerender(<DiscrepancyPanel classId="ESS-2027-1" refreshKey="second" />);
    await waitFor(() => expect(thresholdInput().value).toBe('2'));
    // The report of the class that is no longer shown arrives late
    await act(async () => { resolveFirst(report({ discrepancyThreshold: 0 })); });
    expect(thresholdInput().value).toBe('2');
    expect(panel()).toHaveAttribute('data-loading', 'false');
  });
});
