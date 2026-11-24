import { Roteiro, RoteiroProps, RespostaAluno } from '../models/Roteiro';
import { RoteiroList } from '../models/RoteiroList';
import { Atividade } from '../models/Atividade';

export interface InserirRoteiroInput {
  titulo: string;
  descricao?: string;
  turma: string;
  dataAbertura: string;
  prazoEntrega: string;
  atividades?: (Atividade | string)[] | string;
  respostas?: RespostaAluno[];
}

export interface AtualizarRoteiroInput {
  titulo?: string;
  descricao?: string;
  turma?: string;
  dataAbertura?: string;
  prazoEntrega?: string;
  atividades?: (Atividade | string)[] | string;
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

function normalizarAtividades(
  atividades?: (Atividade | string)[] | string
): Atividade[] {
  if (!atividades) return [];

  if (typeof atividades === 'string') {
    return atividades
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((desc) => new Atividade(desc));
  }

  return atividades
    .map((item) => (item instanceof Atividade ? item.getDescricao() : String(item).trim()))
    .filter((desc) => desc.length > 0)
    .map((desc) => new Atividade(desc));
}

export class RoteiroService {
  private roteiroList: RoteiroList;

  constructor(roteiroList: RoteiroList = new RoteiroList()) {
    this.roteiroList = roteiroList;
  }

  public getRoteiroList(): RoteiroList {
    return this.roteiroList;
  }

  private validarDatas(dataAbertura: string, prazoEntrega: string): void {
    const inicio = parseDataPtBrOuIso(dataAbertura);
    const fim = parseDataPtBrOuIso(prazoEntrega);

    if (inicio !== null && fim !== null && fim < inicio) {
      throw new Error('Prazo de entrega inválido: não pode ser anterior à data de abertura');
    }
  }

  public inserirRoteiro(dados: InserirRoteiroInput): Roteiro {
    const titulo = (dados?.titulo ?? '').trim();
    if (!titulo) {
      throw new Error('O título do roteiro é obrigatório');
    }

    const turma = (dados?.turma ?? '').trim();
    const dataAbertura = (dados?.dataAbertura ?? '').trim();
    const prazoEntrega = (dados?.prazoEntrega ?? '').trim();

    this.validarDatas(dataAbertura, prazoEntrega);

    const duplicado = this.roteiroList.findByTitulo(titulo, turma);
    if (duplicado) {
      throw new Error(`Já existe um roteiro com o título "${titulo}" na turma "${turma}"`);
    }

    const props: RoteiroProps = {
      titulo,
      descricao: dados?.descricao ?? '',
      turma,
      dataAbertura,
      prazoEntrega,
      atividades: normalizarAtividades(dados?.atividades),
      respostas: dados?.respostas ?? [],
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

    const novaTurma =
      dados.turma !== undefined ? String(dados.turma).trim() : existente.getTurma();
    const novaDataAbertura =
      dados.dataAbertura !== undefined
        ? String(dados.dataAbertura).trim()
        : existente.getDataAbertura();
    const novoPrazoEntrega =
      dados.prazoEntrega !== undefined
        ? String(dados.prazoEntrega).trim()
        : existente.getPrazoEntrega();

    this.validarDatas(novaDataAbertura, novoPrazoEntrega);

    const conflitoTitulo = this.roteiroList.findByTitulo(novoTitulo, novaTurma);
    if (conflitoTitulo && conflitoTitulo.id !== existente.id) {
      throw new Error(
        `Já existe um roteiro com o título "${novoTitulo}" na turma "${novaTurma}"`
      );
    }

    if (dados.titulo !== undefined) {
      existente.setTitulo(novoTitulo);
    }
    if (dados.descricao !== undefined) {
      existente.setDescricao(String(dados.descricao));
    }
    if (dados.turma !== undefined) {
      existente.setTurma(novaTurma);
    }
    if (dados.dataAbertura !== undefined) {
      existente.setDataAbertura(novaDataAbertura);
    }
    if (dados.prazoEntrega !== undefined) {
      existente.setPrazoEntrega(novoPrazoEntrega);
    }
    if (dados.atividades !== undefined) {
      existente.setAtividades(normalizarAtividades(dados.atividades));
    }

    return this.roteiroList.update(existente);
  }

  public removerRoteiro(id: string): boolean {
    const existente = this.roteiroList.findById(id);
    if (!existente) {
      throw new Error('Roteiro não encontrado');
    }

    if (existente.possuiRespostas()) {
      throw new Error(
        'Não é possível remover o roteiro pois ele já possui respostas de alunos'
      );
    }

    return this.roteiroList.remove(id);
  }
}