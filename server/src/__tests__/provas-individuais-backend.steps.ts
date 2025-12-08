import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { Response } from 'supertest';
import express, { Express } from 'express';
import { createTestApp } from './helpers/test-app';

const feature = loadFeature('./src/__tests__/features/provas-individuais-backend.feature');

defineFeature(feature, (test) => {
  let app: Express;
  let response: Response;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Registering an exam', ({ given, when, then, and }) => {
    let examData: any = {};

    given(/^the system receives a request to register the exam "(.*)"$/, (examName: string) => {
      examData.nomeProva = examName;
    });

    and(/^the rules define "(.*)" and "(.*)"$/, (openQuestions: string, closedQuestions: string) => {
      const openQty = parseInt(openQuestions.split(' ')[0]);
      const closedQty = parseInt(closedQuestions.split(' ')[0]);
      examData.quantidadeAberta = openQty;
      examData.quantidadeFechada = closedQty;
      examData.classId = "Engenharia de Software e Sistemas-2025-1";
      examData.tema = "Requisitos de Software";
    });

    and('the question bank contains enough questions to satisfy these rules', () => {
      // This step verifies a precondition - questions.json should have enough questions
      // The setup.ts file loads the data, so this is just a documentation step
    });

    when('the system validates the rules', async () => {
      response = await request(app)
        .post('/api/exams')
        .send(examData)
        .set('Content-Type', 'application/json');
    });

    then(/^the system creates the exam "(.*)" with the associated rules$/, (examName: string) => {
      if (response.status !== 201) {
        console.log('Error response:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(examName);
      expect(response.body.data.openQuestions).toBe(examData.quantidadeAberta);
      expect(response.body.data.closedQuestions).toBe(examData.quantidadeFechada);
    });

    and(/^the exam "(.*)" becomes available for the generation of individual versions$/, (examName: string) => {
      // Verify the exam was created and is valid
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.classId).toBe(examData.classId);
    });
  });

  test('Deleting an exam', ({ given, when, then, and }) => {
    given(/^the system receives a request to delete the exam "(.*)"$/, (arg0) => {
      // TODO: Implement DELETE route first
      // Currently no DELETE /api/exams/:id route exists
    });

    when('the system validates the rules', () => {
      // TODO: Implement
    });

    then(/^the system deletes the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    and(/^the exam "(.*)" is no longer available for the generation of individual versions$/, (arg0) => {
      // TODO: Implement
    });
  });

  test('Validation of inconsistent rules', ({ given, and, when, then }) => {
    let examData: any = {};
    let validationResponse: Response;

    given(/^the request to create the exam "(.*)" specifies "(.*)"$/, (examName: string, questionSpec: string) => {
      const quantity = parseInt(questionSpec.split(' ')[0]);
      examData = {
        nomeProva: examName,
        quantidadeAberta: quantity,
        quantidadeFechada: 0,
        classId: 'TEST-2024',
        tema: 'Gerência de Projetos', // Topic with limited questions
      };
    });

    and('the question bank does not contain enough open questions', () => {
      // This is a precondition - the topic "Gerência de Projetos" 
      // has only 5 questions total in questions.json
      // We're requesting 20, which exceeds available
    });

    when('the system evaluates the defined rules', async () => {
      validationResponse = await request(app)
        .post('/api/exams')
        .send(examData)
        .set('Content-Type', 'application/json');
    });

    then(/^the system rejects the creation of the exam "(.*)"$/, (examName: string) => {
      expect(validationResponse.status).toBe(400);
      expect(validationResponse.body).toHaveProperty('error');
    });

    and(/^records the message "(.*)"$/, (expectedMessage: string) => {
      // The actual error message should indicate insufficient questions
      expect(validationResponse.body.error).toContain('Not enough');
    });
  });

  test('Question selection according to rules', ({ given, and, when, then }) => {
    given(/^exam "(.*)" has rules defining "(.*)" and "(.*)"$/, (arg0, arg1, arg2) => {
      // TODO: Implement
    });

    and(/^the system is generating an individual version for student "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    when('the system selects the questions', () => {
      // TODO: Implement
    });

    then('it chooses questions from the bank that match the type and quantity required by the rules', () => {
      // TODO: Implement
    });

    and('ensures that the selection strictly follows the criteria defined for the exam', () => {
      // TODO: Implement
    });
  });

  test('Updating exam rules', ({ given, when, then, and }) => {
    given(/^the exam "(.*)" is already registered with rules$/, (arg0) => {
      // TODO: Implement
    });

    when(/^the rules are updated to "(.*)" and "(.*)"$/, (arg0, arg1) => {
      // TODO: Implement
    });

    then(/^the system records the new rules for the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    and('marks previously generated versions as outdated', () => {
      // TODO: Implement
    });

    and('allows future versions to be generated according to the updated rules', () => {
      // TODO: Implement
    });
  });

  test('Retrieving all exams for a specific class', ({ given, when, then }) => {
    given(/^the class "(.*)" has exams "(.*)" and "(.*)"$/, (arg0, arg1, arg2) => {
      // TODO: Implement
    });

    when(/^the system requests all exams for class "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    then(/^the system returns a list containing "(.*)" and "(.*)"$/, (arg0, arg1) => {
      // TODO: Implement
    });
  });

  test('Retrieving exams for a class that has no exams', ({ given, when, then, and }) => {
    given(/^the class "(.*)" exists but has no exams registered$/, (arg0) => {
      // TODO: Implement
    });

    when(/^the system requests all exams for class "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    then('the system returns an empty list', () => {
      // TODO: Implement
    });

    and(/^records the message "(.*)"$/, (arg0) => {
      // TODO: Implement
    });
  });

  test('Creating an exam with missing required fields', ({ given, when, then, and }) => {
    let examData: any = {};
    let createResponse: Response;

    given(/^the request to create an exam is missing the "(.*)" field$/, (missingField: string) => {
      // Create exam data without the specified field
      examData = {
        quantidadeAberta: 2,
        quantidadeFechada: 3,
        classId: 'TEST-2024',
        tema: 'Requisitos de Software',
      };
      // Intentionally omit nomeProva field
    });

    when('the system validates the rules', async () => {
      createResponse = await request(app)
        .post('/api/exams')
        .send(examData)
        .set('Content-Type', 'application/json');
    });

    then('the system rejects the creation of the exam', () => {
      expect(createResponse.status).toBe(400);
      expect(createResponse.body).toHaveProperty('error');
    });

    and(/^records the message "(.*)"$/, (expectedMessage: string) => {
      expect(createResponse.body.error).toContain('nomeProva');
      expect(createResponse.body.error).toContain('required');
    });
  });

  test('Creating an exam with invalid question quantities', ({ given, when, then, and }) => {
    given(/^the request to create the exam "(.*)" specifies "(.*)"$/, (arg0, arg1) => {
      // TODO: Implement
    });

    when('the system validates the rules', () => {
      // TODO: Implement
    });

    then(/^the system rejects the creation of the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    and(/^records the message "(.*)"$/, (arg0) => {
      // TODO: Implement
    });
  });

  test('Creating an exam for a non-existent class', ({ given, and, when, then }) => {
    given(/^the class "(.*)" does not exist$/, (arg0) => {
      // TODO: Implement
    });

    and(/^the request to create the exam "(.*)" specifies class "(.*)"$/, (arg0, arg1) => {
      // TODO: Implement
    });

    when('the system validates the rules', () => {
      // TODO: Implement
    });

    then(/^the system rejects the creation of the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    and(/^records the message "(.*)"$/, (arg0) => {
      // TODO: Implement
    });
  });

  test('Attempting to delete a non-existent exam', ({ given, when, then }) => {
    given(/^the exam "(.*)" does not exist$/, (arg0) => {
      // TODO: Implement
    });

    when(/^the system receives a request to delete the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    then('the system returns an error indicating the exam was not found', () => {
      // TODO: Implement
    });
  });

  test('Attempting to update a non-existent exam', ({ given, when, then }) => {
    given(/^the exam "(.*)" does not exist$/, (arg0) => {
      // TODO: Implement
    });

    when(/^the system receives a request to update the exam "(.*)"$/, (arg0) => {
      // TODO: Implement
    });

    then('the system returns an error indicating the exam was not found', () => {
      // TODO: Implement
    });
  });
});

