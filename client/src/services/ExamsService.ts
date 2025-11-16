class ExamsService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = "http://localhost:5000/api/exams";
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
}

export default new ExamsService();