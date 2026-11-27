import { QuestaoItem, QuestaoPayload } from '../types/Questao';

const API_BASE_URL = 'http://localhost:3005/api/questoes';

export class QuestaoService {
  public async getAllQuestoes(busca?: string): Promise<QuestaoItem[]> {
    const url = busca
      ? `${API_BASE_URL}?busca=${encodeURIComponent(busca)}`
      : API_BASE_URL;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao carregar questões');
    }
    return data;
  }

  public async createQuestao(payload: QuestaoPayload): Promise<QuestaoItem> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao inserir questão');
    }
    return data;
  }

  public async updateQuestao(id: string, payload: QuestaoPayload): Promise<QuestaoItem> {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao atualizar questão');
    }
    return data;
  }

  public async deleteQuestao(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      let errorMsg = 'Falha ao remover questão';
      try {
        const data = await response.json();
        if (data?.error) errorMsg = data.error;
      } catch {
        // Resposta sem corpo JSON
      }
      throw new Error(errorMsg);
    }
  }
}

export const questaoService = new QuestaoService();
