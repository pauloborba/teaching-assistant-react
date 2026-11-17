import React, { useEffect, useState } from 'react';
import { DiscrepancyReport } from '../types/Discrepancy';
import { discrepancyService } from '../services/DiscrepancyService';

interface Message {
  kind: 'confirmation' | 'error';
  text: string;
}

interface DiscrepancyPanelProps {
  classId: string;
  /**
   * Whatever changes when the grades of the class may have changed (e.g. the
   * class as the page loaded it): the panel asks the server again each time it
   * does, so that it never shows discrepancies of grades that are gone.
   */
  refreshKey?: unknown;
}

/**
 * The discrepancies of a class, shown above its table of grades: the students
 * whose self-assessment grades differ too much from the grades the professor
 * assigned (greatest discrepancy first), the students whose discrepancy could
 * not be computed, how many of the others are discrepant, and the discrepancy
 * threshold of the class, which the professor can change.
 */
const DiscrepancyPanel: React.FC<DiscrepancyPanelProps> = ({ classId, refreshKey }) => {
  const [report, setReport] = useState<DiscrepancyReport | null>(null);
  // What the professor typed in the threshold field; null while it shows the threshold the server keeps
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Another class has nothing to do with what was shown for the previous one
  useEffect(() => {
    setReport(null);
    setDraft(null);
  }, [classId]);

  // The discrepancies depend on the grades, so they are asked again whenever those may have changed
  useEffect(() => {
    let outdated = false;
    setLoading(true);
    setMessage(null);
    discrepancyService.getDiscrepancies(classId)
      .then(loaded => { if (!outdated) setReport(loaded); })
      .catch(error => { if (!outdated) setMessage({ kind: 'error', text: (error as Error).message }); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [classId, refreshKey]);

  const threshold = draft ?? (report ? String(report.discrepancyThreshold) : '');

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
      setReport(await discrepancyService.getDiscrepancies(classId));
      setDraft(null);
    } catch (error) {
      outcome = { kind: 'error', text: (error as Error).message };
    }
    setMessage(outcome);
    setSaving(false);
  };

  const discrepant = report?.students.filter(s => s.discrepant) ?? [];

  return (
    <div className="discrepancy-panel" data-testid="discrepancy-panel" data-loading={String(loading)}>
      <h5>Discrepancies</h5>

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
              max={2}
              step={1}
              value={threshold}
              onChange={e => { setDraft(e.target.value); setMessage(null); }}
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
              <h5>Students whose discrepancy could not be computed</h5>
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

export default DiscrepancyPanel;
