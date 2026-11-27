import { RoteiroDoAluno } from '../types/RoteiroDoAluno';

const API_BASE_URL = 'http://localhost:3005';

class RoteiroAlunoService {
  
  static async getRoteirosDoAluno(cpf: string): Promise<RoteiroDoAluno[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${encodeURIComponent(cpf)}/roteiros`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch roteiros');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching roteiros:', error);
      throw error;
    }
  }
}

export default RoteiroAlunoService;