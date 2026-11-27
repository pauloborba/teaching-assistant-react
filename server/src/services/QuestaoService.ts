import { Questao, TipoQuestao, Alternativa } from '../models/Questao';
import { QuestaoList } from '../models/QuestaoList';
import { RoteiroList } from '../models/RoteiroList';

export interface QuestaoInput {
  titulo?: string;
  enunciado?: string;
  tipo?: TipoQuestao;
  alternativas?: Alternativa[] | null;
}

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// CRUD do banco de questões usado pelo cadastro de roteiros
export class QuestaoService {
  private questaoList: QuestaoList;
  private roteiroList: RoteiroList;

  constructor(questaoList: QuestaoList, roteiroList: RoteiroList) {
    this.questaoList = questaoList;
    this.roteiroList = roteiroList;
  }

  // Lista o banco, filtrando pelo título quando há busca
  public listarQuestoes(busca?: string): Questao[] {
    const termo = (busca ?? '').trim().toLowerCase();
    return this.questaoList
      .getAll()
      .filter((q) => !termo || q.getTitulo().toLowerCase().includes(termo))
      .sort((a, b) => a.getTitulo().localeCompare(b.getTitulo(), 'pt-BR', { sensitivity: 'base' }));
  }

  public inserirQuestao(dados: QuestaoInput): Questao {
    const titulo = (dados?.titulo ?? '').trim();
    if (!titulo) {
      throw new Error('O título da questão é obrigatório');
    }

    const questao = Questao.fromJSON({
      id: gerarId('q'),
      titulo,
      enunciado: (dados?.enunciado ?? '').trim(),
      tipo: dados?.tipo ?? 'texto',
      alternativas: dados?.alternativas ?? null,
    });
    return this.questaoList.add(questao);
  }

  public atualizarQuestao(id: string, dados: QuestaoInput): Questao {
    const existente = this.questaoList.findById(id);
    if (!existente) {
      throw new Error('Questão não encontrada');
    }

    const atual = existente.toJSON();
    const titulo = dados.titulo !== undefined ? String(dados.titulo).trim() : atual.titulo;
    if (!titulo) {
      throw new Error('O título da questão é obrigatório');
    }

    const atualizada = Questao.fromJSON({
      id,
      titulo,
      enunciado: dados.enunciado !== undefined ? String(dados.enunciado).trim() : atual.enunciado,
      tipo: dados.tipo ?? atual.tipo,
      alternativas: dados.alternativas !== undefined ? dados.alternativas : atual.alternativas,
    });
    return this.questaoList.update(atualizada);
  }

  public removerQuestao(id: string): boolean {
    if (!this.questaoList.findById(id)) {
      throw new Error('Questão não encontrada');
    }

    const emUso = this.roteiroList.getAll().some((r) => r.getQuestaoIds().includes(id));
    if (emUso) {
      throw new Error('Não é possível remover a questão pois ela está associada a um roteiro');
    }

    return this.questaoList.remove(id);
  }
}
