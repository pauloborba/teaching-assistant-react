import React, { useCallback, useEffect, useState } from 'react';
import { Class } from '../types/Class';
import { DiscrepancyReport } from '../types/Discrepancy';
import { classService } from '../services/ClassService';
import { discrepancyService } from '../services/DiscrepancyService';

interface Message {
  kind: 'confirmation' | 'error';
  text: string;
}

/**
 * The "Discrepancies" page: for a class chosen by the professor, the students
 * whose self-assessment grades differ too much from the grades the professor
 * assigned (greatest discrepancy first), the students whose discrepancy could
 * not be computed, how many of the others are discrepant, and the discrepancy
 * threshold of the class, which the professor can change.
 */
const Discrepancies: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState('');
  const [report, setReport] = useState<DiscrepancyReport | null>(null);
  const [threshold, setThreshold] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classService.getAllClasses()
      .then(setClasses)
      .catch(error => setMessage({ kind: 'error', text: `Failed to load classes: ${(error as Error).message}` }));
  }, []);

  /** Shows what the server tells about the class. */
  const show = useCallback((loaded: DiscrepancyReport) => {
    setReport(loaded);
    setThreshold(String(loaded.discrepancyThreshold));
  }, []);

  // Selecting another class shows its discrepancies
  useEffect(() => {
    setReport(null);
    setMessage(null);
    if (!classId) {
      return;
    }
    let selectionChanged = false;
    discrepancyService.getDiscrepancies(classId)
      .then(loaded => { if (!selectionChanged) show(loaded); })
      .catch(error => { if (!selectionChanged) setMessage({ kind: 'error', text: (error as Error).message }); });
    return () => { selectionChanged = true; };
  }, [classId, show]);

  const changeThreshold = async () => {
    setSaving(true);
    let outcome: Message = { kind: 'confirmation', text: 'Discrepancy threshold changed' };
    try {
      // An empty field is sent as a value the server rejects, instead of becoming a 0
      await discrepancyService.changeThreshold(classId, threshold.trim() === '' ? NaN : Number(threshold));
    } catch (error) {
      outcome = { kind: 'error', text: (error as Error).message };
    }
    // Either way, show what the server keeps
    try {
      show(await discrepancyService.getDiscrepancies(classId));
    } catch (error) {
      outcome = { kind: 'error', text: (error as Error).message };
    }
    setMessage(outcome);
    setSaving(false);
  };

  const discrepant = report?.students.filter(s => s.discrepant) ?? [];

  return (
    <div className="discrepancies-section">
      <h3>Discrepancies</h3>

      <div className="class-selection-container">
        <label htmlFor="discrepanciesClass">Class:</label>
        <select
          id="discrepanciesClass"
          data-testid="discrepancies-class-select"
          value={classId}
          onChange={e => setClassId(e.target.value)}
          className="class-select"
        >
          <option value="">-- Select a class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.topic} ({c.year}/{c.semester})</option>
          ))}
        </select>
      </div>

      {message && (
        <div
          className={message.kind === 'error' ? 'error-message' : 'confirmation-message'}
          data-testid={`${message.kind}-message`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      {report && (
        <>
          <div className="discrepancy-threshold-control">
            <label htmlFor="discrepancyThreshold">Discrepancy threshold:</label>
            <input
              id="discrepancyThreshold"
              data-testid="discrepancy-threshold-input"
              type="number"
              min={0}
              step={1}
              value={threshold}
              onChange={e => { setThreshold(e.target.value); setMessage(null); }}
            />
            <button data-testid="save-discrepancy-threshold" onClick={changeThreshold} disabled={saving}>
              Change threshold
            </button>
          </div>

          <p className="discrepancy-summary" data-testid="discrepancy-summary">
            <span data-testid="discrepant-count">{report.discrepantCount}</span> of{' '}
            <span data-testid="computable-count">{report.computableCount}</span> students as discrepant, which is{' '}
            <span data-testid="discrepant-percentage">{report.discrepantPercentage}%</span>
          </p>

          {discrepant.length === 0 ? (
            <div className="info-message" data-testid="info-message">The class has no discrepant students</div>
          ) : (
            <div className="table-container">
              <table data-testid="discrepant-students">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Discrepancy</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepant.map(({ student, discrepancy }) => (
                    <tr key={student.cpf}>
                      <td>{student.name}</td>
                      <td>{discrepancy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.uncomputable.length > 0 && (
            <>
              <h4>Students whose discrepancy could not be computed</h4>
              <div className="table-container">
                <table data-testid="uncomputable-students">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.uncomputable.map(({ student, missing }) => (
                      <tr key={student.cpf}>
                        <td>{student.name}</td>
                        <td>{missing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Discrepancies;
