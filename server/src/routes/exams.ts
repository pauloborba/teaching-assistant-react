import { Router, Request, Response } from "express";
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { Readable } from 'stream';

import {
  getStudentsWithExamsForClass,
  getExamsForClass,
  addExam,
  triggerSaveExams,
  generateStudentExams,
  getQuestionById,
  getQuestionsByTopic,
  addExamGeneration,
  getGenerationsForExam,
  ExamGenerationRecord,
  ExamVersionMap,
  shuffleArray,
  getQuestionsByIds,
  QuestionRecord     
} from "../services/dataService";

const formatDateExtended = (dateString: string) => {
  if (!dateString) return '___ de _________________ de ______';
  
  try {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return date.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
      });
  } catch (e) {
      return dateString;
  }
};

const router = Router();

/**
 * Gera o documento PDF (Visual)
 */
const generateExamPDF = (
    className: string,
    teacherName: string,
    examTitle: string,
    versionNumber: number, 
    questions: QuestionRecord[], 
    isGabarito: boolean,
    dateString: string
): InstanceType<typeof PDFDocument> => {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true }); 
  const FONT_REGULAR = 'Times-Roman'; 
  const FONT_BOLD = 'Times-Bold';

  doc.font(FONT_REGULAR);

  doc.fontSize(16);
  doc.text(className, { align: 'center' });
  doc.text(examTitle, { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text(teacherName, { align: 'center' });
  doc.text('Centro de Informática', { align: 'center' });
  doc.text('Universidade Federal de Pernambuco', { align: 'center' });
  doc.moveDown(0.5);

  doc.text(dateString, { align: 'center' });
  doc.moveDown(2);

  if (!isGabarito) {
      doc.font(FONT_BOLD).fontSize(11);
      doc.text(
          'Em cada questão a seguir, some os valores das afirmações que você considera corretas e escreva o resultado da soma no espaço indicado. Todas as questões têm o mesmo peso.',
          { align: 'justify' }
      );
      doc.moveDown(2);
  } else {
      doc.font(FONT_BOLD).fontSize(14).text('GABARITO OFICIAL', { align: 'center', underline: true });
      doc.moveDown(2);
  }

  doc.font(FONT_REGULAR).fontSize(12);

  questions.forEach((q, index) => {
    if (doc.y > 650) doc.addPage();

    doc.font(FONT_BOLD).text(`Questão ${index + 1}.`, { continued: true });
    doc.font(FONT_REGULAR).text(` ${q.question}`, { align: 'justify' });
    doc.moveDown(0.5);

    if (q.type === 'closed' && q.options) {
        q.options.forEach((opt, idx) => {
            if (doc.y > 720) doc.addPage();

            const letra = String.fromCharCode(65 + idx);
            const isRight = isGabarito && opt.isCorrect;

            if (isRight) {
                doc.font(FONT_BOLD).text(`(X) ${letra}) ${opt.option}`);
                doc.font(FONT_REGULAR);
            } else {
                doc.text(`( ) ${letra}) ${opt.option}`);
            }
        });
        doc.moveDown(1.5);
    } else {
        if (isGabarito) {
            doc.font(FONT_BOLD).text('Resposta Esperada:', { underline: true });
            doc.font(FONT_REGULAR).text(q.answer || 'Sem resposta cadastrada.');
            doc.moveDown(1.5);
        } else {
            // Verifica espaço para as linhas de resposta
            if (doc.y > 600) doc.addPage();

            doc.moveDown(0.5);
            doc.font(FONT_BOLD).text('Resposta:');
            doc.moveDown(0.2);
            
            const linhas = 5;
            for(let l = 0; l < linhas; l++) {
                 doc.font(FONT_REGULAR).text('__________________________________________________________________________');
                 doc.moveDown(0.3);
            }
            doc.moveDown(1.5);
        }
    }
  });

  if (!isGabarito) {
      if (doc.y > 700) doc.addPage();
      
      doc.moveDown(2);
      doc.font(FONT_BOLD).fontSize(12);
      doc.text('Aluno(a): _______________________________________________________________', { align: 'center' });
  }

  const range = doc.bufferedPageRange(); 
  for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i); 

      const oldBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const bottom = doc.page.height - 30;
      const right = doc.page.width - 50;
      
      doc.font(FONT_REGULAR).fontSize(10);
      const text = `Tipo de Prova: ${versionNumber}`;
      const width = doc.widthOfString(text);
      
      doc.text(text, right - width, bottom, { 
          lineBreak: false 
      });

      doc.page.margins.bottom = oldBottomMargin;
  }

  return doc;
};


const handleGetExamZIP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; 
    const { classId, date } = req.query; 
    const quantity = parseInt(req.query.quantity as string, 10);

    if (isNaN(quantity) || quantity <= 0) return res.status(400).json({ error: 'Quantidade inválida.' });
    if (!classId || typeof classId !== 'string') return res.status(400).json({ error: 'classId é obrigatório.' });

    const allExams = getExamsForClass(classId);
    const examIdNum = parseInt(id, 10); 
    const examDef = allExams.find(e => e.id === examIdNum);

    if (!examDef) return res.status(404).json({ error: 'Prova não encontrada.' });
    if (!examDef.questions || examDef.questions.length === 0) {
        return res.status(400).json({ error: 'Esta prova não possui questões vinculadas.' });
    }

    const className = "Engenharia de Software e Sistemas"; 
    const teacherName = "Paulo Borba"; 

    const formattedDate = formatDateExtended(date as string);

    const timestamp = new Date();
    const generationId = `${examIdNum}-${timestamp.getTime()}`; 
    
    const newGenerationRecord: ExamGenerationRecord = {
        id: generationId,
        examId: examIdNum,
        classId: classId,
        timestamp: timestamp.toISOString(),
        description: `Lote gerado em ${timestamp.toLocaleString('pt-BR')} (${quantity} provas)`,
        versions: [] 
    };

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Lote_${examDef.title}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const originalQuestionsPool = getQuestionsByIds(examDef.questions);

    for (let i = 1; i <= quantity; i++) {
        
        // Deep copy das questões para poder embaralhar
        let versionQuestions: QuestionRecord[] = JSON.parse(JSON.stringify(originalQuestionsPool));
        versionQuestions = shuffleArray(versionQuestions);
        
        versionQuestions.forEach(q => {
            if (q.type === 'closed' && q.options && q.options.length > 0) {
                q.options = shuffleArray(q.options);
            }
        });

        const docProva = generateExamPDF(
            className, 
            teacherName, 
            examDef.title, 
            i, 
            versionQuestions, 
            false,
            formattedDate
        );
        archive.append(docProva as unknown as Readable, { name: `Provas/Prova_Tipo_${i}.pdf` });
        docProva.end();

        const docGabarito = generateExamPDF(
            className, 
            teacherName, 
            examDef.title, 
            i, 
            versionQuestions, 
            true,
            formattedDate
        );
        archive.append(docGabarito as unknown as Readable, { name: `Gabaritos/Gabarito_Tipo_${i}.pdf` });
        docGabarito.end();

        const mapEntry: ExamVersionMap = {
            versionNumber: i,
            questions: versionQuestions.map((q, idx) => {
                let gabarito = '';
                if (q.type === 'closed' && q.options) {
                    const indexCorreta = q.options.findIndex(opt => opt.isCorrect);
                    gabarito = indexCorreta >= 0 ? String.fromCharCode(65 + indexCorreta) : '?';
                } else {
                    gabarito = q.answer || 'Dissertativa';
                }
                return {
                    numero: idx + 1,
                    questionId: q.id,
                    type: q.type,
                    rightAnswer: gabarito
                };
            })
        };
        newGenerationRecord.versions.push(mapEntry);
    }

    addExamGeneration(newGenerationRecord);
    archive.finalize();

  } catch (error: any) {
    console.error('Erro na rota ZIP:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message || 'Erro interno.' });
  }
};

const handleGetGenerations = (req: Request, res: Response) => {
    const { id } = req.params;
    const { classId } = req.query;
    if (!classId) return res.status(400).json({ error: 'classId required' });
    const generations = getGenerationsForExam(parseInt(id, 10), classId as string);
    generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(generations);
};

router.get("/students", (req: Request, res: Response) => {
  try {
    const { classId, examId } = req.query;
    if (!classId || typeof classId !== "string") {
      return res.status(400).json({ error: "classId is required and must be a string" });
    }

    let examIdNum: number | undefined;
    if (examId) {
      examIdNum = parseInt(examId as string, 10);
      if (isNaN(examIdNum)) {
        return res.status(400).json({ error: "examId must be a valid number" });
      }
    }

    const studentsWithExams = getStudentsWithExamsForClass(classId, examIdNum);

    if (studentsWithExams.length === 0) {
      return res.status(200).json({
        message: "No students found",
        classId: classId,
        examId: examIdNum || "all",
        total: 0,
        data: [],
      });
    }

    const tableData = studentsWithExams.map(studentData => {
      const examDef = getExamsForClass(classId).find(e => e.id === studentData.examId);
      if (!examDef) return null;

      const examQuestions = studentData.answers
        .map((a: { questionId: number; answer: any; }) => {
          const q = getQuestionById(a.questionId);
          if (!q) return null;
          return {
            idQuestion: q.id,
            tipoQuestao: q.type === "open" ? "Aberta" : "Fechada",
            textoPergunta: q.question,
            respostaAluno: a.answer,
          };
        })
        .filter(Boolean);

      return {
        studentName: studentData.studentName,
        examID: studentData.examId,
        qtdAberta: examDef.openQuestions,
        qtdFechada: examDef.closedQuestions,
        ativo: "Sim",
        details: examQuestions,
      };
    }).filter(Boolean);

    res.status(200).json({
      message: "Success",
      classId: classId,
      examId: examIdNum || "all",
      total: tableData.length,
      data: tableData,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/class/:classId", (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const exams = getExamsForClass(classId);
    if (exams.length === 0) {
      return res.status(404).json({ message: "No exams found", classId, data: [] });
    }
    res.status(200).json({ message: "Success", classId, total: exams.length, data: exams });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:examId/generate", (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { classId } = req.query;
    if (!examId) return res.status(400).json({ error: "examId required" });

    const examIdNum = parseInt(examId, 10);
    if (isNaN(examIdNum)) return res.status(400).json({ error: "Invalid examId" });
    if (!classId || typeof classId !== "string") return res.status(400).json({ error: "classId required" });

    const generatedExams = generateStudentExams(examIdNum, classId);
    res.status(201).json({ message: "Generated", examId: examIdNum, classId, totalGenerated: generatedExams.length, data: generatedExams });
  } catch (error) {
    console.error("Error generating:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/:id/zip', handleGetExamZIP);
router.get('/:id/generations', handleGetGenerations);

router.post("/", (req: Request, res: Response) => {
  try {
    const {
      codigoProva,
      nomeProva,
      classId,
      tema,
      quantidadeAberta,
      quantidadeFechada,
    } = req.body;

    if (!codigoProva || typeof codigoProva !== "string") return res.status(400).json({ error: "codigoProva required" });
    if (!nomeProva || typeof nomeProva !== "string") return res.status(400).json({ error: "nomeProva required" });
    if (!classId || typeof classId !== "string") return res.status(400).json({ error: "classId required" });
    if (!tema || typeof tema !== "string") return res.status(400).json({ error: "tema required" });
    if (quantidadeAberta === undefined || quantidadeAberta < 0) return res.status(400).json({ error: "qtdAberta invalid" });
    if (quantidadeFechada === undefined || quantidadeFechada < 0) return res.status(400).json({ error: "qtdFechada invalid" });
    if (quantidadeAberta === 0 && quantidadeFechada === 0) return res.status(400).json({ error: "At least one question required" });

    const allExams = getExamsForClass(classId);
    if (allExams.some((exam) => exam.id.toString() === codigoProva)) {
      return res.status(409).json({ error: "Exam code exists" });
    }

    const examId = parseInt(codigoProva, 10) || Date.now();

    // Get questions by topic (tema)
    const questionsByTopic = getQuestionsByTopic(tema);
    
    if (questionsByTopic.length === 0) return res.status(400).json({ error: `No questions for topic: ${tema}` });

    const openQuestionsAvailable = questionsByTopic.filter(q => q.type === 'open').length;
    const closedQuestionsAvailable = questionsByTopic.filter(q => q.type === 'closed').length;

    if (openQuestionsAvailable < quantidadeAberta) return res.status(400).json({ error: `Not enough open questions` });
    if (closedQuestionsAvailable < quantidadeFechada) return res.status(400).json({ error: `Not enough closed questions` });

    const newExam = {
      id: examId,
      classId: classId,
      title: nomeProva,
      isValid: true,
      openQuestions: quantidadeAberta,
      closedQuestions: quantidadeFechada,
      questions: questionsByTopic.map(q => q.id), // All question IDs from this topic
    };

    addExam(newExam);
    triggerSaveExams();

    res.status(201).json({ message: "Exam created", data: newExam });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;