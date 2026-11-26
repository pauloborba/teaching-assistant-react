import {
  GenerateResponseTimeReportRequest,
  ResponseTimeReportData,
} from '../types/ResponseTimeReport';

const API_BASE_URL = 'http://localhost:3005';

class ResponseTimeReportService {
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
