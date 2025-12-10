import { Grade } from "./Evaluation";
import { TaskAnswer } from "./TaskAnswer";
import { v4 as uuid } from 'uuid';

export class ScriptAnswer {
  private id: string;
  private scriptId: string;
  private classId: string;
  private student: string; 
  public answers: TaskAnswer[] = [];
  public started_at?: number;
  public finished_at?: number;
  public status: 'in_progress' | 'finished' = 'in_progress';
  public grade?: Grade

  constructor(id: string, scriptId: string, classId: string, student: string, answers?: TaskAnswer[], grade?: Grade, started_at?: number, finished_at?: number, status?: 'in_progress' | 'finished') {
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
    this.id = id;
    this.scriptId = scriptId;
    this.classId = classId;
    this.student = student;
    this.answers = answers || [];
    this.started_at = started_at ?? Date.now();
    this.finished_at = finished_at;
    this.status = status ?? 'in_progress';
    this.grade = grade;
  }

  getId(): string {
    return this.id;
  }

  getstudentId(): string {
    return this.student;
  }

  getScriptId(): string {
    return this.scriptId;
  }

  getClassId(): string {
    return this.classId;
  }

  toJSON() {
    return {
      id: this.id,
      scriptId: this.scriptId,
      classId: this.classId,
      student: this.student,
      answers: this.answers.map(answer => {
        if (answer && typeof answer.toJSON === "function") {
          return answer.toJSON();
        }
        console.warn("Invalid answer detected:", answer);
        return null;
      }).filter(Boolean),
      grade: this.grade ? this.grade : undefined,
      started_at: this.started_at,
      finished_at: this.finished_at,
      status: this.status,
    };
  }

  static fromJSON(obj: any): ScriptAnswer {
    const answers = obj.answers ? obj.answers.map((ansObj: any) => TaskAnswer.fromJSON(ansObj)) : [];
    return new ScriptAnswer(obj.id, obj.scriptId, obj.classId, obj.student, answers, obj.grade, obj.started_at, obj.finished_at, obj.status);
  }

  // answer management

  findAnswerByTaskId(taskId: string): TaskAnswer | undefined {
    return this.answers.find(answer => 
      answer.getTaskId() === taskId
    );
  }
  //obsoleto
  addAnswer(answer: TaskAnswer): TaskAnswer {
    const existingAnswer = this.findAnswerByTaskId(answer.task);
    if (existingAnswer) {
      throw new Error('Answer for task already in script');
    }

    this.answers.push(answer);
    return answer;
  }

  removeAnswer(taskId: string): boolean {
    const index = this.answers.findIndex(answer => 
      answer.getTaskId() === taskId
    );
    
    if (index === -1) {
      return false;
    }

    this.answers.splice(index, 1);
    return true;
  }

  createTaskAnswer(taskId: string, data?: { answer?: string; grade?: Grade; comments?: string }): TaskAnswer | null {
    const existing = this.findAnswerByTaskId(taskId);
    if (existing) return null;
    const ta = new TaskAnswer(
      `${this.id}-${taskId}`,  // ou use uuid()
      taskId,
      data?.answer,
      data?.grade,
      data?.comments
    );
    this.answers.push(ta);
    return ta;
  }

  submitTaskAnswer(taskId: string, data?: { answer?: string; grade?: Grade; comments?: string }): TaskAnswer | null {
    const ta = this.findAnswerByTaskId(taskId);
    if (!ta) return null;
    
    if (data?.grade !== undefined) ta.updateGrade(data.grade);
    if (data?.comments !== undefined) ta.comments = data.comments;
    ta.submit(data?.answer);
    return ta;
  }

  markFinished(finishedAt?: number) {
    this.finished_at = finishedAt ?? Date.now();
    this.status = 'finished';
  }

  checkAndMarkIfTimedOut(timeoutSeconds: number) {
    if (this.status === 'finished') return; // já finalizou
    const elapsed = (Date.now() - (this.started_at || 0)) / 1000;
    if (elapsed > timeoutSeconds) {
      this.markFinished();
      this.answers.forEach(ta => {
        if (ta.status == 'started'){
          ta.submit();
        }
        else if (ta.status !== 'submitted') {
          ta.status = 'timed_out';
        }
      });
    }
  }
  // grade Management

  updateGrade(grade: Grade | undefined) {
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
    this.grade = grade;
  }

  private getNumberOfAnswersWithGrade(grade : Grade): number { 
    if (grade !== 'MANA' && grade !== 'MPA' && grade !== 'MA') {
      throw new Error('Invalid grade');
    }
    return this.answers.filter(answer => answer.getGrade() === grade).length;
  }

  getGradeDistribution(): Record<Grade, number> {
    return {
      'MANA': this.getNumberOfAnswersWithGrade('MANA'),
      'MPA': this.getNumberOfAnswersWithGrade('MPA'),
      'MA': this.getNumberOfAnswersWithGrade('MA'),
    };
  }
  
}