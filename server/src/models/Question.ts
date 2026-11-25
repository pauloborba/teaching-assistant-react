import { randomUUID } from 'crypto'
import { DomainError } from './DomainError'

export interface Alternative {
    text: string
    isTrue: boolean
}

export class Question {
    readonly code: string;
    readonly subject: string;
    readonly statement: string;
    private readonly _alternatives: Alternative [];

    constructor(
        subject: string,
        statement: string,
        alternatives: Alternative[],
        code: string = randomUUID()
    )   {
        if (typeof subject != 'string' || !subject.trim()) {
            throw new DomainError('É preciso definir o assunto da questão');
        }
        
        if (typeof statement != 'string' || !statement.trim()) {
            throw new DomainError('É preciso definir o enunciado da questão');
        }

        if (!Array.isArray(alternatives) || alternatives.length === 0) {
            throw new DomainError('É preciso adicionar alternativas para a questão')
        }

        for (const alternative of alternatives) {
            if (
                !alternative ||
                typeof alternative.text !== 'string' ||
                !alternative.text.trim() ||
                typeof alternative.isTrue !== 'boolean'
            ) {
                throw new DomainError('Alternativa inválida');
            }
        }

        this.code = code;
        this.subject = subject.trim();
        this.statement = statement.trim();
        this._alternatives = alternatives.map(a => ({
            text: a.text.trim(),
            isTrue: a.isTrue
        }));
    }

    get alternatives(): Alternative[] {
        return this._alternatives.map(a => ({ ...a }));
    }

    toJSON() {
        return {
            code: this.code,
            subject: this.subject,
            statement: this.statement,
            alternatives: this.alternatives
        };
    }
}

