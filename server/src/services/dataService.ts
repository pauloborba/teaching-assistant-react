import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { Question } from '../models/Question';
import { Exam } from '../models/Exam';
import { StudentExam } from '../models/StudentExam';
import { StudentAnswer } from '../models/StudentAnswer';
import { QuestionSet } from '../models/QuestionSet';
import { ExamSet } from '../models/ExamSet';
import { StudentExamSet } from '../models/StudentExamSet';
import { Exams, ExamRecord, StudentExamRecord } from '../models/Exams';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions for compatibility (used by some routes)
export interface QuestionOption {
  id: number;
  option: string;
  isCorrect: boolean;
}

export interface QuestionInterface {
  id: number;
  question: string;
  topic: string;
  type: 'open' | 'closed';
  options?: QuestionOption[];
  answer?: string;
}

// In-memory storage with file persistence (using classes)
export const studentSet = new StudentSet();
export const classes = new Classes();
export const questionSet = new QuestionSet();
export const examSet = new ExamSet();
export const studentExamSet = new StudentExamSet();

// Compatibility layer: examsManager and questions array for routes that use them
export const examsManager = new Exams();
export const questions: QuestionInterface[] = [];

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
    // Save using classes (primary storage)
    const data = {
      exams: examSet.getAllExams().map(exam => exam.toJSON())
    };
    
    ensureDataDirectory(examsFile);
    fs.writeFileSync(examsFile, JSON.stringify(data, null, 2), 'utf8');
    
    // Sync examsManager for compatibility
    syncExamsManagerFromExamSet();
  } catch (error) {
    console.error('Error saving exams to file:', error);
  }
};

export const saveQuestionsToFile = (): void => {
  try {
    const data = {
      questions: questionSet.getAllQuestions().map(question => question.toJSON())
    };
    
    ensureDataDirectory(questionsFile);
    fs.writeFileSync(questionsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving questions to file:', error);
  }
};

export const saveStudentsExamsToFile = (): void => {
  try {
    // Save using classes (primary storage)
    const data = {
      studentsExams: studentExamSet.getAllStudentExams().map(studentExam => studentExam.toJSON())
    };
    
    ensureDataDirectory(studentsExamsFile);
    fs.writeFileSync(studentsExamsFile, JSON.stringify(data, null, 2), 'utf8');
    
    // Sync examsManager for compatibility
    syncExamsManagerFromStudentExamSet();
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
        data.exams.forEach((examData: any) => {
          try {
            // Load into classes (primary storage)
            const exam = Exam.fromJSON(examData);
            examSet.addExam(exam);
            
            // Also load into examsManager for compatibility
            const examRecord: ExamRecord = {
              id: exam.getId(),
              classId: exam.getClassId(),
              title: exam.getTitle(),
              isValid: exam.getIsValid(),
              openQuestions: exam.getOpenQuestions(),
              closedQuestions: exam.getClosedQuestions(),
              questions: exam.getQuestions()
            };
            examsManager.addExam(examRecord);
          } catch (error) {
            console.error(`Error adding exam ${examData.id}:`, error);
          }
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
        data.questions.forEach((questionData: any) => {
          try {
            // Load into classes (primary storage)
            const question = Question.fromJSON(questionData);
            questionSet.addQuestion(question);
            
            // Also load into questions array for compatibility
            const questionInterface: QuestionInterface = {
              id: question.getId(),
              question: question.getQuestion(),
              topic: question.getTopic(),
              type: question.getType(),
              options: question.getOptions()?.map(opt => ({
                id: opt.getId(),
                option: opt.getOption(),
                isCorrect: opt.getIsCorrect()
              })),
              answer: question.getAnswer()
            };
            questions.push(questionInterface);
          } catch (error) {
            console.error(`Error adding question ${questionData.id}:`, error);
          }
        });
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
        data.studentsExams.forEach((studentExamData: any) => {
          try {
            // Load into classes (primary storage)
            const studentExam = StudentExam.fromJSON(studentExamData);
            studentExamSet.addStudentExam(studentExam);
            
            // Also load into examsManager for compatibility
            const studentExamRecord: StudentExamRecord = {
              id: studentExam.getId(),
              studentCPF: studentExam.getStudentCPF(),
              examId: studentExam.getExamId(),
              answers: studentExam.getAnswers().map(answer => ({
                questionId: answer.getQuestionId(),
                answer: answer.getAnswer()
              }))
            };
            examsManager.addStudentExam(studentExamRecord);
          } catch (error) {
            console.error(`Error adding student exam ${studentExamData.id}:`, error);
          }
        });
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

// Synchronization functions to keep both structures in sync
const syncExamsManagerFromExamSet = (): void => {
  // Sync examsManager from examSet (only add missing exams)
  const allExams = examSet.getAllExams();
  allExams.forEach(exam => {
    if (!examsManager.getExamById(exam.getId())) {
      const examRecord: ExamRecord = {
        id: exam.getId(),
        classId: exam.getClassId(),
        title: exam.getTitle(),
        isValid: exam.getIsValid(),
        openQuestions: exam.getOpenQuestions(),
        closedQuestions: exam.getClosedQuestions(),
        questions: exam.getQuestions()
      };
      examsManager.addExam(examRecord);
    }
  });
};

const syncExamsManagerFromStudentExamSet = (): void => {
  // Sync student exams in examsManager from studentExamSet (only add missing)
  const allStudentExams = studentExamSet.getAllStudentExams();
  allStudentExams.forEach(studentExam => {
    if (!examsManager.getStudentExamById(studentExam.getId())) {
      const studentExamRecord: StudentExamRecord = {
        id: studentExam.getId(),
        studentCPF: studentExam.getStudentCPF(),
        examId: studentExam.getExamId(),
        answers: studentExam.getAnswers().map(answer => ({
          questionId: answer.getQuestionId(),
          answer: answer.getAnswer()
        }))
      };
      examsManager.addStudentExam(studentExamRecord);
    }
  });
};

// Helper functions for Exams manager (synchronized with classes)
export const getExamsForClass = (classId: string): ExamRecord[] => {
  syncExamsManagerFromExamSet();
  return examsManager.getExamsByClassId(classId);
};

export const getStudentsWithExamsForClass = (
  classId: string,
  examId?: number
): any[] => {
  syncExamsManagerFromExamSet();
  syncExamsManagerFromStudentExamSet();
  const classObj = classes.findClassById(classId);
  if (!classObj) {
    return [];
  }
  const enrolledStudents = classObj.getEnrolledStudents();
  return examsManager.getStudentsWithExams(classId, enrolledStudents, examId);
};

export const getExamById = (examId: number): ExamRecord | undefined => {
  syncExamsManagerFromExamSet();
  return examsManager.getExamById(examId);
};

export const addExam = (exam: ExamRecord): void => {
  // Add to both structures
  const examClass = new Exam(
    exam.id,
    exam.classId,
    exam.title,
    exam.isValid,
    exam.openQuestions,
    exam.closedQuestions,
    exam.questions
  );
  examSet.addExam(examClass);
  examsManager.addExam(exam);
  triggerSaveExams();
};

export const updateExam = (examId: number, updatedExam: Partial<ExamRecord>): boolean => {
  // Update in both structures
  const exam = examSet.findExamById(examId);
  if (exam) {
    if (updatedExam.title !== undefined) exam.setTitle(updatedExam.title);
    if (updatedExam.isValid !== undefined) exam.setIsValid(updatedExam.isValid);
    if (updatedExam.questions) {
      updatedExam.questions.forEach(qId => exam.addQuestion(qId));
    }
  }
  const result = examsManager.updateExam(examId, updatedExam);
  if (result) {
    triggerSaveExams();
  }
  return result;
};

export const deleteExam = (examId: number): boolean => {
  // Delete from both structures
  examSet.removeExam(examId);
  const result = examsManager.deleteExam(examId);
  if (result) {
    triggerSaveExams();
  }
  return result;
};

export const addStudentExam = (studentExam: StudentExamRecord): void => {
  // Add to both structures
  const answers = studentExam.answers.map(a => {
    const studentAnswer = new StudentAnswer(a.questionId, a.answer, 0);
    return studentAnswer;
  });
  const studentExamClass = new StudentExam(
    studentExam.id,
    studentExam.studentCPF,
    studentExam.examId,
    answers
  );
  studentExamSet.addStudentExam(studentExamClass);
  examsManager.addStudentExam(studentExam);
  triggerSaveStudentsExams();
};

export const updateStudentExamAnswers = (
  studentExamId: number,
  answers: Array<{ questionId: number; answer: string }>
): boolean => {
  // Update in both structures
  const studentExam = studentExamSet.findStudentExamById(studentExamId);
  if (studentExam) {
    answers.forEach(a => {
      studentExam.addOrUpdateAnswer(a.questionId, a.answer);
    });
  }
  const result = examsManager.updateStudentExamAnswers(studentExamId, answers);
  if (result) {
    triggerSaveStudentsExams();
  }
  return result;
};

export const getStudentExamById = (studentExamId: number): StudentExamRecord | undefined => {
  syncExamsManagerFromStudentExamSet();
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
      const studentExamId = Date.now() + Math.random(); // Generate unique ID
      const studentExamRecord: StudentExamRecord = {
        id: studentExamId,
        studentCPF: studentCPF,
        examId: examId,
        answers: selectedQuestions.map(q => ({
          questionId: q.id,
          answer: '',
        })),
      };

      // Add to both structures
      const studentAnswers = selectedQuestions.map(q => 
        new StudentAnswer(q.id, '', 0)
      );
      const studentExamClass = new StudentExam(
        studentExamId,
        studentCPF,
        examId,
        studentAnswers
      );
      studentExamSet.addStudentExam(studentExamClass);
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


