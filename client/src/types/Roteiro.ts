export type SituacaoRoteiro =
  | 'em_andamento'
  | 'respondido'
  | 'enviado'
  | 'nao_iniciado'
  | 'ainda_nao_aberto'
  | 'prazo_encerrado';

export interface RoteiroDoAluno {
  id: string;
  titulo: string;
  descricao: string;
  dataAbertura: string;
  prazoEntrega: string;
  turmaId: string;
  turma: string;
  totalQuestoes: number;
  questoesRespondidas: number;
  situacao: SituacaoRoteiro;
  disponivel: boolean;
}

export const SITUACAO_LABEL: Record<SituacaoRoteiro, string> = {
  em_andamento: 'Em andamento',
  respondido: 'Respondido',
  enviado: 'Enviado',
  nao_iniciado: 'Não iniciado',
  ainda_nao_aberto: 'Ainda não aberto',
  prazo_encerrado: 'Prazo encerrado'
};