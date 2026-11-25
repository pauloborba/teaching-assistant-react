
import { Question } from '../models/Question';

describe('Question — encapsulamento', () => {
    const createQuestion = () => new Question(
        'Git',
        'Qual comando une branches?',
        [
            { text: 'merge', isTrue: true },
            { text: 'log', isTrue: false }
        ]
    );

    test('protege o array interno de alternativas', () => {
        const question = createQuestion();

        const alternatives = question.alternatives;

        alternatives.pop();

        expect(question.alternatives).toHaveLength(2);
    });

    test('protege a classificação original das alternativas', () => {
        const question = createQuestion();

        const alternatives = question.alternatives;

        alternatives[0].isTrue = false;

        expect(question.alternatives[0].isTrue).toBe(true);
    });

    test('protege a ordem original das alternativas', () => {
        const question = createQuestion();

        const alternatives = question.alternatives;

        alternatives.reverse();

        expect(question.alternatives.map(a => a.text))
            .toEqual(['merge', 'log']);
    });

    test('protege os dados ao serializar uma questão', () => {
        const question = createQuestion();

        const serialized = question.toJSON();

        serialized.alternatives[0].text = 'Alterado';

        expect(question.alternatives[0].text).toBe('merge');
    });
});
