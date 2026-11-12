import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { AverageCalculationSpecification } from './AverageCalculationSpecification';
import { DomainError, NotFoundError } from './DomainError';
import { SelfAssessmentRequest } from './SelfAssessmentRequest';
import { isGoal, isGrade } from './Evaluation';
import { formatDate } from './Dates';
import { cleanCPF } from './CPF';

/**
 * A class (offering of a course) given in a semester of a year, identified by
 * 'topic-year-semester', with the enrolled students, the specification of how
 * their averages are computed and, once the professor makes it, the request
 * for the students' self-assessment. A student is enrolled at most once.
 */
export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private readonly averageCalculationSpecification: AverageCalculationSpecification;
  private enrollments: Enrollment[];
  private selfAssessmentRequest: SelfAssessmentRequest | null = null;

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

  /** The self-assessment can be changed while there is a request whose deadline has not passed. */
  isSelfAssessmentOpen(today: string): boolean {
    return this.selfAssessmentRequest !== null && this.selfAssessmentRequest.isOpenOn(today);
  }

  /** Stores the grade an enrolled student assigns to themselves for a goal of the class. */
  setSelfAssessment(studentCPF: string, goal: string, grade: unknown, today: string): Enrollment {
    const enrollment = this.selfAssessmentEnrollment(studentCPF, goal, today);
    if (!isGrade(grade)) {
      throw new DomainError('Invalid grade. Must be MANA, MPA, or MA');
    }
    enrollment.setSelfAssessment(goal, grade);
    return enrollment;
  }

  /** Removes the grade an enrolled student assigned to themselves for a goal of the class. */
  removeSelfAssessment(studentCPF: string, goal: string, today: string): Enrollment {
    const enrollment = this.selfAssessmentEnrollment(studentCPF, goal, today);
    enrollment.removeSelfAssessment(goal);
    return enrollment;
  }

  /**
   * The enrollment whose self-assessment is about to change, once checked
   * that the student is enrolled, the goal is evaluated in the class, and
   * the self-assessment is open today.
   */
  private selfAssessmentEnrollment(studentCPF: string, goal: string, today: string): Enrollment {
    const enrollment = this.findEnrollmentByStudentCPF(studentCPF);
    if (!enrollment) {
      throw new NotFoundError('Student not enrolled in this class');
    }
    if (!isGoal(goal)) {
      throw new DomainError(`${goal} is not a goal of the class`);
    }
    if (!this.selfAssessmentRequest) {
      throw new DomainError('The self-assessment of the class was not requested');
    }
    if (!this.selfAssessmentRequest.isOpenOn(today)) {
      throw new DomainError(`The self-assessment deadline ${formatDate(this.selfAssessmentRequest.deadline)} has passed`);
    }
    return enrollment;
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
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { topic: string; semester: number; year: number; averageCalculationSpecification: any, enrollments: any[], selfAssessmentRequest?: any }, allStudents: Student[]): Class {
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
    return classObj;
  }
}
