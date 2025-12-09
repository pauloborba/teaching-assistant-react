import { Class } from './Class';
import { Enrollment } from './Enrollment';
import { Grade } from './Evaluation';
import { StudentStatus, IApprovalCriteria, DefaultApprovalCriteria } from './ApprovalCriteria';

export { StudentStatus } from './ApprovalCriteria';

export interface EvaluationPerformance {
  goal: string;
  averageGrade: number | null;
  gradeDistribution: {
    MANA: number;
    MPA: number;
    MA: number;
  };
  evaluatedStudents: number;
}

export interface StudentEntry {
  studentId: string;
  name: string;
  finalGrade: number | null;
  status: StudentStatus;
}

export interface ReportData {
  classId: string;
  topic: string;
  semester: number;
  year: number;
  totalEnrolled: number;
  studentsAverage: number | null;
  approvedCount: number;
  approvedFinalCount: number;
  notApprovedCount: number;
  failedByAbsenceCount: number;
  pendingCount: number;
  evaluationPerformance: EvaluationPerformance[];
  students: StudentEntry[];
  generatedAt: Date;
}

export interface IReportGenerator {
  generate(): ReportData;
  
  toJSON(): ReportData;
}

export class Report implements IReportGenerator {
  private classObj: Class;
  private approvalCriteria: IApprovalCriteria;

  constructor(classObj: Class, approvalCriteria: IApprovalCriteria = new DefaultApprovalCriteria()) {
    this.classObj = classObj;
    this.approvalCriteria = approvalCriteria;
  }

  // Gets the grade values from the class specification or returns defaults.
  private getGradeValues(): Record<Grade, number> {
    const defaultValues: Record<Grade, number> = {
      'MA': 10,
      'MPA': 7,
      'MANA': 0
    };

    try {
      const especificacao = this.classObj.getEspecificacaoDoCalculoDaMedia();
      const json = especificacao.toJSON();
      if (json.pesosDosConceitos) {
        return {
          'MA': json.pesosDosConceitos['MA'] ?? defaultValues['MA'],
          'MPA': json.pesosDosConceitos['MPA'] ?? defaultValues['MPA'],
          'MANA': json.pesosDosConceitos['MANA'] ?? defaultValues['MANA']
        };
      }
    } catch {
      // Use default values
    }

    return defaultValues;
  }

  // Calculates the student average. Returns null if no grade data is available.
  private calculateStudentAverage(enrollment: Enrollment): number | null {
    const mediaPreFinal = enrollment.getMediaPreFinal();
    if (mediaPreFinal !== null && mediaPreFinal !== 0) {
      return mediaPreFinal;
    }

    const evaluations = enrollment.getEvaluations();
    
    if (evaluations.length === 0) {
      return null;
    }

    const notasDasMetas = new Map<string, Grade>();
    evaluations.forEach(evaluation => {
      notasDasMetas.set(evaluation.getGoal(), evaluation.getGrade());
    });

    try {
      const especificacao = this.classObj.getEspecificacaoDoCalculoDaMedia();
      const result = especificacao.calc(notasDasMetas);

      if (!isNaN(result)) {
        return result;
      }
    } catch {
      // Fall through to simple average calculation
    }

    const gradeValues = this.getGradeValues();

    const totalGrade = evaluations.reduce((sum, evaluation) => {
      return sum + gradeValues[evaluation.getGrade()];
    }, 0);

    return totalGrade / evaluations.length;
  }
   
  // Gets the student's final grade. Returns null if no grade data is available.
  private getStudentFinalGrade(enrollment: Enrollment): number | null {
    const mediaPosFinal = enrollment.getMediaPosFinal();
    if (mediaPosFinal !== null && mediaPosFinal !== 0) {
      return mediaPosFinal;
    }
    return this.calculateStudentAverage(enrollment);
  }

  // Calculates the class average. Returns null if no students have finalized grades.
  // Only includes students who are not PENDING.
  private calculateClassAverage(): number | null {
    const enrollments = this.classObj.getEnrollments();
    
    if (enrollments.length === 0) {
      return null;
    }

    const gradesWithData = enrollments
      .filter(enrollment => this.getStudentStatus(enrollment) !== 'PENDING')
      .map(enrollment => this.getStudentFinalGrade(enrollment))
      .filter((grade): grade is number => grade !== null);

    if (gradesWithData.length === 0) {
      return null;
    }

    const totalAverage = gradesWithData.reduce((sum, grade) => sum + grade, 0);
    return Math.round((totalAverage / gradesWithData.length) * 100) / 100;
  }

  // Determines the student status using the configured approval criteria strategy.
  private getStudentStatus(enrollment: Enrollment): StudentStatus {
    const mediaPreFinal = this.calculateStudentAverage(enrollment);
    return this.approvalCriteria.determineStatus(enrollment, mediaPreFinal);
  }

  private calculateApprovalStats(): { approved: number;
                                      approvedFinal: number; 
                                      notApproved: number; 
                                      failedByAbsence: number; 
                                      pending: number } {
    const enrollments = this.classObj.getEnrollments();
    
    let approved = 0;
    let approvedFinal = 0;
    let notApproved = 0;
    let failedByAbsence = 0;
    let pending = 0;

    enrollments.forEach(enrollment => {
      const status = this.getStudentStatus(enrollment);
      if (status === 'APPROVED') {
        approved++;
      } else if (status === 'APPROVED_FINAL') {
        approvedFinal++;
      } else if (status === 'FAILED_BY_ABSENCE') {
        failedByAbsence++;
      } else if (status === 'PENDING') {
        pending++;
      } else {
        notApproved++;
      }
    });

    return { approved, approvedFinal, notApproved, failedByAbsence, pending };
  }

  private calculateEvaluationPerformance(): EvaluationPerformance[] { 
    const enrollments = this.classObj.getEnrollments();
    const goalMap = new Map<string, {
      grades: Grade[];
      gradeDistribution: { MANA: number; MPA: number; MA: number };
    }>();

    enrollments.forEach(enrollment => {
      const evaluations = enrollment.getEvaluations();
      evaluations.forEach(evaluation => {
        const goal = evaluation.getGoal();
        const grade = evaluation.getGrade();

        if (!goalMap.has(goal)) {
          goalMap.set(goal, {
            grades: [],
            gradeDistribution: { MANA: 0, MPA: 0, MA: 0 }
          });
        }

        const goalData = goalMap.get(goal)!;
        goalData.grades.push(grade);
        goalData.gradeDistribution[grade]++;
      });
    });

    const gradeValues = this.getGradeValues();
    const performance: EvaluationPerformance[] = [];

    goalMap.forEach((data, goal) => {
      const totalGrade = data.grades.reduce((sum, grade) => {
        return sum + gradeValues[grade];
      }, 0);

      const averageGrade = data.grades.length > 0 ? totalGrade / data.grades.length : null;

      performance.push({
        goal,
        averageGrade: averageGrade !== null ? Math.round(averageGrade * 100) / 100 : null,
        gradeDistribution: data.gradeDistribution,
        evaluatedStudents: data.grades.length
      });
    });

    return performance.sort((a, b) => a.goal.localeCompare(b.goal));
  }

  private getStudentReports(): StudentEntry[] {
    const enrollments = this.classObj.getEnrollments();
    
    return enrollments.map(enrollment => {
      const student = enrollment.getStudent();
      const status = this.getStudentStatus(enrollment);
      
      // Don't show final grade for pending students
      let finalGrade: number | null = null;
      if (status !== 'PENDING') {
        const rawGrade = this.getStudentFinalGrade(enrollment);
        finalGrade = rawGrade !== null ? Math.round(rawGrade * 100) / 100 : null;
      }
      
      return {
        studentId: student.getCPF(),
        name: student.name,
        finalGrade,
        status
      };
    });
  }

  /**
   * Generates the full class report.
   * @returns ReportData object compliant with the interface.
   */
  public generate(): ReportData {
    const enrollments = this.classObj.getEnrollments();
    const approvalStats = this.calculateApprovalStats();
    const evaluationPerformance = this.calculateEvaluationPerformance();
    const students = this.getStudentReports();
    const classAverage = this.calculateClassAverage();

    return {
      classId: this.classObj.getClassId(),
      topic: this.classObj.getTopic(),
      semester: this.classObj.getSemester(),
      year: this.classObj.getYear(),
      totalEnrolled: enrollments.length,
      studentsAverage: classAverage,
      approvedCount: approvalStats.approved,
      approvedFinalCount: approvalStats.approvedFinal,
      notApprovedCount: approvalStats.notApproved,
      failedByAbsenceCount: approvalStats.failedByAbsence,
      pendingCount: approvalStats.pending,
      evaluationPerformance,
      students,
      generatedAt: new Date()
    };
  }

  public toJSON(): ReportData {
    return this.generate();
  }
}
