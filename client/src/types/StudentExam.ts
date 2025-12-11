export interface StudentExam {
    id: number;
    studentCPF: string;
    examId: string;
    grade: number;
    questions: Question[];
}

export interface Question {
    questionId: string;
    answer: string;
}