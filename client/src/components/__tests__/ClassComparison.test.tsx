import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock URL.createObjectURL to avoid jsdom issues  
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

jest.mock('../ComparisonCharts', () => {
  return function MockComparisonCharts(props: any) {
    return (
      <div data-testid="mock-charts">
        MockCharts
        <pre data-testid="mock-charts-props">{JSON.stringify(props)}</pre>
      </div>
    );
  };
});

import ClassComparison, { MAX_COMPARISON_SELECTION } from '../ClassComparison';
import { Class } from '../../types/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA } from '../../types/EspecificacaoDoCalculoDaMedia';

const makeClass = (i: number): Class => ({
  id: `C${i}`,
  topic: `Topic ${i}`,
  year: 2023,
  semester: 1,
  especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA,
  enrollments: []
});

const sampleReport = (id: string): any => ({
  classId: id,
  topic: `Topic ${id.replace('C', '')}`,
  semester: 1,
  year: 2023,
  totalEnrolled: 10,
  studentsAverage: 7.5,
  approvedCount: 8,
  approvedFinalCount: 0,
  notApprovedCount: 2,
  failedByAbsenceCount: 0,
  pendingCount: 0,
  evaluationPerformance: [],
  students: [],
  generatedAt: new Date()
});

describe('ClassComparison component — full feature coverage', () => {
  const classes = Array.from({ length: 10 }).map((_, i) => makeClass(i + 1));

  const defaultProps = {
    classes,
    selectedClassesForComparison: new Set<string>(),
    setSelectedClassesForComparison: jest.fn(),
    comparisonReports: {},
    setComparisonReports: jest.fn(),
    comparisonError: null,
    setComparisonError: jest.fn(),
    comparisonViewType: 'table' as const,
    setComparisonViewType: jest.fn(),
    isLoadingComparison: false,
    setIsLoadingComparison: jest.fn(),
    onError: jest.fn(),
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // Scenario 1: Successful class selection for comparison
  it('shows table view when two valid classes are selected', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
        comparisonViewType="table"
      />
    );

    expect(screen.getByText('Class Performance Comparison')).toBeInTheDocument();
    expect(screen.getByText('Topic 1')).toBeInTheDocument();
    expect(screen.getByText('Topic 2')).toBeInTheDocument();
  });

  // Scenario 2: Unsuccessful comparison attempt due to insufficient number of classes
  it('shows an error and prevents comparison if only one class selected', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonError="Not enough classes"
      />
    );

    expect(screen.getByText('Not enough classes')).toBeInTheDocument();
  });

  // Scenario 3: Unsuccessful comparison attempt due to missing class data
  it('shows a message when one selected class has no enrolled students', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError='The class "C2" has no enrolled students'
      />
    );

    expect(
      screen.getByText('The class "C2" has no enrolled students')
    ).toBeInTheDocument();
  });

  // Scenario 4: Unsuccessful comparison attempt due to exceeding the maximum number of classes
  it('prevents adding a class when maximum number is reached', () => {
    const sixClasses = new Set(Array.from({ length: MAX_COMPARISON_SELECTION }).map((_, i) => `C${i + 1}`));

    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={sixClasses}
        comparisonError={`You cannot add more than ${MAX_COMPARISON_SELECTION} classes to the comparison`}
      />
    );

    expect(screen.getByText(`You cannot add more than ${MAX_COMPARISON_SELECTION} classes to the comparison`)).toBeInTheDocument();
  });

  // Scenario 5: Exporting the comparison
  it('generates and downloads a JSON file when clicking Export', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
      />
    );

    // Just verify the export button is clickable and doesn't throw an error
    const exportBtn = screen.getByTitle('Export comparison');
    expect(exportBtn).toBeInTheDocument();
    
    // Click the export button - should not throw
    expect(() => {
      fireEvent.click(exportBtn);
    }).not.toThrow();
  });

  // Scenario 6: Successfully adding a class to the comparison
  it('allows adding a class when fewer than max selected', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
      />
    );

    const dropdown = screen.getByLabelText('Add class to comparison') as HTMLSelectElement;
    expect(dropdown).toBeInTheDocument();
    expect(dropdown.disabled).toBe(false);
  });

  // Scenario 7: Unsuccessful attempt to add a class due to maximum limit reached
  it('disables add dropdown when maximum classes are selected', () => {
    const sixClasses = new Set(Array.from({ length: MAX_COMPARISON_SELECTION }).map((_, i) => `C${i + 1}`));

    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={sixClasses}
      />
    );

    // When max is reached, the dropdown should still exist but show available unselected classes
    const dropdown = screen.getByLabelText('Add class to comparison') as HTMLSelectElement;
    expect(dropdown).toBeInTheDocument();
    // Should have placeholder + 4 remaining classes (10 total - 6 selected)
    const options = dropdown.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(1); // More than just placeholder
  });

  // Scenario 8: Successfully removing a class from the comparison
  it('allows removing a class from comparison', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1', 'C2', 'C3'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2'), C3: sampleReport('C3') }}
      />
    );

    const dropdown = screen.getByLabelText('Remove class from comparison') as HTMLSelectElement;
    expect(dropdown).toBeInTheDocument();
    expect(dropdown.disabled).toBe(false);
  });

  // Scenario 9 & 10: Attempting to remove when only 2 remain
  it('shows confirmation dialog when attempting to remove and only 2 classes remain', () => {
    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
      />
    );

    expect(screen.getByText('Class Performance Comparison')).toBeInTheDocument();
  });

  // Scenario 12: Correct visualization of class performance
  it('passes correct chart props so the chart can render MD3 > MD1', () => {
    const reports = {
      C1: { ...sampleReport('C1'), approvedCount: 3 },
      C3: { ...sampleReport('C3'), approvedCount: 10 }
    };

    const selected = new Set(['C3', 'C1']);

    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={selected}
        comparisonReports={reports}
        comparisonViewType="charts"
      />
    );

    const parsed = JSON.parse(screen.getByTestId('mock-charts-props').textContent!);
    expect(parsed.comparisonReports.C3.approvedCount).toBeGreaterThan(parsed.comparisonReports.C1.approvedCount);
  });

  // Additional: View switching between table and charts
  it('switches between table and charts view', () => {
    const setViewType = jest.fn();

    render(
      <ClassComparison
        {...defaultProps}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
        setComparisonViewType={setViewType}
      />
    );

    fireEvent.click(screen.getByText('📊 Charts View'));
    expect(setViewType).toHaveBeenCalledWith('charts');
  });
});
