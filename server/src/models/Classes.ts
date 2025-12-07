import { Class } from './Class';
import { Student } from './Student';

export class Classes {
  private classes: Class[] = [];

  constructor() {
    
  }

  
  addClass(classObj: Class): Class {
    
    if (this.findClassById(classObj.getClassId())) {
      throw new Error('Class with same topic, year, and semester already exists');
    }

    this.classes.push(classObj);
    return classObj;
  }

  
  removeClass(classId: string): boolean {
    const index = this.classes.findIndex(c => c.getClassId() === classId);
    
    if (index === -1) {
      return false;
    }

    this.classes.splice(index, 1);
    return true;
  }

  
  updateClass(updatedClass: Class): Class {
    const existingClass = this.findClassById(updatedClass.getClassId());
    
    if (!existingClass) {
      throw new Error('Class not found');
    }

    
    existingClass.setTopic(updatedClass.getTopic());
    existingClass.setSemester(updatedClass.getSemester());
    existingClass.setYear(updatedClass.getYear());
    
    
    const updatedEnrollments = updatedClass.getEnrollments();
    const existingEnrollments = existingClass.getEnrollments();
    
   
    updatedEnrollments.forEach(updatedEnrollment => {
      const studentCPF = updatedEnrollment.getStudent().getCPF();
      const existingEnrollment = existingClass.findEnrollmentByStudentCPF(studentCPF);
      
      if (existingEnrollment) {
        
        const updatedEvaluations = updatedEnrollment.getEvaluations();
        updatedEvaluations.forEach(evaluation => {
          existingEnrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
        });
      } else {
        
        try {
          existingClass.addEnrollment(updatedEnrollment.getStudent());
          const newEnrollment = existingClass.findEnrollmentByStudentCPF(studentCPF);
          if (newEnrollment) {
            
            const updatedEvaluations = updatedEnrollment.getEvaluations();
            updatedEvaluations.forEach(evaluation => {
              newEnrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
            });
          }
        } catch (error) {
          
          console.warn(`Could not add enrollment for student ${studentCPF}: ${error}`);
        }
      }
    });
    
    return existingClass;
  }


  findClassById(classId: string): Class | undefined {
    return this.classes.find(c => c.getClassId() === classId);
  }

  
  getAllClasses(): Class[] {
    return [...this.classes]; 
  }

  
  getCount(): number {
    return this.classes.length;
  }

  
  findClassesByYear(year: number): Class[] {
    return this.classes.filter(c => c.getYear() === year);
  }

  
  findClassesByTopic(topic: string): Class[] {
    return this.classes.filter(c => c.getTopic().toLowerCase().includes(topic.toLowerCase()));
  }

  
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