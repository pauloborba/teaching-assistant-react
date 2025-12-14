import React, { useState } from 'react';
import ComparisonCharts from './ComparisonCharts';
import ClassService from '../services/ClassService';
import { Class } from '../types/Class';
import { ReportData } from '../types/Report';

interface Props {
  classes: Class[];
  selectedClassesForComparison: Set<string>;
  setSelectedClassesForComparison: (selection: Set<string>) => void;
  comparisonReports: { [classId: string]: ReportData };
  setComparisonReports: (reports: { [classId: string]: ReportData }) => void;
  comparisonError: string | null;
  setComparisonError: (error: string | null) => void;
  comparisonViewType: 'table' | 'charts';
  setComparisonViewType: (v: 'table' | 'charts') => void;
  isLoadingComparison: boolean;
  setIsLoadingComparison: (loading: boolean) => void;
  onError: (message: string) => void;
}

export const MAX_COMPARISON_SELECTION = 6;

const ClassComparison: React.FC<Props> = ({
  classes,
  selectedClassesForComparison,
  setSelectedClassesForComparison,
  comparisonReports,
  setComparisonReports,
  comparisonError,
  setComparisonError,
  comparisonViewType,
  setComparisonViewType,
  isLoadingComparison,
  setIsLoadingComparison,
  onError,
}) => {
  const [addClassToComparison, setAddClassToComparison] = useState<string>('');
  const [pendingRemoveClassId, setPendingRemoveClassId] = useState<string | null>(null);
  const [showRemovalDecision, setShowRemovalDecision] = useState(false);

  // Helper to clear comparison error
  const clearComparisonError = () => setComparisonError(null);

  // Handle comparison button click
  const handleCompareClasses = async () => {
    const selectedIds = Array.from(selectedClassesForComparison);
    setIsLoadingComparison(true);
    clearComparisonError();
    
    // Pre-check: ensure at least 2 selected
    if (selectedIds.length < 2) {
      setComparisonError('Please select at least 2 classes to compare');
      setIsLoadingComparison(false);
      return;
    }

    // Check for classes with no enrollments and inform user with names
    const emptyClasses = selectedIds
      .map(id => classes.find(c => c.id === id))
      .filter(Boolean)
      .filter(c => (c as Class).enrollments.length === 0) as Class[];

    if (emptyClasses.length > 0) {
      const names = emptyClasses.map(c => c.topic);
      const first = names[0];
      const others = names.length - 1;
      const msg = others > 0
        ? `The class "${first}" and ${others} other(s) have no enrolled students`
        : `The class "${first}" has no enrolled students`;
      setComparisonError(msg);
      setIsLoadingComparison(false);
      return;
    }

    try {
      const { fetchClassReportsForComparison } = await import('../services/ClassService');
      const result = await fetchClassReportsForComparison(selectedIds);

      if (result.error) {
        setComparisonError(result.error);
        setIsLoadingComparison(false);
        return;
      }

      setComparisonReports(result.reports);
      clearComparisonError();
    } catch (error) {
      setComparisonError((error as Error).message || 'Failed to fetch comparison reports');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  // Handle closing comparison view
  const handleCloseComparison = () => {
    setComparisonReports({});
    clearComparisonError();
  };

  // Export comparison data
  const handleExportComparison = () => {
    const data = Array.from(selectedClassesForComparison).map(id => {
      const cls = classes.find(c => c.id === id);
      return {
        class: cls ? `${cls.topic} (${cls.year}/${cls.semester})` : id,
        report: comparisonReports[id]
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Add class to comparison
  const handleAddClassToComparison = async (classIdParam?: string) => {
    const classId = classIdParam ?? addClassToComparison;
    if (!classId) return;
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      setComparisonError(`You cannot add more than ${MAX_COMPARISON_SELECTION} classes to the comparison`);
      return;
    }

    const newSelection = new Set(selectedClassesForComparison);
    newSelection.add(classId);
    setSelectedClassesForComparison(newSelection);

    // Fetch report for newly added class
    try {
      const report = await ClassService.getClassReport(classId);
      setComparisonReports({ ...comparisonReports, [classId]: report });
      clearComparisonError();
      // clear controlled select value
      setAddClassToComparison('');
    } catch (err) {
      setComparisonError((err as Error).message || 'Failed to load report for the added class');
    }
  };

  // Remove class from comparison
  const handleRemoveFromComparisonPrompt = (classId: string) => {
    // If removing would leave fewer than 2 classes, ask the user
    if (selectedClassesForComparison.size <= 2) {
      setPendingRemoveClassId(classId);
      setShowRemovalDecision(true);
      return;
    }

    // Otherwise remove immediately
    const newSelection = new Set(selectedClassesForComparison);
    newSelection.delete(classId);
    setSelectedClassesForComparison(newSelection);
    // also remove report
    const newReports = { ...comparisonReports };
    delete newReports[classId];
    setComparisonReports(newReports);
  };

  // Confirm clear display when removing would leave fewer than 2 classes
  const handleConfirmClearDisplay = () => {
    setSelectedClassesForComparison(new Set());
    setComparisonReports({});
    setPendingRemoveClassId(null);
    setShowRemovalDecision(false);
    clearComparisonError();
  };

  // Cancel removal decision
  const handleCancelRemovalDecision = () => {
    setPendingRemoveClassId(null);
    setShowRemovalDecision(false);
  };

  // Toggle select all visible classes for comparison
  const handleToggleSelectAllVisible = () => {
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toSelect = prioritized.slice(0, Math.min(MAX, prioritized.length));

    const allSelected = toSelect.every(c => selectedClassesForComparison.has(c.id));
    if (allSelected) {
      setSelectedClassesForComparison(new Set());
      clearComparisonError();
      return;
    }

    const newSelection = new Set<string>(toSelect.map(c => c.id));
    setSelectedClassesForComparison(newSelection);
    clearComparisonError();
  };

  // Check if all visible classes are selected
  const headerAllSelected = (() => {
    if (!classes || classes.length === 0) return false;
    const MAX = MAX_COMPARISON_SELECTION;
    const withReports = classes.filter(c => Boolean(comparisonReports[c.id]));
    const withoutReports = classes.filter(c => !comparisonReports[c.id]);
    const prioritized = [...withReports, ...withoutReports];
    const toCheck = prioritized.slice(0, Math.min(MAX, prioritized.length));
    return toCheck.length > 0 && toCheck.every(c => selectedClassesForComparison.has(c.id));
  })();

  // Selection info text for display
  const selectionInfoText = (() => {
    if (selectedClassesForComparison.size === 0) return 'Select at least 2 classes to compare';
    if (selectedClassesForComparison.size >= MAX_COMPARISON_SELECTION) {
      return `Maximum of ${MAX_COMPARISON_SELECTION} classes selected`;
    }
    return `${selectedClassesForComparison.size} class${selectedClassesForComparison.size !== 1 ? 'es' : ''} selected`;
  })();
  return (
    <div className="comparison-overlay">
      <div className="comparison-modal">
        <div className="comparison-modal-header">
          <h3>Class Performance Comparison</h3>
          <div className="comparison-header-actions">
            <button
              className="export-btn"
              onClick={handleExportComparison}
              title="Export comparison"
            >
              Export
            </button>
            <button
              className="close-modal-btn"
              onClick={handleCloseComparison}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="comparison-view-selector">
          <button
            className={`view-btn ${comparisonViewType === 'charts' ? 'active' : ''}`}
            onClick={() => setComparisonViewType('charts')}
          >
            📊 Charts View
          </button>
          <button
            className={`view-btn ${comparisonViewType === 'table' ? 'active' : ''}`}
            onClick={() => setComparisonViewType('table')}
          >
            📋 Table View
          </button>
        </div>

        <div
          className="comparison-add-controls"
          style={{
            padding: '1.25rem 2rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 14, height: 14, backgroundColor: '#28a745', borderRadius: 3 }} aria-hidden />
            <select
              value={addClassToComparison}
              onChange={(e) => {
                const val = e.target.value;
                setAddClassToComparison(val);
                if (val) {
                  handleAddClassToComparison(val);
                }
              }}
              aria-label="Add class to comparison"
              style={{ padding: '6px 8px', minWidth: 240 }}
            >
              <option value="">-- Add class to comparison --</option>
              {classes
                .filter(c => !selectedClassesForComparison.has(c.id))
                .map(c => (
                  <option key={c.id} value={c.id}>{`${c.topic} (${c.year}/${c.semester})`}</option>
                ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '28px', backgroundColor: '#eee', margin: '0 0.5rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 14, height: 14, backgroundColor: '#dc3545', borderRadius: 3 }} aria-hidden />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleRemoveFromComparisonPrompt(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              aria-label="Remove class from comparison"
              style={{ padding: '6px 8px', minWidth: 240 }}
            >
              <option value="">-- Remove class from comparison --</option>
              {Array.from(selectedClassesForComparison).map(classId => {
                const classObj = classes.find(c => c.id === classId);
                return classObj ? (
                  <option key={classId} value={classId}>{`${classObj.topic} (${classObj.year}/${classObj.semester})`}</option>
                ) : null;
              })}
            </select>
          </div>
        </div>

        <div className="comparison-modal-content">
          {comparisonError && (
            <div className="comparison-error">
              <p>{comparisonError}</p>
            </div>
          )}

          {comparisonViewType === 'charts' && (
            <ComparisonCharts
              selectedClasses={Array.from(selectedClassesForComparison)
                .map(id => classes.find(c => c.id === id))
                .filter((c): c is Class => c !== undefined && Boolean(comparisonReports[c.id]))}
              comparisonReports={comparisonReports}
            />
          )}

          {comparisonViewType === 'table' && (
            <div className="comparison-reports-container">
              {Array.from(selectedClassesForComparison).map((classId) => {
                const report = comparisonReports[classId];
                const classObj = classes.find(c => c.id === classId);

                if (!classObj || !report) return null;

                return (
                  <div key={classId} className="comparison-report-card">
                    <div className="report-card-header">
                      <h4>{classObj.topic}</h4>
                      <p className="report-card-meta">
                        {classObj.year}/{classObj.semester}
                      </p>
                    </div>

                    <div className="report-card-content">
                      <div className="metric-row">
                        <span className="metric-label">Mean Grade:</span>
                        <span className="metric-value">{report.studentsAverage?.toFixed(2) ?? 'N/A'}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Enrolled:</span>
                        <span className="metric-value">{report.totalEnrolled}</span>
                      </div>
                      <div className="metric-row approved">
                        <span className="metric-label">Approved:</span>
                        <span className="metric-value">{report.approvedCount}</span>
                      </div>
                      <div className="metric-row failed">
                        <span className="metric-label">Failed:</span>
                        <span className="metric-value">{report.notApprovedCount}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Approval Rate:</span>
                        <span className="metric-value">
                          {report.totalEnrolled > 0
                            ? Math.round((report.approvedCount / report.totalEnrolled) * 100)
                            : 0
                          }%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="comparison-actions">
          <button
            className="cancel-btn"
            onClick={handleCloseComparison}
          >
            Close Comparison
          </button>
        </div>

        {showRemovalDecision && (
          <div className="comparison-error-modal">
            <div className="error-content">
              <h4>Not enough classes</h4>
              <p>Removing this class would leave fewer than two classes for comparison. Do you want to clear the comparison display or keep the existing classes?</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="cancel-btn" onClick={handleConfirmClearDisplay}>Clear display</button>
                <button className="ok-btn" onClick={handleCancelRemovalDecision}>Keep classes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassComparison;
