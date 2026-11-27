import { Classes } from './Classes';
import { Class } from './Class';
import { Desempenho, media, RespostasDeRoteiro } from './RespostasDeRoteiro';
import { RespostasDeAvaliacao } from './RespostasDeAvaliacao';
import { RoteiroList } from './RoteiroList';
import { RoteiroAlunoList } from './RoteiroAlunoList';

export const MEDIA_DAS_TURMAS_PASSADAS = 'Média das turmas passadas';
export const MENSAGEM_DE_ERRO = 'Não é possível fazer essa operação!';

// Nota mínima (escala de 0 a 10) para uma questão contar como acerto
export const NOTA_MINIMA_DE_ACERTO = 6;

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

// Formato de cada linha devolvida por comparar() (uma linha da tabela do relatório).
// Não é uma entidade nem um value object do DDD; só descreve os dados devolvidos.
export interface LinhaDoRelatorio extends Desempenho {
  turma: string;
}

// Compara o desempenho da turma atual em um roteiro com o das turmas passadas
export class ComparacaoService {
  private turmas: Classes;
  private roteiros: RoteiroList;
  private roteirosAlunos: RoteiroAlunoList;

  constructor(turmas: Classes, roteiros: RoteiroList, roteirosAlunos: RoteiroAlunoList) {
    this.turmas = turmas;
    this.roteiros = roteiros;
    this.roteirosAlunos = roteirosAlunos;
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

  // Desempenho da turma no roteiro, ou undefined se ela não tem resultados nele.
  // Os resultados vêm das respostas reais dos alunos (roteirosAlunos): entram os roteiros
  // respondidos ou enviados com todas as questões corrigidas. Acerto é nota >= NOTA_MINIMA_DE_ACERTO;
  // o tempo de entrega é o número de dias entre a abertura do roteiro e o envio.
  private desempenhoNoRoteiro(turma: Class, tituloRoteiro: string): Desempenho | undefined {
    const roteiro = this.roteiros.findByTitulo(tituloRoteiro, turma.getClassId());
    if (!roteiro) {
      return undefined;
    }

    const questaoIds = roteiro.getQuestaoIds();
    const abertura = Date.parse(roteiro.getDataAbertura());
    const respostasDoRoteiro = new RespostasDeRoteiro(roteiro);

    this.roteirosAlunos
      .getAll()
      .filter((ra) => ra.getRoteiroId() === roteiro.id && ra.getTurmaId() === turma.getClassId())
      .filter((ra) => ra.getStatus() === 'respondido' || ra.getStatus() === 'enviado')
      .forEach((ra) => {
        const aluno = turma.findEnrollmentByStudentCPF(ra.getCpfAluno())?.getStudent();
        const notas = questaoIds.map((id) => ra.findResposta(id)?.getNota());
        const dataEnvio = ra.getDataEnvio();
        if (!aluno || !dataEnvio || Number.isNaN(abertura) || notas.length === 0 || notas.some((n) => n == null)) {
          return;
        }

        const acertos = notas.filter((n) => (n as number) >= NOTA_MINIMA_DE_ACERTO).length;
        const dias = Math.max(0, (dataEnvio.getTime() - abertura) / MILISSEGUNDOS_POR_DIA);
        respostasDoRoteiro.addAvaliacao(
          new RespostasDeAvaliacao(aluno, acertos, notas.length - acertos, Math.round(dias * 100) / 100)
        );
      });

    return respostasDoRoteiro.temResultados() ? respostasDoRoteiro.calcularDesempenho() : undefined;
  }

  // Cada turma passada pesa igual: é a média das médias das turmas
  private calcularMediaDasPassadas(desempenhos: Desempenho[]): Desempenho {
    return {
      mediaAcertos: media(desempenhos.map(d => d.mediaAcertos)),
      mediaErros: media(desempenhos.map(d => d.mediaErros)),
      mediaTempoEntrega: media(desempenhos.map(d => d.mediaTempoEntrega))
    };
  }

  // Busca pelo id da turma (topic-year-semester), formato do contrato de roteiro
  private buscarTurma(turmaId: string): Class {
    const turma = this.turmas.findClassById(turmaId);
    if (!turma) {
      throw new Error(MENSAGEM_DE_ERRO);
    }
    return turma;
  }
}
