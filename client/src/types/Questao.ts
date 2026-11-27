export type TipoQuestao = 'texto' | 'multipla' | 'imagem';

export interface AlternativaItem {
  id: string;
  texto: string;
}

// Questão do banco de questões
export interface QuestaoItem {
  id: string;
  titulo: string;
  enunciado: string;
  tipo: TipoQuestao;
  alternativas: AlternativaItem[] | null;
}

export interface QuestaoPayload {
  titulo: string;
  enunciado: string;
  tipo: TipoQuestao;
  alternativas: AlternativaItem[] | null;
}

// Texto exibido para cada tipo de resposta
export const TIPO_QUESTAO_LABEL: Record<TipoQuestao, string> = {
  texto: 'Aberta-texto',
  imagem: 'Imagem',
  multipla: 'Múltipla escolha',
};
