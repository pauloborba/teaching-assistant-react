
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExamList from '../components/ExamList';
import { examService } from '../services/ExamService';
import { Exam, ExamDetail } from '../types/Exam';

jest.mock('../services/ExamService', () => ({
  examService: {
    getAllExams: jest.fn(),
    getExamByCode: jest.fn()
  }
}));

const getAllExamsMock = examService.getAllExams as jest.Mock;
const getExamByCodeMock = examService.getExamByCode as jest.Mock;

const exam: Exam = {
  code: 'exam-001',
  name: 'Prova de Requisitos',
  questionCodes: ['q-001']
};

const examDetail: ExamDetail = {
  ...exam,
  subjects: ['Requisitos'],
  questions: [
    {
      code: 'q-001',
      subject: 'Requisitos',
      statement: 'O que é um requisito funcional?',
      alternatives: [
        { text: 'Descreve uma função do sistema', isTrue: true },
        { text: 'Define apenas desempenho', isTrue: false }
      ]
    }
  ]
};

describe('ExamList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAllExamsMock.mockResolvedValue([exam]);
    getExamByCodeMock.mockResolvedValue(examDetail);
  });

  test('informa quando não há provas cadastradas', async () => {
    getAllExamsMock.mockResolvedValue([]);

    render(<ExamList />);

    expect(await screen.findByText(
      'Não há provas cadastradas.'
    )).toBeInTheDocument();
  });

  test('lista as provas e permite consultar os detalhes', async () => {
    const user = userEvent.setup();

    render(<ExamList />);

    await screen.findByText('Prova de Requisitos');

    expect(screen.getByText(
      '1 questão(ões)'
    )).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Visualizar prova'
      })
    );

    expect(getExamByCodeMock).toHaveBeenCalledWith(
      'exam-001'
    );

    expect(await screen.findByText(
      'O que é um requisito funcional?'
    )).toBeInTheDocument();

    expect(screen.getByText(
      'Assuntos abordados:'
    ).parentElement).toHaveTextContent('Requisitos');
  });

  test('mostra uma mensagem quando a consulta falha', async () => {
    const user = userEvent.setup();

    getExamByCodeMock.mockRejectedValue(
      new Error('Falha ao consultar prova')
    );

    render(<ExamList />);

    await screen.findByText('Prova de Requisitos');

    await user.click(
      screen.getByRole('button', {
        name: 'Visualizar prova'
      })
    );

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Falha ao consultar prova');
  });
});
