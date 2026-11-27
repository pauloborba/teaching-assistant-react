import { LinhaDoRelatorio } from '../types/RelatorioRoteiro';

const API_BASE_URL = 'http://localhost:3005';

class RelatorioRoteiroService {
  // As turmas vão pelo nome, ex.: "ESS - 2026.2"
  static async getRelatorio(turmaAtual: string, roteiro: string, passadas: string[]): Promise<LinhaDoRelatorio[]> {
    const params = new URLSearchParams();
    params.append('turmaAtual', turmaAtual);
    params.append('roteiro', roteiro);
    passadas.forEach(nome => params.append('passadas', nome));

    const response = await fetch(`${API_BASE_URL}/api/relatorio-roteiro?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch report');
    }

    return data;
  }
}

export default RelatorioRoteiroService;
