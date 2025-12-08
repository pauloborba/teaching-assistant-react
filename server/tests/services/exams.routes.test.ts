import request from 'supertest';
import app from '../../src/server'; 
import * as dataService from '../../src/services/dataService';
import AdmZip from 'adm-zip';

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

jest.mock('../../src/services/dataService');

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument(uint8Array);
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    return fullText;
}

describe('Service Tests: Exam Generation Routes (Robust)', () => {
    
    const mockExam = {
        id: 100,
        title: 'Prova Final de Teste',
        classId: 'turma-A',
        openQuestions: 1,
        closedQuestions: 1,
        questions: [1, 2]
    };

    const mockQuestions = [
        { id: 1, question: 'Questão Aberta de Teste?', type: 'open', topic: 'T1' },
        { 
            id: 2, 
            question: 'Questão Fechada de Teste?', 
            type: 'closed', 
            topic: 'T1', 
            options: [
                {id: 1, option: 'Opção Errada', isCorrect: false},
                {id: 2, option: 'Opção Certa', isCorrect: true}
            ] 
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (dataService.getExamsForClass as jest.Mock).mockReturnValue([mockExam]);
        (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
        (dataService.shuffleArray as jest.Mock).mockImplementation((arr) => arr);
        (dataService.getQuestionsByIds as jest.Mock).mockReturnValue(mockQuestions);
    });

    it('should generate a valid ZIP containing correct PDFs and content', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ classId: 'turma-A', quantity: 2 })
            .responseType('blob'); 

        expect(response.status).toBe(200);
        expect(response.header['content-type']).toContain('application/zip');
        
        const zip = new AdmZip(response.body);
        const zipEntries = zip.getEntries();
        
        expect(zipEntries.length).toBe(4);
        
        const fileNames = zipEntries.map(entry => entry.entryName);
        expect(fileNames).toContain('Provas/Prova_Tipo_1.pdf');
        expect(fileNames).toContain('Gabaritos/Gabarito_Tipo_1.pdf');

        const provaEntry = zip.getEntry('Provas/Prova_Tipo_1.pdf');
        if (!provaEntry) throw new Error('PDF da prova não encontrado no ZIP');
        
        const text = await extractTextFromPDF(provaEntry.getData());

        expect(text).toContain('Engenharia de Software e Sistemas');
        expect(text).toContain('Paulo Borba');
        expect(text).toContain('Prova Final de Teste');
        expect(text).toContain('Tipo de Prova: 1');
        
        expect(text).toContain('Questão Aberta de Teste');
        expect(text).toContain('Questão Fechada de Teste');
        
        expect(text).not.toContain('(X)'); 
        expect(text).not.toContain('Resposta Esperada');
    });

    it('should generate a GABARITO PDF with correct answers marked', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ classId: 'turma-A', quantity: 1 })
            .responseType('blob');

        const zip = new AdmZip(response.body);
        const gabaritoEntry = zip.getEntry('Gabaritos/Gabarito_Tipo_1.pdf');
        
        if (!gabaritoEntry) throw new Error('Gabarito não encontrado no ZIP');

        const text = await extractTextFromPDF(gabaritoEntry.getData());

        expect(text).toContain('GABARITO OFICIAL');
        expect(text).toContain('(X)'); 
        expect(text).toContain('Opção Certa');
        expect(text).toContain('Resposta Esperada');
    });

    it('should return 400 Bad Request if classId is missing', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ quantity: 5 }); 

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'classId é obrigatório.' });
        expect(dataService.addExamGeneration).not.toHaveBeenCalled();
    });
});