import {
  GenerateResponseTimeReportRequest,
  ResponseTimeReportData,
  StudentResponseData,
} from '../types/ResponseTimeReport';

const API_BASE_URL = 'http://localhost:3005';

class ResponseTimeReportService {
  /** Busca a nota e o tempo de cada aluno a partir das respostas corrigidas de um roteiro. */
  async getRespostasDoRoteiro(roteiroId: string, turmaId?: string): Promise<StudentResponseData[]> {
    const query = turmaId ? `?turmaId=${encodeURIComponent(turmaId)}` : '';
    const response = await fetch(
      `${API_BASE_URL}/api/roteiros/${encodeURIComponent(roteiroId)}/respostas-tempo-nota${query}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Não foi possível carregar as respostas do roteiro.');
    }
    return data as StudentResponseData[];
  }

  /** Envia as respostas de um único roteiro e recebe suas estatísticas. */
  async generateReport(
    responses: GenerateResponseTimeReportRequest['responses']
  ): Promise<ResponseTimeReportData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/response-time-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Failed to generate response time report: ${response.statusText}`
        );
      }

      return (await response.json()) as ResponseTimeReportData;
    } catch (error) {
      console.error('Error generating response time report:', error);
      throw error;
    }
  }
}

const responseTimeReportService = new ResponseTimeReportService();
export default responseTimeReportService;
