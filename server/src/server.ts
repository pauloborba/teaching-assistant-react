import express, { Request, Response } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation, EVALUATION_GOALS, GENERAL_EVALUATION_GOALS, ROTEIRO_EVALUATION_GOALS } from './models/Evaluation';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import { Report } from './models/Report';
import * as fs from 'fs';
import * as path from 'path';
import { CSVReader, XLSXReader } from './services/SpreeadsheetReader';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from './models/EspecificacaoDoCalculoDaMedia';
import { getStudentStatusColor } from './models/StudentStatusColor';
import { Grade } from './models/Evaluation';
// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({ dest: 'tmp_data/' })

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage with file persistence
const studentSet = new StudentSet();
const classes = new Classes();
// map temporary session_string (uploaded.path) to metadata so we can recover original extension
const uploadSessions: Map<string, { ext: string; original: string }> = new Map();
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
                                        evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON()),
                                        mediaPreFinal: enrollment.getMediaPreFinal(),
                                        mediaPosFinal: enrollment.getMediaPosFinal(),
                                        reprovadoPorFalta: enrollment.getReprovadoPorFalta()
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
export const loadDataFromFile = (): void => {
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
                // Recalculate media values after evaluation change so they are sent to the client
                try {
                        enrollment.calculateMediaPreFinal();
                        // enrollment.calculateMediaPosFinal();
                } catch (err) {
                        // ignore errors during recalculation
                }


                triggerSave(); // Save to file after evaluation update
                res.json(enrollment.toJSON());
        } catch (error) {
                res.status(400).json({ error: (error as Error).message });
        }
});

// POST api/classes/gradeImport/:classId
// Endpoint with two-step flow used by the frontend when importing grades:
// 1) Upload a file -> backend reads only the header and returns `file_columns` + `session_string`.
// 2) Front maps file columns to class goals and sends `session_string` + `mapping` -> backend parses
//    the whole file and updates enrollments accordingly.
app.post('/api/classes/gradeImport/:classId', upload_dir.single('file'), async (req: express.Request, res: express.Response) => {
        const classId = req.params.classId;
        const classObj = classes.findClassById(classId);
        if (!classObj) return res.status(404).json({ error: 'Class not Found' });

        const enrollments = classObj.getEnrollments();
        if (!enrollments) return res.status(404).json({ error: 'Enrollments not found' });

        // Determine which goals to use based on evaluationType query parameter
        const evaluationType = req.query.evaluationType as string;
        let selectedGoals: string[];

        if (evaluationType === 'general') {
                selectedGoals = [...GENERAL_EVALUATION_GOALS];
        } else if (evaluationType === 'roteiros') {
                selectedGoals = [...ROTEIRO_EVALUATION_GOALS];
        } else {
                // Default to all goals if not specified
                selectedGoals = [...EVALUATION_GOALS];
        }

        const goals_field = ['cpf', ...Array.from(selectedGoals)];

        // STEP 1: if a file was uploaded, return its columns so frontend can map them to goals
        // - `session_string` is the temp path (multer destination) used as an identifier
        const uploaded = (req as any).file;
        // If file uploaded => return session + file columns for mapping
        if (uploaded?.path) {
                // validate file type for csv and excel
                const allowedMimeTypes = [
                        'text/csv',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ];
                const allowedExtensions = ['.csv', '.xlsx', '.xls'];
                const original = uploaded.originalname || '';
                const ext = path.extname(original).toLowerCase();

                // validate file type by mimetype OR extension
                if (!allowedMimeTypes.includes(uploaded.mimetype) && !allowedExtensions.includes(ext)) {
                        return res.status(400).json({ error: 'Invalid file type. Only CSV or XLSX files are allowed.' });
                }

                // choose appropriate reader based on file extension
                const Reader = ext === '.xlsx' || ext === '.xls' ? XLSXReader : CSVReader;
                const sheet = new Reader(uploaded.path);
                const file_columns = await sheet.getColumns();
                // store session metadata so later requests can detect original extension
                uploadSessions.set(uploaded.path, { ext, original });
                // return the temp path (session_string) + header columns and expected mapping fields
                return res.status(200).json({ session_string: uploaded.path, file_columns, mapping_colums: goals_field });
        }

        // STEP 2: mapping + processing
        // Expect JSON body: { session_string: string, mapping: { fileColumnName -> goalName } }
        const { session_string, mapping } = req.body ?? {};
        if (!session_string || !mapping) return res.status(400).json({ error: 'session_string and mapping are required' });

        // invert mapping so we can lookup file column by goal: { goal -> fileColumn }
        const invertedMapping = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]));
        // try to recover original extension from uploadSessions (multer's uploaded.path usually has no extension)
        const meta = uploadSessions.get(session_string);
        const sessionExt = (meta?.ext) ? meta.ext : path.extname(session_string).toLowerCase();
        const ReaderForSession = sessionExt === '.xlsx' || sessionExt === '.xls' ? XLSXReader : CSVReader;
        const sheet = new ReaderForSession(session_string);
        const data = await sheet.process();

        // build parsed lines with the expected goals order (including 'cpf')
        const parsed_lines = data.map((row: any) => Object.fromEntries(goals_field.map(k => [k, row[invertedMapping[k]] ?? ''])));

        // for each parsed line, find enrollment by CPF and add evaluation only when it's missing
        for (const line of parsed_lines) {
                const cleanedcpf = cleanCPF(line['cpf']);
                const enrollment = classObj.findEnrollmentByStudentCPF(cleanedcpf);
                if (!enrollment) return res.status(404).json({ error: `Student, ${cleanedcpf}, not enrolled in this class` });

                for (const [goal, grade] of Object.entries(line).filter(([k]) => k !== 'cpf')) {
                        const gradeStr = String(grade);
                        if (gradeStr === '') continue; // ignore empty cells
                        if (!['MANA', 'MPA', 'MA'].includes(gradeStr)) {
                                return res.status(400).json({ error: `Invalid grade for ${goal} on CPF=${cleanedcpf}. Must be MANA, MPA, or MA` });
                        }
                        // only write if system doesn't have an evaluation for that goal yet
                        if (enrollment.getEvaluationForGoal(goal) === undefined) {
                                enrollment.addOrUpdateEvaluation(goal, gradeStr as 'MANA' | 'MPA' | 'MA');
                        }
                }
        }
        // persintence
        triggerSave();
        return res.status(200).json(parsed_lines);
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

// GET /api/classes/:classId/students-status - Get status color for each student in a class
app.get('/api/classes/:classId/students-status', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const classObj = classes.findClassById(classId);

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const currentTopic = classObj.getTopic();
    const currentYear = classObj.getYear();
    const currentSemester = classObj.getSemester();

    const pastClasses = classes.getAllClasses().filter(c => {
      if (c.getTopic() !== currentTopic) return false;

      const isPrior = c.getYear() < currentYear || (c.getYear() === currentYear && c.getSemester() < currentSemester);
      return isPrior;
    });

    const enrollments = classObj.getEnrollments();

    const studentData = enrollments.map(enrollment => {
      const mediaAluno = enrollment.calculateMediaPreFinal();

      return {
        enrollment,
        mediaAluno
      };
    });

    const mediasValidas = studentData.map(d => d.mediaAluno);
    const mediaTurma =
      mediasValidas.length > 0
        ? mediasValidas.reduce((acc, curr) => acc + curr, 0) / mediasValidas.length
        : 0;

    const result = studentData.map(({ enrollment, mediaAluno }) => {
      const student = enrollment.getStudent();
      const cpf = cleanCPF(student.getCPF());

      const reprovadoAnteriormente = pastClasses.some(pastClass => 
        pastClass.findEnrollmentByStudentCPF(cpf) !== undefined
      );

      const temReprovacao = reprovadoAnteriormente;

      const color = getStudentStatusColor(
        mediaAluno,
        mediaTurma,
        temReprovacao
      );

      return {
        student: {
          ...student.toJSON(), 
          cpf: student.getCPF() 
        },
        mediaAluno,
        mediaTurma,
        temReprovacaoAnterior: temReprovacao,
        statusColor: color
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Erro Fatal ao calcular status:', error);
    res.status(500).json({ error: 'Failed to calculate students status' });
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
