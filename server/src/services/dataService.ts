import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions for new data structures
export interface Exam {
  id: number;
  classId: string;
  title: string;
  isValid: boolean;
  openQuestions: number;
  closedQuestions: number;
  questions: number[];
}

export interface QuestionOption {
  id: number;
  option: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  question: string;
  topic: string;
  type: 'open' | 'closed';
  options?: QuestionOption[];
  answer?: string;
}

export interface StudentAnswer {
  questionId: number;
  answer: string;
}

export interface StudentExam {
  id: number;
  studentCPF: string;
  examId: number;
  answers: StudentAnswer[];
}

// In-memory storage with file persistence
export const studentSet = new StudentSet();
export const classes = new Classes();
export const exams: Exam[] = [];
export const questions: Question[] = [];
export const studentsExams: StudentExam[] = [];

// File paths
export const dataFile = path.resolve('./data/app-data.json');
export const examsFile = path.resolve('./data/exams.json');
export const questionsFile = path.resolve('./data/questions.json');
export const studentsExamsFile = path.resolve('./data/students-exams.json');

// Persistence functions
const ensureDataDirectory = (filePath: string): void => {
  const dataDir = path.dirname(filePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

export const saveDataToFile = (): void => {
  try {
    const data = {
      students: studentSet.getAllStudents().map(student => ({
        name: student.name,
        cpf: student.getCPF(),
        email: student.email
      })),
      classes: classes.getAllClasses().map(classObj => ({
        topic: classObj.getTopic(),
        semester: classObj.getSemester(),
        year: classObj.getYear(),
        enrollments: classObj.getEnrollments().map(enrollment => ({
          studentCPF: enrollment.getStudent().getCPF(),
          evaluations: enrollment.getEvaluations().map(evaluation => evaluation.toJSON())
        }))
      }))
    };
    
    ensureDataDirectory(dataFile);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving app data to file:', error);
  }
};

export const saveExamsToFile = (): void => {
  try {
    const data = {
      exams: exams
    };
    
    ensureDataDirectory(examsFile);
    fs.writeFileSync(examsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving exams to file:', error);
  }
};

export const saveQuestionsToFile = (): void => {
  try {
    const data = {
      questions: questions
    };
    
    ensureDataDirectory(questionsFile);
    fs.writeFileSync(questionsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving questions to file:', error);
  }
};

export const saveStudentsExamsToFile = (): void => {
  try {
    const data = {
      studentsExams: studentsExams
    };
    
    ensureDataDirectory(studentsExamsFile);
    fs.writeFileSync(studentsExamsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving students exams to file:', error);
  }
};

// Load data from file
export const loadDataFromFile = (): void => {
  try {
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Load students
      if (data.students && Array.isArray(data.students)) {
        data.students.forEach((studentData: any) => {
          // Create student with basic info only - evaluations handled through enrollments
          const student = new Student(
            studentData.name,
            studentData.cpf,
            studentData.email
          );
          
          try {
            studentSet.addStudent(student);
          } catch (error) {
            console.error(`Error adding student ${studentData.name}:`, error);
          }
        });
      }

      // Load classes with enrollments
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach((classData: any) => {
          try {
            const classObj = new Class(classData.topic, classData.semester, classData.year);
            classes.addClass(classObj);

            // Load enrollments for this class
            if (classData.enrollments && Array.isArray(classData.enrollments)) {
              classData.enrollments.forEach((enrollmentData: any) => {
                const student = studentSet.findStudentByCPF(enrollmentData.studentCPF);
                if (student) {
                  const enrollment = classObj.addEnrollment(student);
                  
                  // Load evaluations for this enrollment
                  if (enrollmentData.evaluations && Array.isArray(enrollmentData.evaluations)) {
                    enrollmentData.evaluations.forEach((evalData: any) => {
                      const evaluation = Evaluation.fromJSON(evalData);
                      enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
                    });
                  }
                } else {
                  console.error(`Student with CPF ${enrollmentData.studentCPF} not found for enrollment`);
                }
              });
            }
          } catch (error) {
            console.error(`Error adding class ${classData.topic}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading app data from file:', error);
  }
};

export const loadExamsFromFile = (): void => {
  try {
    if (fs.existsSync(examsFile)) {
      const fileContent = fs.readFileSync(examsFile, 'utf-8');
      const data = JSON.parse(fileContent);
      
      if (data.exams && Array.isArray(data.exams)) {
        exams.length = 0; // Clear existing exams
        exams.push(...data.exams);
      }
    }
  } catch (error) {
    console.error('Error loading exams from file:', error);
  }
};

export const loadQuestionsFromFile = (): void => {
  try {
    if (fs.existsSync(questionsFile)) {
      const fileContent = fs.readFileSync(questionsFile, 'utf-8');
      const data = JSON.parse(fileContent);
      
      if (data.questions && Array.isArray(data.questions)) {
        questions.length = 0; // Clear existing questions
        questions.push(...data.questions);
      }
    }
  } catch (error) {
    console.error('Error loading questions from file:', error);
  }
};

export const loadStudentsExamsFromFile = (): void => {
  try {
    if (fs.existsSync(studentsExamsFile)) {
      const fileContent = fs.readFileSync(studentsExamsFile, 'utf-8');
      const data = JSON.parse(fileContent);
      
      if (data.studentsExams && Array.isArray(data.studentsExams)) {
        studentsExams.length = 0; // Clear existing students exams
        studentsExams.push(...data.studentsExams);
      }
    }
  } catch (error) {
    console.error('Error loading students exams from file:', error);
  }
};

// Load all data files
export const loadAllData = (): void => {
  loadDataFromFile();
  loadExamsFromFile();
  loadQuestionsFromFile();
  loadStudentsExamsFromFile();
};

// Trigger save after any modification (async to not block operations)
export const triggerSave = (): void => {
  setImmediate(() => {
    saveDataToFile();
  });
};

export const triggerSaveExams = (): void => {
  setImmediate(() => {
    saveExamsToFile();
  });
};

export const triggerSaveQuestions = (): void => {
  setImmediate(() => {
    saveQuestionsToFile();
  });
};

export const triggerSaveStudentsExams = (): void => {
  setImmediate(() => {
    saveStudentsExamsToFile();
  });
};

// Helper function to clean CPF
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[.-]/g, '');
};

