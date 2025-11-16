class ExamsService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = "http://localhost:3005/api/exams";
    }

    public async correctExam(examId: string, answers: Record<string, any>): Promise<any> {
        const response = await fetch(`${this.apiUrl}/correct/${examId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(answers),
        });

        if (!response.ok) {
            throw new Error("Failed to correct exam");
        }

        return response.json();
    }

    /**
     * Generate randomized student exams with different questions for each student
     * @param examId - The exam ID
     * @param classId - The class ID
     * @returns Promise with generated exams data
     */
    public async generateStudentExams(examId: number, classId: string): Promise<any> {
        const response = await fetch(`${this.apiUrl}/${examId}/generate?classId=${encodeURIComponent(classId)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to generate student exams");
        }

        return response.json();
    }

    /**
     * Create an exam and generate student exams
     * @param examData - The exam data to create
     * @param classId - The class ID
     * @returns Promise with generated exams data
     */
    public async createAndGenerateExams(examData: any, classId: string): Promise<any> {
        // First, create the exam
        const createResponse = await fetch(`${this.apiUrl}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                codigoProva: examData.codProva,
                nomeProva: examData.nomeProva,
                tema: examData.temas,
                quantidadeAberta: parseInt(examData.abertas, 10),
                quantidadeFechada: parseInt(examData.fechadas, 10),
                classId: classId,
            }),
        });

        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.error || "Failed to create exam");
        }

        const examResponse = await createResponse.json();
        const examId = examResponse.data.id;

        // Then, generate student exams
        return this.generateStudentExams(examId, classId);
    }

    /**
     * Get all exams for a specific class
     * @param classId - The class ID
     * @returns Promise with array of exams
     */
    public async getExamsForClass(classId: string): Promise<any> {
        const response = await fetch(`http://localhost:3005/api/exams/class/${encodeURIComponent(classId)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to fetch exams for class");
        }

        return response.json();
    }

    /**
     * Get students with their exam information for a specific class
     * @param classId - The class ID
     * @param examId - Optional exam ID to filter by specific exam
     * @returns Promise with array of students with exam data
     */
    public async getStudentsWithExamsForClass(classId: string, examId?: number): Promise<any> {
        let url = `http://localhost:3005/api/exams/students?classId=${encodeURIComponent(classId)}`;
        if (examId) {
            url += `&examId=${examId}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to fetch students with exams");
        }

        return response.json();
    }
}

export default new ExamsService();