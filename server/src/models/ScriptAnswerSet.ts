import { v4 as uuid } from 'uuid';
import  { ScriptAnswer } from './ScriptAnswer';
import { Grade } from './Evaluation';
import { Scripts } from './Scripts';
import { Classes } from './Classes';
import { StudentSet } from './StudentSet';
import { TaskAnswer } from './TaskAnswer';

export class ScriptAnswerSet {
  private scriptAnswers: ScriptAnswer[] = [];

  addScriptAnswer(data: any, classes?: any, studentSet?: any, scripts?: any) {
    if (!data.scriptId || !data.classId || !data.studentId) {
      throw new Error('scriptId, classId and studentId are required');
    }
    if (classes && !classes.findClassById(data.classId)) {
      throw new Error(`Class with ID ${data.classId} not found`);
    }
    if (studentSet && !studentSet.findStudentByCPF(data.studentId)) {
      throw new Error(`Student with CPF ${data.studentId} not found`);
    }
    if (scripts && !scripts.findById(data.scriptId)) {
      throw new Error(`Script with ID ${data.scriptId} not found`);
    }
    const newAnswer = ScriptAnswer.fromJSON({
      id: data.id ??  uuid(),
      scriptId: data.scriptId,
      classId: data.classId,
      student: data.studentId,
      answers: data.taskAnswers ?? [],
      grade: data.grade ?? null,
      started_at: data.started_at,
      status: data.status,
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

  findByClassId(classId: string) {
    return this.getAll().filter(a => a.getClassId() === classId).slice();
  }

  findByClassAndStudent(classId: string, studentId: string) {
    return this.getAll().filter(a => 
      a.getClassId() === classId && a.getstudentId() === studentId
    ).slice();
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

  startTaskAnswer(scriptAnswerId: string, taskId: string, data?: { answer?: string; grade?: Grade; comments?: string }) {
    const sa = this.findById(scriptAnswerId);
    if (!sa) return null;
    return sa.createTaskAnswer(taskId, data);
  }

  submitTaskAnswer(scriptAnswerId: string, taskId: string, data?: { answer?: string; grade?: Grade; comments?: string }) {
    const sa = this.findById(scriptAnswerId);
    if (!sa) return null;
    return sa.submitTaskAnswer(taskId, data); //submit questão.
  }

  submitLastTaskAnswer(scriptAnswerId: string,taskId: string, scripts: Scripts,data?: { answer?: string; grade?: Grade; comments?: string }) {
    const sa = this.findById(scriptAnswerId);
    if (!sa) return null;
    const ta = sa.submitTaskAnswer(taskId, data);
    if (!ta) return null;
    if (this.isLastTaskInScript(sa.getScriptId(), taskId, scripts)) {
      sa.markFinished(); //se ultima, marca como terminado.
    }
    return ta;
  }

  isLastTaskInScript(scriptId: string, taskId: string, scripts: Scripts): boolean {
    const script = scripts.findById(scriptId);
    if (!script) return false;
    const allTasks = script.getTasks();
    return allTasks[allTasks.length - 1].getId() === taskId;
  } //verifica se é a ultima
}

