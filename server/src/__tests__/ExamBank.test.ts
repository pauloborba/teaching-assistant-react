import { Exam } from '../models/Exam';
import { ExamBank } from '../models/ExamBank';
import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';

describe('ExamBank', () => {
    let questionBank: QuestionBank;
    let examBank: ExamBank;

    let question1: Question;
    let question2: Question;

    beforeEach(() => {
        questionBank = new QuestionBank();

        // Questão de requisitos
        question1 = questionBank.addQuestion(
            new Question(
                'Requisitos',
                'O que é um requisito funcional?',
                [
                { text: 'Descreve uma função do sistema', isTrue: true },
                { text: 'Define somente desempenho', isTrue: false }
                ]
            )
        );

        // Questão de gerência de configuração
        question2 = questionBank.addQuestion(
            new Question(
                'Gerência de configuração',
                'Qual comando une branches?',
                [
                { text: 'merge', isTrue: true },
                { text: 'log', isTrue: false }
                ]
            )
        );

        examBank = new ExamBank(questionBank);
    });

    test('cadastra uma prova válida', () => {
        const exam = new Exam(
            'Prova de Engenharia de Software',
            [question1.code, question2.code]
        );

        examBank.addExam(exam);

        expect(examBank.getAllExams()).toHaveLength(1);
        expect(examBank.getAllExams()[0].code).toBe(exam.code);
    });

    test('rejeita prova sem nome', () => {
        expect(() => new Exam(
            '',
            [question1.code]
        )).toThrow('É preciso definir o nome da prova');
    });

    test('rejeita prova sem questões', () => {
        expect(() => new Exam(
            'Prova de Requisitos',
            []
        )).toThrow('Não é possível criar uma prova sem questões');
    });

    test('rejeita questão repetida na mesma prova', () => {
        expect(() => new Exam(
            'Prova de Requisitos',
            [question1.code, question1.code]
        )).toThrow(
            'Uma questão não pode aparecer duas vezes na mesma prova'
        );
    });

    test('rejeita questão inexistente', () => {
        const exam = new Exam(
            'Prova de Requisitos',
            ['q-inexistente']
        );

        expect(() => examBank.addExam(exam)).toThrow(
            'Questão q-inexistente não encontrada'
        );

        expect(examBank.getAllExams()).toHaveLength(0);
    });

    test('rejeita uma prova com nome já utilizado', () => {
        const exam1 = new Exam(
            'Prova de Requisitos',
            [question1.code]
        );

        const exam2 = new Exam(
            'Prova de Requisitos',
            [question2.code]
        );

        examBank.addExam(exam1);

        expect(() => examBank.addExam(exam2)).toThrow(
            'Já existe uma prova com esse nome'
        );

        expect(examBank.getAllExams()).toHaveLength(1);
    });


    test('recupera as questões na ordem selecionada', () => {
        const exam = new Exam(
            'Prova de Engenharia de Software',
            [question2.code, question1.code]
        );

        examBank.addExam(exam);

        const questions = examBank.getQuestionsForExam(exam.code);

        expect(questions.map(q => q.code)).toEqual([question2.code, question1.code]);
    });

    test('identifica os assuntos abordados pela prova', () => {
        const exam = new Exam(
            'Prova de Engenharia de Software',
            [question1.code, question2.code]
        );

        examBank.addExam(exam);

        const subjects = examBank.getSubjectsForExam(exam.code);

        expect(subjects).toEqual([
            'Requisitos',
            'Gerência de configuração'
        ]);
    });
})