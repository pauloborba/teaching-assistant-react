import {
    Exam,
    ExamDetail,
    CreateExamRequest
} from '../types/Exam';

import { get, sendJson } from './apiClient';

const EXAMS = '/api/exams';

export const examService = {
    // Consulta todas as provas cadastradas
    getAllExams: (): Promise<Exam[]> =>
        get(EXAMS, 'Não foi possível carregar as provas'),

    // Cadastra uma nova prova
    createExam: (data: CreateExamRequest): Promise<Exam> =>
        sendJson(
            'POST',
            EXAMS,
            data,
            'Não foi possível criar a prova'
        ),
    
    // Consulta uma prova com suas questões e assuntos
    getExamByCode: (code: string): Promise<ExamDetail> =>
        get(
            EXAMS + '/' + encodeURIComponent(code),
            'Não foi possível consultar a prova'
        )

}