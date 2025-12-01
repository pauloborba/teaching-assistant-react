import { Student } from './Student';

export class StudentSet {
  private students: Student[] = [];

  constructor() {
    // StudentSet is now independent of persistence
  }

  // Add a new student
  addStudent(student: Student): Student {
    // Check if CPF already exists (student.cpf is already clean)
    if (this.findStudentByCPF(student.cpf)) {
      throw new Error('Student with this CPF already exists');
    }

    this.students.push(student);
    return student;
  }

  // Remove student by CPF (expects clean CPF)
  removeStudent(cpf: string): boolean {
    const index = this.students.findIndex(s => s.cpf === cpf);
    
    if (index === -1) {
      return false;
    }

    this.students.splice(index, 1);
    return true;
  }

  // Update student by CPF
  updateStudent(updatedStudent: Student): Student {
    // updatedStudent.cpf is already clean
    const existingStudent = this.findStudentByCPF(updatedStudent.cpf);
    
    if (!existingStudent) {
      throw new Error('Student not found');
    }

    // Update basic fields only - evaluations are now handled through enrollments
    existingStudent.name = updatedStudent.name;
    existingStudent.email = updatedStudent.email;
    
    // CPF should not be updated as it's the identifier
    
    return existingStudent;
  }  // Find student by CPF (expects clean CPF)
  findStudentByCPF(cpf: string): Student | undefined {
    return this.students.find(s => s.cpf === cpf);
  }

  // Get all students
  getAllStudents(): Student[] {
    return [...this.students]; // Return a copy to prevent external modification
  }

  // Get students count
  getCount(): number {
    return this.students.length;
  }

  // Clear all students (for testing)
  clear(): void {
    this.students = [];
  }
}