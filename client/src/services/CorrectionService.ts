import { Exam } from "../types/Exam";
import { Student } from "../types/Student";
import ExamsService from "./ExamsService";
import { studentService } from "./StudentService";

class CorrectionService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = "http://localhost:3005/api/correct";
    }

    public async correctAllStudentsInExam(examId: string): Promise<any> {
        return fetch(`${this.apiUrl}/${examId}`, {
            method: 'POST',
        })
        .then(response => response.json())
        .catch(error => {
            console.error("Error correcting exam:", error);
            throw error;
        });
    }
}

export default new CorrectionService();