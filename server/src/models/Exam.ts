import { randomUUID } from 'crypto';
import { DomainError } from './DomainError';

export class Exam {
    readonly code: string;
    readonly name: string;

    private readonly questionCodes: string[];

    constructor(
        name: string,
        questionCodes: string[],
        code: string = randomUUID()
    ) {
        // Uma prova precisa de um nome
        if (typeof name !== 'string' || !name.trim()) {
            throw new DomainError(
                'É preciso definir o nome da prova'
            );
        }

        // Uma prova precisa de pelo menos uma questão
        if (!Array.isArray(questionCodes) || questionCodes.length === 0) {
            throw new DomainError(
                'Não é possível criar uma prova sem questões'
            );
        }

        // Verifica se todos os códigos são válidos
        if (questionCodes.some(
            q => typeof q !== 'string' || !q.trim()
        )) {
            throw new DomainError(
                'Código de questão inválido'
            );
        }

        // Remove espaços das extremidades dos códigos
        const normalizedCodes = questionCodes.map(
            q => q.trim()
        );

        // Não permite a mesma questão duas vezes na prova
        if (new Set(normalizedCodes).size !== normalizedCodes.length) {
            throw new DomainError(
                'Uma questão não pode aparecer duas vezes na mesma prova'
            );
        }

        if (typeof code !== 'string' || !code.trim()) {
            throw new DomainError('Código da prova inválido');
        }

        this.code = code.trim();
        this.name = name.trim();
        this.questionCodes = normalizedCodes;
    }

    getQuestionCodes(): string[] {
        return [...this.questionCodes];
    }

    toJSON() {
        return {
            code: this.code,
            name: this.name,
            questionCodes: this.getQuestionCodes()
        };
    }
}