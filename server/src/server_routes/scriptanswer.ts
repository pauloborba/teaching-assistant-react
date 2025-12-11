import { Request, Response, Express } from 'express';
import { TaskAnswer } from '../models/TaskAnswer';

export function setupScriptAnswerRoutes(app: Express, scriptAnswerSet: any, studentSet: any, TaskSet: any, classes: any, scripts: any, saveCallback?: () => void) {
  const scriptAnswerurl = '/api/scriptanswers/';

  // GET /api/scriptanswers → get ALL answers
  app.get(scriptAnswerurl+'', (req: Request, res: Response) => {
    try {
      const all = scriptAnswerSet.getAll();
      return res.status(200).json(all.map((a: any) => a.toJSON()));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch script answers' });
    }
  });

  // GET /api/scriptanswers/student/:studentId → Answers for a student
  app.get(scriptAnswerurl+'student/:studentId', (req: Request, res: Response) => {
    const { studentId } = req.params;

    const student = studentSet.findStudentByCPF(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const answers = scriptAnswerSet.findByStudentId(studentId);
    return res.status(200).json(answers.map((a: any) => a.toJSON()));
  });

  // GET /api/scriptanswers/class/:classId → Answers for a class
  app.get(scriptAnswerurl+'class/:classId', (req: Request, res: Response) => {
    const { classId } = req.params;

    const classe = classes.findClassById(classId);
    if (!classe) {
      return res.status(404).json({ error: 'class not found' });
    }
    const answers = scriptAnswerSet.findByClassId(classId);
    return res.status(200).json(answers.map((a: any) => a.toJSON()));
  });

  // GET /api/scriptanswers/script/:scriptId → Answers for a script
  app.get(scriptAnswerurl+'script/:scriptId', (req: Request, res: Response) => {
    const { scriptId } = req.params;

    const answers = scriptAnswerSet.findbyScriptId(scriptId);
    return res.status(200).json(answers.map((a: any) => a.toJSON()));
  });

  // GET /api/scriptanswers/enrollment?classId=X&studentId=Y  → Answers for a enrollment (student in class)
  app.get('/api/scriptanswers/enrollment', (req: Request, res: Response) => {
    const { classId, studentId } = req.query;
    
    if (!classId || !studentId) {
      return res.status(400).json({ error: 'classId and studentId are required' });
    }
    
    const classIdStr = classId as string;
    const studentIdStr = studentId as string;
    
    const classe = classes.findClassById(classIdStr);
    if (!classe) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const cleanedStudentId = studentIdStr.replace(/[.-]/g, '');
    const student = studentSet.findStudentByCPF(cleanedStudentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const answers = scriptAnswerSet.findByClassAndStudent(classIdStr, cleanedStudentId);
    return res.status(200).json(answers.map((a: any) => a.toJSON()));
  });

  // GET /api/scriptanswers/:id → get ONE answer by ID
  app.get(scriptAnswerurl+':id', (req: Request, res: Response) => {
    const { id } = req.params;

    const found = scriptAnswerSet.findById(id);
    if (!found) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    return res.status(200).json(found.toJSON());
  });

  // GET /api/scriptanswers/:id/tasks/:taskId → Get grade of task
  app.get(scriptAnswerurl+':id/tasks/:taskId', (req: Request, res: Response) => {
    const { id, taskId } = req.params;

    const scriptAnswer = scriptAnswerSet.findById(id);
    if (!scriptAnswer) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    const task = scriptAnswer.findAnswerByTaskId(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({ taskId, grade: task.getGrade() });
  });

  // POST /api/scriptanswers → create a script answer
  app.post(scriptAnswerurl+'', (req: Request, res: Response) => {
  try {
    const { id, scriptId, classId, studentId } = req.body;
    if (!scriptId || !classId || !studentId) {
      return res.status(400).json({ error: 'scriptId, classId and studentId are required' });
    }
    const script = scripts.findById(scriptId);
    if (!script) {
      return res.status(401).json({ error: 'Script not found' });
    }
    const classe = classes.findClassById(classId);
    if (!classe) {
      return res.status(401).json({ error: 'Class not found' });
    }
    // Clean CPF before searching
    const cleanedStudentId = studentId.replace(/[.-]/g, '');
    const student = studentSet.findStudentByCPF(cleanedStudentId);
    if (!student) {
      return res.status(401).json({ error: 'Student not found' });
    }
    const enrollment = classe.findEnrollmentByStudentCPF(cleanedStudentId);
    if (!enrollment) {
      return res.status(403).json({ error: 'Student is not enrolled in this class' });
    }
    const existing = scriptAnswerSet.findByClassAndStudent(classId, cleanedStudentId).find((sa: any) => sa.getScriptId() === scriptId);
    if (existing) {
      return res.status(409).json({ 
        error: 'ScriptAnswer already exists',
        scriptAnswerId: existing.getId()
      });
    }
    const newAnswer = scriptAnswerSet.addScriptAnswer({
      id,
      scriptId,
      classId,
      studentId: cleanedStudentId,
      classes, studentSet, scripts
    });
    saveCallback?.();
    res.status(201).json(newAnswer.toJSON());
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

  // POST /api/scriptanswers/:id/tasks/:taskId/start → start an answer on the scriptAnswer

  app.post(scriptAnswerurl+':id/tasks/:taskId/start', (req: Request, res: Response) => {
    try {
      const { id, taskId } = req.params;
      const { answer, grade, comments } = req.body;
      const scriptAnswer = scriptAnswerSet.findById(id);
      if (!scriptAnswer) {
        return res.status(404).json({ error: 'ScriptAnswer not found' });
      }
      if (scriptAnswer.status === 'finished') {
        return res.status(403).json({ error: 'ScriptAnswer is closed for new answers' });
      }
      const task = TaskSet.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const ta = scriptAnswerSet.startTaskAnswer(id, taskId, {
        answer,
        grade,
        comments,
      });
      if (!ta) {
        return res.status(409).json({ error: 'Task answer already exists for this task' });
      }
      saveCallback?.();
      res.status(201).json(ta.toJSON());
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // POST /api/scriptanswers/:id/tasks/:taskId/submit → submit an answer on the scriptAnswer

  app.post(scriptAnswerurl+':id/tasks/:taskId/submit', (req: Request, res: Response) => {
    try {
      const { id, taskId } = req.params;
      const { answer, grade, comments } = req.body;

      const scriptAnswer = scriptAnswerSet.findById(id);
      if (!scriptAnswer) {
        return res.status(404).json({ error: 'ScriptAnswer not found' });
      }
      if (scriptAnswer.status === 'finished') {
        return res.status(409).json({ error: 'ScriptAnswer already finished' });
      }

      const existingTask = scriptAnswer.findAnswerByTaskId(taskId);
      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (existingTask.status === 'submitted') {
        return res.status(409).json({ error: 'Task answer already submitted and cannot be changed' });
      }

      const ta = scriptAnswerSet.submitLastTaskAnswer(id, taskId, scripts, {
        answer,
        grade,
        comments,
      });
      if (!ta) {
        return res.status(404).json({ error: 'ScriptAnswer or Task not found' });
      }
      saveCallback?.();
      res.status(200).json(ta.toJSON());
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

// POST /api/scriptanswers/:id/timeout → Marca roteiro como expirado por timeout
app.post(scriptAnswerurl+':id/timeout', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeoutSeconds } = req.body; //padrão 3600
    const sa = scriptAnswerSet.findById(id);
    if (!sa) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }
    sa.checkAndMarkIfTimedOut(timeoutSeconds);
    saveCallback?.();
    res.status(200).json({
      message: 'Timeout check completed',
      scriptAnswer: sa.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

  // POST /api/scriptanswers/:id/tasks → Add a new task answer to a script answer
  app.post(scriptAnswerurl+':id/tasks', (req: Request, res: Response) => {
    const answerId = req.params["id"];
    const { id, task, answer, grade, comments } = req.body;

    // Validate required fields
    if (!id || !task) {
      return res.status(400).json({ error: 'Missing required fields: id and task' });
    }

    try {
      const scriptAnswer = scriptAnswerSet.findById(answerId);
      if (!scriptAnswer) {
        return res.status(404).json({ error: 'ScriptAnswer not found' });
      }

      // Check if task answer already exists
      const existingTask = scriptAnswer.findAnswerByTaskId(id);
      if (existingTask) {
        return res.status(409).json({ error: 'Task answer already exists for this task' });
      }

      // Create new TaskAnswer
      const newTaskAnswer = new TaskAnswer(
        id,
        task,
        answer || '',
        grade,
        comments
      );

      // Add the task answer to the script answer
      scriptAnswer.addAnswer(newTaskAnswer);

      return res.status(201).json({
        id: id,
        task: task,
        answer: answer || '',
        grade: grade || undefined,
        comments: comments || undefined
      });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  });

  // PUT /api/scriptanswers/:id/tasks/:taskId → Update task answer grade
  app.put(scriptAnswerurl+':id/tasks/:taskId', (req: Request, res: Response) => {
    const { id, taskId } = req.params;
    const { grade } = req.body;

    const scriptAnswer = scriptAnswerSet.findById(id);
    if (!scriptAnswer) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    const task = scriptAnswer.findAnswerByTaskId(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!['MANA', 'MPA', 'MA'].includes(grade)) {
      return res.status(400).json({ error: 'Invalid grade' });
    }
    task.updateGrade(grade);
    saveCallback?.();
    return res.status(200).json({ taskId, grade });
  });

  // PUT /api/scriptanswers/:id/tasks/:taskId/comments → Update task answer comments
  app.put(scriptAnswerurl+':id/tasks/:taskId/comments', (req: Request, res: Response) => {
    const { id, taskId } = req.params;
    const { comment } = req.body;

    const scriptAnswer = scriptAnswerSet.findById(id);
    if (!scriptAnswer) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    const task = scriptAnswer.findAnswerByTaskId(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.comments = comment;
    saveCallback?.();
    return res.status(200).json({ taskId, comment });
  });

  // DELETE /api/scriptanswers/:id/tasks/:taskId → Remove a task answer from script answer
  app.delete(scriptAnswerurl+':id/tasks/:taskId', (req: Request, res: Response) => {
    const { id, taskId } = req.params;

    const scriptAnswer = scriptAnswerSet.findById(id);
    if (!scriptAnswer) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    const removed = scriptAnswer.removeAnswer(taskId);
    if (!removed) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({ message: 'Task answer removed successfully', taskId });
  });

  // DELETE /api/scriptanswers/:id → Delete a script answer by ID
  app.delete(scriptAnswerurl+':id', (req: Request, res: Response) => {
    const { id } = req.params;

    const removed = scriptAnswerSet.removeScriptAnswer(id);
    if (!removed) {
      return res.status(404).json({ error: 'ScriptAnswer not found' });
    }

    return res.status(200).json({ message: 'ScriptAnswer deleted successfully', id });
  });

  // DELETE /api/scriptanswers → Delete all script answers
  app.delete(scriptAnswerurl+'', (req: Request, res: Response) => {
    try {
      const count = scriptAnswerSet.removeAllScriptAnswers();
      return res.status(200).json({ message: 'All script answers deleted', count });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete all script answers' });
    }
  });

  app.post('/api/reset-mock-data', (req: Request, res: Response) => {
    try {
      const { loadMockScriptsAndAnswers } = require('../mock_scripts');
      loadMockScriptsAndAnswers(TaskSet, scripts, scriptAnswerSet, classes, studentSet, '11111111111');
      return res.status(200).json({ message: 'Mock data reset successfully' });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}