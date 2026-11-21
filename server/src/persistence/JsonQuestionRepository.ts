import * as fs from 'fs';
import * as path from 'path';

import { Question, Alternative } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';

export class JsonQuestionRepository {
    constructor(private readonly filePath: string) {}

    // Salva as questões no arquivo JSON
    save(questionBank: QuestionBank): void {
        const data = { questions: questionBank.getAllQuestions().map(question => question.toJSON()) };

        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    // Recupera as questões do arquivo JSON
    load(questionBank: QuestionBank): void {
        // Na primeira execução, o arquivo ainda não existe
        if (!fs.existsSync(this.filePath)) {
            return;
        }

        const content = fs.readFileSync(this.filePath, 'utf-8');
        const data: unknown = JSON.parse(content);

        if (typeof data !== 'object' || data === null || !('questions' in data) || !Array.isArray(data.questions)) {
            throw new Error('Arquivo de questões invalido');
        }

        for (const record of data.questions) {
            if (typeof record !== 'object' || record === null || typeof record.code !== 'string' || !record.code.trim()) {
                throw new Error('Registro de questão inválido');
            }

            const question = new Question(
                record.subject as string,
                record.statement as string,
                record.alternatives as Alternative[],
                record.code
            );

            questionBank.addQuestion(question);
        }
    }
};