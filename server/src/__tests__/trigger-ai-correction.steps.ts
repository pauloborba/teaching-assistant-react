import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { Response } from 'supertest';
import express, { Express } from 'express';
import { createTestApp } from './helpers/test-app';

const feature = loadFeature('./src/__tests__/features/trigger-ai-correction.feature');

defineFeature(feature, (test) => {
  let app: Express;
  let response: Response;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Falhar ao iniciar correção quando classId não é fornecido', ({ given, when, then, and }) => {
    when(/^uma requisição "(.*)" for enviada para "(.*)" com body contendo apenas model "(.*)"$/, 
      async (method: string, endpoint: string, model: string) => {
        const body = { model };
        response = await request(app)
          .post(endpoint)
          .send(body)
          .set('Content-Type', 'application/json');
      }
    );

    then(/^o status da resposta deve ser "(.*)"$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10));
    });

    and(/^o JSON da resposta deve conter error "(.*)"$/, (expectedError: string) => {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe(expectedError);
    });
  });
});

