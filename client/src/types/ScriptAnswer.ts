import {Grade} from './EspecificacaoDoCalculoDaMedia';

export interface TaskAnswer {
    id: string;
    taskId: string;
    answer: string;
    grade?: Grade;
    comments?: string;
}

export interface ScriptAnswer {
    id: string;
    scriptId: string;
    studentId: string;
    taskAnswers: TaskAnswer[];
    grade?: Grade;
}

export interface UpdateSriptAnswerGradeRequest {
    scriptAnswerId: string;
    grade: Grade;
}

export interface updateTaskAnswerGradeRequest {
    TaskAnswerId: string;
    grade?: Grade;
    comments?: string;
}

export const isValidJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
