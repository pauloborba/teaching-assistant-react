import { Request, Response, Express } from 'express';

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
  app.get(scriptAnswerurl+'enrollment', (req: Request, res: Response) => {
    const { classId, studentId } = req.query; //retorna tipo generico (especificar tipo depois)
    if (!classId || !studentId) {
      return res.status(400).json({ error: 'classId and studentId are required' });
    }
    const classe = classes.findClassById(classId as string);
    if (!classe) {
      return res.status(404).json({ error: 'Class not found' });
    }
    const student = studentSet.findStudentByCPF(studentId as string);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const answers = scriptAnswerSet.findByClassAndStudent(classId as string, studentId as string);
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

  // POST /api/scriptanswers → create a scriptanswer (obsoleto)

  // app.post(scriptAnswerurl+'', (req: Request, res: Response) => {
  //   try {
  //     const newAnswer = scriptAnswerSet.addScriptAnswer(req.body);
  //     res.status(201).json(newAnswer.toJSON());
  //   } catch (error) {
  //     res.status(400).json({ error: (error as Error).message });
  //   }
  // });

  // POST /api/scriptanswers → create a script answer

app.post(scriptAnswerurl+'', (req: Request, res: Response) => {
  try {
    const { scriptId, classId, studentId } = req.body;
    if (!scriptId || !classId || !studentId) {
      return res.status(400).json({ error: 'scriptId, classId and studentId are required' });
    }
    const script = scripts.findById(scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const classe = classes.findClassById(classId);
    if (!classe) {
      return res.status(404).json({ error: 'Class not found' });
    }
    const student = studentSet.findStudentByCPF(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const enrollment = classe.findEnrollmentByStudentCPF(studentId);
    if (!enrollment) {
      return res.status(403).json({ error: 'Student is not enrolled in this class' });
    }
    const existing = scriptAnswerSet.findByClassAndStudent(classId, studentId).find((sa: any) => sa.getScriptId() === scriptId);
    if (existing) {
      return res.status(409).json({ 
        error: 'ScriptAnswer already exists',
        scriptAnswerId: existing.getId()
      });
    }
    const newAnswer = scriptAnswerSet.addScriptAnswer({
      scriptId,
      classId,
      studentId,
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
        return res.status(404).json({ error: 'Answer already exists in ScriptAnswer' });
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
    const ta = scriptAnswerSet.submitLastTaskAnswer(id, taskId, scripts, {
      answer,
      grade,
      comments,
    });
    if (!ta) {
      return res.status(404).json({ error: 'ScriptAnswer or Task not found' });
    }
    saveCallback?.();
    res.json(ta.toJSON());
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
    res.json({
      message: 'Timeout check completed',
      scriptAnswer: sa.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

  // PUT /api/scriptanswers/:id/tasks/:taskId → Update grade
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

  // PUT /api/scriptanswers/:id/tasks/:taskId/comments → Add comment to task
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
}