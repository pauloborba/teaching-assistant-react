const API_URL = 'http://localhost:3005/api';

export interface GradeResultNotification {
  studentCPF: string;
  disciplina: string;
  professorNome: string;
}

export interface BatchResultNotification {
  classId: string;
  disciplina: string;
  professorNome: string;
}

export interface GradeUpdateNotification {
  studentCPF: string;
  disciplina: string;
  professorNome: string;
  // Não precisa de mais campos, pois é apenas um placeholder
}

class NotificationService {
  
  /**
   * Função auxiliar privada para encapsular a lógica de POST e tratamento de erro.
   */
  private async _post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}/notifications/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send notification to ${endpoint}`);
    }

    // Retorna o JSON da resposta, tipado como T
    return response.json() as Promise<T>;
  }

  /**
   * Envia notificação de resultado da disciplina para um aluno
   */
  async sendGradeResultNotification(data: GradeResultNotification): Promise<void> {
    // O tipo de retorno é void, mas o _post retorna o JSON da resposta.
    // Como o backend retorna { message: 'Notificação enviada com sucesso' }, o tipo T será { message: string }
    await this._post<{ message: string }>('grade-result', data);
  }

  /**
   * Envia notificação de resultado da disciplina em lote
   */
  async sendBatchResultNotification(data: BatchResultNotification): Promise<{ message: string; totalEnviados: number }> {
    return this._post<{ message: string; totalEnviados: number }>('batch-result', data);
  }

  /**
   * Envia notificação de atualização de nota para um aluno (Placeholder)
   */
  async sendGradeUpdateNotification(data: GradeUpdateNotification): Promise<void> {
    // O tipo de retorno é void, mas o _post retorna o JSON da resposta.
    await this._post<{ message: string }>('grade-update', data);
  }
}

const notificationService = new NotificationService();
export default notificationService;