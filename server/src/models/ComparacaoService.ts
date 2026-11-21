import { Classes } from './Classes';
import { Class } from './Class';
import { Desempenho, media } from './RespostasDeRoteiro';

export const MEDIA_DAS_TURMAS_PASSADAS = 'Média das turmas passadas';
export const MENSAGEM_DE_ERRO = 'Não é possível fazer essa operação!';

// Formato de cada linha devolvida por comparar() (uma linha da tabela do relatório).
// Não é uma entidade nem um value object do DDD; só descreve os dados devolvidos.
export interface LinhaDoRelatorio extends Desempenho {
  turma: string;
}

// Compara o desempenho da turma atual em um roteiro com o das turmas passadas
export class ComparacaoService {
  private turmas: Classes;

  constructor(turmas: Classes) {
    this.turmas = turmas;
  }

  comparar(turmaAtual: string, tituloRoteiro: string, passadas: string[]): LinhaDoRelatorio[] {
    const turmaDoRelatorio = this.buscarTurma(turmaAtual);
    const turmasPassadas = passadas.map(nome => this.buscarTurma(nome));

    // Só entram na média as turmas passadas que têm resultados nesse roteiro
    const desempenhosPassados = turmasPassadas
      .map(turma => this.desempenhoNoRoteiro(turma, tituloRoteiro))
      .filter((desempenho): desempenho is Desempenho => desempenho !== undefined);

    if (desempenhosPassados.length === 0) {
      throw new Error(MENSAGEM_DE_ERRO);
    }

    const linhas: LinhaDoRelatorio[] = [];

    // Se a turma atual ainda não tem resultados, mostra só a média das passadas
    const desempenhoAtual = this.desempenhoNoRoteiro(turmaDoRelatorio, tituloRoteiro);
    if (desempenhoAtual) {
      linhas.push({ turma: turmaDoRelatorio.getNome(), ...desempenhoAtual });
    }

    linhas.push({ turma: MEDIA_DAS_TURMAS_PASSADAS, ...this.calcularMediaDasPassadas(desempenhosPassados) });

    return linhas;
  }

  // Desempenho da turma no roteiro, ou undefined se ela não tem resultados nele
  private desempenhoNoRoteiro(turma: Class, tituloRoteiro: string): Desempenho | undefined {
    if (!turma.temResultadosNoRoteiro(tituloRoteiro)) {
      return undefined;
    }
    return turma.getDesempenhoNoRoteiro(tituloRoteiro);
  }

  // Cada turma passada pesa igual: é a média das médias das turmas
  private calcularMediaDasPassadas(desempenhos: Desempenho[]): Desempenho {
    return {
      mediaAcertos: media(desempenhos.map(d => d.mediaAcertos)),
      mediaErros: media(desempenhos.map(d => d.mediaErros)),
      mediaTempoEntrega: media(desempenhos.map(d => d.mediaTempoEntrega))
    };
  }

  // Busca pelo nome da turma, ex.: "ESS - 2026.2" (TurmaList.findByNome)
  private buscarTurma(nome: string): Class {
    const turma = this.turmas.findByNome(nome);
    if (!turma) {
      throw new Error(MENSAGEM_DE_ERRO);
    }
    return turma;
  }
}
