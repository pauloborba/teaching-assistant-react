import express, { Request, Response } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { Evaluation } from './models/Evaluation';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import { Goal } from './models/Goal';
import * as fs from 'fs';
import * as path from 'path';

// usado para ler arquivos em POST
const multer = require('multer');

// pasta usada para salvar os upload's feitos
const upload_dir = multer({dest: 'tmp_data/'})

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}

// In-memory storage with file persistence
const studentSet = new StudentSet();
const classes = new Classes();
const dataFile = process.env.APP_DATA_FILE
  ? path.resolve(process.env.APP_DATA_FILE)
  : process.env.NODE_ENV === 'test'
  ? path.resolve('./data/app-data.test.json')
  : path.resolve('./data/app-data.json');

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
        ,
        goals: classObj.getGoals().map(goal => goal.toJSON())
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
            // Use Class.fromJSON to load enrollments and goals consistently
            const classObj = Class.fromJSON(
              classData,
              studentSet.getAllStudents()
            );
            classes.addClass(classObj);
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

// POST /api/classes/:sourceClassId/clone-goals/:destClassId - Clone evaluation goals from source class to destination class
app.post('/api/classes/:sourceClassId/clone-goals/:destClassId', (req: Request, res: Response) => {
  try {
    const { sourceClassId, destClassId } = req.params;

    const sourceClass = classes.findClassById(sourceClassId);
    if (!sourceClass) {
      return res.status(404).json({ error: 'Source class not found' });
    }

    const destClass = classes.findClassById(destClassId);
    if (!destClass) {
      return res.status(404).json({ error: 'Destination class not found' });
    }

    // Clone goals from source class to destination class
    const sourceGoals = sourceClass.getGoals();
    if (!sourceGoals || sourceGoals.length === 0) {
      return res.status(400).json({
        error: 'Source class has no goals to clone',
        code: 'NO_SOURCE_GOALS'
      });
    }

    const destGoals = destClass.getGoals();
    if (destGoals && destGoals.length > 0) {
      return res.status(409).json({
        error: 'Destination class already has goals. This action would produce duplicate goals.',
        code: 'DEST_HAS_GOALS'
      });
    }

    // Perform clone using Class.cloneGoals -> returns new Goal instances with new ids
    const cloned = sourceClass.cloneGoals();
    // Add cloned goals to destination class
    cloned.forEach(goal => destClass.addGoal(goal));

    triggerSave(); // Save to file after cloning goals
    res.status(200).json({
      message: 'Goals cloned successfully',
      clonedGoalsCount: cloned.length
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Goals CRUD
// GET /api/classes/:classId/goals
app.get('/api/classes/:classId/goals', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const classObj = classes.findClassById(classId);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });
    res.json(classObj.getGoals().map(g => g.toJSON()));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/classes/:classId/goals
app.post('/api/classes/:classId/goals', (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { description, weight } = req.body;
    if (!description || weight === undefined) return res.status(400).json({ error: 'Description and weight are required' });

    const classObj = classes.findClassById(classId);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });

    const goal = new Goal(description, weight);
    const added = classObj.addGoal(goal);
    triggerSave();
    res.status(201).json(added.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/classes/:classId/goals/:goalId
app.put('/api/classes/:classId/goals/:goalId', (req: Request, res: Response) => {
  try {
    const { classId, goalId } = req.params;
    const { description, weight } = req.body;
    const classObj = classes.findClassById(classId);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });

    try {
      const updated = classObj.updateGoal(goalId, description, weight);
      triggerSave();
      res.json(updated.toJSON());
    } catch (err) {
      res.status(404).json({ error: 'Goal not found' });
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/classes/:classId/goals/:goalId
app.delete('/api/classes/:classId/goals/:goalId', (req: Request, res: Response) => {
  try {
    const { classId, goalId } = req.params;
    const classObj = classes.findClassById(classId);
    if (!classObj) return res.status(404).json({ error: 'Class not found' });

    const success = classObj.removeGoal(goalId);
    if (!success) return res.status(404).json({ error: 'Goal not found' });

    triggerSave();
    res.status(204).send();
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

// Serve React frontend for all non-API routes (must be after all API routes)
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(__dirname, '../../frontend/build/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not built. Run "npm run build" in the frontend directory first.' 
    });
  }
});

// Only start server if executed directly - makes it easier to test using supertest/importing the app
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Frontend available at http://localhost:${PORT}`);
  });
}

export { app };