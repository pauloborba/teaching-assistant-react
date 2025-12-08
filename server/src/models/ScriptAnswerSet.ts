import { v4 as uuid } from 'uuid';
import  { ScriptAnswer } from './ScriptAnswer';
import { Grade } from './Evaluation';

export class ScriptAnswerSet {
  private scriptAnswers: ScriptAnswer[] = [];

  addScriptAnswer(data: any) {
    const newAnswer = ScriptAnswer.fromJSON({
      id: data.id ??  uuid(),
      scriptId: data.scriptId,
      student: data.studentId,
      answers: data.taskAnswers ?? [],
      grade: data.grade ?? null
    });
    this.scriptAnswers.push(newAnswer);
    return newAnswer;
  }

  removeScriptAnswer(id: string) {
    const index = this.scriptAnswers.findIndex(a => a.getId() === id);
    if (index !== -1) {
      this.scriptAnswers.splice(index, 1);
      return true;
    }
    return false;
  }

  removeAllScriptAnswers() {
    const count = this.scriptAnswers.length;
    this.scriptAnswers = [];
    return count;
  }

  getAll() {
    return this.scriptAnswers.slice()
  }

  findByStudentId(studentId: string) {
    return this.getAll().filter(a => a.getstudentId() === studentId).slice();
  }

  findById(id: string) {
    return this.scriptAnswers.find(a => a.getId() === id) || null;
  }

  findbyScriptId(scriptId: string) {
    return this.getAll().filter(a => a.getScriptId() === scriptId).slice();
  }

  updateGrade(id: string, grade: Grade | undefined) {
    const answer = this.findById(id);
    if (!answer) return null;
    answer.grade = grade;
    return answer;
  }

  updateTaskAnswer(taskAnswerId: string, update: any) {
    for (const scriptAnswer of this.scriptAnswers) {
      const ta = scriptAnswer.answers.find(t => t.id === taskAnswerId);
      if (ta) {
        if (update.grade !== undefined) ta.updateGrade(update.grade);
        if (update.comments !== undefined) ta.comments = update.comments;
        return ta;
      }
    }
    return null;
  }
}
