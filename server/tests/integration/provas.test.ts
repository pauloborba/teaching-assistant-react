import { defineFeature, loadFeature } from 'jest-cucumber';
import { expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';

const feature = loadFeature('./tests/features/provas-individuais-backend.feature');

defineFeature(feature, (test) => {

    test('Registering an exam', ({ given, and, when, then }) => {
        let examPayload: any = {};
        let response: any;

        given(/^the system receives a request to register the exam "(.*)" in the class "(.*)"$/, (examName, className) => {
            examPayload = {
                nomeProva: examName,
                classId: className,
                // Default values that will be overwritten or supplemented
                quantidadeAberta: 0,
                quantidadeFechada: 0,
                questionIds: []
            };
        });

        and(/^the request contains the questions "(.*)" and "(.*)" and "(.*)" and "(.*)" and "(.*)"$/, (q1, q2, q3, q4, q5) => {
            const questions = [q1, q2, q3, q4, q5].map(q => parseInt(q));
            examPayload.questionIds = questions;
            examPayload.quantidadeFechada = 3;
            examPayload.quantidadeAberta = 2;
        });

        when('the system validates the rules', async () => {
            response = await request(app)
                .post('/api/exams')
                .send(examPayload)
                .set('Content-Type', 'application/json');
        });

        then(/^the system creates the exam "(.*)" with the questions "(.*)" and "(.*)" and "(.*)" and "(.*)" and "(.*)"$/, (examName, q1, q2, q3, q4, q5) => {
            expect(response.status).toBe(201);
            expect(response.body.data.title).toBe(examName);
            const expectedQuestions = [q1, q2, q3, q4, q5].map(q => parseInt(q));
            expect(response.body.data.questions).toEqual(expect.arrayContaining(expectedQuestions));
        });

        and(/^the exam "(.*)" becomes available for the generation of individual versions$/, (examName) => {
            expect(response.body.data.isValid).toBe(true);
            // Additionally check if it persists / is retrievable
            // const check = await request(app).get...
        });
    });

    test('Deleting an exam', ({ given, when, then, and }) => {
        let createdExamId: number;
        let classId: string;
        let deleteResponse: any;

        given(/^the system receives a request to delete the exam "(.*)" from the class "(.*)"$/, async (examName, className) => {
            // First, creating the exam to be deleted
            const examPayload = {
                nomeProva: examName,
                classId: className,
                quantidadeAberta: 2,
                quantidadeFechada: 3,
                questionIds: [1, 2, 3, 4, 5]
            };

            const createResponse = await request(app)
                .post('/api/exams')
                .send(examPayload)
                .set('Content-Type', 'application/json');

            expect(createResponse.status).toBe(201);
            createdExamId = createResponse.body.data.id;
            classId = className;
        });

        when('the system validates the rules', async () => {
            deleteResponse = await request(app)
                .delete(`/api/exams/${createdExamId}?classId=${classId}`);
        });

        then(/^the system deletes the exam "(.*)"$/, (arg0) => {
            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.message).toBe("Exam deleted successfully");
        });

        and(/^the exam "(.*)" is no longer available for the generation of individual versions$/, async (arg0) => {
            const getResponse = await request(app).get(`/api/exams/${createdExamId}/zip?classId=Engenharia de Software e Sistemas-2025-1&quantity=1`);
            // Expecting failure or not found since it was deleted.
            // The zip endpoint might return 404 if exam not found.
            expect(getResponse.status).toBe(404);
        });
    });

    test('Retrieving all exams for a specific class', ({ given, when, then }) => {
        let savedExams: any[] = [];
        let response: any;

        given(/^the class "(.*)" has exams "(.*)" and "(.*)"$/, async (className, exam1, exam2) => {
            // Helper to create exam
            const createExam = async (name: string) => {
                const payload = {
                    nomeProva: name,
                    classId: className,
                    quantidadeAberta: 1,
                    quantidadeFechada: 1,
                    questionIds: [1, 2, 3, 4]
                };
                return request(app).post('/api/exams').send(payload);
            };

            await createExam(exam1);
            await createExam(exam2);
        });

        when(/^the system requests all exams for class "(.*)"$/, async (className) => {
            response = await request(app).get(`/api/exams/class/${className}`);
        });

        then(/^the system returns a list containing "(.*)" and "(.*)"$/, (exam1, exam2) => {
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ title: exam1 }),
                    expect.objectContaining({ title: exam2 })
                ])
            );
        });
    });

    test('Retrieving exams for a class that has no exams', ({ given, when, then, and }) => {
        let response: any;

        given(/^the class "(.*)" exists but has no exams registered$/, (className) => {
            // We assume this class has no exams. 
            // If state is persistent, we might need to ensure it's empty, but sticking to "happy path" assumption for now.
        });

        when(/^the system requests all exams for class "(.*)"$/, async (className) => {
            response = await request(app).get(`/api/exams/class/${className}`);
        });

        then('the system returns an empty list', () => {
            expect(response.status).toBe(404);
            expect(response.body.data).toEqual([]);
        });

        and(/^records the message "(.*)"$/, (msg) => {
            expect(response.body.message).toBe(msg);
        });
    });

    test('Creating an exam with missing required fields', ({ given, when, then, and }) => {
        let payload: any = {};
        let response: any;

        given(/^the request to create an exam is missing the "(.*)" field$/, (field) => {
            // Create a payload but omit the specified field
            payload = {
                nomeProva: "Prova Teste",
                classId: "Engenharia de Software e Sistemas-2025-1",
                quantidadeAberta: 2,
                quantidadeFechada: 3,
                questionIds: [1, 2, 3, 4, 5]
            };
            delete payload[field];
        });

        when('the system validates the rules', async () => {
            response = await request(app)
                .post('/api/exams')
                .send(payload)
                .set('Content-Type', 'application/json');
        });

        then('the system rejects the creation of the exam', () => {
            expect(response.status).toBe(400); // Bad Request
        });

        and(/^records the message "(.*)"$/, (msg) => {
            expect(response.body.error).toBe(msg); // Note: Server returns { error: "..." }, not { message: "..." } for 400s usually
        });
    });

    test('Creating an exam for a non-existent class', ({ given, and, when, then }) => {
        let payload: any = {};
        let response: any;

        given(/^the class "(.*)" does not exist$/, (className) => {
            // No-op: We assume the class does not exist. 
            // Ideally we could ensure it doesn't, but for now we rely on the name being unique/unused.
        });

        and(/^the request to create the exam "(.*)" specifies class "(.*)"$/, (examTitle, className) => {
            payload = {
                nomeProva: examTitle,
                classId: className,
                quantidadeAberta: 2,
                quantidadeFechada: 3,
                questionIds: [1, 2, 3, 4, 5]
            };
        });

        when('the system validates the rules', async () => {
            response = await request(app)
                .post('/api/exams')
                .send(payload)
                .set('Content-Type', 'application/json');
        });

        then(/^the system rejects the creation of the exam "(.*)"$/, (examTitle) => {
            expect(response.status).toBe(400);
        });

        and(/^records the message "(.*)"$/, (msg) => {
            expect(response.body.error).toBe(msg);
        });
    });

    test('Attempting to delete a non-existent exam', ({ given, when, then, and }) => {
        let response: any;
        let classId: string;
        let examIdToDelete: string;

        given(/^the exam "(.*)" does not exist$/, (examId) => {
            examIdToDelete = examId;
        });

        and(/^the request to delete the exam "(.*)" specifies class "(.*)"$/, (examId, className) => {
            classId = className;
        });

        when('the system validates the rules', async () => {
            response = await request(app).delete(`/api/exams/${examIdToDelete}?classId=${classId}`);
        });

        then('the system returns an error indicating the exam was not found', () => {
            expect(response.status).toBe(404);
        });

        and(/^records the message "(.*)"$/, (msg) => {
            expect(response.body.error).toBe(msg);
        });
    });
});
