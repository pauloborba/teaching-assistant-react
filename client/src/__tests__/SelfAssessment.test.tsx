import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelfAssessment from '../components/SelfAssessment';
import { classService } from '../services/ClassService';
import { selfAssessmentService } from '../services/SelfAssessmentService';
import { Class } from '../types/Class';
import { Evaluation } from '../types/Evaluation';
import { ana, bruno, softwareEngineering } from '../test-support/fixtures';

jest.mock('../services/ClassService', () => ({ classService: { getAllClasses: jest.fn() } }));
jest.mock('../services/SelfAssessmentService', () => ({
  selfAssessmentService: { setGrade: jest.fn(), removeGrade: jest.fn() }
}));

/**
 * Class (unit) tests of the "My self-assessment" page: the services are
 * mocked, so only the page's own behavior is checked.
 */

const ess = (selfAssessments: Evaluation[] = [{ goal: 'Requirements', grade: 'MPA' }]): Class => ({
  id: 'ESS-2026-2',
  topic: 'ESS',
  semester: 2,
  year: 2026,
  averageCalculationSpecification: softwareEngineering.averageCalculationSpecification,
  selfAssessmentRequest: { deadline: '2026-10-20', sentDate: '2026-10-08' },
  enrollments: [
    { student: ana, evaluations: [{ goal: 'Requirements', grade: 'MA' }], selfAssessments },
    { student: bruno, evaluations: [], selfAssessments: [] }
  ]
});

const getAllClasses = classService.getAllClasses as jest.Mock;
const setGrade = selfAssessmentService.setGrade as jest.Mock;
const removeGrade = selfAssessmentService.removeGrade as jest.Mock;
const gradeOf = (goal: string) => (screen.getByTestId(`self-assessment-grade-${goal}`) as HTMLSelectElement).value;

/** Renders the page with Ana's self-assessment of ESS (2026/2) open. */
async function openAnasSelfAssessment() {
  const user = userEvent.setup();
  render(<SelfAssessment />);
  await screen.findByRole('option', { name: 'ESS (2026/2)' });
  await user.selectOptions(screen.getByTestId('self-assessment-class-select'), 'ESS-2026-2');
  await user.selectOptions(screen.getByTestId('self-assessment-student-select'), ana.cpf);
  return user;
}

describe('SelfAssessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllClasses.mockResolvedValue([ess()]);
  });

  test('asks for a class and a student before showing the grades', async () => {
    const user = userEvent.setup();
    render(<SelfAssessment />);
    await screen.findByRole('option', { name: 'ESS (2026/2)' });
    await user.selectOptions(screen.getByTestId('self-assessment-class-select'), 'ESS-2026-2');
    expect(screen.queryByTestId('self-assessment-grades')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ana Lima' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bruno Melo' })).toBeInTheDocument();
  });

  test('shows the deadline and the student self-assessment grades, not the professor grades', async () => {
    await openAnasSelfAssessment();
    expect(screen.getByText('Deadline: 20/10/2026')).toBeInTheDocument();
    expect(gradeOf('Requirements')).toBe('MPA');
    for (const goal of ['Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring']) {
      expect(gradeOf(goal)).toBe('');
    }
  });

  test('says when the self-assessment was not requested', async () => {
    getAllClasses.mockResolvedValue([{ ...ess(), selfAssessmentRequest: null }]);
    await openAnasSelfAssessment();
    expect(screen.getByText('The self-assessment of this class was not requested')).toBeInTheDocument();
  });

  test('saving sends only the changed goals, then confirms and shows the stored grades', async () => {
    const user = await openAnasSelfAssessment();
    setGrade.mockResolvedValue({});
    removeGrade.mockResolvedValue({});
    getAllClasses.mockResolvedValue([ess([{ goal: 'Tests', grade: 'MA' }])]);
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Tests'), 'MA');
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Requirements'), '');
    await user.click(screen.getByTestId('save-self-assessment'));
    expect(await screen.findByTestId('confirmation-message')).toHaveTextContent('Self-assessment saved');
    expect(setGrade).toHaveBeenCalledTimes(1);
    expect(setGrade).toHaveBeenCalledWith('ESS-2026-2', ana.cpf, 'Tests', 'MA');
    expect(removeGrade).toHaveBeenCalledTimes(1);
    expect(removeGrade).toHaveBeenCalledWith('ESS-2026-2', ana.cpf, 'Requirements');
    await waitFor(() => expect(gradeOf('Tests')).toBe('MA'));
    expect(gradeOf('Requirements')).toBe('');
  });

  test('when the server refuses, shows its message and the grades it keeps', async () => {
    const user = await openAnasSelfAssessment();
    setGrade.mockRejectedValue(new Error('The self-assessment deadline 20/10/2026 has passed'));
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Requirements'), 'MA');
    await user.click(screen.getByTestId('save-self-assessment'));
    expect(await screen.findByTestId('error-message')).toHaveTextContent('The self-assessment deadline 20/10/2026 has passed');
    expect(screen.queryByTestId('confirmation-message')).not.toBeInTheDocument();
    await waitFor(() => expect(gradeOf('Requirements')).toBe('MPA'));
  });

  test('choosing another student discards the unsaved changes of the previous one', async () => {
    const user = await openAnasSelfAssessment();
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Tests'), 'MA');
    await user.selectOptions(screen.getByTestId('self-assessment-student-select'), bruno.cpf);
    expect(gradeOf('Requirements')).toBe('');
    expect(gradeOf('Tests')).toBe('');
    await user.selectOptions(screen.getByTestId('self-assessment-student-select'), ana.cpf);
    expect(gradeOf('Requirements')).toBe('MPA');
    expect(gradeOf('Tests')).toBe('');
    expect(setGrade).not.toHaveBeenCalled();
  });

  test('says when the classes cannot be loaded', async () => {
    getAllClasses.mockRejectedValue(new Error('Failed to fetch classes: Service Unavailable'));
    render(<SelfAssessment />);
    expect(await screen.findByTestId('error-message'))
      .toHaveTextContent('Failed to load classes: Failed to fetch classes: Service Unavailable');
    expect(screen.queryByTestId('self-assessment-grades')).not.toBeInTheDocument();
  });

  test('changing a grade clears the previous message', async () => {
    const user = await openAnasSelfAssessment();
    setGrade.mockResolvedValue({});
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Tests'), 'MA');
    await user.click(screen.getByTestId('save-self-assessment'));
    await screen.findByTestId('confirmation-message');
    await user.selectOptions(screen.getByTestId('self-assessment-grade-Design'), 'MPA');
    expect(screen.queryByTestId('confirmation-message')).not.toBeInTheDocument();
  });
});
