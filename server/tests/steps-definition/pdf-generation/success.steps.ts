import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import app from '../../../src/server'; 
import * as dataService from '../../../src/services/dataService';

const feature = loadFeature('./tests/features/pdf-generation/success.feature');

jest.mock('../../../src/services/dataService');

defineFeature(feature, (test) => {
  let response: request.Response;

  const mockQuestionsDB = [
    { id: 1, question: 'Q1', type: 'open', topic: 'Test' },
    { id: 2, question: 'Q2', type: 'closed', topic: 'Test', options: [{id: 1, option: 'A', isCorrect: true}] }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Gerar ZIP de provas com sucesso e verificar integridade', ({ given, when, then, and }) => {
      
      given(/^o DataService possui uma turma "(.*)" com id "(.*)"$/, () => {});

      given(/^o DataService possui uma prova "(.*)" com id "(.*)" vinculada à turma "(.*)" contendo (\d+) questões$/, 
        (examName: string, examId: string, classId: string, questionsCountStr: string) => {
          
          const qCount = parseInt(questionsCountStr);
          (dataService.getExamsForClass as jest.Mock).mockReturnValue([{
              id: parseInt(examId),
              title: examName,
              classId: classId,
              openQuestions: qCount > 0 ? 1 : 0,
              closedQuestions: qCount > 1 ? 1 : 0,
              questions: [1, 2].slice(0, qCount)
          }]);

          (dataService.getQuestionsByIds as jest.Mock).mockReturnValue(mockQuestionsDB);
          (dataService.shuffleArray as jest.Mock).mockImplementation((arr) => arr);
          (dataService.getNextGenerationId as jest.Mock).mockReturnValue("1");
          (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
      });

      when(/^uma requisição "(.*)" for enviada para "(.*)" com query params:$/, async (method: string, url: string, table: any[]) => {
        const queryParams: Record<string, any> = {};
        table.forEach((row: any) => {
          if (row.classId) queryParams['classId'] = row.classId;
          if (row.quantity) queryParams['quantity'] = row.quantity;
        });
        if (method === 'GET') {
          response = await request(app).get(url).query(queryParams); 
        }
      });

      then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
        expect(response.status).toBe(parseInt(statusCode));
      });

      and(/^o header "(.*)" deve ser "(.*)"$/, (headerName: string, headerValue: string) => {
        expect(response.header[headerName.toLowerCase()]).toBe(headerValue);
      });
      
      and(/^o header "(.*)" deve conter "(.*)"$/, (headerName: string, headerValue: string) => {
        expect(response.header[headerName.toLowerCase()]).toContain(headerValue);
      });

      and(/^o sistema deve registrar uma nova geração no histórico com (\d+) versões para a prova "(.*)"$/, 
        (versionsCount: string, examId: string) => {
          expect(dataService.addExamGeneration).toHaveBeenCalledTimes(1);
          const callArgs = (dataService.addExamGeneration as jest.Mock).mock.calls[0][0];
          expect(callArgs.examId).toBe(parseInt(examId));
          expect(callArgs.versions).toHaveLength(parseInt(versionsCount));
      });
  });
});