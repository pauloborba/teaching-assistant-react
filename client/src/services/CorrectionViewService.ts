const API_BASE_URL = 'http://localhost:3005';

export interface CorrectionGrade {
  studentCPF: string;
  name: string;
  answers: Array<{
    questionId: number;
    grade: number | null;
  }>;
}

class CorrectionViewService {
  static async getGrades(examId: number): Promise<CorrectionGrade[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/grades/${examId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Tenta parsear como JSON, caso contrário usa o texto da resposta
        let errorMessage = `Erro ao buscar correções: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não for JSON, tenta ler como texto
          const text = await response.text();
          if (text) {
            errorMessage = text.substring(0, 200); // Limita o tamanho
          }
        }
        throw new Error(errorMessage);
      }

      // Verifica se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Resposta inválida do servidor. Esperado JSON, recebido: ${contentType || 'text/html'}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching correction grades:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao buscar correções');
    }
  }
}

export default CorrectionViewService;

