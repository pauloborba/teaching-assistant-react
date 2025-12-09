import React from 'react';
import ComparisonCharts from './ComparisonCharts';
import { Class } from '../types/Class';
import { ReportData } from '../types/Report';

interface Props {
  classes: Class[];
  selectedClassesForComparison: Set<string>;
  comparisonReports: { [classId: string]: ReportData };
  comparisonError: string | null;
  comparisonViewType: 'table' | 'charts';
  setComparisonViewType: (v: 'table' | 'charts') => void;
  addClassToComparison: string;
  setAddClassToComparison: (id: string) => void;
  handleAddClassToComparison: (id?: string) => Promise<void>;
  handleRemoveFromComparisonPrompt: (classId: string) => void;
  handleExportComparison: () => void;
  handleCloseComparison: () => void;
  showRemovalDecision: boolean;
  handleConfirmClearDisplay: () => void;
  handleCancelRemovalDecision: () => void;
}

export const MAX_COMPARISON_SELECTION = 6;

const ClassComparison: React.FC<Props> = ({
  classes,
  selectedClassesForComparison,
  comparisonReports,
  comparisonError,
  comparisonViewType,
  setComparisonViewType,
  addClassToComparison,
  setAddClassToComparison,
  handleAddClassToComparison,
  handleRemoveFromComparisonPrompt,
  handleExportComparison,
  handleCloseComparison,
  showRemovalDecision,
  handleConfirmClearDisplay,
  handleCancelRemovalDecision
}) => {
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
