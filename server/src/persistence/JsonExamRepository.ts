import * as fs from 'fs';

import { Exam } from '../models/Exam';
import { ExamBank } from '../models/ExamBank';
import { atomicWriteJson } from './atomicWriteJson';

// Verifica se um valor é um objeto JSON
function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

export class JsonExamRepository {
    constructor(private readonly filePath: string) {}

    // Salva as provas existentes no arquivo JSON
    save(examBank: ExamBank): void {
        const data = {
            exams: examBank.getAllExams().map(
                exam => exam.toJSON()
            )
        };

        atomicWriteJson(this.filePath, data);
    }

    // Recupera as provas salvas anteriormente
    load(examBank: ExamBank): void {
        // Na primeira execução, o arquivo pode não existir
        if (!fs.existsSync(this.filePath)) {
            return;
        }

        const content = fs.readFileSync(this.filePath, 'utf8');
        const data: unknown = JSON.parse(content);

        if (!isRecord(data) || !Array.isArray(data.exams)) {
            throw new Error('Arquivo de provas inválido');
        }

        for (const record of data.exams) {
            if (!isRecord(record) ||
                typeof record.code !== 'string' ||
                typeof record.name !== 'string' ||
                !Array.isArray(record.questionCodes) ||
                !record.questionCodes.every(
                    (code: unknown) => typeof code == 'string'
                )
            ) {
                throw new Error('Registro de prova inválido');
            }

            // Reconstrói a instância da classe Exam
            const exam = new Exam(
                record.name,
                record.questionCodes as string[],
                record.code
            );

            examBank.addExam(exam);
        }
    }
}