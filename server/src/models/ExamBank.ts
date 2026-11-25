import { Exam } from './Exam';
import { Question } from './Question';
import { QuestionBank } from './QuestionBank';
import { DomainError } from './DomainError';

export class ExamBank {
    private exams: Exam[] = [];

    constructor(
        private readonly questionBank: QuestionBank
    ) {}

    addExam(
        exam: Exam,
        onChanged: () => void = () => {}
    ): Exam {
        if (this.findExamByCode(exam.code)) {
            throw new DomainError(
                'Já existe uma prova com esse código'
            );
        }
        // Verifica se o nome já foi utilizado
        const alreadyExists = this.exams.some(
            existing => existing.name == exam.name
        );
        
        if (alreadyExists) {
            throw new DomainError(
                'Já existe uma prova com esse nome'
            );
        }

        // Obtém os códigos das questões cadastradas
        const registeredCodes = new Set(
            this.questionBank.getAllQuestions().map(
                question => question.code
            )
        );

        // Verifica se todas as questões selecionadas existem
        for (const code of exam.getQuestionCodes()) {
            if (!registeredCodes.has(code)) {
                throw new DomainError(
                    'Questão ' + code + ' não encontrada'
                );
            }
        }

        // Registra a prova
        this.exams.push(exam);

        try {
            onChanged();
        } catch (error) {
            // Desfaz a inclusão caso a persistência falhe.
            this.exams.pop();

            throw error;
        }

        return exam;
    }

    getAllExams(): Exam[] {
        return [...this.exams];
    }

    findExamByCode(code: string): Exam | undefined {
        return this.exams.find(
            exam => exam.code === code
        );
    }

    getQuestionsForExam(examCode: string): Question[] {
        const exam = this.findExamByCode(examCode);
        if (!exam) {
            throw new DomainError('Prova não encontrada');
        }

        const registeredQuestions = this.questionBank.getAllQuestions();

        return exam.getQuestionCodes().map(code => {
            const question = registeredQuestions.find(
                q => q.code === code
            );

            if (!question) {
                throw new DomainError(
                    'Questão ' + code + ' não encontrada'
                );
            }

            return question;
        });
    }

    getSubjectsForExam(examCode: string): string[] {
        const questions = this.getQuestionsForExam(examCode);

        return [...new Set(questions.map(question => question.subject))]

    }
}
