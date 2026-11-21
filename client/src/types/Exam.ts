import { Question } from './Question';

// Representa uma prova cadastrada
export interface Exam {
    code: string;
    name: string;
    questionCodes: string[];
}

// Dados que enviamos para criar uma prova
export interface CreateExamRequest {
    name: string;
    questionCodes: string[];
}

// Dados completos retornados pela consulta de uma prova
export interface ExamDetail extends Exam {
    questions: Question[];
    subjects: string[];
}

