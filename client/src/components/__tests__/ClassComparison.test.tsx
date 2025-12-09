import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock ComparisonCharts so tests stay focused on interaction and props
jest.mock('../ComparisonCharts', () => {
  return function MockComparisonCharts(props: any) {
    // Render a simple marker with JSON of received props for assertion
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

const makeClass = (i: number): Class => ({
  id: `C${i}`,
  topic: `Topic ${i}`,
  year: 2023,
  semester: 1
});

const sampleReport = (id: string) => ({
  studentsAverage: 7.5,
  totalEnrolled: 10,
  approvedCount: 8,
  notApprovedCount: 2
});

describe('ClassComparison component (unit, with stubs)', () => {
  const classes = [makeClass(1), makeClass(2), makeClass(3), makeClass(4), makeClass(5), makeClass(6), makeClass(7)];

  it('renders table view with comparison report cards', () => {
    const selected = new Set(['C1', 'C2']);
    const reports: any = {
      C1: sampleReport('C1'),
      C2: sampleReport('C2')
    };

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={selected}
        comparisonReports={reports}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    // Header
    expect(screen.getByText('Class Performance Comparison')).toBeInTheDocument();

    // Two report cards should be present with metrics
    expect(screen.getByText('Topic 1')).toBeInTheDocument();
    expect(screen.getByText('Topic 2')).toBeInTheDocument();
    expect(screen.getAllByText('Enrolled:').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Approved:').length).toBeGreaterThanOrEqual(2);
  });

  it('calls export handler when clicking Export', () => {
    const exportHandler = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="charts"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={exportHandler}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    const exportBtn = screen.getByTitle('Export comparison');
    fireEvent.click(exportBtn);
    expect(exportHandler).toHaveBeenCalledTimes(1);
  });

  it('renders charts view and passes proper props to ComparisonCharts', () => {
    const selected = new Set(['C1', 'C2', 'C3']);
    const reports: any = {
      C1: sampleReport('C1'),
      C2: sampleReport('C2'),
      C3: sampleReport('C3')
    };

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={selected}
        comparisonReports={reports}
        comparisonError={null}
        comparisonViewType="charts"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    const mockCharts = screen.getByTestId('mock-charts');
    expect(mockCharts).toBeInTheDocument();

    const propsPre = screen.getByTestId('mock-charts-props');
    const parsed = JSON.parse(propsPre.textContent || '{}');
    // Ensure selected classes passed are class objects and comparisonReports passed through
    expect(parsed.comparisonReports).toEqual(reports);
    expect(Array.isArray(parsed.selectedClasses)).toBe(true);
    expect(parsed.selectedClasses.length).toBeGreaterThanOrEqual(1);
  });

  it('adding a class triggers handlers via the add select', async () => {
    const setAdd = jest.fn();
    const handleAdd = jest.fn().mockResolvedValue(undefined);

    // selected set contains just C1, so other options should be available
    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="charts"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={setAdd}
        handleAddClassToComparison={handleAdd}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    const addSelect = screen.getByLabelText('Add class to comparison') as HTMLSelectElement;
    // choose the second available option (not the empty placeholder)
    fireEvent.change(addSelect, { target: { value: 'C2' } });

    expect(setAdd).toHaveBeenCalledWith('C2');
    // handler called with the id
    expect(handleAdd).toHaveBeenCalledWith('C2');
  });

  it('removing a class triggers the removal prompt handler', () => {
    const removePrompt = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1', 'C2'])}
        comparisonReports={{ C1: sampleReport('C1'), C2: sampleReport('C2') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={removePrompt}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={false}
        handleConfirmClearDisplay={() => {}}
        handleCancelRemovalDecision={() => {}}
      />
    );

    const removeSelect = screen.getByLabelText('Remove class from comparison') as HTMLSelectElement;
    // choose an option to trigger prompt
    fireEvent.change(removeSelect, { target: { value: 'C1' } });

    expect(removePrompt).toHaveBeenCalledWith('C1');
  });

  it('shows removal decision modal and triggers confirm/cancel handlers', () => {
    const confirm = jest.fn();
    const cancel = jest.fn();

    render(
      <ClassComparison
        classes={classes}
        selectedClassesForComparison={new Set(['C1'])}
        comparisonReports={{ C1: sampleReport('C1') }}
        comparisonError={null}
        comparisonViewType="table"
        setComparisonViewType={() => {}}
        addClassToComparison=""
        setAddClassToComparison={() => {}}
        handleAddClassToComparison={async () => {}}
        handleRemoveFromComparisonPrompt={() => {}}
        handleExportComparison={() => {}}
        handleCloseComparison={() => {}}
        showRemovalDecision={true}
        handleConfirmClearDisplay={confirm}
        handleCancelRemovalDecision={cancel}
      />
    );

    expect(screen.getByText('Not enough classes')).toBeInTheDocument();

    const clearBtn = screen.getByText('Clear display');
    const keepBtn = screen.getByText('Keep classes');

    fireEvent.click(clearBtn);
    expect(confirm).toHaveBeenCalledTimes(1);

    fireEvent.click(keepBtn);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
