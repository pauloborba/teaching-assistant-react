import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { Exams, ExamRecord, StudentExamRecord } from '../models/Exams';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions for new data structures
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

// In-memory storage with file persistence
export const studentSet = new StudentSet();
export const classes = new Classes();
export const examsManager = new Exams();
export const questions: Question[] = [];
export const responses: any[] = [];

// File paths
export const dataFile = path.resolve('./data/app-data.json');
export const examsFile = path.resolve('./data/exams.json');
export const questionsFile = path.resolve('./data/questions.json');
export const studentsExamsFile = path.resolve('./data/students-exams.json');
export const responsesFile = path.resolve('./data/responses.json');

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
    const data = examsManager.toJSON();
    
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
      studentsExams: examsManager.getAllStudentExams()
    };
    
    ensureDataDirectory(studentsExamsFile);
    fs.writeFileSync(studentsExamsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving students exams to file:', error);
  }
};

export const saveResponsesToFile = (): void => {
  try {
    const data = {
      responses: responses
    };

    ensureDataDirectory(responsesFile);
    fs.writeFileSync(responsesFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving responses to file:', error);
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
        data.exams.forEach((exam: ExamRecord) => {
          examsManager.addExam(exam);
        });
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
        data.studentsExams.forEach((studentExam: StudentExamRecord) => {
          examsManager.addStudentExam(studentExam);
        });
      }
    }
  } catch (error) {
    console.error('Error loading students exams from file:', error);
  }
};

export const loadResponsesFromFile = (): void => {
  try {
    if (fs.existsSync(responsesFile)) {
      const fileContent = fs.readFileSync(responsesFile, 'utf-8');
      const data = JSON.parse(fileContent);

      if (data.responses && Array.isArray(data.responses)) {
        responses.length = 0;
        responses.push(...data.responses);
      }
    }
  } catch (error) {
    console.error('Error loading responses from file:', error);
  }
};

// Load all data files
export const loadAllData = (): void => {
  loadDataFromFile();
  loadExamsFromFile();
  loadQuestionsFromFile();
  loadStudentsExamsFromFile();
  loadResponsesFromFile();
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
  // Deprecated: keep function for compatibility but persist responses only
  setImmediate(() => {
    // Save to responses.json instead of students-exams.json
    saveResponsesToFile();
  });
};

export const triggerSaveResponses = (): void => {
  setImmediate(() => {
    saveResponsesToFile();
  });
};

// Helper function to clean CPF
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[.-]/g, '');
};

// Helper functions for Exams manager
export const getExamsForClass = (classId: string): ExamRecord[] => {
  return examsManager.getExamsByClassId(classId);
};

export const getStudentsWithExamsForClass = (
  classId: string,
  examId?: number
): any[] => {
  const classObj = classes.findClassById(classId);
  if (!classObj) {
    return [];
  }
  const enrolledStudents = classObj.getEnrolledStudents();
  return examsManager.getStudentsWithExams(classId, enrolledStudents, examId);
};

export const getExamById = (examId: number): ExamRecord | undefined => {
  return examsManager.getExamById(examId);
};

export const addExam = (exam: ExamRecord): void => {
  examsManager.addExam(exam);
};

export const updateExam = (examId: number, updatedExam: Partial<ExamRecord>): boolean => {
  return examsManager.updateExam(examId, updatedExam);
};

export const deleteExam = (examId: number): boolean => {
  return examsManager.deleteExam(examId);
};

export const addStudentExam = (studentExam: StudentExamRecord): void => {
  examsManager.addStudentExam(studentExam);
  try {
    // store a simplified response record in responses.json
    responses.push({
      id: studentExam.id,
      studentCPF: studentExam.studentCPF,
      examId: studentExam.examId,
      answers: studentExam.answers,
      timestamp: new Date().toISOString()
    });
    triggerSaveResponses();
  } catch (error) {
    console.error('Error adding student exam to responses:', error);
  }
};

export const updateStudentExamAnswers = (
  studentExamId: number,
  answers: Array<{ questionId: number; answer: string }>
): boolean => {
  return examsManager.updateStudentExamAnswers(studentExamId, answers);
};

export const getStudentExamById = (studentExamId: number): StudentExamRecord | undefined => {
  return examsManager.getStudentExamById(studentExamId);
};

/**
 * Generate randomized student exams with different questions for each student
 * @param examId - The exam ID
 * @param classId - The class ID
 * @returns Array of generated student exam records
 */
export const generateStudentExams = (examId: number, classId: string): StudentExamRecord[] => {
  try {
    const exam = examsManager.getExamById(examId);
    if (!exam || exam.classId !== classId) {
      throw new Error(`Exam ${examId} not found in class ${classId}`);
    }

    const classObj = classes.findClassById(classId);
    if (!classObj) {
      throw new Error(`Class ${classId} not found`);
    }

    const enrolledStudents = classObj.getEnrolledStudents();
    const generatedExams: StudentExamRecord[] = [];

    // Get available questions
    const availableQuestions = questions.filter(q => 
      exam.questions.includes(q.id)
    );

    if (availableQuestions.length === 0) {
      throw new Error(`No questions found for exam ${examId}`);
    }

    // Separate questions by type
    const openQuestions = availableQuestions.filter(q => q.type === 'open');
    const closedQuestions = availableQuestions.filter(q => q.type === 'closed');

    // Validate we have enough questions
    if (openQuestions.length < exam.openQuestions) {
      throw new Error(
        `Not enough open questions. Required: ${exam.openQuestions}, Available: ${openQuestions.length}`
      );
    }

    if (closedQuestions.length < exam.closedQuestions) {
      throw new Error(
        `Not enough closed questions. Required: ${exam.closedQuestions}, Available: ${closedQuestions.length}`
      );
    }

    // Generate exam for each student
    enrolledStudents.forEach((student) => {
      const studentCPF = student.getCPF();
      
      // Check if student already has this exam
      const existingExam = examsManager.getAllStudentExams().find(
        se => se.examId === examId && se.studentCPF === studentCPF
      );

      if (existingExam) {
        // Return existing exam without creating duplicate
        generatedExams.push(existingExam);
        return;
      }

      // Shuffle and select random questions of each type
      const shuffledOpenQuestions = [...openQuestions].sort(() => Math.random() - 0.5);
      const shuffledClosedQuestions = [...closedQuestions].sort(() => Math.random() - 0.5);

      const selectedOpenQuestions = shuffledOpenQuestions.slice(0, exam.openQuestions);
      const selectedClosedQuestions = shuffledClosedQuestions.slice(0, exam.closedQuestions);

      const selectedQuestions = [...selectedOpenQuestions, ...selectedClosedQuestions];

      // Create student exam record
      const studentExamRecord: StudentExamRecord = {
        id: Date.now() + Math.random(), // Generate unique ID
        studentCPF: studentCPF,
        examId: examId,
        answers: selectedQuestions.map(q => ({
          questionId: q.id,
          answer: '',
        })),
      };

      // Add to manager
      examsManager.addStudentExam(studentExamRecord);
      generatedExams.push(studentExamRecord);
    });

    // Save to file
    triggerSaveStudentsExams();

    return generatedExams;
  } catch (error) {
    console.error('Error generating student exams:', error);
    throw error;
  }
};


