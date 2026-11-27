import { RoteiroAluno } from './RoteiroAluno';

export class RoteiroAlunoList {
  private roteirosAlunos: RoteiroAluno[] = [];

  add(roteiroAluno: RoteiroAluno): RoteiroAluno {
    if (this.findBy(roteiroAluno.getRoteiroId(), roteiroAluno.getCpfAluno())) {
      throw new Error('O aluno já possui registro neste roteiro');
    }
    this.roteirosAlunos.push(roteiroAluno);
    return roteiroAluno;
  }

  findBy(roteiroId: string, cpf: string): RoteiroAluno | undefined {
    return this.roteirosAlunos.find(ra => ra.getRoteiroId() === roteiroId && ra.getCpfAluno() === cpf);
  }

  listByAluno(cpf: string): RoteiroAluno[] {
    return this.roteirosAlunos.filter(ra => ra.getCpfAluno() === cpf);
  }

  getAll(): RoteiroAluno[] {
    return [...this.roteirosAlunos];
  }

  clear(): void {
    this.roteirosAlunos = [];
  }
}