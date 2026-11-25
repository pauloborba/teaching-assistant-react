
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CreateExam from '../components/CreateExam';
import { Question } from '../types/Question';

import { questionService } from '../services/QuestionService';
import { examService } from '../services/ExamService';

// Substituímos as chamadas reais aos serviços.
jest.mock('../services/QuestionService', () => ({
  questionService: {
    getAllQuestions: jest.fn()
  }
}));

jest.mock('../services/ExamService', () => ({
  examService: {
    createExam: jest.fn()
  }
}));

const getAllQuestionsMock =
  questionService.getAllQuestions as jest.Mock;

const createExamMock =
  examService.createExam as jest.Mock;

// Questões utilizadas somente nos testes.
const questions: Question[] = [
  {
    code: 'q-001',
    subject: 'Requisitos',
    statement: 'O que é um requisito funcional?',
    alternatives: [
      { text: 'Descreve uma função do sistema', isTrue: true },
      { text: 'Define apenas desempenho', isTrue: false }
    ]
  },
  {
    code: 'q-002',
    subject: 'Requisitos',
    statement: 'O que é um requisito não funcional?',
    alternatives: [
      { text: 'Uma característica de qualidade', isTrue: true },
      { text: 'Um cadastro de usuário', isTrue: false }
    ]
  },
  {
    code: 'q-003',
    subject: 'Gerência de configuração',
    statement: 'Qual comando une branches?',
    alternatives: [
      { text: 'merge', isTrue: true },
      { text: 'log', isTrue: false }
    ]
  }
];

describe('CreateExam', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Por padrão, a API simulada fornece três questões.
    getAllQuestionsMock.mockResolvedValue(questions);
  });

  test('informa quando não existem questões cadastradas', async () => {
    getAllQuestionsMock.mockResolvedValue([]);

    render(<CreateExam />);

    expect(await screen.findByText(
      /Não há questões cadastradas/i
    )).toBeInTheDocument();

    expect(screen.queryByRole('button', {
      name: 'Selecionar'
    })).not.toBeInTheDocument();
  });

  test('filtra as questões por assunto', async () => {
    const user = userEvent.setup();

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    const filter = screen.getByTestId('exam-subject-filter');

    await user.type(filter, 'requisitos');

    expect(screen.getByText(
      'O que é um requisito funcional?'
    )).toBeInTheDocument();

    expect(screen.getByText(
      'O que é um requisito não funcional?'
    )).toBeInTheDocument();

    expect(screen.queryByText(
      'Qual comando une branches?'
    )).not.toBeInTheDocument();

    // Agora pesquisa um assunto que não existe.
    await user.clear(filter);
    await user.type(filter, 'Banco de Dados');

    expect(screen.getByText(
      /Não há questões do assunto/i
    )).toBeInTheDocument();
  });

  test('seleciona questões de assuntos diferentes', async () => {
    const user = userEvent.setup();

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    await user.click(
      screen.getByTestId('select-question-q-001')
    );

    await user.click(
      screen.getByTestId('select-question-q-003')
    );

    expect(screen.getByRole('heading', {
      name: 'Questões selecionadas (2)'
    })).toBeInTheDocument();

    expect(
      screen.getByText('Assuntos abordados:').parentElement
    ).toHaveTextContent('Requisitos');

    expect(
      screen.getByText('Assuntos abordados:').parentElement
    ).toHaveTextContent('Gerência de configuração');
  });

  test('avisa quando uma questão já está selecionada', async () => {
    const user = userEvent.setup();

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    const selectButton =
      screen.getByTestId('select-question-q-001');

    await user.click(selectButton);
    await user.click(selectButton);

    expect(screen.getByRole('alert'))
      .toHaveTextContent(/já está selecionada/i);

    expect(screen.getByRole('heading', {
      name: 'Questões selecionadas (1)'
    })).toBeInTheDocument();
  });

  test('impede salvar uma prova sem questões', async () => {
    const user = userEvent.setup();

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    await user.type(
      screen.getByTestId('exam-name'),
      'Prova sem questões'
    );

    await user.click(screen.getByTestId('save-exam'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não é possível criar uma prova sem questões'
    );

    expect(createExamMock).not.toHaveBeenCalled();
  });

  test('salva a prova e limpa o formulário', async () => {
    const user = userEvent.setup();

    createExamMock.mockResolvedValue({
      code: 'exam-001',
      name: 'Prova de Engenharia de Software',
      questionCodes: ['q-001', 'q-003']
    });

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    await user.click(
      screen.getByTestId('select-question-q-001')
    );

    await user.click(
      screen.getByTestId('select-question-q-003')
    );

    await user.type(
      screen.getByTestId('exam-name'),
      'Prova de Engenharia de Software'
    );

    await user.click(screen.getByTestId('save-exam'));

    await waitFor(() => {
      expect(createExamMock).toHaveBeenCalledWith({
        name: 'Prova de Engenharia de Software',
        questionCodes: ['q-001', 'q-003']
      });
    });

    expect(await screen.findByRole('alert'))
      .toHaveTextContent(/foi criada com sucesso/i);

    expect(screen.getByTestId('exam-name'))
      .toHaveValue('');

    expect(screen.getByRole('heading', {
      name: 'Questões selecionadas (0)'
    })).toBeInTheDocument();
  });

  test('mantém os dados após erro de nome repetido', async () => {
    const user = userEvent.setup();

    createExamMock.mockRejectedValue(
      new Error('Já existe uma prova com esse nome')
    );

    render(<CreateExam />);

    await screen.findByText('Qual comando une branches?');

    await user.click(
      screen.getByTestId('select-question-q-001')
    );

    await user.type(
      screen.getByTestId('exam-name'),
      'Prova de Requisitos'
    );

    await user.click(screen.getByTestId('save-exam'));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Já existe uma prova com esse nome');

    expect(screen.getByTestId('exam-name'))
      .toHaveValue('Prova de Requisitos');

    expect(screen.getByRole('heading', {
      name: 'Questões selecionadas (1)'
    })).toBeInTheDocument();
  });

  test('permite visualizar e ocultar as alternativas de uma questão', async () => {
      const user = userEvent.setup();

      render(<CreateExam />);

      const toggleButton = await screen.findByTestId(
          'view-alternatives-q-003'
      );

      // Inicialmente, as alternativas estão ocultas.
      expect(screen.queryByText('merge')).not.toBeInTheDocument();

      // Expande a questão.
      await user.click(toggleButton);

      expect(screen.getByText('merge')).toBeInTheDocument();
      expect(screen.getByText('log')).toBeInTheDocument();

      expect(toggleButton).toHaveAttribute(
          'aria-expanded',
          'true'
      );

      // Oculta novamente.
      await user.click(toggleButton);

      expect(screen.queryByText('merge')).not.toBeInTheDocument();

      expect(toggleButton).toHaveAttribute(
          'aria-expanded',
          'false'
      );
  });
});
