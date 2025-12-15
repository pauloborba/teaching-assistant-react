import { Class } from './Class';
import { Enrollment } from './Enrollment';
import { Student } from './Student';

export class Classes {
  private classes: Class[] = [];

  constructor() {
    // Classes management is independent of persistence
  }

  // Add a new class
  addClass(classObj: Class): Class {
    // Check if class already exists (same topic, year, semester)
    if (this.findClassById(classObj.getClassId())) {
      throw new Error('Class with same topic, year, and semester already exists');
    }

    this.classes.push(classObj);
    return classObj;
  }

  // Remove class by ID
  removeClass(classId: string): boolean {
    const index = this.classes.findIndex(c => c.getClassId() === classId);
    
    if (index === -1) {
      return false;
    }

    this.classes.splice(index, 1);
    return true;
  }

  // Update class
  updateClass(updatedClass: Class): Class {
    const existingClass = this.findClassById(updatedClass.getClassId());
    
    if (!existingClass) {
      throw new Error('Class not found');
    }

    // Update basic fields of the existing class object
    existingClass.setTopic(updatedClass.getTopic());
    existingClass.setSemester(updatedClass.getSemester());
    existingClass.setYear(updatedClass.getYear());
    
    // Update enrollments: merge existing with updated enrollments
    const updatedEnrollments = updatedClass.getEnrollments();
    const existingEnrollments = existingClass.getEnrollments();
    
    // Process each updated enrollment
    updatedEnrollments.forEach(updatedEnrollment => {
      const studentCPF = updatedEnrollment.getStudent().getCPF();
      const existingEnrollment = existingClass.findEnrollmentByStudentCPF(studentCPF);
      
      if (existingEnrollment) {
        // Update existing enrollment's evaluations and self-evaluations
        existingEnrollment.mergeEvaluationsFrom(updatedEnrollment);
        existingEnrollment.mergeSelfEvaluationsFrom(updatedEnrollment);
      } else {
        // Add new enrollment that doesn't exist yet
        try {
          existingClass.addEnrollment(updatedEnrollment.getStudent());
          const newEnrollment = existingClass.findEnrollmentByStudentCPF(studentCPF);
          if (newEnrollment) {
            // Copy over evaluations and self-evaluations from updated enrollment
            newEnrollment.mergeEvaluationsFrom(updatedEnrollment);
            newEnrollment.mergeSelfEvaluationsFrom(updatedEnrollment);
          }
        } catch (error) {
          // Enrollment already exists, this shouldn't happen but handle gracefully
          console.warn(`Could not add enrollment for student ${studentCPF}: ${error}`);
        }
      }
    });
    
    return existingClass;
  }

  // Find class by ID
  findClassById(classId: string): Class | undefined {
    return this.classes.find(c => c.getClassId() === classId);
  }

  // Get all classes
  getAllClasses(): Class[] {
    return [...this.classes]; // Return a copy to prevent external modification
  }

  // Get classes count
  getCount(): number {
    return this.classes.length;
  }

  // Find classes by year
  findClassesByYear(year: number): Class[] {
    return this.classes.filter(c => c.getYear() === year);
  }

  // Find classes by topic
  findClassesByTopic(topic: string): Class[] {
    return this.classes.filter(c => c.getTopic().toLowerCase().includes(topic.toLowerCase()));
  }

  // Get all students enrolled in any class
  getAllEnrolledStudents(): Student[] {
    const students: Student[] = [];
    const seenCPFs = new Set<string>();

    this.classes.forEach(classObj => {
      classObj.getEnrolledStudents().forEach(student => {
        if (!seenCPFs.has(student.getCPF())) {
          seenCPFs.add(student.getCPF());
          students.push(student);
        }
      });
    });

    return students;
  }
}