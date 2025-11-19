class ExamsService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = "http://localhost:3005/api";
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
    public async downloadExamPDF(examId: string): Promise<void> {
        try {

            const response = await fetch(`${this.apiUrl}/exams/${examId}/pdf`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                },
            });

            if (!response.ok) {
                const status = response.status;
                let errorMessage = 'Falha ao baixar o PDF.';

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                }
                console.log(response);
                if (status === 404) {
                    throw new Error('Prova não encontrada.');
                }
                if (status === 403) {
                    throw new Error('Você não tem permissão para baixar esta prova.');
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(
                new Blob([blob], { type: 'application/pdf' })
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prova-${examId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading exam PDF:', error);
            throw error;
        }
    }

    public async downloadExamZIP(examId: string, quantity: number): Promise<void> {
        try {
            
            const response = await fetch(`${this.apiUrl}/exams/${examId}/zip?quantity=${quantity}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/zip',
                },
            });

            if (!response.ok) {
                const status = response.status;
                let errorMessage = 'Falha ao baixar o PDF.';

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                }
                console.log(response);
                if (status === 404) {
                    throw new Error('Prova não encontrada.');
                }
                if (status === 403) {
                    throw new Error('Você não tem permissão para baixar esta prova.');
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(
                new Blob([blob], { type: 'application/zip' })
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prova-${examId}-versions.zip`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading exam ZIP:', error);
            throw error;
        }
    }
}

export default new ExamsService();