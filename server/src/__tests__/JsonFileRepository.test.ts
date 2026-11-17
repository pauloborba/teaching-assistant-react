import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonFileRepository } from '../persistence/JsonFileRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class, DEFAULT_DISCREPANCY_THRESHOLD } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';

describe('JsonFileRepository', () => {
  let directory: string;
  let filePath: string;
  let repository: JsonFileRepository;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ta-repo-'));
    filePath = path.join(directory, 'data', 'app-data.json');
    repository = new JsonFileRepository(filePath);
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const populatedState = () => {
    const students = new StudentSet();
    const classes = new Classes();
    const ana = students.addStudent(new Student('Ana Lima', '123.456.789-01', 'ana@cin.ufpe.br'));
    students.addStudent(new Student('Bruno Melo', '987.654.321-00', 'bruno@cin.ufpe.br'));
    const se = classes.addClass(new Class('Software Engineering', 1, 2025, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    const enrollment = se.addEnrollment(ana);
    enrollment.addOrUpdateEvaluation('Design', 'MA');
    enrollment.setAverageBeforeFinalExam(8.5);
    enrollment.setFailedByAbsence(true);
    se.requestSelfAssessment('2026-10-20', '2026-10-08');
    enrollment.submitSelfAssessment([new Evaluation('Design', 'MPA')]);
    se.setDiscrepancyThreshold(1);
    return { students, classes };
  };

  test('load does nothing when the file does not exist', () => {
    const students = new StudentSet();
    const classes = new Classes();
    repository.load(students, classes);
    expect(students.getCount()).toBe(0);
    expect(classes.getCount()).toBe(0);
  });

  test('save creates the data directory and writes the documented format', () => {
    const { students, classes } = populatedState();
    repository.save(students, classes);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
      students: [
        { name: 'Ana Lima', cpf: '12345678901', email: 'ana@cin.ufpe.br' },
        { name: 'Bruno Melo', cpf: '98765432100', email: 'bruno@cin.ufpe.br' }
      ],
      classes: [{
        topic: 'Software Engineering',
        semester: 1,
        year: 2025,
        averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
        selfAssessmentRequest: { deadline: '2026-10-20', sentDate: '2026-10-08' },
        discrepancyThreshold: 1,
        enrollments: [{
          studentCPF: '12345678901',
          evaluations: [{ goal: 'Design', grade: 'MA' }],
          selfAssessments: [{ goal: 'Design', grade: 'MPA' }],
          averageBeforeFinalExam: 8.5,
          averageAfterFinalExam: null,
          failedByAbsence: true
        }]
      }]
    });
  });

  test('load rebuilds what save wrote', () => {
    const saved = populatedState();
    repository.save(saved.students, saved.classes);

    const students = new StudentSet();
    const classes = new Classes();
    repository.load(students, classes);

    expect(students.getAllStudents().map(s => s.toJSON())).toEqual(saved.students.getAllStudents().map(s => s.toJSON()));
    expect(classes.getAllClasses().map(c => c.toJSON())).toEqual(saved.classes.getAllClasses().map(c => c.toJSON()));
    const enrollment = classes.findClassById('Software Engineering-2025-1')!.findEnrollmentByStudentCPF('12345678901')!;
    expect(enrollment.getStudent()).toBe(students.findStudentByCPF('12345678901'));
    expect(enrollment.getAverageBeforeFinalExam()).toBe(8.5);
    expect(enrollment.getAverageAfterFinalExam()).toBeNull();
    expect(enrollment.getFailedByAbsence()).toBe(true);
    expect(enrollment.toJSON().selfAssessments).toEqual([{ goal: 'Design', grade: 'MPA' }]);
    expect(classes.findClassById('Software Engineering-2025-1')!.getSelfAssessmentRequest()?.toJSON())
      .toEqual({ deadline: '2026-10-20', sentDate: '2026-10-08' });
    expect(classes.findClassById('Software Engineering-2025-1')!.getDiscrepancyThreshold()).toBe(1);
  });

  test('load gives the default discrepancy threshold to a class whose file has none', () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      students: [],
      classes: [{
        topic: 'SE', semester: 1, year: 2025,
        averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
        enrollments: []
      }]
    }));
    const classes = new Classes();
    repository.load(new StudentSet(), classes);
    expect(classes.findClassById('SE-2025-1')!.getDiscrepancyThreshold()).toBe(DEFAULT_DISCREPANCY_THRESHOLD);
    expect(DEFAULT_DISCREPANCY_THRESHOLD).toBe(2);
  });

  test('load drops an invalid discrepancy threshold, keeping the class with the default one', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      students: [],
      classes: [
        { topic: 'A', semester: 1, year: 2025, discrepancyThreshold: -1, enrollments: [] },
        { topic: 'B', semester: 1, year: 2025, discrepancyThreshold: '3', enrollments: [] },
        { topic: 'C', semester: 1, year: 2025, discrepancyThreshold: 0, enrollments: [] },
        { topic: 'D', semester: 1, year: 2025, discrepancyThreshold: 3, enrollments: [] },
        { topic: 'E', semester: 1, year: 2025, discrepancyThreshold: 1, enrollments: [] }
      ]
    }));
    const classes = new Classes();
    repository.load(new StudentSet(), classes);
    expect(classes.getAllClasses().map(c => c.getDiscrepancyThreshold())).toEqual([2, 2, 0, 2, 1]);
    expect(consoleError).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith('Error loading the discrepancy threshold of class A:', expect.any(Error));
    // A threshold above the maximum, as in a file written by hand, is dropped too
    expect(consoleError).toHaveBeenCalledWith('Error loading the discrepancy threshold of class D:', expect.any(Error));
    consoleError.mockRestore();
  });

  test('load reads averages and absence status when the file has them', () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      students: [{ name: 'Ana Lima', cpf: '12345678901', email: 'ana@cin.ufpe.br' }],
      classes: [{
        topic: 'SE', semester: 1, year: 2025,
        averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
        enrollments: [{ studentCPF: '12345678901', evaluations: [], averageBeforeFinalExam: 7, averageAfterFinalExam: 8, failedByAbsence: true }]
      }]
    }));
    const students = new StudentSet();
    const classes = new Classes();
    repository.load(students, classes);
    const enrollment = classes.findClassById('SE-2025-1')!.getEnrollments()[0];
    expect(enrollment.getAverageBeforeFinalExam()).toBe(7);
    expect(enrollment.getAverageAfterFinalExam()).toBe(8);
    expect(enrollment.getFailedByAbsence()).toBe(true);
    // Files written before the self-assessment existed have neither field
    expect(classes.findClassById('SE-2025-1')!.getSelfAssessmentRequest()).toBeNull();
    expect(enrollment.getSelfAssessments()).toEqual([]);
  });

  test('load drops a self-assessment request with invalid dates, keeping the class and its grades', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      students: [{ name: 'Ana Lima', cpf: '12345678901', email: 'ana@cin.ufpe.br' }],
      classes: [{
        topic: 'SE', semester: 1, year: 2025,
        averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
        selfAssessmentRequest: { deadline: '20/10/2026', sentDate: '2026-10-08' },
        enrollments: [{ studentCPF: '12345678901', evaluations: [], selfAssessments: [{ goal: 'Tests', grade: 'MA' }] }]
      }]
    }));
    const students = new StudentSet();
    const classes = new Classes();
    repository.load(students, classes);
    const classObj = classes.findClassById('SE-2025-1')!;
    expect(classObj.getSelfAssessmentRequest()).toBeNull();
    expect(classObj.getEnrollments()[0].toJSON().selfAssessments).toEqual([{ goal: 'Tests', grade: 'MA' }]);
    expect(consoleError).toHaveBeenCalledWith('Error loading the self-assessment request of class SE:', expect.any(Error));
    consoleError.mockRestore();
  });

  test('load skips invalid records and enrollments of unknown students', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      students: [
        { name: 'Bad', cpf: '123', email: 'bad@x.com' },
        { name: 'Ana Lima', cpf: '12345678901', email: 'ana@cin.ufpe.br' }
      ],
      classes: [{
        topic: 'SE', semester: 1, year: 2025,
        averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
        enrollments: [{ studentCPF: '00000000000', evaluations: [] }, { studentCPF: '12345678901', evaluations: [] }]
      }]
    }));
    const students = new StudentSet();
    const classes = new Classes();
    repository.load(students, classes);
    expect(students.getCount()).toBe(1);
    expect(classes.findClassById('SE-2025-1')!.getEnrollments()).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  test('load tolerates a corrupt file', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{ not json');
    const students = new StudentSet();
    repository.load(students, new Classes());
    expect(students.getCount()).toBe(0);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  test('the committed sample data file is loadable', () => {
    const students = new StudentSet();
    const classes = new Classes();
    new JsonFileRepository(path.resolve(__dirname, '../../data/app-data.json')).load(students, classes);
    expect(students.getCount()).toBeGreaterThan(0);
    expect(classes.getCount()).toBeGreaterThan(0);
  });
});
