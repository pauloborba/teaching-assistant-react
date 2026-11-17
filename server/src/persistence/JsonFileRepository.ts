import * as fs from 'fs';
import * as path from 'path';
import { AppStateRepository } from './AppStateRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { AverageCalculationSpecification } from '../models/AverageCalculationSpecification';

/**
 * Keeps the application state in a single JSON file.
 *
 * File format:
 * {
 *   "students": [{ "name", "cpf" (11 digits), "email" }],
 *   "classes": [{
 *     "topic", "semester", "year", "averageCalculationSpecification",
 *     "selfAssessmentRequest": { "deadline", "sentDate" } (yyyy-mm-dd) or null,
 *     "discrepancyThreshold" (integer from 0 to 2),
 *     "enrollments": [{
 *       "studentCPF" (11 digits), "evaluations": [{ "goal", "grade" }],
 *       "selfAssessments": [{ "goal", "grade" }],
 *       "averageBeforeFinalExam", "averageAfterFinalExam" (numbers or null), "failedByAbsence" (boolean)
 *     }]
 *
 * Files written before these fields were renamed to English are also read:
 * especificacaoDoCalculoDaMedia, mediaPreFinal, mediaPosFinal and
 * reprovadoPorFalta are accepted as the previous names of, respectively,
 * averageCalculationSpecification, averageBeforeFinalExam,
 * averageAfterFinalExam and failedByAbsence. Files written before the
 * self-assessment existed have no selfAssessmentRequest nor selfAssessments:
 * the class is then read without request and the enrollments without grades.
 * Files written before the discrepancies existed have no discrepancyThreshold:
 * the class is then read with the default threshold.
 *   }]
 * }
 *
 * Loading is lenient: entries that cannot be rebuilt are reported on the
 * console and skipped, so that one bad record does not prevent the server
 * from starting.
 */
export class JsonFileRepository implements AppStateRepository {
  constructor(private readonly filePath: string) {}

  save(students: StudentSet, classes: Classes): void {
    try {
      const data = {
        students: students.getAllStudents().map(student => ({
          name: student.getName(),
          cpf: student.getCPF(),
          email: student.getEmail()
        })),
        classes: classes.getAllClasses().map(classObj => ({
          topic: classObj.getTopic(),
          semester: classObj.getSemester(),
          year: classObj.getYear(),
          averageCalculationSpecification: classObj.getAverageCalculationSpecification().toJSON(),
          selfAssessmentRequest: classObj.getSelfAssessmentRequest()?.toJSON() ?? null,
          discrepancyThreshold: classObj.getDiscrepancyThreshold(),
          enrollments: classObj.getEnrollments().map(enrollment => ({
            studentCPF: enrollment.getStudent().getCPF(),
            evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON()),
            selfAssessments: enrollment.getSelfAssessments().map(evaluation => evaluation.toJSON()),
            averageBeforeFinalExam: enrollment.getAverageBeforeFinalExam(),
            averageAfterFinalExam: enrollment.getAverageAfterFinalExam(),
            failedByAbsence: enrollment.getFailedByAbsence()
          }))
        }))
      };

      this.ensureDataDirectory();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving students to file:', error);
    }
  }

  load(students: StudentSet, classes: Classes): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      this.loadStudents(data, students);
      this.loadClasses(data, students, classes);
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadStudents(data: any, students: StudentSet): void {
    if (!Array.isArray(data.students)) {
      return;
    }
    data.students.forEach((studentData: any) => {
      try {
        students.addStudent(new Student(studentData.name, studentData.cpf, studentData.email));
      } catch (error) {
        console.error(`Error adding student ${studentData.name}:`, error);
      }
    });
  }

  private loadClasses(data: any, students: StudentSet, classes: Classes): void {
    if (!Array.isArray(data.classes)) {
      return;
    }
    data.classes.forEach((classData: any) => {
      try {
        const classObj = new Class(
          classData.topic,
          classData.semester,
          classData.year,
          // averageCalculationSpecification was named
          // especificacaoDoCalculoDaMedia in files written by previous versions
          AverageCalculationSpecification.fromJSON(
            classData.averageCalculationSpecification ?? classData.especificacaoDoCalculoDaMedia
          )
        );
        this.loadSelfAssessmentRequest(classData, classObj);
        this.loadDiscrepancyThreshold(classData, classObj);
        classes.addClass(classObj);
        this.loadEnrollments(classData, classObj, students);
      } catch (error) {
        console.error(`Error adding class ${classData.topic}:`, error);
      }
    });
  }

  /** A request with invalid dates is reported and dropped; the class is still loaded. */
  private loadSelfAssessmentRequest(classData: any, classObj: Class): void {
    if (!classData.selfAssessmentRequest) {
      return;
    }
    const { deadline, sentDate } = classData.selfAssessmentRequest;
    try {
      classObj.requestSelfAssessment(deadline, sentDate);
    } catch (error) {
      console.error(`Error loading the self-assessment request of class ${classData.topic}:`, error);
    }
  }

  /** An invalid threshold is reported and dropped; the class keeps the default one. */
  private loadDiscrepancyThreshold(classData: any, classObj: Class): void {
    if (classData.discrepancyThreshold === undefined) {
      return;
    }
    try {
      classObj.setDiscrepancyThreshold(classData.discrepancyThreshold);
    } catch (error) {
      console.error(`Error loading the discrepancy threshold of class ${classData.topic}:`, error);
    }
  }

  private loadEnrollments(classData: any, classObj: Class, students: StudentSet): void {
    if (!Array.isArray(classData.enrollments)) {
      return;
    }
    classData.enrollments.forEach((enrollmentData: any) => {
      const student = students.findStudentByCPF(enrollmentData.studentCPF);
      if (!student) {
        console.error(`Student with CPF ${enrollmentData.studentCPF} not found for enrollment`);
        return;
      }
      const enrollment = classObj.addEnrollment(student);
      if (Array.isArray(enrollmentData.evaluations)) {
        enrollmentData.evaluations.forEach((evalData: any) => {
          const evaluation = Evaluation.fromJSON(evalData);
          enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
        });
      }
      if (Array.isArray(enrollmentData.selfAssessments)) {
        enrollment.submitSelfAssessment(enrollmentData.selfAssessments.map((evalData: any) => Evaluation.fromJSON(evalData)));
      }
      // Averages and attendance status, when present in the file. The names
      // on the right of each ?? are the ones used by previous versions.
      const averageBeforeFinalExam = enrollmentData.averageBeforeFinalExam ?? enrollmentData.mediaPreFinal;
      const averageAfterFinalExam = enrollmentData.averageAfterFinalExam ?? enrollmentData.mediaPosFinal;
      const failedByAbsence = enrollmentData.failedByAbsence ?? enrollmentData.reprovadoPorFalta;
      if (typeof averageBeforeFinalExam !== 'undefined') {
        enrollment.setAverageBeforeFinalExam(averageBeforeFinalExam);
      }
      if (typeof averageAfterFinalExam !== 'undefined') {
        enrollment.setAverageAfterFinalExam(averageAfterFinalExam);
      }
      if (typeof failedByAbsence !== 'undefined') {
        enrollment.setFailedByAbsence(Boolean(failedByAbsence));
      }
    });
  }
}
