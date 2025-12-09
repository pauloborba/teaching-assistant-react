import { Express } from 'express';
import { TaskSet } from './models/TaskSet';
import { Scripts } from './models/Scripts';
import { ScriptAnswerSet } from './models/ScriptAnswerSet';
import { Task } from './models/Task';
import { TaskAnswer } from './models/TaskAnswer';
import { Classes } from './models/Classes';
import { Class } from './models/Class';
import { StudentSet } from './models/StudentSet';
import { Student } from './models/Student';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from './models/EspecificacaoDoCalculoDaMedia';

export function loadMockScriptsAndAnswers(
  taskset: TaskSet,
  scripts: Scripts,
  scriptAnswerSet: ScriptAnswerSet,
  classes: Classes,
  studentSet: StudentSet,
  studentCPF: string = '11111111111'
): void {
  
  try {
    // Create mock student if not exists
    let student = studentSet.findStudentByCPF(studentCPF);
    if (!student) {
      student = new Student('João Silva', studentCPF, 'joao@example.com');
      studentSet.addStudent(student);
      console.log('Mock student created:', studentCPF);
    }
    // Create mock class if not exists
    let classe = classes.findClassById('Math 101-2024-2024');
    if (!classe) {
      classe = new Class('Math 101', 2024, 2024, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
      classes.addClass(classe);
      // Enroll student in class
      classe.addEnrollment(student);
      console.log('Mock class created:', classe.getClassId());
    }
    // Create mock tasks if none exist
    if (taskset.getAllTasks().length === 0) {
      const task1 = taskset.addTask(
        new Task('task-001', 'Explain the basic concepts covered in class')
      );

      const task2 = taskset.addTask(
        new Task('task-002', 'Implement the algorithm discussed')
      );

      const task3 = taskset.addTask(
        new Task('task-003', 'Analyze the problem and propose a solution')
      );

      console.log('Mock tasks created:', [task1.getId(), task2.getId(), task3.getId()]);
    }

    // Create mock scripts if none exist
    if (scripts.getAllScripts().length === 0) {
      const script1 = scripts.addScript(new (require('./models/Script').Script)('script-001', 'Midterm Exam - Math 101'));
      const foundTask1 = taskset.findById('task-001');
      const foundTask2 = taskset.findById('task-002');
      const foundTask3 = taskset.findById('task-003');

      if (foundTask1) script1.addTask(foundTask1);
      if (foundTask2) script1.addTask(foundTask2);
      if (foundTask3) script1.addTask(foundTask3);

      const script2 = scripts.addScript(new (require('./models/Script').Script)('script-002', 'Final Exam - Math 101'));
      if (foundTask1) script2.addTask(foundTask1);
      if (foundTask2) script2.addTask(foundTask2);
      if (foundTask3) script2.addTask(foundTask3);

      const script3 = scripts.addScript(new (require('./models/Script').Script)('script-003', 'Quiz - Programming 201'));
      if (foundTask2) script3.addTask(foundTask2);
      if (foundTask3) script3.addTask(foundTask3);

      const script4 = scripts.addScript(new (require('./models/Script').Script)('script-004', 'Quiz - Programming 202'));
      if (foundTask2) script4.addTask(foundTask2);
      if (foundTask3) script4.addTask(foundTask3);

      console.log('Mock scripts created:', [script1.getId(), script2.getId(), script3.getId(), script4.getId()]);
    }

    // Create mock script answers if none exist
    if (scriptAnswerSet.getAll().length === 0) {
      const answer1 = scriptAnswerSet.addScriptAnswer({
        id: 'answer-001',
        scriptId: 'script-001',
        classId: 'Math 101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer(
            'ta-001',
            'task-001',
            'The basic concepts are fundamental to understanding the subject matter.',
            'MA',
            'Excellent explanation with clear examples'
          ),
          new TaskAnswer(
            'ta-002',
            'task-002',
            'Here is my implementation of the algorithm using a recursive approach...',
            'MPA',
            'Good attempt, but missing edge cases'
          ),
          new TaskAnswer(
            'ta-003',
            'task-003',
            'My analysis shows that the time complexity is O(n log n).',
            'MA',
            'Well-reasoned analysis with proper mathematical justification'
          )
        ],
        grade: 'MA'
      },classes, studentSet, scripts);

      const answer2 = scriptAnswerSet.addScriptAnswer({
        id: 'answer-002',
        scriptId: 'script-002',
        classId: 'Math 101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer(
            'ta-004',
            'task-001',
            'Building on previous knowledge, the concepts form the foundation...',
            'MA',
            'Excellent continuation of understanding'
          ),
          new TaskAnswer(
            'ta-005',
            'task-002',
            'The implementation demonstrates proper use of design patterns.',
            'MA',
            'Clean code with good structure'
          ),
          new TaskAnswer(
            'ta-006',
            'task-003',
            'Critical analysis reveals that the solution handles all edge cases effectively.',
            'MA',
            'Thorough and insightful analysis'
          )
        ],
        grade: 'MA'
      },classes, studentSet, scripts);
      const answer3 = scriptAnswerSet.addScriptAnswer({
        id: 'answer-003',
        scriptId: 'script-003',
        classId: 'Math 101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer(
            'ta-007',
            'task-002',
            'My implementation uses a basic loop structure.',
            'MPA',
            'Works correctly but could be optimized'
          ),
          new TaskAnswer(
            'ta-008',
            'task-003',
            'The solution works but could be optimized.',
            'MPA',
            'Shows understanding but optimization potential missed'
          )
        ]
      },classes, studentSet, scripts);
      const answer4 = scriptAnswerSet.addScriptAnswer({
        id: 'answer-004',
        scriptId: 'script-004',
        classId: 'Math 101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer(
            'ta-009',
            'task-002',
            'My implementation uses a basic loop structure.',
            'MPA',
            'Works correctly but could be optimized'
          )
        ]
      },classes, studentSet, scripts);

      console.log('Mock script answers created:', [answer1.getId(), answer2.getId(), answer3.getId(), answer4.getId()]);
    }
  } catch (error) {
    console.error('Error loading mock scripts and answers:', error);
  }
}