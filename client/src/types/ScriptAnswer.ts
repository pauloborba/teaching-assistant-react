import {Grade} from './EspecificacaoDoCalculoDaMedia';

export interface TaskAnswer {
    id: string;
    task: string;
    answer: string;
    grade?: Grade;
    comments?: string;
}

export interface ScriptAnswer {
    id: string;
    scriptId: string;
    student: string;
    answers: TaskAnswer[];
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
