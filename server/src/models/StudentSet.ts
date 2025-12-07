import { Student } from './Student';

export class StudentSet {
  private students: Student[] = [];

  constructor() {
    
  }

  
  addStudent(student: Student): Student {
    
    if (this.findStudentByCPF(student.cpf)) {
      throw new Error('Student with this CPF already exists');
    }

    this.students.push(student);
    return student;
  }

  
  removeStudent(cpf: string): boolean {
    const index = this.students.findIndex(s => s.cpf === cpf);
    
    if (index === -1) {
      return false;
    }

    this.students.splice(index, 1);
    return true;
  }

  
  updateStudent(updatedStudent: Student): Student {
    
    const existingStudent = this.findStudentByCPF(updatedStudent.cpf);
    
    if (!existingStudent) {
      throw new Error('Student not found');
    }

    
    existingStudent.name = updatedStudent.name;
    existingStudent.email = updatedStudent.email;
    
    
    
    return existingStudent;
  }  
  findStudentByCPF(cpf: string): Student | undefined {
    return this.students.find(s => s.cpf === cpf);
  }

  
  getAllStudents(): Student[] {
    return [...this.students]; 
  }

  
  getCount(): number {
    return this.students.length;
  }
}