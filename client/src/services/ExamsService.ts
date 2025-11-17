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