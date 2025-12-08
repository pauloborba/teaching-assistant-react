import { loadFeature, defineFeature } from 'jest-cucumber';
import request from 'supertest';
import app from '../../../src/server'; 
import * as dataService from '../../../src/services/dataService';

const feature = loadFeature('./tests/features/pdf-generation/validation.feature');

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

  // --- CENÁRIO 1: PROVA SEM QUESTÕES ---
  test('Tentar gerar ZIP de uma prova que não possui questões', ({ given, when, then, and }) => {
      
      given(/^o DataService possui uma turma "(.*)" com id "(.*)"$/, (name, id) => {
          
      });

      given(/^o DataService possui uma prova "(.*)" com id "(.*)" vinculada à turma "(.*)" contendo (\d+) questões$/, 
        (examName, examId, classId, questionsCountStr) => {
          
          (dataService.getExamsForClass as jest.Mock).mockReturnValue([{
              id: parseInt(examId),
              title: examName,
              classId: classId,
              openQuestions: 0,
              closedQuestions: 0,
              questions: []
          }]);

          (dataService.getQuestionsByIds as jest.Mock).mockReturnValue(mockQuestionsDB);
          (dataService.shuffleArray as jest.Mock).mockImplementation((arr) => arr);
          (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
      });

      when(/^uma requisição "(.*)" for enviada para "(.*)" com query params:$/, async (method, url, table) => {
        const queryParams: Record<string, any> = {};
        table.forEach((row: any) => {
           if (row.classId) queryParams['classId'] = row.classId;
           if (row.quantity) queryParams['quantity'] = row.quantity;
        });
        if (method === 'GET') {
          response = await request(app).get(url).query(queryParams); 
        }
      });

      then(/^o status da resposta deve ser "(.*)"$/, (statusCode) => {
        expect(response.status).toBe(parseInt(statusCode));
      });

      and(/^o JSON da resposta deve conter a mensagem de erro "(.*)"$/, (errorMessage) => {
          expect(response.body).toEqual(expect.objectContaining({ error: errorMessage }));
      });

      and('o sistema não deve registrar nada no histórico', () => {
          expect(dataService.addExamGeneration).not.toHaveBeenCalled();
      });
  });

  // --- CENÁRIO 2: QUANTIDADE INVÁLIDA ---
  test('Tentar gerar ZIP com quantidade inválida (Zero)', ({ given, when, then, and }) => {
      
      given(/^o DataService possui uma turma "(.*)" com id "(.*)"$/, () => {});

      given(/^o DataService possui uma prova "(.*)" com id "(.*)" vinculada à turma "(.*)" contendo (\d+) questões$/, 
        (examName, examId, classId, questionsCountStr) => {
          
          (dataService.getExamsForClass as jest.Mock).mockReturnValue([{
              id: parseInt(examId),
              title: examName,
              classId: classId,
              openQuestions: 1,
              closedQuestions: 1,
              questions: [1, 2]
          }]);
          
          (dataService.getQuestionsByIds as jest.Mock).mockReturnValue(mockQuestionsDB);
          (dataService.shuffleArray as jest.Mock).mockImplementation((arr) => arr);
          (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
      });

      when(/^uma requisição "(.*)" for enviada para "(.*)" com query params:$/, async (method, url, table) => {
        const queryParams: Record<string, any> = {};
        table.forEach((row: any) => {
           if (row.classId) queryParams['classId'] = row.classId;
           if (row.quantity) queryParams['quantity'] = row.quantity;
        });
        response = await request(app).get(url).query(queryParams); 
      });

      then(/^o status da resposta deve ser "(.*)"$/, (statusCode) => {
        expect(response.status).toBe(parseInt(statusCode));
      });

      and(/^o JSON da resposta deve conter a mensagem de erro "(.*)"$/, (errorMessage) => {
          expect(response.body).toEqual(expect.objectContaining({ error: errorMessage }));
      });

      and('o sistema não deve registrar nada no histórico', () => {
          expect(dataService.addExamGeneration).not.toHaveBeenCalled();
      });
  });

  // --- CENÁRIO 3: TURMA ERRADA ---
  test('Tentar gerar ZIP de uma prova informando a turma errada', ({ given, when, then, and }) => {
      
      given(/^o DataService possui uma turma "(.*)" com id "(.*)"$/, () => {});

      given(/^o DataService possui uma prova "(.*)" com id "(.*)" vinculada à turma "(.*)"$/, 
        (examName, examId, classId) => {
          
          (dataService.getExamsForClass as jest.Mock).mockImplementation((queryClassId) => {
              if (queryClassId === classId) {
                  return [{ id: parseInt(examId), title: examName, classId: classId, questions: [1] }];
              }
              return [];
          });
          
          (dataService.getQuestionsByIds as jest.Mock).mockReturnValue(mockQuestionsDB);
          (dataService.shuffleArray as jest.Mock).mockImplementation((arr) => arr);
          (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
      });

      when(/^uma requisição "(.*)" for enviada para "(.*)" com query params:$/, async (method, url, table) => {
        const queryParams: Record<string, any> = {};
        table.forEach((row: any) => {
           if (row.classId) queryParams['classId'] = row.classId;
           if (row.quantity) queryParams['quantity'] = row.quantity;
        });
        response = await request(app).get(url).query(queryParams); 
      });

      then(/^o status da resposta deve ser "(.*)"$/, (statusCode) => {
        expect(response.status).toBe(parseInt(statusCode));
      });

      and(/^o JSON da resposta deve conter a mensagem de erro "(.*)"$/, (errorMessage) => {
          expect(response.body).toEqual(expect.objectContaining({ error: errorMessage }));
      });

      and('o sistema não deve registrar nada no histórico', () => {
          expect(dataService.addExamGeneration).not.toHaveBeenCalled();
      });
  });

});