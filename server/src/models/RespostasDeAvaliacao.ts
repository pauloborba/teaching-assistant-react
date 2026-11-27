import { Student } from './Student';

// Resultado de um aluno em um roteiro corrigido (value object).
// tempoEntrega é o tempo aproximado até a entrega, em dias.
export class RespostasDeAvaliacao {
  private readonly aluno: Student;
  private readonly acertos: number;
  private readonly erros: number;
  private readonly tempoEntrega: number;

  constructor(aluno: Student, acertos: number, erros: number, tempoEntrega: number) {
    if (!RespostasDeAvaliacao.ehNumeroValido(acertos) ||
        !RespostasDeAvaliacao.ehNumeroValido(erros) ||
        !RespostasDeAvaliacao.ehNumeroValido(tempoEntrega)) {
      throw new Error('Acertos, erros e tempo de entrega devem ser números não negativos');
    }
    this.aluno = aluno;
    this.acertos = acertos;
    this.erros = erros;
    this.tempoEntrega = tempoEntrega;
  }

  private static ehNumeroValido(valor: number): boolean {
    return typeof valor === 'number' && !isNaN(valor) && valor >= 0;
  }

  getAluno(): Student {
    return this.aluno;
  }

  getAcertos(): number {
    return this.acertos;
  }

  getErros(): number {
    return this.erros;
  }

  getTempoEntrega(): number {
    return this.tempoEntrega;
  }

  toJSON() {
    return {
      studentCPF: this.aluno.getCPF(),
      acertos: this.acertos,
      erros: this.erros,
      tempoEntrega: this.tempoEntrega
    };
  }
}
