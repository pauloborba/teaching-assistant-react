import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import archiver from 'archiver'
import { Readable } from 'stream';

const FONT_REGULAR = 'Times-Roman'; 
const FONT_BOLD = 'Times-Bold';

const router = Router();

const mockExams = [
  { id: 'exam-id-123', title: 'Prova1_ESS', questions: ['O que é Engenharia de Software?', 'O que é um Requisito?'] },
  { id: 'exam-id-456', title: 'Prova de Teste (Aluno)', questions: ['...'] },
  { id: 'exam-final-vazia', title: 'Prova_final_vazia', questions: [] },
];

const findExamById = async (id: string) => {
  return mockExams.find(exam => exam.id === id);
};

const generateExamPDF = (exam: any, copyNumber: number): InstanceType<typeof PDFDocument> => {
  const doc = new PDFDocument();

  doc.font(FONT_REGULAR);

  doc.fontSize(20).text(`${exam.title}`, { align: 'center' });
  doc.moveDown(0.5);

  if (copyNumber > 0) {
      doc.fontSize(12).text(`Versão: ${copyNumber}`, { align: 'right' });
  }

  doc.fontSize(11).text('Paulo Borba', { align: 'center' });
  doc.moveDown(0.3);


  doc.fontSize(11).text('Centro de Informática', { align: 'center' });
  doc.moveDown(0.3);

  doc.fontSize(11).text('Universidade Federal de Pernambuco', { align: 'center' });
  doc.moveDown(0.3);

  doc.fontSize(11).text('___ de _________ de ______', { align: 'center' });
  doc.moveDown(2);

  exam.questions.forEach((q: string, index: number) => {
    doc.fontSize(14).text(`${index + 1}. ${q}`);
    doc.moveDown();
  });

  return doc;
}

const handleGetExamPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await findExamById(id);
    
    if (!exam) {
      return res.status(404).json({ error: 'Prova não encontrada.' });
    }
    
    if (exam.questions.length === 0) {
       return res.status(400).json({ error: 'Não pode exportar prova vazia.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}.pdf"`);

    const doc = generateExamPDF(exam, 0);

    doc.pipe(res);
    doc.end();

  } catch (error: any) {
    console.error('Erro ao gerar PDF da prova:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const handleGetExamZIP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quantity = parseInt(req.query.quantity as string, 10)

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade inválida.' });
    }
    
    const exam = await findExamById(id);
    if (!exam) {
      return res.status(404).json({ error: 'Prova não encontrada.' });
    }
    
    if (exam.questions.length === 0) {
       return res.status(400).json({ error: 'Não pode exportar prova vazia.' });
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}_${quantity}_versions.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (let i = 1; i <= quantity; i++) {
      const doc = generateExamPDF(exam, i);
      archive.append(doc as unknown as Readable, { name: `${exam.title}_Versao_${i}.pdf` });
      doc.end();
    }
    archive.finalize();
  } catch (error: any) {
    console.error('Erro ao gerar ZIP de PDFs da prova:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
router.get(
  '/:id/pdf',
  handleGetExamPDF
);

router.get(
  '/:id/zip',
  handleGetExamZIP
);

export default router;