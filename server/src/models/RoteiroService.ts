import { Classes } from './Classes';
import { Class } from './Class';
import { Roteiro } from './Roteiro';
import { RoteiroList } from './RoteiroList';
import { RoteiroAlunoList } from './RoteiroAlunoList';

export type SituacaoRoteiro =
  | 'em_andamento'
  | 'respondido'
  | 'enviado'
  | 'nao_iniciado'
  | 'ainda_nao_aberto'
  | 'prazo_encerrado';

export interface RoteiroDoAlunoResumo {
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

export interface ResultadoListagem {
  roteiros: RoteiroDoAlunoResumo[];
  houveAlteracao: boolean; 
}


export class RoteiroService {
  constructor(
    private readonly roteiros: RoteiroList,
    private readonly roteirosAlunos: RoteiroAlunoList,
    private readonly turmas: Classes
  ) {}

  listarRoteirosDoAluno(cpf: string, agora: Date): ResultadoListagem {
    const turmasDoAluno = this.turmas
      .getAllClasses()
      .filter(turma => turma.findEnrollmentByStudentCPF(cpf) !== undefined);
    const idsTurmasDoAluno = turmasDoAluno.map(turma => turma.getClassId());

    let houveAlteracao = false;

    const roteiros = this.roteiros
      .getAll()
      .filter(roteiro => roteiro.getTurmaIds().some(id => idsTurmasDoAluno.includes(id)))
      .map(roteiro => {
        const progresso = this.roteirosAlunos.findBy(roteiro.getId(), cpf);

        if (progresso && progresso.enviarSePrazoAcabou(roteiro, agora)) {
          houveAlteracao = true;
        }

        const turmaId = progresso
          ? progresso.getTurmaId()
          : roteiro.getTurmaIds().find(id => idsTurmasDoAluno.includes(id))!;
        const turma = turmasDoAluno.find(t => t.getClassId() === turmaId);

        const situacao: SituacaoRoteiro = progresso
          ? progresso.getStatus()
          : this.situacaoSemProgresso(roteiro, agora);

        return {
          id: roteiro.getId(),
          titulo: roteiro.getTitulo(),
          descricao: roteiro.getDescricao(),
          dataAbertura: roteiro.getDataAbertura().toISOString(),
          prazoEntrega: roteiro.getPrazoEntrega().toISOString(),
          turmaId,
          turma: turma ? RoteiroService.nomeDaTurma(turma) : turmaId,
          totalQuestoes: roteiro.getTotalQuestoes(),
          questoesRespondidas: progresso ? progresso.getQuantidadeRespondidas() : 0,
          situacao,
          disponivel: roteiro.aberto(agora) && (situacao === 'nao_iniciado' || situacao === 'em_andamento')
        };
      })
      .sort((a, b) => a.prazoEntrega.localeCompare(b.prazoEntrega));

    return { roteiros, houveAlteracao };
  }

  private situacaoSemProgresso(roteiro: Roteiro, agora: Date): SituacaoRoteiro {
    if (roteiro.aindaNaoAbriu(agora)) return 'ainda_nao_aberto';
    if (roteiro.prazoEncerrado(agora)) return 'prazo_encerrado';
    return 'nao_iniciado';
  }

  static nomeDaTurma(turma: Class): string {
    return `${turma.getTopic()} - ${turma.getYear()}.${turma.getSemester()}`;
  }
}