import request from 'supertest';
import app from '../../src/server';
import AdmZip from 'adm-zip';
import { getDocument } from 'pdfjs-dist';

// ------------------ FUNÇÃO DIRETA NO TESTE ------------------
async function extractPdfText(buffer: Buffer): Promise<string> {
    const pdf = await getDocument({ data: buffer }).promise;
    let text = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        text += content.items.map((i: any) => i.str).join(' ') + '\n';
    }

    return text;
}
// ------------------------------------------------------------

describe('Integration: Verificação de Conteúdo do PDF', () => {

    let baseUrl = '/exams';
    let validExamId: string | undefined;
    const classId = 'Engenharia de Software e Sistemas-2025-1';

    beforeAll(async () => {
        let resProvas = await request(app).get(`/exams/class/${classId}`);

        if (resProvas.status === 404) {
            baseUrl = '/api/exams';
            resProvas = await request(app).get(`${baseUrl}/class/${classId}`);
        }

        if (resProvas.status === 200 && resProvas.body.data?.length > 0) {
            validExamId = resProvas.body.data[0].id;
        }
    });

    it('deve gerar o PDF contendo data formatada, nome do professor e instituição', async () => {
        if (!validExamId) return;

        const inputDate = '2025-12-25';
        const expectedFormattedDate = '25 de dezembro de 2025';

        const response = await request(app)
            .get(`${baseUrl}/${validExamId}/zip`)
            .query({ 
                classId, 
                quantity: 1,
                date: inputDate 
            })
            .buffer()
            .parse((res, callback) => {
                res.setEncoding('binary');
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => callback(null, Buffer.from(data, 'binary')));
            })
            .expect(200);

        const zip = new AdmZip(response.body);
        const pdfEntry = zip.getEntries().find(e =>
            e.entryName.toLowerCase().endsWith('.pdf')
        );

        const pdfBuffer = pdfEntry!.getData();
        const pdfText = await extractPdfText(pdfBuffer);

        expect(pdfText).toContain(expectedFormattedDate);
        expect(pdfText).toContain('Universidade Federal de Pernambuco');
        expect(pdfText).toContain('Paulo Borba');
        expect(pdfText).toMatch(/Quest.o\s+1/i);
    });

    it('deve retornar erro 400 se a data enviada for inválida', async () => {
        const id = validExamId || '1';

        await request(app)
            .get(`${baseUrl}/${id}/zip`)
            .query({ classId, quantity: 1, date: '2023-02-30' })
            .expect(400);
    });
});
