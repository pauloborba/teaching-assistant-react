import { Student } from '../models/Student';
import { StudentSet } from '../models/StudentSet';
import { Evaluation, EVALUATION_GOALS } from '../models/Evaluation';
import { Enrollment } from '../models/Enrollment';
import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { Report } from '../models/Report';
import {
  AverageCalculationSpecification,
  DEFAULT_AVERAGE_CALCULATION_SPECIFICATION
} from '../models/AverageCalculationSpecification';

/**
 * Class (unit) tests for the domain model. They record the behavior observed
 * before refactoring, so that the refactoring can be checked against it.
 */

const ana = () => new Student('Ana Lima', '123.456.789-01', 'ana@cin.ufpe.br');
const bruno = () => new Student('Bruno Melo', '987.654.321-00', 'bruno@cin.ufpe.br');
const newClass = () => new Class('Software Engineering', 1, 2025, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION);

describe('StudentSet', () => {
  let students: StudentSet;
  beforeEach(() => { students = new StudentSet(); });

  test('is initially empty', () => {
    expect(students.getAllStudents()).toEqual([]);
    expect(students.getCount()).toBe(0);
  });

  test('adds students and finds them by clean CPF', () => {
    const added = students.addStudent(ana());
    expect(added.getName()).toBe('Ana Lima');
    expect(students.getCount()).toBe(1);
    expect(students.findStudentByCPF('12345678901')).toBe(added);
    expect(students.findStudentByCPF('123.456.789-01')).toBeUndefined();
  });

  test('rejects a second student with the same CPF', () => {
    students.addStudent(ana());
    expect(() => students.addStudent(new Student('Other', '12345678901', 'o@o.com')))
      .toThrow('Student with this CPF already exists');
    expect(students.getCount()).toBe(1);
  });

  test('updates name and email but never the CPF', () => {
    const original = students.addStudent(ana());
    const updated = students.updateStudent(new Student('Ana Souza', '12345678901', 'souza@cin.ufpe.br'));
    expect(updated).toBe(original);
    expect(original.getName()).toBe('Ana Souza');
    expect(original.getEmail()).toBe('souza@cin.ufpe.br');
    expect(original.getCPF()).toBe('12345678901');
  });

  test('refuses to update an unknown student', () => {
    expect(() => students.updateStudent(ana())).toThrow('Student not found');
  });

  test('removes by clean CPF and reports whether something was removed', () => {
    students.addStudent(ana());
    expect(students.removeStudent('12345678901')).toBe(true);
    expect(students.removeStudent('12345678901')).toBe(false);
    expect(students.getCount()).toBe(0);
  });

  test('getAllStudents returns a copy', () => {
    students.addStudent(ana());
    students.getAllStudents().pop();
    expect(students.getCount()).toBe(1);
  });
});

describe('Evaluation', () => {
  test('stores goal and grade, allows changing the grade, and round-trips through JSON', () => {
    const evaluation = new Evaluation('Design', 'MPA');
    expect(evaluation.getGoal()).toBe('Design');
    expect(evaluation.getGrade()).toBe('MPA');
    evaluation.setGrade('MA');
    expect(evaluation.toJSON()).toEqual({ goal: 'Design', grade: 'MA' });
    expect(Evaluation.fromJSON({ goal: 'Tests', grade: 'MANA' }).toJSON()).toEqual({ goal: 'Tests', grade: 'MANA' });
  });

  test('predefines the six evaluation goals', () => {
    expect(EVALUATION_GOALS).toEqual([
      'Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'
    ]);
  });
});

describe('Enrollment', () => {
  let enrollment: Enrollment;
  beforeEach(() => { enrollment = new Enrollment(ana()); });

  test('starts with no evaluations, null averages and not failed by absence', () => {
    expect(enrollment.getStudent().getName()).toBe('Ana Lima');
    expect(enrollment.getEvaluations()).toEqual([]);
    expect(enrollment.getAverageBeforeFinalExam()).toBeNull();
    expect(enrollment.getAverageAfterFinalExam()).toBeNull();
    expect(enrollment.getFailedByAbsence()).toBe(false);
  });

  test('adds, updates, finds and removes evaluations by goal', () => {
    enrollment.addOrUpdateEvaluation('Design', 'MPA');
    enrollment.addOrUpdateEvaluation('Tests', 'MA');
    enrollment.addOrUpdateEvaluation('Design', 'MA');
    expect(enrollment.getEvaluations().map(e => e.toJSON())).toEqual([
      { goal: 'Design', grade: 'MA' }, { goal: 'Tests', grade: 'MA' }
    ]);
    expect(enrollment.getEvaluationForGoal('Design')?.getGrade()).toBe('MA');
    expect(enrollment.getEvaluationForGoal('Requirements')).toBeUndefined();
    expect(enrollment.removeEvaluation('Design')).toBe(true);
    expect(enrollment.removeEvaluation('Design')).toBe(false);
    expect(enrollment.getEvaluations()).toHaveLength(1);
  });

  test('getEvaluations returns a copy', () => {
    enrollment.addOrUpdateEvaluation('Design', 'MPA');
    enrollment.getEvaluations().pop();
    expect(enrollment.getEvaluations()).toHaveLength(1);
  });

  test('exposes averages and absence status through setters and JSON', () => {
    enrollment.setAverageBeforeFinalExam(7.5);
    enrollment.setAverageAfterFinalExam(8);
    enrollment.setFailedByAbsence(true);
    expect(enrollment.toJSON()).toEqual({
      student: { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' },
      evaluations: [],
      selfAssessments: [],
      averageBeforeFinalExam: 7.5,
      averageAfterFinalExam: 8,
      failedByAbsence: true
    });
  });

  test('average calculation is not implemented yet', () => {
    expect(() => enrollment.calculateAverageBeforeFinalExam()).toThrow('not implemented');
    expect(() => enrollment.calculateAverageAfterFinalExam()).toThrow('not implemented');
  });

  test('fromJSON rebuilds evaluations and optional fields', () => {
    const rebuilt = Enrollment.fromJSON(
      { student: {}, evaluations: [{ goal: 'Design', grade: 'MA' }], averageBeforeFinalExam: 9, failedByAbsence: true },
      ana()
    );
    expect(rebuilt.getEvaluations().map(e => e.toJSON())).toEqual([{ goal: 'Design', grade: 'MA' }]);
    expect(rebuilt.getAverageBeforeFinalExam()).toBe(9);
    expect(rebuilt.getAverageAfterFinalExam()).toBeNull();
    expect(rebuilt.getFailedByAbsence()).toBe(true);
  });
});

describe('Class', () => {
  let softwareEngineering: Class;
  beforeEach(() => { softwareEngineering = newClass(); });

  test('derives its id from topic, year and semester', () => {
    expect(softwareEngineering.getClassId()).toBe('Software Engineering-2025-1');
    softwareEngineering.setTopic('SE');
    softwareEngineering.setYear(2026);
    softwareEngineering.setSemester(2);
    expect(softwareEngineering.getClassId()).toBe('SE-2026-2');
    expect(softwareEngineering.getTopic()).toBe('SE');
    expect(softwareEngineering.getYear()).toBe(2026);
    expect(softwareEngineering.getSemester()).toBe(2);
  });

  test('enrolls students at most once and finds enrollments by CPF', () => {
    const enrollment = softwareEngineering.addEnrollment(ana());
    expect(enrollment.getStudent().getCPF()).toBe('12345678901');
    expect(() => softwareEngineering.addEnrollment(ana())).toThrow('Student is already enrolled in this class');
    expect(softwareEngineering.findEnrollmentByStudentCPF('12345678901')).toBe(enrollment);
    expect(softwareEngineering.findEnrollmentByStudentCPF('98765432100')).toBeUndefined();
    expect(softwareEngineering.getEnrolledStudents().map(s => s.getName())).toEqual(['Ana Lima']);
  });

  test('removes enrollments by CPF', () => {
    softwareEngineering.addEnrollment(ana());
    expect(softwareEngineering.removeEnrollment('12345678901')).toBe(true);
    expect(softwareEngineering.removeEnrollment('12345678901')).toBe(false);
    expect(softwareEngineering.getEnrollments()).toEqual([]);
  });

  test('getEnrollments returns a copy', () => {
    softwareEngineering.addEnrollment(ana());
    softwareEngineering.getEnrollments().pop();
    expect(softwareEngineering.getEnrollments()).toHaveLength(1);
  });

  test('serializes to JSON with its id, specification and enrollments', () => {
    softwareEngineering.addEnrollment(ana());
    expect(softwareEngineering.toJSON()).toEqual({
      id: 'Software Engineering-2025-1',
      topic: 'Software Engineering',
      semester: 1,
      year: 2025,
      averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
      selfAssessmentRequest: null,
      discrepancyThreshold: 2,
      enrollments: [new Enrollment(ana()).toJSON()]
    });
  });

  test('fromJSON resolves enrolled students from the given list', () => {
    const rebuilt = Class.fromJSON({
      topic: 'SE', semester: 2, year: 2024,
      averageCalculationSpecification: DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON(),
      enrollments: [{ student: { cpf: '12345678901' }, evaluations: [] }]
    }, [ana(), bruno()]);
    expect(rebuilt.getClassId()).toBe('SE-2024-2');
    expect(rebuilt.getEnrolledStudents().map(s => s.getName())).toEqual(['Ana Lima']);
    expect(() => Class.fromJSON({
      topic: 'SE', semester: 2, year: 2024, averageCalculationSpecification: {},
      enrollments: [{ student: { cpf: '00000000000' }, evaluations: [] }]
    }, [])).toThrow('Student with CPF 00000000000 not found');
  });
});

describe('Classes', () => {
  let classes: Classes;
  beforeEach(() => { classes = new Classes(); });

  test('adds, finds, counts and removes classes by id', () => {
    const added = classes.addClass(newClass());
    expect(classes.getCount()).toBe(1);
    expect(classes.findClassById('Software Engineering-2025-1')).toBe(added);
    expect(() => classes.addClass(newClass())).toThrow('Class with same topic, year, and semester already exists');
    expect(classes.removeClass('Software Engineering-2025-1')).toBe(true);
    expect(classes.removeClass('Software Engineering-2025-1')).toBe(false);
  });

  test('updateClassIdentification changes topic, semester and year, keeping ids unique', () => {
    const se = classes.addClass(newClass());
    classes.addClass(new Class('Databases', 2, 2024, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    expect(classes.updateClassIdentification('Software Engineering-2025-1', 'SE', 2, 2026)).toBe(se);
    expect(se.getClassId()).toBe('SE-2026-2');
    // same identification as itself is allowed
    classes.updateClassIdentification('SE-2026-2', 'SE', 2, 2026);
    expect(() => classes.updateClassIdentification('SE-2026-2', 'Databases', 2, 2024))
      .toThrow('Class with same topic, year, and semester already exists');
    expect(se.getClassId()).toBe('SE-2026-2');
    expect(() => classes.updateClassIdentification('Nope-1-1', 'X', 1, 2000)).toThrow('Class not found');
  });

  test('getAllClasses returns a copy', () => {
    classes.addClass(newClass());
    classes.getAllClasses().pop();
    expect(classes.getCount()).toBe(1);
  });

  test('filters classes by year and by topic substring (case-insensitive)', () => {
    classes.addClass(newClass());
    classes.addClass(new Class('Databases', 2, 2024, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    expect(classes.findClassesByYear(2024).map(c => c.getTopic())).toEqual(['Databases']);
    expect(classes.findClassesByTopic('software').map(c => c.getTopic())).toEqual(['Software Engineering']);
  });

  test('lists each enrolled student once across classes', () => {
    const se = classes.addClass(newClass());
    const db = classes.addClass(new Class('Databases', 2, 2024, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    se.addEnrollment(ana());
    db.addEnrollment(ana());
    db.addEnrollment(bruno());
    expect(classes.getAllEnrolledStudents().map(s => s.getName())).toEqual(['Ana Lima', 'Bruno Melo']);
  });

  test('updateClass copies fields and merges enrollments and evaluations', () => {
    const existing = classes.addClass(newClass());
    existing.addEnrollment(ana()).addOrUpdateEvaluation('Design', 'MANA');
    const updated = newClass();
    updated.addEnrollment(ana()).addOrUpdateEvaluation('Design', 'MA');
    updated.addEnrollment(bruno()).addOrUpdateEvaluation('Tests', 'MPA');
    expect(classes.updateClass(updated)).toBe(existing);
    expect(existing.findEnrollmentByStudentCPF('12345678901')?.getEvaluationForGoal('Design')?.getGrade()).toBe('MA');
    expect(existing.findEnrollmentByStudentCPF('98765432100')?.getEvaluationForGoal('Tests')?.getGrade()).toBe('MPA');
    expect(() => classes.updateClass(new Class('X', 1, 2000, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION))).toThrow('Class not found');
  });
});

describe('AverageCalculationSpecification', () => {
  const grades = new Map<'MANA' | 'MPA' | 'MA', number>([['MA', 10], ['MPA', 7], ['MANA', 0]]);

  test('computes the weighted average of the grades', () => {
    const spec = new AverageCalculationSpecification(grades, new Map([['Design', 2], ['Tests', 1]]));
    expect(spec.calculateAverage(new Map([['Design', 'MA'], ['Tests', 'MPA']]))).toBeCloseTo((2 * 10 + 1 * 7) / 3);
    expect(spec.calculateAverage(new Map())).toBe(0);
  });

  test('rejects goal weights that sum to zero', () => {
    expect(() => new AverageCalculationSpecification(grades, new Map())).toThrow('The sum of the goal weights cannot be zero.');
  });

  test('is immutable with respect to the maps it was built from', () => {
    const goals = new Map([['Design', 1]]);
    const spec = new AverageCalculationSpecification(grades, goals);
    goals.set('Design', 100);
    expect(spec.toJSON().goalWeights).toEqual({ Design: 1 });
  });

  test('the default specification covers every evaluation goal, so averages can be computed', () => {
    const allMA = new Map(EVALUATION_GOALS.map(goal => [goal, 'MA' as const]));
    expect(DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.calculateAverage(allMA)).toBe(10);
  });

  test('serializes maps as plain objects and reads them back', () => {
    const json = DEFAULT_AVERAGE_CALCULATION_SPECIFICATION.toJSON();
    expect(json).toEqual({
      gradeWeights: { MA: 10, MPA: 7, MANA: 0 },
      goalWeights: { Requirements: 1, 'Configuration Management': 1, 'Project Management': 1, Design: 1, Tests: 1, Refactoring: 1 }
    });
    expect(AverageCalculationSpecification.fromJSON(json).toJSON()).toEqual(json);
  });

  test('fromJSON also accepts the legacy array formats', () => {
    const fromPairs = AverageCalculationSpecification.fromJSON({
      gradeWeights: [['MA', 10], ['MPA', 7], ['MANA', 0]],
      goalWeights: [{ key: 'Design', value: 1 }]
    });
    expect(fromPairs.toJSON()).toEqual({ gradeWeights: { MA: 10, MPA: 7, MANA: 0 }, goalWeights: { Design: 1 } });
  });
});

describe('Report', () => {
  test('is a placeholder that only fills in the class identification', () => {
    const report = new Report(newClass()).generate();
    expect(report).toMatchObject({
      classId: 'Software Engineering-2025-1', topic: 'Software Engineering', semester: 1, year: 2025,
      totalEnrolled: 0, studentsAverage: 0, approvedCount: 0, approvedFinalCount: 0, notApprovedCount: 0,
      evaluationPerformance: [], students: []
    });
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(new Report(newClass()).toJSON()).toMatchObject({ classId: 'Software Engineering-2025-1' });
  });
});
