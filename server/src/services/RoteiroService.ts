import { Roteiro, RoteiroProps } from '../models/Roteiro';
import { RoteiroList } from '../models/RoteiroList';
import { QuestaoList } from '../models/QuestaoList';

export interface InserirRoteiroInput {
  titulo: string;
  descricao?: string;
  dataAbertura: string;
  prazoEntrega: string;
  questaoIds?: string[];
  turmaIds?: string[];
}

export interface AtualizarRoteiroInput {
  titulo?: string;
  descricao?: string;
  dataAbertura?: string;
  prazoEntrega?: string;
  questaoIds?: string[];
  turmaIds?: string[];
}

export interface RoteiroServiceOpcoes {
  // Verifica se o id de turma existe (o server.ts consulta Classes)
  turmaExiste?: (turmaId: string) => boolean;
  // Verifica se algum aluno já respondeu o roteiro (ligado à feature de responder roteiros)
  possuiRespostas?: (roteiroId: string) => boolean;
}

function parseDataPtBrOuIso(dataStr: string): number | null {
  const limpo = (dataStr ?? '').trim();
  if (!limpo) return null;

  // Formato DD/MM/YYYY
  const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(limpo);
  if (matchBr) {
    const dia = Number(matchBr[1]);
    const mes = Number(matchBr[2]) - 1;
    const ano = Number(matchBr[3]);
    const data = new Date(ano, mes, dia);
    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes ||
      data.getDate() !== dia
    ) {
      return null;
    }
    return data.getTime();
  }

  // Formato YYYY-MM-DD ou ISO
  const timestamp = Date.parse(limpo);
  return Number.isNaN(timestamp) ? null : timestamp;
}

// Converte a data recebida (DD/MM/YYYY ou ISO) para ISO 8601, formato do contrato.
// DD/MM/YYYY: abertura às 00:00 e prazo às 23:59 daquele dia.
// Valores vazios ou inválidos são mantidos como vieram.
function normalizarData(dataStr: string, fimDoDia: boolean): string {
  const limpo = (dataStr ?? '').trim();
  const timestamp = parseDataPtBrOuIso(limpo);
  if (timestamp === null) return limpo;

  const data = new Date(timestamp);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpo) && fimDoDia) {
    data.setHours(23, 59, 0, 0);
  }
  return data.toISOString();
}

export class RoteiroService {
  private roteiroList: RoteiroList;
  private questaoList: QuestaoList;
  private opcoes: RoteiroServiceOpcoes;

  constructor(
    roteiroList: RoteiroList = new RoteiroList(),
    questaoList: QuestaoList = new QuestaoList(),
    opcoes: RoteiroServiceOpcoes = {}
  ) {
    this.roteiroList = roteiroList;
    this.questaoList = questaoList;
    this.opcoes = opcoes;
  }

  public getRoteiroList(): RoteiroList {
    return this.roteiroList;
  }

  public getQuestaoList(): QuestaoList {
    return this.questaoList;
  }

  private validarDatas(dataAbertura: string, prazoEntrega: string): void {
    const inicio = parseDataPtBrOuIso(dataAbertura);
    const fim = parseDataPtBrOuIso(prazoEntrega);

    if (inicio !== null && fim !== null && fim < inicio) {
      throw new Error('Prazo de entrega inválido: não pode ser anterior à data de abertura');
    }
  }

  private resolverTurmaIds(dados: AtualizarRoteiroInput): string[] | undefined {
    if (dados.turmaIds === undefined) return undefined;

    const limpos = dados.turmaIds.map((id) => String(id).trim()).filter((id) => id.length > 0);
    const turmaExiste = this.opcoes.turmaExiste;
    const inexistente = turmaExiste ? limpos.find((id) => !turmaExiste(id)) : undefined;
    if (inexistente) {
      throw new Error(`Turma não encontrada: ${inexistente}`);
    }
    return limpos;
  }

  private resolverQuestaoIds(dados: AtualizarRoteiroInput): string[] | undefined {
    if (dados.questaoIds === undefined) return undefined;

    const inexistente = dados.questaoIds.find((id) => !this.questaoList.findById(id));
    if (inexistente) {
      throw new Error(`Questão não encontrada: ${inexistente}`);
    }
    return [...dados.questaoIds];
  }

  private verificarTituloDuplicado(titulo: string, turmaIds: string[], idIgnorado?: string): void {
    turmaIds.forEach((turmaId) => {
      const conflito = this.roteiroList.findByTitulo(titulo, turmaId);
      if (conflito && conflito.id !== idIgnorado) {
        throw new Error(`Já existe um roteiro com o título "${titulo}" na turma "${turmaId}"`);
      }
    });
  }

  public inserirRoteiro(dados: InserirRoteiroInput): Roteiro {
    const titulo = (dados?.titulo ?? '').trim();
    if (!titulo) {
      throw new Error('O título do roteiro é obrigatório');
    }

    const turmaIds = this.resolverTurmaIds(dados) ?? [];
    const dataAbertura = (dados?.dataAbertura ?? '').trim();
    const prazoEntrega = (dados?.prazoEntrega ?? '').trim();

    this.validarDatas(dataAbertura, prazoEntrega);
    this.verificarTituloDuplicado(titulo, turmaIds);

    const questaoIds = this.resolverQuestaoIds(dados) ?? [];

    const props: RoteiroProps = {
      titulo,
      descricao: dados?.descricao ?? '',
      dataAbertura: normalizarData(dataAbertura, false),
      prazoEntrega: normalizarData(prazoEntrega, true),
      questaoIds,
      turmaIds,
    };

    const novoRoteiro = new Roteiro(props);
    return this.roteiroList.add(novoRoteiro);
  }

  public atualizarRoteiro(id: string, dados: AtualizarRoteiroInput): Roteiro {
    const existente = this.roteiroList.findById(id);
    if (!existente) {
      throw new Error('Roteiro não encontrado');
    }

    let novoTitulo = existente.getTitulo();
    if (dados.titulo !== undefined) {
      const tituloLimpo = String(dados.titulo).trim();
      if (!tituloLimpo) {
        throw new Error('O título do roteiro é obrigatório');
      }
      novoTitulo = tituloLimpo;
    }

    const novasTurmaIds = this.resolverTurmaIds(dados) ?? existente.getTurmaIds();
    const novaDataAbertura =
      dados.dataAbertura !== undefined
        ? String(dados.dataAbertura).trim()
        : existente.getDataAbertura();
    const novoPrazoEntrega =
      dados.prazoEntrega !== undefined
        ? String(dados.prazoEntrega).trim()
        : existente.getPrazoEntrega();

    this.validarDatas(novaDataAbertura, novoPrazoEntrega);
    this.verificarTituloDuplicado(novoTitulo, novasTurmaIds, existente.id);

    const novasQuestaoIds = this.resolverQuestaoIds(dados);

    if (dados.titulo !== undefined) {
      existente.setTitulo(novoTitulo);
    }
    if (dados.descricao !== undefined) {
      existente.setDescricao(String(dados.descricao));
    }
    if (dados.turmaIds !== undefined) {
      existente.setTurmaIds(novasTurmaIds);
    }
    if (dados.dataAbertura !== undefined) {
      existente.setDataAbertura(normalizarData(novaDataAbertura, false));
    }
    if (dados.prazoEntrega !== undefined) {
      existente.setPrazoEntrega(normalizarData(novoPrazoEntrega, true));
    }
    if (novasQuestaoIds !== undefined) {
      existente.setQuestaoIds(novasQuestaoIds);
    }

    return this.roteiroList.update(existente);
  }

  public removerRoteiro(id: string): boolean {
    const existente = this.roteiroList.findById(id);
    if (!existente) {
      throw new Error('Roteiro não encontrado');
    }

    if (this.opcoes.possuiRespostas?.(id)) {
      throw new Error(
        'Não é possível remover o roteiro pois ele já possui respostas de alunos'
      );
    }

    return this.roteiroList.remove(id);
  }
}
