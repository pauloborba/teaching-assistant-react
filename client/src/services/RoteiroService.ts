import {
  RoteiroItem,
  CriarRoteiroPayload,
  AtualizarRoteiroPayload,
} from '../types/Roteiro';

const API_BASE_URL = 'http://localhost:3005/api/roteiros';

export class RoteiroService {
  public async getAllRoteiros(turma?: string): Promise<RoteiroItem[]> {
    const url = turma
      ? `${API_BASE_URL}?turma=${encodeURIComponent(turma)}`
      : API_BASE_URL;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao carregar roteiros');
    }
    return data;
  }

  public async createRoteiro(payload: CriarRoteiroPayload): Promise<RoteiroItem> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao inserir roteiro');
    }
    return data;
  }

  public async updateRoteiro(
    id: string,
    payload: AtualizarRoteiroPayload
  ): Promise<RoteiroItem> {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao atualizar roteiro');
    }
    return data;
  }

  public async deleteRoteiro(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      let errorMsg = 'Falha ao remover roteiro';
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

export const roteiroService = new RoteiroService();