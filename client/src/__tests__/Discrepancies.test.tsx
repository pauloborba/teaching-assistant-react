import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Discrepancies from '../components/Discrepancies';
import { classService } from '../services/ClassService';
import { discrepancyService } from '../services/DiscrepancyService';
import { DiscrepancyReport } from '../types/Discrepancy';
import { ana, bruno, softwareEngineering } from '../test-support/fixtures';

jest.mock('../services/ClassService', () => ({ classService: { getAllClasses: jest.fn() } }));
jest.mock('../services/DiscrepancyService', () => ({
  discrepancyService: { getDiscrepancies: jest.fn(), changeThreshold: jest.fn() }
}));

/**
 * Class (unit) tests of the "Discrepancies" page: the services are mocked, so
 * only the page's own behavior is checked.
 */

const ess = { ...softwareEngineering, id: 'ESS-2026-2', topic: 'ESS', semester: 2, year: 2026 };
const empty = { ...ess, id: 'ESS-2027-1', semester: 1, year: 2027 };

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

const getAllClasses = classService.getAllClasses as jest.Mock;
const getDiscrepancies = discrepancyService.getDiscrepancies as jest.Mock;
const changeThreshold = discrepancyService.changeThreshold as jest.Mock;
const thresholdInput = () => screen.getByTestId('discrepancy-threshold-input') as HTMLInputElement;
const rowsOf = (testId: string) =>
  within(screen.getByTestId(testId)).getAllByRole('row').slice(1).map(row =>
    within(row).getAllByRole('cell').map(cell => cell.textContent));

async function openClass(classId = 'ESS-2026-2') {
  const user = userEvent.setup();
  render(<Discrepancies />);
  await screen.findByRole('option', { name: 'ESS (2026/2)' });
  await user.selectOptions(screen.getByTestId('discrepancies-class-select'), classId);
  return user;
}

describe('Discrepancies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllClasses.mockResolvedValue([ess, empty]);
    getDiscrepancies.mockResolvedValue(report());
  });

  test('asks for a class before showing anything', async () => {
    render(<Discrepancies />);
    await screen.findByRole('option', { name: 'ESS (2026/2)' });
    expect(screen.queryByTestId('discrepancy-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discrepancy-threshold-input')).not.toBeInTheDocument();
    expect(getDiscrepancies).not.toHaveBeenCalled();
  });

  test('shows only the discrepant students, the ones that could not be computed, the summary and the threshold', async () => {
    await openClass();
    await screen.findByTestId('discrepant-students');
    expect(getDiscrepancies).toHaveBeenCalledWith('ESS-2026-2');
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
    await openClass();
    await screen.findByTestId('discrepant-students');
    expect(rowsOf('discrepant-students')).toEqual([['Bruno Melo', '5'], ['Ana Lima', '3']]);
  });

  test('says so when no student is discrepant, still showing the summary', async () => {
    getDiscrepancies.mockResolvedValue(report({
      students: [{ student: ana, discrepancy: 0, discrepant: false }],
      uncomputable: [], discrepantCount: 0, computableCount: 1, discrepantPercentage: 0
    }));
    await openClass();
    expect(await screen.findByTestId('info-message')).toHaveTextContent('The class has no discrepant students');
    expect(screen.queryByTestId('discrepant-students')).not.toBeInTheDocument();
    expect(screen.queryByTestId('uncomputable-students')).not.toBeInTheDocument();
    expect(screen.getByTestId('discrepant-percentage')).toHaveTextContent('0%');
  });

  test('changes the threshold and shows what the server then reports', async () => {
    const user = await openClass();
    await screen.findByTestId('discrepant-students');
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
    const user = await openClass();
    await screen.findByTestId('discrepant-students');
    changeThreshold.mockRejectedValue(new Error('The threshold must be a non-negative integer'));
    await user.clear(thresholdInput());
    await user.type(thresholdInput(), '-1');
    await user.click(screen.getByTestId('save-discrepancy-threshold'));
    expect(await screen.findByTestId('error-message')).toHaveTextContent('The threshold must be a non-negative integer');
    expect(thresholdInput().value).toBe('1');
    expect(screen.queryByTestId('confirmation-message')).not.toBeInTheDocument();
  });

  test('an empty threshold is not sent as zero', async () => {
    const user = await openClass();
    await screen.findByTestId('discrepant-students');
    changeThreshold.mockRejectedValue(new Error('The threshold must be a non-negative integer'));
    await user.clear(thresholdInput());
    await user.click(screen.getByTestId('save-discrepancy-threshold'));
    await screen.findByTestId('error-message');
    expect(changeThreshold).toHaveBeenCalledWith('ESS-2026-2', NaN);
  });

  test('shows the error when the discrepancies cannot be loaded', async () => {
    getDiscrepancies.mockRejectedValue(new Error('Class not found'));
    await openClass();
    expect(await screen.findByTestId('error-message')).toHaveTextContent('Class not found');
    expect(screen.queryByTestId('discrepancy-summary')).not.toBeInTheDocument();
  });

  test('shows the error when the classes cannot be loaded', async () => {
    getAllClasses.mockRejectedValue(new Error('network'));
    render(<Discrepancies />);
    expect(await screen.findByTestId('error-message')).toHaveTextContent('Failed to load classes: network');
  });

  test('selecting another class replaces the report, and back to no class clears it', async () => {
    const user = await openClass();
    await screen.findByTestId('discrepant-students');
    getDiscrepancies.mockResolvedValue(report({
      discrepancyThreshold: 3, students: [], uncomputable: [], discrepantCount: 0, computableCount: 0, discrepantPercentage: 0
    }));
    await user.selectOptions(screen.getByTestId('discrepancies-class-select'), 'ESS-2027-1');
    await waitFor(() => expect(thresholdInput().value).toBe('3'));
    expect(screen.getByTestId('info-message')).toBeInTheDocument();
    expect(screen.getByTestId('computable-count')).toHaveTextContent('0');
    await user.selectOptions(screen.getByTestId('discrepancies-class-select'), '');
    expect(screen.queryByTestId('discrepancy-summary')).not.toBeInTheDocument();
  });

  test('ignores a report that arrives after another class was selected', async () => {
    let resolveFirst: (value: DiscrepancyReport) => void = () => undefined;
    getDiscrepancies.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const user = await openClass('ESS-2026-2');
    getDiscrepancies.mockResolvedValue(report({ discrepancyThreshold: 7, students: [], uncomputable: [], discrepantCount: 0, computableCount: 0, discrepantPercentage: 0 }));
    await user.selectOptions(screen.getByTestId('discrepancies-class-select'), 'ESS-2027-1');
    await waitFor(() => expect(thresholdInput().value).toBe('7'));
    // The report of the class that is no longer selected arrives late
    await act(async () => { resolveFirst(report({ discrepancyThreshold: 1 })); });
    expect(thresholdInput().value).toBe('7');
  });
});
