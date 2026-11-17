import React, { useCallback, useEffect, useState } from 'react';
import { Class } from '../types/Class';
import { EVALUATION_GOALS, GRADES } from '../types/Evaluation';
import { classService } from '../services/ClassService';
import { selfAssessmentService } from '../services/SelfAssessmentService';

/** The grade of each goal; '' when the goal has none. */
type Grades = Record<string, string>;

interface Message {
  kind: 'confirmation' | 'error';
  text: string;
}

const formatDate = (isoDate: string) => isoDate.split('-').reverse().join('/');

/**
 * The "My self-assessment" page: a student of a class registers, updates and
 * removes the grade they assign to themselves for each goal, and submits the
 * whole self-assessment at once, at any time. The professor sees it in the
 * Evaluations page. There is no login, so the student is chosen among the
 * enrolled ones.
 */
const SelfAssessment: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState('');
  const [studentCPF, setStudentCPF] = useState('');
  const [draft, setDraft] = useState<Grades>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find(c => c.id === classId);
  const enrollment = selectedClass?.enrollments.find(e => e.student.cpf === studentCPF);

  /** The grades the server keeps for the selected student. */
  const storedGrades = useCallback((fromClasses: Class[]): Grades => {
    const stored = fromClasses.find(c => c.id === classId)?.enrollments
      .find(e => e.student.cpf === studentCPF)?.selfAssessments ?? [];
    return Object.fromEntries(EVALUATION_GOALS.map(goal => [goal, stored.find(e => e.goal === goal)?.grade ?? '']));
  }, [classId, studentCPF]);

  const loadClasses = useCallback(async (): Promise<Class[]> => {
    try {
      const loaded = await classService.getAllClasses();
      setClasses(loaded);
      return loaded;
    } catch (error) {
      setMessage({ kind: 'error', text: `Failed to load classes: ${(error as Error).message}` });
      return [];
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Selecting another student (or class) shows that student's stored grades
  useEffect(() => {
    setDraft(storedGrades(classes));
    setMessage(null);
    // Only on selection changes: a reload after saving resets the draft itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, studentCPF]);

  const changeGrade = (goal: string, grade: string) => {
    setDraft({ ...draft, [goal]: grade });
    setMessage(null);
  };

  const submit = async () => {
    // Only the graded goals: a goal left without grade loses its grade
    const grades = Object.fromEntries(EVALUATION_GOALS.filter(goal => draft[goal]).map(goal => [goal, draft[goal]]));
    setSaving(true);
    let outcome: Message = { kind: 'confirmation', text: 'Self-assessment submitted' };
    try {
      await selfAssessmentService.submit(classId, studentCPF, grades);
    } catch (error) {
      outcome = { kind: 'error', text: (error as Error).message };
    }
    // Either way, show what the server keeps
    setDraft(storedGrades(await loadClasses()));
    setMessage(outcome);
    setSaving(false);
  };

  return (
    <div className="self-assessment-section">
      <h3>My self-assessment</h3>

      <div className="class-selection-container">
        <label htmlFor="selfAssessmentClass">Class:</label>
        <select
          id="selfAssessmentClass"
          data-testid="self-assessment-class-select"
          value={classId}
          onChange={e => { setClassId(e.target.value); setStudentCPF(''); }}
          className="class-select"
        >
          <option value="">-- Select a class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.topic} ({c.year}/{c.semester})</option>
          ))}
        </select>

        {selectedClass && (
          <>
            <label htmlFor="selfAssessmentStudent">Student:</label>
            <select
              id="selfAssessmentStudent"
              data-testid="self-assessment-student-select"
              value={studentCPF}
              onChange={e => setStudentCPF(e.target.value)}
              className="class-select"
            >
              <option value="">-- Select a student --</option>
              {selectedClass.enrollments.map(e => (
                <option key={e.student.cpf} value={e.student.cpf}>{e.student.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {selectedClass && (
        <p className="self-assessment-deadline">
          {selectedClass.selfAssessmentRequest
            ? `Deadline: ${formatDate(selectedClass.selfAssessmentRequest.deadline)}`
            : 'The self-assessment of this class was not requested yet; you can submit it anyway'}
        </p>
      )}

      {message && (
        <div
          className={message.kind === 'error' ? 'error-message' : 'confirmation-message'}
          data-testid={`${message.kind}-message`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      {enrollment && (
        <>
          <table className="evaluation-table" data-testid="self-assessment-grades">
            <thead>
              <tr>
                <th>Goal</th>
                <th>My grade</th>
              </tr>
            </thead>
            <tbody>
              {EVALUATION_GOALS.map(goal => (
                <tr key={goal}>
                  <td>{goal}</td>
                  <td>
                    <select
                      aria-label={goal}
                      data-testid={`self-assessment-grade-${goal}`}
                      value={draft[goal] ?? ''}
                      onChange={e => changeGrade(goal, e.target.value)}
                      className={`evaluation-select ${draft[goal] ? `grade-${draft[goal].toLowerCase()}` : ''}`}
                    >
                      <option value="">-</option>
                      {GRADES.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-buttons">
            <button data-testid="submit-self-assessment" onClick={submit} disabled={saving}>
              Submit self-assessment
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SelfAssessment;
