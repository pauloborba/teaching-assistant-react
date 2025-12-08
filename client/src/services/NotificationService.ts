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
   * Envia notificação de resultado da disciplina para um aluno
   */
  async sendGradeResultNotification(data: GradeResultNotification): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/grade-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send grade result notification');
    }

    return response.json();
  }

  /**
   * Envia notificação de resultado da disciplina em lote
   */
  async sendBatchResultNotification(data: BatchResultNotification): Promise<{ message: string; totalEnviados: number }> {
    const response = await fetch(`${API_URL}/notifications/batch-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send batch result notification');
    }

    return response.json();
  }

  /**
   * Envia notificação de atualização de nota para um aluno (Placeholder)
   */
  async sendGradeUpdateNotification(data: GradeUpdateNotification): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/grade-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send grade update notification');
    }

    return response.json();
  }
}

const notificationService = new NotificationService();
export default notificationService;
