import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { EVALUATION_GOALS, Grade, gradeLevel } from '../models/Evaluation';

/** Why the discrepancy of a student could not be computed. */
export type MissingGrades =
  | 'professor grades'
  | 'self-assessment grades'
  | 'professor and self-assessment grades'
  | 'goals graded by both';

interface StudentData {
  name: string;
  cpf: string;
  email: string;
}

export interface StudentDiscrepancy {
  student: StudentData;
  discrepancy: number;
  discrepant: boolean;
}

export interface UncomputableStudent {
  student: StudentData;
  missing: MissingGrades;
}

export interface DiscrepancyReport {
  discrepancyThreshold: number;
  /** The students whose discrepancy could be computed, the greatest discrepancy first. */
  students: StudentDiscrepancy[];
  /** The students whose discrepancy could not be computed, in the order of the enrollments. */
  uncomputable: UncomputableStudent[];
  discrepantCount: number;
  computableCount: number;
  /** Whole percentage of the computable students that are discrepant; 0 when there is none. */
  discrepantPercentage: number;
}

type GradesByGoal = Map<string, Grade>;

/**
 * Finds the students whose self-assessment differs too much from the grades
 * the professor assigned (service). It only reads the class.
 *
 * The divergence of a goal is the number of levels between the two grades
 * (MANA, MPA, MA), and only goals that have both grades count. The
 * discrepancy of a student is the sum of the divergences, and the student is
 * discrepant when it is greater than the discrepancy threshold of the class.
 * A student with no goal graded by both has no discrepancy to compute.
 */
export class DiscrepancyAnalyzer {
  analyze(classObj: Class): DiscrepancyReport {
    const threshold = classObj.getDiscrepancyThreshold();
    const students: StudentDiscrepancy[] = [];
    const uncomputable: UncomputableStudent[] = [];

    for (const enrollment of classObj.getEnrollments()) {
      const student = enrollment.getStudent().toJSON();
      const discrepancy = this.discrepancyOf(enrollment);
      if (discrepancy.kind === 'computed') {
        students.push({ student, discrepancy: discrepancy.value, discrepant: discrepancy.value > threshold });
      } else {
        uncomputable.push({ student, missing: discrepancy.missing });
      }
    }

    students.sort((a, b) => b.discrepancy - a.discrepancy || a.student.name.localeCompare(b.student.name));

    const discrepantCount = students.filter(s => s.discrepant).length;
    return {
      discrepancyThreshold: threshold,
      students,
      uncomputable,
      discrepantCount,
      computableCount: students.length,
      discrepantPercentage: students.length === 0 ? 0 : Math.round((100 * discrepantCount) / students.length)
    };
  }

  private discrepancyOf(enrollment: Enrollment):
    { kind: 'computed'; value: number } | { kind: 'missing'; missing: MissingGrades } {
    const professor = this.gradesByGoal(enrollment.getEvaluations());
    const self = this.gradesByGoal(enrollment.getSelfAssessments());

    let value = 0;
    let goalsInCommon = 0;
    for (const goal of EVALUATION_GOALS) {
      const professorGrade = professor.get(goal);
      const selfGrade = self.get(goal);
      if (professorGrade !== undefined && selfGrade !== undefined) {
        value += Math.abs(gradeLevel(selfGrade) - gradeLevel(professorGrade));
        goalsInCommon++;
      }
    }
    if (goalsInCommon > 0) {
      return { kind: 'computed', value };
    }

    if (professor.size === 0 && self.size === 0) {
      return { kind: 'missing', missing: 'professor and self-assessment grades' };
    }
    if (professor.size === 0) {
      return { kind: 'missing', missing: 'professor grades' };
    }
    if (self.size === 0) {
      return { kind: 'missing', missing: 'self-assessment grades' };
    }
    return { kind: 'missing', missing: 'goals graded by both' };
  }

  /** The grades by goal, ignoring any goal that is not one of the goals of the class. */
  private gradesByGoal(evaluations: { getGoal(): string; getGrade(): Grade }[]): GradesByGoal {
    const grades: GradesByGoal = new Map();
    for (const evaluation of evaluations) {
      if ((EVALUATION_GOALS as readonly string[]).includes(evaluation.getGoal())) {
        grades.set(evaluation.getGoal(), evaluation.getGrade());
      }
    }
    return grades;
  }
}
