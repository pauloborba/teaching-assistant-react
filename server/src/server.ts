import express, { Request, Response } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation } from './models/Evaluation';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import { Report } from './models/Report';
import { RoteiroService } from './services/RoteiroService';
import { QuestaoService } from './services/QuestaoService';
import { Roteiro } from './models/Roteiro';
import { RoteiroList } from './models/RoteiroList';
import { Questao } from './models/Questao';
import { QuestaoList } from './models/QuestaoList';
import * as fs from 'fs';
import * as path from 'path';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from './models/EspecificacaoDoCalculoDaMedia';

// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({dest: 'tmp_data/'})

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage with file persistence
const studentSet = new StudentSet();
const classes = new Classes();
const questaoList = new QuestaoList();
const roteiroService = new RoteiroService(new RoteiroList(), questaoList, {
  turmaExiste: (turmaId) => classes.findClassById(turmaId) !== undefined
});
const questaoService = new QuestaoService(questaoList, roteiroService.getRoteiroList());
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
        especificacaoDoCalculoDaMedia: classObj.getEspecificacaoDoCalculoDaMedia().toJSON(),
        enrollments: classObj.getEnrollments().map(enrollment => ({
          studentCPF: enrollment.getStudent().getCPF(),
          evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON())
        }))
      })),
      questoes: questaoList.getAll().map(questao => questao.toJSON()),
      roteiros: roteiroService.getRoteiroList().getAll().map(roteiro => roteiro.toJSON())
    };
    
    ensureDataDirectory();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving data to file:', error);
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
            const classObj = new Class(classData.topic, classData.semester, classData.year, EspecificacaoDoCalculoDaMedia.fromJSON(classData.especificacaoDoCalculoDaMedia));
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

      // Load question bank (before roteiros, which reference questions by id)
      if (data.questoes && Array.isArray(data.questoes)) {
        data.questoes.forEach((questaoData: any) => {
          try {
            questaoList.add(Questao.fromJSON(questaoData));
          } catch (error) {
            console.error(`Error loading question ${questaoData?.id}:`, error);
          }
        });
      }

      // Load roteiros
      if (data.roteiros && Array.isArray(data.roteiros)) {
        data.roteiros.forEach((roteiroData: any) => {
          try {
            const roteiro = Roteiro.fromJSON(roteiroData);
            roteiroService.getRoteiroList().add(roteiro);
          } catch (error) {
            console.error(`Error loading roteiro ${roteiroData?.titulo}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading data from file:', error);
  }
};

// Test mode flag to disable file persistence
const isTestMode = process.env.NODE_ENV === 'test';

// Trigger save after any modification (async to not block operations)
const triggerSave = (): void => {
  if (!isTestMode) {
    setImmediate(() => {
      saveDataToFile();
    });
  }
};

// Load existing data on startup (only in non-test mode)
if (!isTestMode) {
  loadDataFromFile();
}

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

    const student = new Student(name, cpf, email);
    const addedStudent = studentSet.addStudent(student);
    triggerSave();
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
    
    const updatedStudent = new Student(name, cpf, email);
    const result = studentSet.updateStudent(updatedStudent);
    triggerSave();
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
    
    triggerSave();
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

    const classObj = new Class(topic, semester, year, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const newClass = classes.addClass(classObj);
    triggerSave();
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

    existingClass.setTopic(topic);
    existingClass.setSemester(semester);
    existingClass.setYear(year);
    
    triggerSave();
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
    
    triggerSave();
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
    triggerSave();
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
    
    triggerSave();
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
      enrollment.removeEvaluation(goal);
    } else {
      if (!['MANA', 'MPA', 'MA'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be MANA, MPA, or MA' });
      }
      enrollment.addOrUpdateEvaluation(goal, grade);
    }

    triggerSave();
    res.json(enrollment.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST api/classes/gradeImport/:classId, usado na feature de importacao de grades
app.post('/api/classes/gradeImport/:classId', upload_dir.single('file'), async (req: express.Request, res: express.Response) => {
  res.status(501).json({ error: "Endpoint ainda não implementado." });
});

// GET /api/classes/:classId/report - Generate statistics report for a class
app.get('/api/classes/:classId/report', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    const classObj = classes.findClassById(classId);
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const report = new Report(classObj);
    res.json(report.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/roteiros - Get all roteiros (optional ?turma= filter)
app.get('/api/roteiros', (req: Request, res: Response) => {
  try {
    const turma = typeof req.query.turma === 'string' ? req.query.turma : undefined;
    const lista = turma
      ? roteiroService.getRoteiroList().listByTitulo(turma)
      : roteiroService.getRoteiroList().getAll();
    res.json(lista.map(r => r.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roteiros' });
  }
});

// POST /api/roteiros - Create a new roteiro
app.post('/api/roteiros', (req: Request, res: Response) => {
  try {
    const novoRoteiro = roteiroService.inserirRoteiro(req.body);
    triggerSave();
    res.status(201).json(novoRoteiro.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/roteiros/:id - Update an existing roteiro
app.put('/api/roteiros/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const atualizado = roteiroService.atualizarRoteiro(id, req.body);
    triggerSave();
    res.json(atualizado.toJSON());
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Roteiro não encontrado' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/roteiros/:id - Delete a roteiro
app.delete('/api/roteiros/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const removido = roteiroService.removerRoteiro(id);
    if (!removido) {
      return res.status(404).json({ error: 'Roteiro não encontrado' });
    }
    triggerSave();
    res.status(204).send();
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Roteiro não encontrado' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// GET /api/questoes - Get the question bank (optional ?busca= filter by title)
app.get('/api/questoes', (req: Request, res: Response) => {
  try {
    const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
    res.json(questaoService.listarQuestoes(busca).map(q => q.toJSON()));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/questoes - Create a new question in the bank
app.post('/api/questoes', (req: Request, res: Response) => {
  try {
    const novaQuestao = questaoService.inserirQuestao(req.body);
    triggerSave();
    res.status(201).json(novaQuestao.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/questoes/:id - Update a question of the bank
app.put('/api/questoes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const atualizada = questaoService.atualizarQuestao(id, req.body);
    triggerSave();
    res.json(atualizada.toJSON());
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Questão não encontrada' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/questoes/:id - Delete a question not used by any roteiro
app.delete('/api/questoes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    questaoService.removerQuestao(id);
    triggerSave();
    res.status(204).send();
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'Questão não encontrada' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// Export the app for testing
export { app, studentSet, classes, roteiroService, questaoList };

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}