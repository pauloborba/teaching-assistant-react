const API_BASE_URL = 'http://localhost:3005';

export type ResultadoFinal =
  | 'Aprovado'
  | 'Final'
  | 'Reprovado'
  | 'Aprovado na final'
  | 'Reprovado na final'
  | 'Reprovado por falta';

export type StatusEnvio = 'Não enviado' | 'Enviado' | 'Pendente';

export interface LinhaResultado {
  cpf: string;
  nome: string;
  possuiEmail: boolean;
  media: number | null;
  notaProvaFinal: number | null;
  mediaFinal: number | null;
  resultado: ResultadoFinal | null;
  metasPendentes: string[];
  statusEnvio: StatusEnvio;
  resultadoEnviado: ResultadoFinal | null;
  motivoFalha: string | null;
}

export interface TurmaResultados {
  id: string;
  disciplina: string;
  periodo: string;
  professor: string;
  prazoAcademico: string | null;
}

export interface ResultadosDaTurma {
  turma: TurmaResultados;
  alunos: LinhaResultado[];
}

interface AlunoDoRelatorio {
  cpf: string;
  aluno: string;
}

export interface RelatorioEnvio {
  enviados: AlunoDoRelatorio[];
  falhas: (AlunoDoRelatorio & { motivo: string })[];
  semResultado: (AlunoDoRelatorio & { metasPendentes: string[] })[];
  jaEnviados: AlunoDoRelatorio[];
}

export interface RespostaEnvio extends ResultadosDaTurma {
  relatorio: RelatorioEnvio;
}

export interface AtualizacaoDeResultado {
  aluno: string;
  resultadoAnterior: ResultadoFinal;
  resultadoNovo: ResultadoFinal;
  enviado: boolean;
  motivoFalha?: string;
}

export interface PedidoDeEnvio {
  alunos?: string[];
  conteudos?: Record<string, string>;
  somentePendentes?: boolean;
}

/** Erro devolvido pela API, com o status HTTP (ex.: 409 para resultado já enviado). */
export class ErroDaApi extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const urlDaTurma = (classId: string) => `${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}`;

async function requisitar<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let corpo: any = null;
  try {
    corpo = await response.json();
  } catch {
    // resposta sem JSON (ex.: servidor desatualizado ou fora do ar)
  }
  if (!response.ok) {
    throw new ErroDaApi(corpo?.error || 'Não foi possível falar com o servidor', response.status);
  }
  if (corpo === null) throw new ErroDaApi('Resposta inválida do servidor', response.status);
  return corpo as T;
}

const comJson = (method: string, corpo: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo)
});

export const resultadoService = {
  listar: (classId: string) =>
    requisitar<ResultadosDaTurma>(`${urlDaTurma(classId)}/resultados`),

  previsualizar: (classId: string, cpf: string) =>
    requisitar<{ assunto: string; conteudo: string }>(
      `${urlDaTurma(classId)}/resultados/${encodeURIComponent(cpf)}/previa`),

  liberarEnvio: (classId: string, pedido: PedidoDeEnvio) =>
    requisitar<RespostaEnvio>(`${urlDaTurma(classId)}/resultados/envio`, comJson('POST', pedido)),

  registrarNotaProvaFinal: (classId: string, cpf: string, nota: number | null) =>
    requisitar<{ aluno: LinhaResultado; atualizacaoResultado: AtualizacaoDeResultado | null }>(
      `${urlDaTurma(classId)}/enrollments/${encodeURIComponent(cpf)}/prova-final`, comJson('PUT', { nota }))
};

/** Média no formato brasileiro, com ao menos uma casa decimal (ex.: 7,0 e 6,67). */
export const formatarMedia = (valor: number | null | undefined): string =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
