import { Roteiro } from './Roteiro';
import { RespostaQuestao } from './RespostaQuestao';

export type StatusRoteiroAluno = 'em_andamento' | 'respondido' | 'enviado';

export class RoteiroAluno {
  private readonly roteiroId: string;
  private readonly cpfAluno: string;
  private readonly turmaId: string;
  private status: StatusRoteiroAluno;
  private dataEnvio: Date | null;
  private respostas: RespostaQuestao[];

  constructor(
    roteiroId: string,
    cpfAluno: string,
    turmaId: string,
    status: StatusRoteiroAluno = 'em_andamento',
    dataEnvio: Date | null = null,
    respostas: RespostaQuestao[] = []
  ) {
    if (!roteiroId || !cpfAluno || !turmaId) {
      throw new Error('Roteiro, aluno e turma são obrigatórios');
    }
    if (!['em_andamento', 'respondido', 'enviado'].includes(status)) {
      throw new Error('Status de roteiro inválido');
    }
    this.roteiroId = roteiroId;
    this.cpfAluno = cpfAluno;
    this.turmaId = turmaId;
    this.status = status;
    this.dataEnvio = dataEnvio;
    this.respostas = [...respostas];
  }

  // Getters
  getRoteiroId(): string {
    return this.roteiroId;
  }

  getCpfAluno(): string {
    return this.cpfAluno;
  }

  getTurmaId(): string {
    return this.turmaId;
  }

  getStatus(): StatusRoteiroAluno {
    return this.status;
  }

  getDataEnvio(): Date | null {
    return this.dataEnvio;
  }

  getRespostas(): RespostaQuestao[] {
    return [...this.respostas];
  }

  findResposta(questaoId: string): RespostaQuestao | undefined {
    return this.respostas.find(r => r.getQuestaoId() === questaoId);
  }

  getQuantidadeRespondidas(): number {
    return this.respostas.filter(r => r.estaRespondida()).length;
  }

    // Envia o roteiro se o prazo acabou, preenchendo respostas não respondidas com valor null e tempo 0
  enviarSePrazoAcabou(roteiro: Roteiro, agora: Date): boolean {
    if (roteiro.getId() !== this.roteiroId) {
      throw new Error('Roteiro não corresponde a este progresso');
    }
    if (this.status !== 'em_andamento' || !roteiro.prazoEncerrado(agora)) {
      return false;
    }

    roteiro.getQuestaoIds().forEach(questaoId => {
      if (!this.findResposta(questaoId)) {
        this.respostas.push(new RespostaQuestao(questaoId, null, 0));
      }
    });
    this.status = 'enviado';
    this.dataEnvio = new Date(roteiro.getPrazoEntrega());
    return true;
  }

  toJSON() {
    return {
      roteiroId: this.roteiroId,
      cpfAluno: this.cpfAluno,
      turmaId: this.turmaId,
      status: this.status,
      dataEnvio: this.dataEnvio ? this.dataEnvio.toISOString() : null,
      respostas: this.respostas.map(r => r.toJSON())
    };
  }

  static fromJSON(data: {
    roteiroId: string;
    cpfAluno: string;
    turmaId: string;
    status: StatusRoteiroAluno;
    dataEnvio?: string | null;
    respostas?: any[];
  }): RoteiroAluno {
    const respostas = data.respostas
      ? data.respostas.map((respostaData: any) => RespostaQuestao.fromJSON(respostaData))
      : [];
    return new RoteiroAluno(
      data.roteiroId,
      data.cpfAluno,
      data.turmaId,
      data.status,
      data.dataEnvio ? new Date(data.dataEnvio) : null,
      respostas
    );
  }
}