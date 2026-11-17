import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { AverageCalculationSpecification } from './AverageCalculationSpecification';
import { DomainError, NotFoundError } from './DomainError';
import { SelfAssessmentRequest } from './SelfAssessmentRequest';
import { EVALUATION_GOALS, Evaluation, Grade, isGoal, isGrade } from './Evaluation';
import { cleanCPF } from './CPF';

/** The discrepancy threshold of a class until the professor changes it. */
export const DEFAULT_DISCREPANCY_THRESHOLD = 2;

/** The greatest discrepancy threshold a class accepts. */
export const MAX_DISCREPANCY_THRESHOLD = 2;

/**
 * A class (offering of a course) given in a semester of a year, identified by
 * 'topic-year-semester', with the enrolled students, the specification of how
 * their averages are computed and, once the professor makes it, the request
 * for the students' self-assessment. A student is enrolled at most once.
 *
 * The discrepancy threshold is the largest discrepancy between the
 * self-assessment and the professor's grades that the class tolerates: a
 * student whose discrepancy is greater than it is discrepant. It is an
 * integer from 0 to MAX_DISCREPANCY_THRESHOLD.
 */
export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private readonly averageCalculationSpecification: AverageCalculationSpecification;
  private enrollments: Enrollment[];
  private selfAssessmentRequest: SelfAssessmentRequest | null = null;
  private discrepancyThreshold: number = DEFAULT_DISCREPANCY_THRESHOLD;

  constructor(topic: string, semester: number, year: number, averageCalculationSpecification: AverageCalculationSpecification, enrollments: Enrollment[] = []) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.averageCalculationSpecification = averageCalculationSpecification;
    this.enrollments = enrollments;
  }

  // Getters
  getTopic(): string {
    return this.topic;
  }

  getSemester(): number {
    return this.semester;
  }

  getYear(): number {
    return this.year;
  }

  getEnrollments(): Enrollment[] {
    return [...this.enrollments]; // Return copy to prevent external modification
  }

  // Generate unique class ID
  getClassId(): string {
    return `${this.topic}-${this.year}-${this.semester}`;
  }

  // Setters for editing
  setTopic(topic: string): void {
    this.topic = topic;
  }

  setSemester(semester: number): void {
    this.semester = semester;
  }

  setYear(year: number): void {
    this.year = year;
  }

  getAverageCalculationSpecification(): AverageCalculationSpecification {
    return this.averageCalculationSpecification;
  }

  // Enrollment management
  addEnrollment(student: Student): Enrollment {
    // Check if student is already enrolled
    const existingEnrollment = this.findEnrollmentByStudentCPF(student.getCPF());
    if (existingEnrollment) {
      throw new DomainError('Student is already enrolled in this class');
    }

    const enrollment = new Enrollment(student);
    this.enrollments.push(enrollment);
    return enrollment;
  }

  removeEnrollment(studentCPF: string): boolean {
    const index = this.enrollments.findIndex(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
    
    if (index === -1) {
      return false;
    }

    this.enrollments.splice(index, 1);
    return true;
  }

  findEnrollmentByStudentCPF(studentCPF: string): Enrollment | undefined {
    return this.enrollments.find(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
  }

  /**
   * Replaces the self-assessment of an enrolled student with the submitted
   * grades, given by goal; a goal given '' or null has no grade. The
   * submission is all or nothing: when any of it is invalid, nothing changes.
   * It is accepted at any time, with or without a self-assessment request.
   */
  submitSelfAssessment(studentCPF: string, grades: unknown): Enrollment {
    const enrollment = this.findEnrollmentByStudentCPF(studentCPF);
    if (!enrollment) {
      throw new NotFoundError('Student not enrolled in this class');
    }
    if (typeof grades !== 'object' || grades === null || Array.isArray(grades)) {
      throw new DomainError('Grades must map each goal to its grade');
    }
    const graded = new Map<string, Grade>();
    for (const [goal, grade] of Object.entries(grades)) {
      if (!isGoal(goal)) {
        throw new DomainError(`${goal} is not a goal of the class`);
      }
      if (grade === '' || grade === null) {
        continue; // a goal without grade
      }
      if (!isGrade(grade)) {
        throw new DomainError('Invalid grade. Must be MANA, MPA, or MA');
      }
      graded.set(goal, grade);
    }
    if (graded.size === 0) {
      throw new DomainError('Assign a grade to at least one goal');
    }
    // Kept in the order of the goals, whatever the order they were sent in
    enrollment.submitSelfAssessment(EVALUATION_GOALS
      .filter(goal => graded.has(goal))
      .map(goal => new Evaluation(goal, graded.get(goal)!)));
    return enrollment;
  }

  /** The self-assessment request of the class, or null while the professor has not made one. */
  getSelfAssessmentRequest(): SelfAssessmentRequest | null {
    return this.selfAssessmentRequest;
  }

  /** Requests the self-assessment of the class, sent on sentDate (ISO dates). */
  requestSelfAssessment(deadline: string, sentDate: string): SelfAssessmentRequest {
    this.selfAssessmentRequest = new SelfAssessmentRequest(deadline, sentDate);
    return this.selfAssessmentRequest;
  }

  /** Withdraws the self-assessment request; tells whether there was one. */
  cancelSelfAssessmentRequest(): boolean {
    const hadRequest = this.selfAssessmentRequest !== null;
    this.selfAssessmentRequest = null;
    return hadRequest;
  }

  getDiscrepancyThreshold(): number {
    return this.discrepancyThreshold;
  }

  /**
   * Changes the discrepancy threshold; anything but an integer from 0 to
   * MAX_DISCREPANCY_THRESHOLD is rejected and the threshold kept.
   */
  setDiscrepancyThreshold(threshold: unknown): void {
    if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0) {
      throw new DomainError('The threshold must be a non-negative integer');
    }
    if (threshold > MAX_DISCREPANCY_THRESHOLD) {
      throw new DomainError(`The threshold must be at most ${MAX_DISCREPANCY_THRESHOLD}`);
    }
    this.discrepancyThreshold = threshold;
  }

  // Get all enrolled students
  getEnrolledStudents(): Student[] {
    return this.enrollments.map(enrollment => enrollment.getStudent());
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.semester,
      year: this.year,
      averageCalculationSpecification: this.averageCalculationSpecification.toJSON(),
      selfAssessmentRequest: this.selfAssessmentRequest ? this.selfAssessmentRequest.toJSON() : null,
      discrepancyThreshold: this.discrepancyThreshold,
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { topic: string; semester: number; year: number; averageCalculationSpecification: any, enrollments: any[], selfAssessmentRequest?: any, discrepancyThreshold?: number }, allStudents: Student[]): Class {
    const enrollments = data.enrollments
      ? data.enrollments.map((enrollmentData: any) => {
          // toJSON writes the CPF formatted, students keep it clean
          const student = allStudents.find(s => s.getCPF() === cleanCPF(enrollmentData.student.cpf));
          if (!student) {
            throw new DomainError(`Student with CPF ${enrollmentData.student.cpf} not found`);
          }
          return Enrollment.fromJSON(enrollmentData, student);
        })
      : [];
    
    // Rebuilds the average calculation specification
    const averageCalculationSpecification = AverageCalculationSpecification.fromJSON(data.averageCalculationSpecification);

    const classObj = new Class(data.topic, data.semester, data.year, averageCalculationSpecification, enrollments);
    if (data.selfAssessmentRequest) {
      classObj.selfAssessmentRequest = SelfAssessmentRequest.fromJSON(data.selfAssessmentRequest);
    }
    // Absent from JSON written before the discrepancy threshold existed
    if (data.discrepancyThreshold !== undefined) {
      classObj.setDiscrepancyThreshold(data.discrepancyThreshold);
    }
    return classObj;
  }
}
