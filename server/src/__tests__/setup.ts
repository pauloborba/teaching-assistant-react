// Setup file para Jest
// Este arquivo é executado antes de todos os testes
// Load all data files (questions, exams, etc.) before running tests
import { loadAllData, questions } from '../services/dataService';

beforeAll(() => {
    loadAllData();
    console.log(`Loaded ${questions.length} questions from data files`);
    const reqSoftwareQuestions = questions.filter(q => q.topic === 'Requisitos de Software');
    console.log(`Found ${reqSoftwareQuestions.length} questions for "Requisitos de Software" topic`);
});
// Mock do dotenv para evitar problemas em testes
process.env.NODE_ENV = 'test';
