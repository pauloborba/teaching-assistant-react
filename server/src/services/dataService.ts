import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Evaluation } from '../models/Evaluation';
import { Exams, ExamRecord, StudentExamRecord } from '../models/Exams';
import {
  Questions,
  QuestionRecord,
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../models/Questions';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions
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

export interface ExamVersionMap {
  versionNumber: number;
  questions: {
    numero: number;
    questionId: number;
    type: 'open' | 'closed';
    rightAnswer: string;
  }[];
}

export interface ExamGenerationRecord {
  id: string;
  examId: number;
  classId: string;
  timestamp: string;
  description: string;
  versions: ExamVersionMap[];
}

// In-memory storage with file persistence
export const studentSet = new StudentSet();
export const classes = new Classes();
export const examsManager = new Exams();
export const questions: Question[] = [];
export const responses: any[] = [];
export const questionsManager = new Questions();
export const examGenerations: ExamGenerationRecord[] = [];

// File paths
export const dataFile = path.resolve('./data/app-data.json');
export const examsFile = path.resolve('./data/exams.json');
export const questionsFile = path.resolve('./data/questions.json');
export const studentsExamsFile = path.resolve('./data/students-exams.json');
export const responsesFile = path.resolve('./data/responses.json');
export const generationsFile = path.resolve('./data/exam-generations.json');

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
    const data = questionsManager.toJSON();

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

      // Load classes
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach((classData: any) => {
          try {
            const classObj = new Class(classData.topic, classData.semester, classData.year);
            classes.addClass(classObj);

            if (classData.enrollments && Array.isArray(classData.enrollments)) {
              classData.enrollments.forEach((enrollmentData: any) => {
                const student = studentSet.findStudentByCPF(enrollmentData.studentCPF);
                if (student) {
                  const enrollment = classObj.addEnrollment(student);

                  if (enrollmentData.evaluations && Array.isArray(enrollmentData.evaluations)) {
                    enrollmentData.evaluations.forEach((evalData: any) => {
                      const evaluation = Evaluation.fromJSON(evalData);
                      enrollment.addOrUpdateEvaluation(evaluation.getGoal(), evaluation.getGrade());
                    });
                  }
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
        examsManager.replaceAll(data.exams);
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

      const loaded = Questions.fromJSON(data);
      const all = loaded.getAllQuestions();
      questionsManager.replaceAll(all);

      // Keep exported `questions` array in sync for routes/components that use it
      questions.length = 0;
      questions.push(...all);
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

export const saveGenerationsToFile = (): void => {
  try {
    const data = { generations: examGenerations };
    const dataDir = path.dirname(generationsFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(generationsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving generations to file:', error);
  }
};

export const loadGenerationsFromFile = (): void => {
  try {
    if (fs.existsSync(generationsFile)) {
      const fileContent = fs.readFileSync(generationsFile, 'utf-8');
      const data = JSON.parse(fileContent);
      if (data.generations && Array.isArray(data.generations)) {
        examGenerations.length = 0;
        examGenerations.push(...data.generations);
      }
    }
  } catch (error) {
    console.error('Error loading generations:', error);
  }
};

export const triggerSaveGenerations = (): void => {
  setImmediate(() => saveGenerationsToFile());
};

// Load all data files
export const loadAllData = (): void => {
  loadDataFromFile();
  loadExamsFromFile();
  loadQuestionsFromFile();
  loadStudentsExamsFromFile();
  loadResponsesFromFile();
  loadGenerationsFromFile();
};

export const triggerSave = (): void => { setImmediate(() => { saveDataToFile(); }); };

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

export const getStudentsWithExamsForClass = (classId: string, examId?: number): any[] => {
  const classObj = classes.findClassById(classId);
  if (!classObj) return [];
  const enrolledStudents = classObj.getEnrolledStudents();
  return examsManager.getStudentsWithExams(classId, enrolledStudents, examId);
};

export const getExamById = (examId: number): ExamRecord | undefined => {
  return examsManager.getExamById(examId);
};

export const addExam = (exam: ExamRecord): void => {
  examsManager.addExam(exam);
};

export const getNextExamId = (): number => {
  return examsManager.getNextExamId();
};

export const updateExam = (examId: number, updatedExam: Partial<ExamRecord>): boolean => {
  return examsManager.updateExam(examId, updatedExam);
};

export const deleteExam = (examId: number): boolean => {
  return examsManager.deleteExam(examId);
};

export const addStudentExam = (studentExam: StudentExamRecord): void => {
  // Prevent a student from submitting more than once for the same exam
  try {
    const studentCPF = cleanCPF(String(studentExam.studentCPF));

    const alreadyInResponses = responses.some(r => {
      try {
        return cleanCPF(String(r.studentCPF)) === studentCPF && r.examId === studentExam.examId;
      } catch (e) {
        return false;
      }
    });

    const allStudentExams = examsManager.getAllStudentExams ? examsManager.getAllStudentExams() : [];
    const alreadyInManager = allStudentExams.some((se: any) => {
      try {
        return cleanCPF(String(se.studentCPF)) === studentCPF && se.examId === studentExam.examId;
      } catch (e) {
        return false;
      }
    });

    if (alreadyInResponses || alreadyInManager) {
      throw new Error('StudentAlreadySubmitted');
    }

    // Add to exams manager and persist a simplified responses record
    examsManager.addStudentExam(studentExam);

    responses.push({
      id: studentExam.id,
      studentCPF: studentExam.studentCPF,
      examId: studentExam.examId,
      answers: studentExam.answers,
      timestamp: new Date().toISOString()
    });
    triggerSaveResponses();
  } catch (error) {
    if ((error as Error).message === 'StudentAlreadySubmitted') {
      throw error; // rethrow so callers can handle and return 409
    }
    console.error('Error adding student exam to responses:', error);
    throw error;
  }
};

export const updateStudentExamAnswers = (studentExamId: number, answers: Array<{ questionId: number; answer: string }>): boolean => {
  return examsManager.updateStudentExamAnswers(studentExamId, answers);
};

export const getStudentExamById = (studentExamId: number): StudentExamRecord | undefined => {
  return examsManager.getStudentExamById(studentExamId);
};

export const addExamGeneration = (record: ExamGenerationRecord): void => {
  examGenerations.push(record);
  triggerSaveGenerations();
};

export const getGenerationsForExam = (examId: number, classId: string): ExamGenerationRecord[] => {
  return examGenerations.filter(g => g.examId === examId && g.classId === classId);
};

export const generateStudentExams = (examId: number, classId: string): StudentExamRecord[] => {
  try {
    const exam = examsManager.getExamById(examId);
    if (!exam || exam.classId !== classId) throw new Error(`Exam ${examId} not found in class ${classId}`);

    const classObj = classes.findClassById(classId);
    if (!classObj) throw new Error(`Class ${classId} not found`);

    const enrolledStudents = classObj.getEnrolledStudents();
    const generatedExams: StudentExamRecord[] = [];

    // Get available questions
    const availableQuestions = questionsManager.getQuestionsByIds(exam.questions);

    const openQuestions = availableQuestions.filter(q => q.type === 'open');
    const closedQuestions = availableQuestions.filter(q => q.type === 'closed');

    if (openQuestions.length < exam.openQuestions) throw new Error(`Not enough open questions.`);
    if (closedQuestions.length < exam.closedQuestions) throw new Error(`Not enough closed questions.`);

    enrolledStudents.forEach((student) => {
      const studentCPF = student.getCPF();
      const existingExam = examsManager.getAllStudentExams().find(
        se => se.examId === examId && se.studentCPF === studentCPF
      );

      if (existingExam) {
        generatedExams.push(existingExam);
        return;
      }

      const shuffledOpenQuestions = [...openQuestions].sort(() => Math.random() - 0.5);
      const shuffledClosedQuestions = [...closedQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = [
        ...shuffledOpenQuestions.slice(0, exam.openQuestions),
        ...shuffledClosedQuestions.slice(0, exam.closedQuestions)
      ];

      const studentExamRecord: StudentExamRecord = {
        id: Date.now() + Math.random(),
        studentCPF: studentCPF,
        examId: examId,
        answers: selectedQuestions.map(q => ({ questionId: q.id, answer: '' })),
      };

      examsManager.addStudentExam(studentExamRecord);
      generatedExams.push(studentExamRecord);
    });

    triggerSaveStudentsExams();
    return generatedExams;
  } catch (error) {
    console.error('Error generating student exams:', error);
    throw error;
  }
};

// Question helpers
export const getAllQuestions = (): QuestionRecord[] => {
  return questionsManager.getAllQuestions();
};

export const getQuestionById = (questionId: number): QuestionRecord | undefined => {
  return questionsManager.getQuestionById(questionId);
};

export const getQuestionsByTopic = (topic: string): QuestionRecord[] => {
  return questionsManager.getQuestionsByTopic(topic);
};

export const getQuestionsByIds = (ids: number[]): QuestionRecord[] => {
  return questionsManager.getQuestionsByIds(ids);
};

export const createQuestion = (input: CreateQuestionInput): QuestionRecord => {
  const question = questionsManager.addQuestion(input);
  triggerSaveQuestions();
  return question;
};

export const updateQuestion = (id: number, input: UpdateQuestionInput): QuestionRecord | undefined => {
  const updated = questionsManager.updateQuestion(id, input);
  if (updated) triggerSaveQuestions();
  return updated;
};

export const deleteQuestion = (id: number): boolean => {
  const removed = questionsManager.deleteQuestion(id);
  if (removed) triggerSaveQuestions();
  return removed;
};

export function shuffleArray<T>(array: T[]): T[] {
  if (!Array.isArray(array) || array.length <= 1) {
    return array;
  }
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export type { QuestionRecord, QuestionOptionRecord } from '../models/Questions';