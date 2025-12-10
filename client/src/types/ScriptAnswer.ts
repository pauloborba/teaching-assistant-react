import {Grade} from './EspecificacaoDoCalculoDaMedia';

export interface TaskAnswer {
    id: string;
    task: string;
    answer?: string;
    grade?: Grade;
    comments?: string;
    started_at?: number;
    submitted_at?: number;
    time_taken_seconds?: number;
    status?: 'pending' | 'started' | 'submitted' | 'timed_out';
}

export interface ScriptAnswer {
    id: string;
    scriptId: string;
    classId: string;
    student: string;
    answers: TaskAnswer[];
    grade?: Grade;
    started_at?: number;
    finished_at?: number;
    status?: 'in_progress' | 'finished';
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
