import { Exam } from "../types/Exam";
import { Student } from "../types/Student";
import ExamsService from "./ExamsService";
import { studentService } from "./StudentService";

class CorrectionService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = "http://localhost:5000/api/correction";
    }

    private async correctExam(examId: string, student: Student): Promise<any> {
        return fetch(`${this.apiUrl}/exam/${examId}/student/${student.cpf}/correct`, {
            method: 'POST',
        })
        .then(response => response.json())
        .catch(error => {
            console.error("Error correcting exam:", error);
            throw error;
        });
    }

    public async correctAllExams(students: Student[], exam: Exam): Promise<any> {
        var grades: Number[] = [];

        for (let st of students) {
            grades.push(await this.correctExam(exam.id, st));
        }

        return grades;
    }
}

export default new CorrectionService();