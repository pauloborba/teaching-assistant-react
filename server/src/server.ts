import express, { Request, Response } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation } from './models/Evaluation';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import * as fs from 'fs';
import * as path from 'path';
import { notificarResultadoDisciplina, notificarAlunosEmLote } from './services/gradenotification';
import { notesUpdateSender, notesUpdateBatchSender } from './services/notifications/notes-update-sender';
import { Enrollment } from './models/Enrollment';

// Sistema de controle de notificações (em memória - resetado a cada reinicialização do servidor)
interface NotificationCache {
  [studentCPF: string]: {
    [disciplina: string]: {
      gradeResult?: string; // Data da última notificação de resultado (YYYY-MM-DD)
      gradeUpdate?: string; // Data da última notificação de atualização (YYYY-MM-DD)
    }
  }
}

const notificationCache: NotificationCache = {};

// Função para verificar se uma notificação já foi enviada hoje
const isNotificationSentToday = (studentCPF: string, disciplina: string, type: 'gradeResult' | 'gradeUpdate'): boolean => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  if (!notificationCache[studentCPF]) {
    return false;
  }
  
  if (!notificationCache[studentCPF][disciplina]) {
    return false;
  }
  
  return notificationCache[studentCPF][disciplina][type] === today;
};

// Função para marcar uma notificação como enviada
const markNotificationAsSent = (studentCPF: string, disciplina: string, type: 'gradeResult' | 'gradeUpdate'): void => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  if (!notificationCache[studentCPF]) {
    notificationCache[studentCPF] = {};
  }
  
  if (!notificationCache[studentCPF][disciplina]) {
    notificationCache[studentCPF][disciplina] = {};
  }
  
  notificationCache[studentCPF][disciplina][type] = today;
};

// Função para obter estatísticas de notificações (para debug)
const getNotificationStats = (disciplina: string, type: 'gradeResult' | 'gradeUpdate') => {
  const today = new Date().toISOString().split('T')[0];
  let sentToday = 0;
  
  Object.keys(notificationCache).forEach(cpf => {
    if (notificationCache[cpf][disciplina]?.[type] === today) {
      sentToday++;
    }
  });
  
  return { sentToday };
}

// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({dest: 'tmp_data/'})

export const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage with file persistence
const studentSet = new StudentSet();
const classes = new Classes();
const dataFile = path.resolve('./data/app-data.json');

// Persistence functions
const ensureDataDirectory = (): void => {
  const dataDir = path.dirname(dataFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const saveDataToFile = (): void => {
  try {
    const data = {
      students: studentSet.getAllStudents().map(student => ({
        name: student.name,
        cpf: student.getCPF(),
        email: student.email
      })),
      classes: classes.getAllClasses().map(classObj => ({
        topic: classObj.getTopic(),
        semester: classObj.getSemester(),
        year: classObj.getYear(),
        enrollments: classObj.getEnrollments().map(enrollment => ({
          studentCPF: enrollment.getStudent().getCPF(),
          evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON())
        }))
      }))
    };
    
    ensureDataDirectory();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving students to file:', error);
  }
};

// Load data from file
const loadDataFromFile = (): void => {
  try {
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Load students
      if (data.students && Array.isArray(data.students)) {
        data.students.forEach((studentData: any) => {
          // Create student with basic info only - evaluations handled through enrollments
          const student = new Student(
            studentData.name,
            studentData.cpf,
            studentData.email
          );
          
          try {
            studentSet.addStudent(student);
          } catch (error) {
            console.error(`Error adding student ${studentData.name}:`, error);
          }
        });
      }

      // Load classes with enrollments
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach((classData: any) => {
          try {
            const classObj = new Class(classData.topic, classData.semester, classData.year);
            classes.addClass(classObj);

            // Load enrollments for this class
            if (classData.enrollments && Array.isArray(classData.enrollments)) {
              classData.enrollments.forEach((enrollmentData: any) => {
                const student = studentSet.findStudentByCPF(enrollmentData.studentCPF);
                if (student) {
                  const enrollment = classObj.addEnrollment(student);
                  
                  // Load evaluations for this enrollment
                  if (enrollmentData.evaluations && Array.isArray(enrollmentData.evaluations)) {
                    enrollmentData.evaluations.forEach((evalData: any) => {
                      const evaluation = Evaluation.fromJSON(evalData);
                      enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
                    });
                  }
                    
                    // Load medias and attendance status if provided in the data file
                    if (typeof enrollmentData.mediaPreFinal !== 'undefined') {
                      enrollment.setMediaPreFinal(enrollmentData.mediaPreFinal);
                    }
                    if (typeof enrollmentData.mediaPosFinal !== 'undefined') {
                      enrollment.setMediaPosFinal(enrollmentData.mediaPosFinal);
                    }
                    if (typeof enrollmentData.reprovadoPorFalta !== 'undefined') {
                      enrollment.setReprovadoPorFalta(Boolean(enrollmentData.reprovadoPorFalta));
                    }
                } else {
                  console.error(`Student with CPF ${enrollmentData.studentCPF} not found for enrollment`);
                }
              });
            }
          } catch (error) {
            console.error(`Error adding class ${classData.topic}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading data from file:', error);
  }
};

// Trigger save after any modification (async to not block operations)
const triggerSave = (): void => {
  setImmediate(() => {
    saveDataToFile();
  });
};

// Load existing data on startup
loadDataFromFile();

// Helper function to clean CPF
const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[.-]/g, '');
};

// Routes

// GET /api/students - Get all students
app.get('/api/students', (req: Request, res: Response) => {
  try {
    const students = studentSet.getAllStudents();
    res.json(students.map(s => s.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/students - Add a new student
app.post('/api/students', (req: Request, res: Response) => {
  try {
    const { name, cpf, email } = req.body;
    
    if (!name || !cpf || !email) {
      return res.status(400).json({ error: 'Name, CPF, and email are required' });
    }

    // Create student with basic information only - evaluations handled through enrollments
    const student = new Student(name, cpf, email);
    const addedStudent = studentSet.addStudent(student);
    triggerSave(); // Save to file after adding
    res.status(201).json(addedStudent.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/students/:cpf - Update a student
app.put('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required for update' });
    }
    
    // Create a Student object for update - evaluations handled through enrollments
    const updatedStudent = new Student(name, cpf, email);
    const result = studentSet.updateStudent(updatedStudent);
    triggerSave(); // Save to file after updating
    res.json(result.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/students/:cpf - Delete a student
app.delete('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const cleanedCPF = cleanCPF(cpf);
    const success = studentSet.removeStudent(cleanedCPF);
    
    if (!success) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    triggerSave(); // Save to file after deleting
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/students/:cpf - Get a specific student
app.get('/api/students/:cpf', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const cleanedCPF = cleanCPF(cpf);
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/classes - Get all classes
app.get('/api/classes', (req: Request, res: Response) => {
  try {
    const allClasses = classes.getAllClasses();
    res.json(allClasses.map(c => c.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// POST /api/classes - Add a new class
app.post('/api/classes', (req: Request, res: Response) => {
  try {
    const { topic, semester, year } = req.body;
    
    if (!topic || !semester || !year) {
      return res.status(400).json({ error: 'Topic, semester, and year are required' });
    }

    const classObj = new Class(topic, semester, year);
    const newClass = classes.addClass(classObj);
    triggerSave(); // Save to file after adding class
    res.status(201).json(newClass.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/classes/:id - Update a class
app.put('/api/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { topic, semester, year } = req.body;
    
    if (!topic || !semester || !year) {
      return res.status(400).json({ error: 'Topic, semester, and year are required' });
    }
    
    const existingClass = classes.findClassById(id);
    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Update the class directly using setters
    existingClass.setTopic(topic);
    existingClass.setSemester(semester);
    existingClass.setYear(year);
    
    triggerSave(); // Save to file after updating class
    res.json(existingClass.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/classes/:id - Delete a class
app.delete('/api/classes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = classes.removeClass(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    triggerSave(); // Save to file after deleting class
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/classes/:classId/enroll - Enroll a student in a class
app.post('/api/classes/:classId/enroll', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { studentCPF } = req.body;
    
    if (!studentCPF) {
      return res.status(400).json({ error: 'Student CPF is required' });
    }

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const student = studentSet.findStudentByCPF(cleanCPF(studentCPF));
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const enrollment = classObj.addEnrollment(student);
    triggerSave(); // Save to file after enrolling student
    res.status(201).json(enrollment.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/classes/:classId/enroll/:studentCPF - Remove student enrollment from a class
app.delete('/api/classes/:classId/enroll/:studentCPF', (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const success = classObj.removeEnrollment(cleanedCPF);
    
    if (!success) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }
    
    triggerSave(); // Save to file after unenrolling student
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/classes/:classId/enrollments - Get all enrollments for a class
app.get('/api/classes/:classId/enrollments', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const enrollments = classObj.getEnrollments();
    res.json(enrollments.map(e => e.toJSON()));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/classes/:classId/enrollments/:studentCPF/evaluation - Get the student's average and final average for a class
app.get('/api/classes/:classId/enrollments/:studentCPF/evaluation', (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }

    const mediaPreFinal = enrollment.getMediaPreFinal();
    const mediaPosFinal = enrollment.getMediaPosFinal();

    res.json({
      student: enrollment.getStudent().toJSON(),
      average: mediaPreFinal,
      final_average: mediaPosFinal
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/classes/:classId/enrollments/:studentCPF/evaluation - Update evaluation for an enrolled student
app.put('/api/classes/:classId/enrollments/:studentCPF/evaluation', (req: Request, res: Response) => {
  try {
    const { classId, studentCPF } = req.params;
    const { goal, grade } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Student not enrolled in this class' });
    }

    if (grade === '' || grade === null || grade === undefined) {
      // Remove evaluation
      enrollment.removeEvaluation(goal);
    } else {
      // Add or update evaluation
      if (!['MANA', 'MPA', 'MA'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be MANA, MPA, or MA' });
      }
      enrollment.addOrUpdateEvaluation(goal, grade);
    }

    triggerSave(); // Save to file after evaluation update
    res.json(enrollment.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST api/classes/gradeImport/:classId, usado na feature de importacao de grades
// Vai ser usado em 2 fluxos(poderia ter divido em 2 endpoints mas preferi deixar em apenas 1)
// [Front] Upload → [Back] lê só o cabeçalho e retorna colunas da planilha e os goals da 'classId'
// [Front] Mapeia colunas da planilha para os goals → [Back] faz parse completo (stream)
app.post('/api/classes/gradeImport/:classId', upload_dir.single('file'), async (req: express.Request, res: express.Response) => {
  res.status(501).json({ error: "Endpoint ainda não implementado." });
});

// POST /api/notifications/grade-result - Enviar notificação de resultado da disciplina
app.post('/api/notifications/grade-result', async (req: Request, res: Response) => {
  try {
    const { studentCPF, disciplina, professorNome } = req.body;
    
    if (!studentCPF || !disciplina || !professorNome) {
      return res.status(400).json({ error: 'StudentCPF, disciplina e professorNome são obrigatórios' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    
    // Verificar se já foi enviada hoje
    if (isNotificationSentToday(cleanedCPF, disciplina, 'gradeResult')) {
      return res.status(409).json({ 
        error: 'Notificação já enviada hoje para este aluno nesta disciplina',
        message: 'Uma notificação de resultado já foi enviada para este aluno hoje nesta disciplina'
      });
    }
    
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Encontrar a matrícula do aluno na disciplina para obter a nota
    const classObj = classes.findClassesByTopic(disciplina)[0];
    if (!classObj) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Aluno não matriculado nesta disciplina' });
    }

    const nota = enrollment.getMediaPreFinal() ?? 0;

    await notificarResultadoDisciplina(student, nota, disciplina, professorNome);
    
    // Marcar como enviada
    markNotificationAsSent(cleanedCPF, disciplina, 'gradeResult');
    
    res.status(200).json({ message: 'Notificação enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação de resultado' });
  }
});

// POST /api/notifications/batch-result - Enviar notificação de resultado da disciplina em lote
app.post('/api/notifications/batch-result', async (req: Request, res: Response) => {
  try {
    const { classId, disciplina, professorNome } = req.body;
    
    if (!classId || !disciplina || !professorNome) {
      return res.status(400).json({ error: 'classId, disciplina e professorNome são obrigatórios' });
    }

    const classObj = classes.findClassById(classId);
    
    if (!classObj) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    const allStudents = classObj.getEnrollments().map((e: Enrollment) => e.getStudent());
    
    if (allStudents.length === 0) {
      return res.status(404).json({ error: 'Nenhum aluno matriculado nesta disciplina' });
    }

    // Filtrar alunos que ainda não receberam notificação hoje
    const studentsToNotify = allStudents.filter(student => 
      !isNotificationSentToday(student.getCPF(), disciplina, 'gradeResult')
    );

    console.log(`Total de alunos na turma: ${allStudents.length}`);
    console.log(`Alunos que receberão notificação: ${studentsToNotify.length}`);
    console.log(`Alunos que já receberam hoje: ${allStudents.length - studentsToNotify.length}`);

    if (studentsToNotify.length === 0) {
      return res.status(409).json({ 
        error: 'Todas as notificações já foram enviadas hoje',
        message: `Todos os ${allStudents.length} alunos já receberam a notificação de resultado hoje`,
        totalAlunos: allStudents.length,
        jaNotificados: allStudents.length
      });
    }

    // A lógica de cálculo da nota será implementada agora
    const totalEnviados = await notificarAlunosEmLote(studentsToNotify, disciplina, professorNome, (student) => {
      const enrollment = classObj.findEnrollmentByStudentCPF(student.getCPF());
      return enrollment?.getMediaPreFinal() ?? 0;
    }); 
    
    // Marcar todos os alunos notificados como enviados
    studentsToNotify.forEach(student => {
      markNotificationAsSent(student.getCPF(), disciplina, 'gradeResult');
    });
    
    res.status(200).json({ 
      message: 'Notificações enviadas com sucesso',
      totalEnviados: totalEnviados,
      totalAlunos: allStudents.length,
      jaNotificados: allStudents.length - studentsToNotify.length
    });
  } catch (error) {
    console.error('Erro ao enviar notificações em lote:', error);
    res.status(500).json({ error: 'Erro ao enviar notificações em lote' });
  }
});

// POST /api/notifications/grade-update - Enviar notificação de atualização de nota individual
app.post('/api/notifications/grade-update', async (req: Request, res: Response) => {
  try {
    const { studentCPF, disciplina, professorNome } = req.body;
    
    if (!studentCPF || !disciplina || !professorNome) {
      return res.status(400).json({ error: 'StudentCPF, disciplina e professorNome são obrigatórios' });
    }

    const cleanedCPF = cleanCPF(studentCPF);
    
    // Verificar se já foi enviada hoje
    if (isNotificationSentToday(cleanedCPF, disciplina, 'gradeUpdate')) {
      return res.status(409).json({ 
        error: 'Notificação já enviada hoje para este aluno nesta disciplina',
        message: 'Uma notificação de atualização já foi enviada para este aluno hoje nesta disciplina'
      });
    }
    
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Verificar se o aluno está matriculado na disciplina
    const classObj = classes.findClassesByTopic(disciplina)[0];
    if (!classObj) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    const enrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
    if (!enrollment) {
      return res.status(404).json({ error: 'Aluno não matriculado nesta disciplina' });
    }

    await notesUpdateSender({
      student,
      disciplina,
      professor: professorNome
    });

    // Marcar como enviada
    markNotificationAsSent(cleanedCPF, disciplina, 'gradeUpdate');

    res.status(200).json({ message: 'Notificação de atualização enviada com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar notificação de atualização:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação de atualização' });
  }
});

// POST /api/notifications/batch-update - Enviar notificação de atualização de nota em lote
app.post('/api/notifications/batch-update', async (req: Request, res: Response) => {
  try {
    const { classId, disciplina, professorNome } = req.body;
    
    if (!classId || !disciplina || !professorNome) {
      return res.status(400).json({ error: 'classId, disciplina e professorNome são obrigatórios' });
    }

    const classObj = classes.findClassById(classId);
    
    if (!classObj) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    const allStudents = classObj.getEnrollments().map((e: Enrollment) => e.getStudent());
    
    if (allStudents.length === 0) {
      return res.status(404).json({ error: 'Nenhum aluno matriculado nesta disciplina' });
    }

    // Filtrar alunos que ainda não receberam notificação de atualização hoje
    const studentsToNotify = allStudents.filter(student => 
      !isNotificationSentToday(student.getCPF(), disciplina, 'gradeUpdate')
    );

    console.log(`Total de alunos na turma: ${allStudents.length}`);
    console.log(`Alunos que receberão notificação de atualização: ${studentsToNotify.length}`);
    console.log(`Alunos que já receberam hoje: ${allStudents.length - studentsToNotify.length}`);

    if (studentsToNotify.length === 0) {
      return res.status(409).json({ 
        error: 'Todas as notificações já foram enviadas hoje',
        message: `Todos os ${allStudents.length} alunos já receberam a notificação de atualização hoje`,
        totalAlunos: allStudents.length,
        jaNotificados: allStudents.length
      });
    }

    const totalEnviados = await notesUpdateBatchSender(
      studentsToNotify, 
      disciplina, 
      professorNome
    ); 
    
    // Marcar todos os alunos notificados como enviados
    studentsToNotify.forEach(student => {
      markNotificationAsSent(student.getCPF(), disciplina, 'gradeUpdate');
    });
    
    res.status(200).json({ 
      message: 'Notificações de atualização enviadas com sucesso',
      totalEnviados: totalEnviados,
      totalAlunos: allStudents.length,
      jaNotificados: allStudents.length - studentsToNotify.length
    });
  } catch (error) {
    console.error('Erro ao enviar notificações de atualização em lote:', error);
    res.status(500).json({ error: 'Erro ao enviar notificações de atualização em lote' });
  }
});

// GET /api/notifications/stats/:disciplina - Obter estatísticas de notificações (endpoint para debug)
app.get('/api/notifications/stats/:disciplina', (req: Request, res: Response) => {
  try {
    const { disciplina } = req.params;
    
    const gradeResultStats = getNotificationStats(disciplina, 'gradeResult');
    const gradeUpdateStats = getNotificationStats(disciplina, 'gradeUpdate');
    
    res.json({
      disciplina,
      date: new Date().toISOString().split('T')[0],
      gradeResult: gradeResultStats,
      gradeUpdate: gradeUpdateStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});
