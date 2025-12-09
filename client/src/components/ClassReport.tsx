import React, { useState, useEffect, useMemo } from 'react';
import { Class } from '../types/Class';
import { ReportData } from '../types/Report';
import ClassService from '../services/ClassService';
import { StatusPieChart, EvaluationBarChart } from './charts';

interface ClassReportProps {
  classObj: Class;
  onClose: () => void;
  onError: (errorMessage: string) => void;
}

type FilterOption = 'ALL' | 'APPROVED' | 'BELOW_AVG' | 'BELOW_X';

// ClassReport component - displays a modal with class report statistics.
const ClassReport: React.FC<ClassReportProps> = ({ classObj, onClose, onError }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterType, setFilterType] = useState<FilterOption>('ALL');
  const [customThreshold, setCustomThreshold] = useState<number>(7.0);

  useEffect(() => {
    const loadReport = async () => {
      setIsLoading(true);
      try {
        const report = await ClassService.getClassReport(classObj.id);
        setReportData(report);
      } catch (error) {
        onError((error as Error).message);
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [classObj.id, onError, onClose]);

  const filteredStudents = useMemo(() => {
    if (!reportData || !reportData.students) return [];

    return reportData.students.filter(student => {
      const grade = student.finalGrade ?? 0;
      const isPending = student.status === 'PENDING';

      switch (filterType) {
        case 'ALL':
          return true;
        
        case 'APPROVED':
          return student.status === 'APPROVED' || student.status === 'APPROVED_FINAL';
        
        case 'BELOW_AVG':
          return reportData.studentsAverage !== null && grade < reportData.studentsAverage && !isPending;
        
        case 'BELOW_X':
          if (isPending) return false;
          return grade < customThreshold;
          
        default:
          return true;
      }
    });
  }, [reportData, filterType, customThreshold]);

  const getGradeClass = (grade: number | null) => {
    if (grade === null) return '';
    if (grade >= 7.0) return 'grade-high';
    if (grade >= 4.0) return 'grade-medium';
    return 'grade-low';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Aprovado', className: 'status-approved' };
      case 'APPROVED_FINAL':
        return { label: 'Aprovado (Final)', className: 'status-approved-final' };
      case 'FAILED':
        return { label: 'Reprovado', className: 'status-failed' };
      default:
        return { label: status, className: '' };
    }
  };

return (
    <div className="enrollment-overlay">
      <div className="report-modal">
        <div className="enrollment-modal-header">
          <h3>Class Report: {classObj.topic} ({classObj.year}/{classObj.semester})</h3>
          <button 
            className="close-modal-btn"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="report-modal-content">
          {isLoading ? (
            <div className="loading-report">
              <p>Loading report...</p>
            </div>
          ) : reportData ? (
            <>
              {/* Report Statistics - Two Columns */}
              <div className="report-stats-grid">
                <div className="report-stat-card">
                  <h4>Enrollment Statistics</h4>
                  <div className="stat-item">
                    <span className="stat-label">Total Enrolled:</span>
                    <span className="stat-value">{reportData.totalEnrolled}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Class Average:</span>
                    <span className="stat-value">
                      {reportData.studentsAverage !== null ? reportData.studentsAverage.toFixed(2) : '-'}
                    </span>
                  </div>
                </div>

                <div className="report-stat-card">
                  <h4>Approval Statistics</h4>
                  <div className="stat-item">
                    <span className="stat-label">Approved:</span>
                    <span className="stat-value approved">{reportData.approvedCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Not Approved:</span>
                    <span className="stat-value not-approved">{reportData.notApprovedCount}</span>
                  </div>
                </div>
              </div>

              {/* Charts Section*/}
              <div className="report-charts-section">
                <div className="charts-grid">
                  <StatusPieChart 
                    data={{
                      approvedCount: reportData.approvedCount,
                      approvedFinalCount: reportData.approvedFinalCount,
                      notApprovedCount: reportData.notApprovedCount,
                      failedByAbsenceCount: reportData.failedByAbsenceCount,
                      pendingCount: reportData.pendingCount
                    }}
                  />
                  <EvaluationBarChart 
                    data={reportData.evaluationPerformance}
                  />
                </div>
              </div>

              {/* Evaluation Performance Table */}
              <div className="evaluation-performance">
                <h4>Evaluation Performance</h4>
                {reportData.evaluationPerformance.length === 0 ? (
                  <p className="no-evaluations">No evaluations recorded yet</p>
                ) : (
                  <div className="table-container">
                    <table className="performance-table">
                      <thead>
                        <tr>
                          <th>Goal</th>
                          <th>Average Grade</th>
                          <th>Evaluated Students</th>
                          <th>MA</th>
                          <th>MPA</th>
                          <th>MANA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.evaluationPerformance.map((performance) => (
                          <tr key={performance.goal}>
                            <td><strong>{performance.goal}</strong></td>
                            <td>{performance.averageGrade !== null ? performance.averageGrade.toFixed(2) : '-'}</td>
                            <td>{performance.evaluatedStudents}</td>
                            <td className="grade-ma">{performance.gradeDistribution.MA}</td>
                            <td className="grade-mpa">{performance.gradeDistribution.MPA}</td>
                            <td className="grade-mana">{performance.gradeDistribution.MANA}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Student List Section com Filtros */}
              <div className="student-list-section">
                <div className="section-header">
                  <h4>Detailed Student Results</h4>
                  
                  <div className="filter-group">
                    <div className="filter-control">
                      <label htmlFor="filterType">Filter:</label>
                      <select
                        id="filterType"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as FilterOption)}
                        className="filter-select"
                      >
                        <option value="ALL">All Students</option>
                        <option value="APPROVED">Approved</option>
                        <option value="BELOW_AVG">Below Class Average</option>
                        <option value="BELOW_X">Below specific grade...</option>
                      </select>
                    </div>

                    {filterType === 'BELOW_X' && (
                      <div className="filter-control fade-in">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={customThreshold}
                          onChange={(e) => setCustomThreshold(Number(e.target.value))}
                          className="filter-input-x"
                        />
                      </div>
                    )}

                    {filterType === 'BELOW_AVG' && reportData.studentsAverage !== null && (
                      <span className="avg-indicator">
                        Avg: {reportData.studentsAverage.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="table-container">
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>ID / CPF</th>
                        <th>Final Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => {
                          const statusConfig = getStatusConfig(student.status);
                          return (
                            <tr key={student.studentId}>
                              <td><strong>{student.name}</strong></td>
                              <td style={{ color: '#666' }}>{student.studentId}</td>
                              <td>
                                <span className={getGradeClass(student.finalGrade)}>
                                  {student.finalGrade !== null ? student.finalGrade.toFixed(2) : '-'}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${statusConfig.className}`}>
                                  {statusConfig.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="empty-state-row">
                          <td colSpan={4}>
                            {filterType === 'ALL' 
                              ? 'No students enrolled in this class.' 
                              : 'No students found matching this filter.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
                  Showing {filteredStudents.length} of {reportData.totalEnrolled} students
                </div>
              </div>

              {/* Report Generated Timestamp */}
              <div className="report-footer">
                <p className="report-timestamp">
                  Report generated at: {new Date(reportData.generatedAt).toLocaleString()}
                </p>
              </div>
            </>
          ) : (
            <div className="no-report-data">
              <p>No report data available</p>
            </div>
          )}
        </div>

        <div className="report-actions">
          <button 
            className="cancel-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassReport;