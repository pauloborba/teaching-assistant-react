import { defineFeature, loadFeature } from 'jest-cucumber';
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
            // Assuming for this scenario they are all closed or open, let's say closed for simplicity 
            // or we adjust based on valid logic. 
            // The previous code snippet used closed=5.
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
        given(/^the system receives a request to delete the exam "(.*)" from the class "(.*)"$/, (arg0, arg1) => { });
        when('the system validates the rules', () => { });
        then(/^the system deletes the exam "(.*)"$/, (arg0) => { });
        and(/^the exam "(.*)" is no longer available for the generation of individual versions$/, (arg0) => { });
    });

    test('Retrieving all exams for a specific class', ({ given, when, then }) => {
        given(/^the class "(.*)" has exams "(.*)" and "(.*)"$/, (arg0, arg1, arg2) => { });
        when(/^the system requests all exams for class "(.*)"$/, (arg0) => { });
        then(/^the system returns a list containing "(.*)" and "(.*)"$/, (arg0, arg1) => { });
    });

    test('Retrieving exams for a class that has no exams', ({ given, when, then, and }) => {
        given(/^the class "(.*)" exists but has no exams registered$/, (arg0) => { });
        when(/^the system requests all exams for class "(.*)"$/, (arg0) => { });
        then('the system returns an empty list', () => { });
        and(/^records the message "(.*)"$/, (arg0) => { });
    });

    test('Creating an exam with missing required fields', ({ given, when, then, and }) => {
        given(/^the request to create an exam is missing the "(.*)" field$/, (arg0) => { });
        when('the system validates the rules', () => { });
        then('the system rejects the creation of the exam', () => { });
        and(/^records the message "(.*)"$/, (arg0) => { });
    });

    test('Creating an exam for a non-existent class', ({ given, and, when, then }) => {
        given(/^the class "(.*)" does not exist$/, (arg0) => { });
        and(/^the request to create the exam "(.*)" specifies class "(.*)"$/, (arg0, arg1) => { });
        when('the system validates the rules', () => { });
        then(/^the system rejects the creation of the exam "(.*)"$/, (arg0) => { });
        and(/^records the message "(.*)"$/, (arg0) => { });
    });

    test('Attempting to delete a non-existent exam', ({ given, when, then }) => {
        given(/^the exam "(.*)" does not exist$/, (arg0) => { });
        when(/^the system receives a request to delete the exam "(.*)"$/, (arg0) => { });
        then('the system returns an error indicating the exam was not found', () => { });
    });
});
