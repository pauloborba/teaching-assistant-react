// Formato do roteiro definido no contrato (ver docs do contrato de roteiro)
export interface RoteiroItem {
  id: string;
  titulo: string;
  descricao: string;
  dataAbertura: string; // ISO 8601
  prazoEntrega: string; // ISO 8601
  questaoIds: string[]; // ids do banco de questões, na ordem do roteiro
  turmaIds: string[]; // ids das turmas (topic-year-semester)
}

export interface CriarRoteiroPayload {
  titulo: string;
  descricao?: string;
  dataAbertura: string; // DD/MM/AAAA ou ISO
  prazoEntrega: string; // DD/MM/AAAA ou ISO
  questaoIds?: string[];
  turmaIds?: string[];
}

export interface AtualizarRoteiroPayload {
  titulo?: string;
  descricao?: string;
  dataAbertura?: string;
  prazoEntrega?: string;
  questaoIds?: string[];
  turmaIds?: string[];
}
