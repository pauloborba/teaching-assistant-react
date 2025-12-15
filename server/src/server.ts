import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation } from './models/Evaluation';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import { Report } from './models/Report';
import * as fs from 'fs';
import * as path from 'path';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from './models/EspecificacaoDoCalculoDaMedia';

// Configure multer for temporary file storage (used by gradeImport endpoint)
const upload_dir = multer({ dest: 'tmp_data/' });

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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
        especificacaoDoCalculoDaMedia: classObj.getEspecificacaoDoCalculoDaMedia().toJSON(),
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

// PUT /api/students/:cpf/evaluation - Update a specific evaluation
// DEPRECATED: Evaluations are now handled through class enrollments
/*
app.put('/api/students/:cpf/evaluation', (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    const { goal, grade } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }
    
    const cleanedCPF = cleanCPF(cpf);
    const student = studentSet.findStudentByCPF(cleanedCPF);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    if (grade === '' || grade === null || grade === undefined) {
      // Remove evaluation
      student.removeEvaluation(goal);
    } else {
      // Add or update evaluation
      if (!['MANA', 'MPA', 'MA'].includes(grade)) {
        return res.status(400).json({ error: 'Invalid grade. Must be MANA, MPA, or MA' });
      }
      student.addOrUpdateEvaluation(goal, grade);
    }
    
    triggerSave(); // Save to file after evaluation update
    res.json(student.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
*/

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

// POST /api/classes/:classId/enroll-bulk - Bulk enroll students from spreadsheet
app.post('/api/classes/:classId/enroll-bulk', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    try {
      // Handle multer errors
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          error: 'Erro ao processar o arquivo enviado.' 
        });
      }

      const { classId } = req.params;
      
      // Validation: Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Nenhum arquivo foi enviado. Por favor, envie um arquivo .xlsx ou .csv.' 
        });
      }

      // Find the class
      const classObj = classes.findClassById(classId);
      if (!classObj) {
        return res.status(404).json({ error: 'Turma não encontrada' });
      }

      // Read the spreadsheet from buffer
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return res.status(400).json({ 
          error: 'O arquivo enviado está vazio ou não é suportado (apenas .xlsx ou .csv permitido). Por favor, envie um arquivo com matrículas válidas.' 
        });
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      // Validation: Check if spreadsheet has data
      if (!data || data.length === 0) {
        return res.status(400).json({ 
          error: 'O arquivo enviado está vazio ou não é suportado (apenas .xlsx ou .csv permitido). Por favor, envie um arquivo com matrículas válidas.' 
        });
      }

      // Initialize counters
      let importedCount = 0;
      let rejectedCount = 0;

      // Process each row
      for (const row of data) {
        // Get CPF from the row (try different possible column names)
        const cpfValue = row.cpf || row.CPF || row.matricula || row.Matricula || row.Matrícula;
        
        if (!cpfValue) {
          continue; // Skip rows without CPF (blank lines)
        }

        // Clean and convert CPF to string
        const cpfString = String(cpfValue).trim();
        const cleanedCPF = cleanCPF(cpfString);

        // Check if student exists
        const student = studentSet.findStudentByCPF(cleanedCPF);
        if (!student) {
          // Student not found in the system - count as rejected
          rejectedCount++;
          console.log(`Student ${cleanedCPF} not found in system - rejected`);
          continue;
        }

        // Check if student is already enrolled
        const existingEnrollment = classObj.findEnrollmentByStudentCPF(cleanedCPF);
        if (existingEnrollment) {
          continue; // Skip if already enrolled (Scenario 2) - not counted as rejected
        }

        // Enroll the student (Scenario 1)
        try {
          classObj.addEnrollment(student);
          importedCount++;
          console.log(`Student ${cleanedCPF} successfully enrolled`);
        } catch (error) {
          // Error adding enrollment, count as rejected
          rejectedCount++;
          console.error(`Error enrolling student ${cleanedCPF}:`, error);
        }
      }

      // Save changes to file
      triggerSave();

      // Return response with counters
      res.status(200).json({
        importedCount,
        rejectedCount
      });

    } catch (error) {
      console.error('Error processing bulk enrollment:', error);
      res.status(500).json({ 
        error: 'Erro ao processar o arquivo. Por favor, verifique o formato e tente novamente.' 
      });
    }
  });
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

// POST /api/compare-classes - Compare multiple classes and return their reports
app.post('/api/compare-classes', (req: Request, res: Response) => {
  try {
    const { classes: classNames } = req.body;

    if (!Array.isArray(classNames)) {
      return res.status(400).json({ error: 'Classes array is required' });
    }

    if (classNames.length < 2) {
      return res.status(400).json({ error: 'At least two classes are required for comparison' });
    }

    if (classNames.length > 6) {
      return res.status(400).json({ error: 'The maximum number of classes allowed for comparison is 6' });
    }

    // Find classes by topic (case-insensitive contains)
    const foundClasses = classNames.map((name: string) => {
      const matches = classes.findClassesByTopic(name);
      return matches && matches.length > 0 ? matches[0] : undefined;
    });

    // Check for classes with no enrolled students
    const classesWithNoStudents: string[] = [];
    foundClasses.forEach((cls: any, idx: number) => {
      if (!cls) {
        // treat missing class as having no students
        classesWithNoStudents.push(classNames[idx]);
      } else if (!cls.getEnrollments || cls.getEnrollments().length === 0) {
        classesWithNoStudents.push(classNames[idx]);
      }
    });

    if (classesWithNoStudents.length > 0) {
      return res.status(422).json({ error: `${classesWithNoStudents.join(', ')} has no enrolled students` });
    }

    // Build comparison data using Report for each class
    const comparisonData: any = {};
    foundClasses.forEach((cls: any, idx: number) => {
      const report = new Report(cls);
      comparisonData[classNames[idx]] = report.toJSON();
    });

    return res.status(200).json({ comparisonData });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

// POST api/classes/gradeImport/:classId, usado na feature de importacao de grades
// Vai ser usado em 2 fluxos(poderia ter divido em 2 endpoints mas preferi deixar em apenas 1)
// [Front] Upload → [Back] lê só o cabeçalho e retorna colunas da planilha e os goals da 'classId'
// [Front] Mapeia colunas da planilha para os goals → [Back] faz parse completo (stream)
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

// Export the app for testing
export { app, studentSet, classes };

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}