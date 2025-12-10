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
import { ScriptAnswer } from './models/ScriptAnswer';
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
    console.log('=== Starting Mock Data Load ===');
    
    // Create mock student if not exists
    let student = studentSet.findStudentByCPF(studentCPF);
    if (!student) {
      student = new Student('João Silva', studentCPF, 'joao@example.com');
      studentSet.addStudent(student);
      console.log('✓ Mock student created:', studentCPF);
    } else {
      console.log('✓ Mock student already exists:', studentCPF);
    }
    
    // Create second mock student (not enrolled in class)
    let student2 = studentSet.findStudentByCPF('99999999999');
    if (!student2) {
      student2 = new Student('Maria Santos', '99999999999', 'maria@example.com');
      studentSet.addStudent(student2);
      console.log('Mock student 2 created:', '99999999999');
    }

    // Create third mock student for enrollment query test
    let student3 = studentSet.findStudentByCPF('12345678901');
    if (!student3) {
      student3 = new Student('Pedro Oliveira', '12345678901', 'pedro@example.com');
      studentSet.addStudent(student3);
      console.log('Mock student 3 created:', '12345678901');
    }
    
    // Create mock class if not exists
    let classe = classes.findClassById('Math101-2024-2024');
    if (!classe) {
      classe = new Class('Math101', 2024, 2024, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
      classes.addClass(classe);
      console.log('✓ Mock class created:', classe.getClassId());
    } else {
      console.log('✓ Mock class already exists:', classe.getClassId());
    }
    
    // Always ensure both students are enrolled
    const isStudent1Enrolled = classe.getEnrollments().some(e => e.getStudent().getCPF() === student.getCPF());
    if (!isStudent1Enrolled) {
      classe.addEnrollment(student);
      console.log('✓ Student 1 enrolled:', student.getCPF());
    }
    
    const isStudent3Enrolled = classe.getEnrollments().some(e => e.getStudent().getCPF() === student3.getCPF());
    if (!isStudent3Enrolled) {
      classe.addEnrollment(student3);
      console.log('✓ Student 3 enrolled:', student3.getCPF());
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

    // === Test data for individual scenarios ===
    // These are ALWAYS verified/created to ensure test isolation works properly
    console.log('📝 Creating scenario-specific test data...');

    // In-progress script answer for "Start task" scenario (scriptanswer-start) - NO tasks yet
    const existingStart = scriptAnswerSet.findById('scriptanswer-start');
    if (!existingStart) {
      scriptAnswerSet.addScriptAnswer({
        id: 'scriptanswer-start',
        scriptId: 'script-002',
        classId: 'Math101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [],
        status: 'in_progress',
        started_at: Date.now()
      }, classes, studentSet, scripts);
      console.log('✓ scriptanswer-start created');
    }

    // In-progress script answer for "Submit non-final task" scenario (scriptanswer-submit-nonfinal)
    const existingSubmitNonFinal = scriptAnswerSet.findById('scriptanswer-submit-nonfinal');
    if (!existingSubmitNonFinal) {
      scriptAnswerSet.addScriptAnswer({
        id: 'scriptanswer-submit-nonfinal',
        scriptId: 'script-002',
        classId: 'Math101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer('ta-nf-001', 'task-001', '', undefined, '', Date.now(), undefined, undefined, 'started')
        ],
        status: 'in_progress',
        started_at: Date.now()
      }, classes, studentSet, scripts);
      console.log('✓ scriptanswer-submit-nonfinal created');
    }

    // In-progress script answer for "Submit final task" scenario (scriptanswer-submit-final)
    const existingSubmitFinal = scriptAnswerSet.findById('scriptanswer-submit-final');
    if (!existingSubmitFinal) {
      scriptAnswerSet.addScriptAnswer({
        id: 'scriptanswer-submit-final',
        scriptId: 'script-002',
        classId: 'Math101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer('ta-f-001', 'task-001', 'Already submitted', 'MA', '', Date.now() - 10000, Date.now() - 9000, 1, 'submitted'),
          new TaskAnswer('ta-f-002', 'task-002', 'Already submitted', 'MA', '', Date.now() - 8000, Date.now() - 7000, 1, 'submitted'),
          new TaskAnswer('ta-f-003', 'task-003', '', undefined, '', Date.now(), undefined, undefined, 'started')
        ],
        status: 'in_progress',
        started_at: Date.now()
      }, classes, studentSet, scripts);
      console.log('✓ scriptanswer-submit-final created');
    }

    // In-progress script answer for timeout test (scriptanswer-timeout)
    // Started 2 hours ago so timeout of 3700 seconds (1h+ 2min) would trigger
    const existingTimeout = scriptAnswerSet.findById('scriptanswer-timeout');
    if (!existingTimeout) {
      const twoHoursAgo = Date.now() - 7200000;
      scriptAnswerSet.addScriptAnswer({
        id: 'scriptanswer-timeout',
        scriptId: 'script-003',
        classId: 'Math101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer('ta-t-001', 'task-001', '', undefined, '', twoHoursAgo, undefined, undefined, 'started'),
          new TaskAnswer('ta-t-002', 'task-002', '', undefined, '', twoHoursAgo, undefined, undefined, 'started'),
          new TaskAnswer('ta-t-003', 'task-003', '', undefined, '', undefined, undefined, undefined, 'pending')
        ],
        status: 'in_progress',
        started_at: twoHoursAgo
      }, classes, studentSet, scripts);
      console.log('✓ scriptanswer-timeout created');
    }

    // In-progress script answer for "Re-submit failure" scenario (script-002)
    const existingResubmitFail = scriptAnswerSet.findById('scriptanswer-resubmit-fail');
    if (!existingResubmitFail) {
      scriptAnswerSet.addScriptAnswer({
        id: 'scriptanswer-resubmit-fail',
        scriptId: 'script-004',
        classId: 'Math101-2024-2024',
        studentId: studentCPF,
        taskAnswers: [
          new TaskAnswer('ta-rsf-001', 'task-001', 'Already submitted', 'MA', '', Date.now(), Date.now(), 0, 'submitted')
        ],
        status: 'in_progress',
        started_at: Date.now()
      }, classes, studentSet, scripts);
      console.log('✓ scriptanswer-resubmit-fail created');
    }

    console.log('Mock script answers created: [scenario-specific test data]');

    // === ALWAYS CREATE/CHECK ENROLLMENT ANSWERS (outside the if block) ===
    // These are checked independently to ensure they exist regardless of other ScriptAnswers
    console.log('📝 Creating enrollment answers for student 12345678901...');
    
    // Check if enrollment-001 exists, if not create it
    const existingEnrollment1 = scriptAnswerSet.findById('enrollment-001');
    if (!existingEnrollment1) {
      scriptAnswerSet.addScriptAnswer({
        id: 'enrollment-001',
        scriptId: 'script-001',
        classId: 'Math101-2024-2024',
        studentId: '12345678901',
        taskAnswers: [
          new TaskAnswer('ta-enroll-001', 'task-001', 'Test response for enrollment query', 'MA', '')
        ]
      }, classes, studentSet, scripts);
      console.log('✓ enrollment-001 created');
    } else {
      console.log('✓ enrollment-001 already exists');
    }

    // Check if enrollment-002 exists, if not create it
    const existingEnrollment2 = scriptAnswerSet.findById('enrollment-002');
    if (!existingEnrollment2) {
      scriptAnswerSet.addScriptAnswer({
        id: 'enrollment-002',
        scriptId: 'script-002',
        classId: 'Math101-2024-2024',
        studentId: '12345678901',
        taskAnswers: [
          new TaskAnswer('ta-enroll-002', 'task-001', 'Another test response', 'MPA', '')
        ]
      }, classes, studentSet, scripts);
      console.log('✓ enrollment-002 created');
    } else {
      console.log('✓ enrollment-002 already exists');
    }
  } catch (error) {
    console.error('❌ Error loading mock scripts and answers:', error);
  }
  console.log('=== Mock Data Load Complete ===');
}