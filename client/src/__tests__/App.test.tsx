import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { studentService } from '../services/StudentService';
import { classService } from '../services/ClassService';
import { ana, bruno, softwareEngineering, databases } from '../test-support/fixtures';

jest.mock('../services/StudentService', () => ({
  studentService: { getAllStudents: jest.fn(), createStudent: jest.fn(), updateStudent: jest.fn(), deleteStudent: jest.fn() }
}));
jest.mock('../services/ClassService', () => ({
  classService: { getAllClasses: jest.fn(), addClass: jest.fn(), updateClass: jest.fn(), deleteClass: jest.fn() }
}));
jest.mock('../services/EnrollmentService', () => ({
  enrollmentService: { enrollStudent: jest.fn(), updateEvaluation: jest.fn() }
}));

const getAllStudents = studentService.getAllStudents as jest.Mock;
const getAllClasses = classService.getAllClasses as jest.Mock;

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllStudents.mockResolvedValue([ana, bruno]);
    getAllClasses.mockResolvedValue([softwareEngineering, databases]);
  });

  test('shows the header, the tabs and the Students tab by default', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Teaching Assistant React' })).toBeInTheDocument();
    expect(screen.getByTestId('students-tab')).toHaveClass('active');
    expect(screen.getByTestId('evaluations-tab')).not.toHaveClass('active');
    expect(screen.getByTestId('classes-tab')).toBeInTheDocument();
    expect(screen.getByTestId('self-assessment-tab')).toHaveTextContent('My self-assessment');
    // The discrepancies are shown in the Evaluations tab, not in a tab of their own
    expect(screen.getAllByRole('button').filter(b => b.className.includes('tab-button')).map(b => b.textContent))
      .toEqual(['Students', 'Evaluations', 'Classes', 'My self-assessment']);
    expect(screen.queryByTestId('discrepancies-tab')).not.toBeInTheDocument();
    expect(await screen.findByTestId('student-row-123.456.789-01')).toBeInTheDocument();
    expect(screen.getByTestId('student-row-987.654.321-00')).toBeInTheDocument();
    expect(screen.getByTestId('student-form')).toBeInTheDocument();
  });

  test('offers the classes as a filter and shows only the enrolled students of the selected class', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('student-row-987.654.321-00');
    const filter = screen.getByLabelText('Filter by Class:') as HTMLSelectElement;
    expect(within(filter).getAllByRole('option').map(o => o.textContent)).toEqual([
      'All Students', 'Software Engineering (2025/1)', 'Databases (2024/2)'
    ]);
    await user.selectOptions(filter, 'Software Engineering-2025-1');
    expect(screen.getByTestId('student-row-123.456.789-01')).toBeInTheDocument();
    expect(screen.queryByTestId('student-row-987.654.321-00')).not.toBeInTheDocument();
    expect(screen.getByText(/Auto-enrollment/).parentElement).toHaveTextContent('Software Engineering (2025/1)');
    await user.selectOptions(filter, '');
    expect(screen.getByTestId('student-row-987.654.321-00')).toBeInTheDocument();
  });

  test('shows an error when students cannot be loaded', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getAllStudents.mockRejectedValue(new Error('network'));
    render(<App />);
    expect(await screen.findByText('Failed to load students. Please try again.')).toBeInTheDocument();
    jest.restoreAllMocks();
  });

  test('switches to the Classes and Evaluations tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('student-row-123.456.789-01');
    await user.click(screen.getByTestId('classes-tab'));
    expect(screen.getByTestId('classes-tab')).toHaveClass('active');
    expect(screen.getByRole('heading', { name: 'Class Management' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Existing Classes (2)' })).toBeInTheDocument();
    await user.click(screen.getByTestId('evaluations-tab'));
    expect(screen.getByRole('heading', { name: 'Evaluations' })).toBeInTheDocument();
    expect(screen.queryByTestId('student-form')).not.toBeInTheDocument();
  });

  test('Edit puts the student in the form; Cancel leaves edit mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByTestId('edit-student-123.456.789-01'));
    expect(screen.getByRole('heading', { name: /Edit Student/ })).toBeInTheDocument();
    expect((screen.getByLabelText('Name:') as HTMLInputElement).value).toBe('Ana Lima');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Add New Student' })).toBeInTheDocument();
  });

  test('reloads students and classes after a deletion', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    (studentService.deleteStudent as jest.Mock).mockResolvedValue(undefined);
    render(<App />);
    await user.click(await screen.findByTestId('delete-student-123.456.789-01'));
    await waitFor(() => expect(getAllStudents).toHaveBeenCalledTimes(2));
    expect(getAllClasses).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });
});
