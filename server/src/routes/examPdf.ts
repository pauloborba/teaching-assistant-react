import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
const router = Router();

const mockExams = [
  { id: 'exam-id-123', title: 'Prova1_ESS', questions: ['O que é Engenharia de Software?', 'O que é um Requisito?'] },
  { id: 'exam-id-456', title: 'Prova de Teste (Aluno)', questions: ['...'] },
  { id: 'exam-final-vazia', title: 'Prova_final_vazia', questions: [] },
];

const findExamById = async (id: string) => {
  return mockExams.find(exam => exam.id === id);
};

const handleGetExamPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const exam = await findExamById(id);
    console.log(exam);
    if (!exam) {
      return res.status(404).json({ error: 'Prova não encontrada.' });
    }
    
    if (exam.questions.length === 0) {
       return res.status(400).json({ error: 'Não pode exportar prova vazia.' });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}.pdf"`);

    doc.pipe(res);

    doc.fontSize(20).text(exam.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Aluno: _________________________________________');
    doc.moveDown(2);

    exam.questions.forEach((q, index) => {
      doc.fontSize(14).text(`${index + 1}. ${q}`);
      doc.moveDown();
    });

    doc.end();

  } catch (error: any) {
    console.error('Erro ao gerar PDF da prova:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

router.get(
  '/:id/pdf',
  handleGetExamPDF
);

export default router;