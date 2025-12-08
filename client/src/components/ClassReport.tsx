import React, { useState, useEffect } from 'react';
import { Class } from '../types/Class';
import { ReportData } from '../types/Report';
import ClassService from '../services/ClassService';

interface ClassReportProps {
  classObj: Class;
  onClose: () => void;
  onError: (errorMessage: string) => void;
}


// ClassReport component - displays a modal with class report statistics.
const ClassReport: React.FC<ClassReportProps> = ({ classObj, onClose, onError }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
                      {reportData.studentsAverage !== null ? reportData.studentsAverage.toFixed(2) : '–'}
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
                    <span className="stat-label">Approved (Final):</span>
                    <span className="stat-value approved">{reportData.approvedFinalCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Not Approved:</span>
                    <span className="stat-value not-approved">{reportData.notApprovedCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Failed by Absence:</span>
                    <span className="stat-value not-approved">{reportData.failedByAbsenceCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pending:</span>
                    <span className="stat-value pending">{reportData.pendingCount}</span>
                  </div>
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
                            <td>{performance.averageGrade !== null ? performance.averageGrade.toFixed(2) : '–'}</td>
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

              {/* Students Table */}
              {reportData.students && reportData.students.length > 0 && (
                <div className="students-results">
                  <h4>Student Results</h4>
                  <div className="table-container">
                    <table className="students-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Final Grade</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.students.map((student) => (
                          <tr key={student.studentId}>
                            <td><strong>{student.name}</strong></td>
                            <td>{student.finalGrade !== null ? student.finalGrade.toFixed(2) : '–'}</td>
                            <td className={`status-${student.status.toLowerCase().replace('_', '-')}`}>
                              {formatStatus(student.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

/**
 * Formats the student status for display.
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'APPROVED': 'Approved',
    'APPROVED_FINAL': 'Approved (Final)',
    'FAILED': 'Failed',
    'FAILED_BY_ABSENCE': 'Failed (Absence)',
    'PENDING': 'Pending'
  };
  return statusMap[status] || status;
}

export default ClassReport;
