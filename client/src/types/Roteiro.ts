export interface AtividadeItem {
  descricao: string;
}

export interface RespostaAlunoItem {
  alunoNome: string;
  resposta?: string;
}

export interface RoteiroItem {
  id: string;
  titulo: string;
  descricao: string;
  turma: string;
  dataAbertura: string;
  prazoEntrega: string;
  atividades: AtividadeItem[];
  respostas: RespostaAlunoItem[];
}

export interface CriarRoteiroPayload {
  titulo: string;
  descricao?: string;
  turma: string;
  dataAbertura: string;
  prazoEntrega: string;
  atividades?: string[] | string;
}

export interface AtualizarRoteiroPayload {
  titulo?: string;
  descricao?: string;
  turma?: string;
  dataAbertura?: string;
  prazoEntrega?: string;
  atividades?: string[] | string;
}