import React from 'react';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ExamPage from '../../pages/ExamPage';
import AICorrectionService from '../../services/AICorrectionService';
import ExamsService from '../../services/ExamsService';

// Mock dos serviços
jest.mock('../../services/AICorrectionService', () => ({
  __esModule: true,
  default: {
    triggerAICorrection: jest.fn(),
  },
}));

jest.mock('../../services/ExamsService', () => ({
  __esModule: true,
  default: {
    getExamsForClass: jest.fn(),
    getStudentsWithExamsForClass: jest.fn(),
    createAndGenerateExams: jest.fn(),
  },
}));

import path from 'path';

const featurePath = path.join(__dirname, '../../../../tests/features/ai-correction-gui.feature');
const feature = loadFeature(featurePath);

defineFeature(feature, (test) => {
  // Aumenta o timeout para testes de GUI
  jest.setTimeout(15000);

  const mockTriggerAICorrection = AICorrectionService.triggerAICorrection as jest.MockedFunction<typeof AICorrectionService.triggerAICorrection>;
  const mockGetExamsForClass = ExamsService.getExamsForClass as jest.MockedFunction<typeof ExamsService.getExamsForClass>;
  const mockGetStudentsWithExamsForClass = ExamsService.getStudentsWithExamsForClass as jest.MockedFunction<typeof ExamsService.getStudentsWithExamsForClass>;

  const classId = 'Engenharia de Software e Sistemas-2025-1';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock das chamadas de API
    mockGetExamsForClass.mockResolvedValue({
      data: [
        { id: 1, title: 'Requisitos', classId: classId },
        { id: 2, title: 'Gerência', classId: classId }
      ]
    });

    mockGetStudentsWithExamsForClass.mockResolvedValue({
      data: [
        {
          studentName: 'João Silva',
          examID: 1,
          qtdAberta: 2,
          qtdFechada: 3,
          ativo: 'Sim',
          questions: []
        }
      ]
    });
  });

  test('Attempt to Confirm Without Selecting Any Model', ({ given, when, then, and }) => {
    given(/^teacher "(.*)" is viewing the exam "(.*)"$/, (teacherName, examName) => {
      // Renderiza o componente com a rota correta usando Routes
      const route = `/exam/${encodeURIComponent(classId)}`;
      
      act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routerElement = React.createElement(
          MemoryRouter as any,
          { initialEntries: [route] },
          React.createElement(
            Routes as any,
            {},
            React.createElement(Route as any, { path: '/exam/:id', element: React.createElement(ExamPage) })
          )
        );
        render(routerElement);
      });
    });

    when(/^the teacher asks the system to grade the open questions in the exam "(.*)" without selecting any model$/, 
      async (examName) => {
        const user = userEvent.setup();
        
        // Aguarda o componente carregar e a API ser chamada
        await waitFor(() => {
          expect(mockGetExamsForClass).toHaveBeenCalledWith(classId);
        }, { timeout: 10000 });

        // Aguarda o componente terminar de carregar (sem texto "Carregando...")
        await waitFor(() => {
          const loadingText = screen.queryByText(/carregando/i);
          return loadingText === null;
        }, { timeout: 10000 });

        // Encontra e clica no botão "Corrigir com IA"
        const correctButton = await screen.findByRole('button', { name: /corrigir com ia/i }, { timeout: 10000 });
        expect(correctButton).toBeInTheDocument();
        expect(correctButton).not.toBeDisabled();
        await user.click(correctButton);

        // Aguarda o modal de seleção de modelo aparecer
        await waitFor(() => {
          const modalTitle = screen.getByText(/selecionar modelo de ia/i);
          expect(modalTitle).toBeInTheDocument();
        }, { timeout: 5000 });

        // Tenta confirmar sem selecionar um modelo
        const confirmButton = screen.getByRole('button', { name: /confirmar/i });
        expect(confirmButton).toBeInTheDocument();
        await user.click(confirmButton);
      }
    );

    then(/^the system displays a validation error message "(.*)"$/, async (expectedMessage) => {
      // Aguarda a mensagem de erro aparecer
      await waitFor(() => {
        const errorMessage = screen.getByText(expectedMessage);
        expect(errorMessage).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    and(/^the correction process is not initiated$/, async () => {
      // Verifica que o serviço de correção NÃO foi chamado
      expect(mockTriggerAICorrection).not.toHaveBeenCalled();
      
      // Verifica que o modal de sucesso NÃO aparece
      expect(screen.queryByText(/correção iniciada com sucesso/i)).not.toBeInTheDocument();
    });
  });
});

