import { Question } from './Question';
import { DomainError } from './DomainError';

export class QuestionBank {
    private questions: Question[] = [];

    addQuestion(
        question: Question,
        onChanged: () => void = () => {}
    ): Question {
        if (this.findQuestionByCode(question.code)) {
            throw new DomainError(
                'Já existe uma questão com esse código'
            );
        }

        const alreadyExists = this.questions.some(
            existing =>
                this.getSignature(existing) === this.getSignature(question)
        );

        if (alreadyExists) {
            throw new DomainError(
                'Essa questão já foi criada no sistema'
            );
        }

        this.questions.push(question);

        try {
            onChanged();
        } catch (error) {
            // Desfaz a inclusão caso a persistência falhe
            this.questions.pop();

            throw error;
        }

        return question;
    }


    getAllQuestions(): Question[] {
        return [...this.questions];
    }

    findQuestionByCode(code: string): Question | undefined {
        return this.questions.find(question => question.code === code);   
    }

    private getSignature(question: Question): string {
        const alternatives = question.alternatives
            .map(a => JSON.stringify([a.text, a.isTrue]))
            .sort();

        return JSON.stringify([
            question.subject,
            question.statement,
            alternatives
        ]);
    }
}