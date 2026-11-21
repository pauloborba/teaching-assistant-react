import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { Roteiro } from '../models/Roteiro';
import { RespostasDeRoteiro } from '../models/RespostasDeRoteiro';
import { RespostasDeAvaliacao } from '../models/RespostasDeAvaliacao';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

const aluno = new Student('Aluno Teste', '11122233344', 'aluno@cin.ufpe.br');
const outroAluno = new Student('Outro Aluno', '55566677788', 'outro@cin.ufpe.br');

describe('Roteiro', () => {
  test('guarda o título sem espaços sobrando', () => {
    expect(new Roteiro('  Roteiro 1 ').getTitulo()).toBe('Roteiro 1');
  });

  test('tem os atributos do DDD do cadastro de roteiros', () => {
    const roteiro = new Roteiro('Roteiro 1', 'Testes de GUI', new Date('2026-11-01'), new Date('2026-11-08'), 'r1');

    expect(roteiro.toJSON()).toEqual({
      id: 'r1',
      titulo: 'Roteiro 1',
      descricao: 'Testes de GUI',
      dataAbertura: '2026-11-01T00:00:00.000Z',
      prazoEntrega: '2026-11-08T00:00:00.000Z'
    });
  });

  test('sem id informado, o título identifica o roteiro', () => {
    expect(new Roteiro('Roteiro 1').getId()).toBe('Roteiro 1');
  });

  test('a turma guarda o roteiro recebido, com todos os seus dados', () => {
    const turma = new Class('ESS', 2, 2026, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    turma.addEnrollment(aluno);
    const roteiro = new Roteiro('Roteiro 1', 'Testes de GUI', undefined, undefined, 'r1');

    turma.addRespostasDeAvaliacao(roteiro, new RespostasDeAvaliacao(aluno, 8, 2, 1));

    expect(turma.findRespostasDoRoteiro('Roteiro 1')?.getRoteiro()).toBe(roteiro);
  });

  test('não aceita título vazio', () => {
    expect(() => new Roteiro('')).toThrow('Título do roteiro é obrigatório');
    expect(() => new Roteiro('   ')).toThrow('Título do roteiro é obrigatório');
  });
});

describe('RespostasDeAvaliacao', () => {
  test('guarda acertos, erros e tempo de entrega do aluno', () => {
    const avaliacao = new RespostasDeAvaliacao(aluno, 8, 2, 1);

    expect(avaliacao.toJSON()).toEqual({ studentCPF: '11122233344', acertos: 8, erros: 2, tempoEntrega: 1 });
  });

  test('não aceita valores negativos', () => {
    expect(() => new RespostasDeAvaliacao(aluno, -1, 2, 1)).toThrow();
    expect(() => new RespostasDeAvaliacao(aluno, 8, -2, 1)).toThrow();
    expect(() => new RespostasDeAvaliacao(aluno, 8, 2, -1)).toThrow();
  });

  test('não aceita valores que não são números', () => {
    expect(() => new RespostasDeAvaliacao(aluno, NaN, 2, 1)).toThrow();
    expect(() => new RespostasDeAvaliacao(aluno, '8' as any, 2, 1)).toThrow();
    expect(() => new RespostasDeAvaliacao(aluno, 8, undefined as any, 1)).toThrow();
  });
});

describe('RespostasDeRoteiro', () => {
  let respostas: RespostasDeRoteiro;

  beforeEach(() => {
    respostas = new RespostasDeRoteiro(new Roteiro('Roteiro 1'));
  });

  test('começa sem resultados', () => {
    expect(respostas.temResultados()).toBe(false);
  });

  test('não calcula desempenho sem resultados', () => {
    expect(() => respostas.calcularDesempenho()).toThrow('A turma não tem resultados nesse roteiro');
  });

  test('calcula as médias dos alunos', () => {
    respostas.addAvaliacao(new RespostasDeAvaliacao(aluno, 10, 0, 1));
    respostas.addAvaliacao(new RespostasDeAvaliacao(outroAluno, 6, 4, 3));

    expect(respostas.calcularDesempenho()).toEqual({ mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 2 });
  });

  test('um novo resultado do mesmo aluno substitui o anterior', () => {
    respostas.addAvaliacao(new RespostasDeAvaliacao(aluno, 2, 8, 5));
    respostas.addAvaliacao(new RespostasDeAvaliacao(aluno, 9, 1, 1));

    expect(respostas.getAvaliacoes()).toHaveLength(1);
    expect(respostas.calcularDesempenho()).toEqual({ mediaAcertos: 9, mediaErros: 1, mediaTempoEntrega: 1 });
  });
});

describe('Class (Turma) com resultados de roteiros', () => {
  let turma: Class;

  beforeEach(() => {
    turma = new Class('ESS', 2, 2026, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    turma.addEnrollment(aluno);
  });

  test('o nome da turma segue o formato dos cenários', () => {
    expect(turma.getNome()).toBe('ESS - 2026.2');
  });

  test('cadastra o resultado de um aluno matriculado', () => {
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 1'), new RespostasDeAvaliacao(aluno, 8, 2, 1));

    expect(turma.temResultadosNoRoteiro('Roteiro 1')).toBe(true);
    expect(turma.getDesempenhoNoRoteiro('Roteiro 1')).toEqual({ mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 });
  });

  test('não cadastra o resultado de um aluno que não é da turma', () => {
    expect(() => turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 1'), new RespostasDeAvaliacao(outroAluno, 8, 2, 1)))
      .toThrow('Student is not enrolled in this class');
    expect(turma.temResultadosNoRoteiro('Roteiro 1')).toBe(false);
  });

  test('guarda os resultados de cada roteiro separados', () => {
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 1'), new RespostasDeAvaliacao(aluno, 8, 2, 1));
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 2'), new RespostasDeAvaliacao(aluno, 4, 6, 3));

    expect(turma.getRespostasDeRoteiros()).toHaveLength(2);
    expect(turma.getDesempenhoNoRoteiro('Roteiro 2')).toEqual({ mediaAcertos: 4, mediaErros: 6, mediaTempoEntrega: 3 });
  });

  test('remover os resultados de um roteiro não mexe nos outros', () => {
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 1'), new RespostasDeAvaliacao(aluno, 8, 2, 1));
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 2'), new RespostasDeAvaliacao(aluno, 4, 6, 3));

    turma.removeRespostasDoRoteiro('Roteiro 1');

    expect(turma.temResultadosNoRoteiro('Roteiro 1')).toBe(false);
    expect(turma.temResultadosNoRoteiro('Roteiro 2')).toBe(true);
  });

  test('não tem desempenho num roteiro sem resultados', () => {
    expect(turma.temResultadosNoRoteiro('Roteiro 1')).toBe(false);
    expect(() => turma.getDesempenhoNoRoteiro('Roteiro 1')).toThrow('A turma não tem resultados nesse roteiro');
  });

  test('o JSON da turma inclui os resultados dos roteiros', () => {
    turma.addRespostasDeAvaliacao(new Roteiro('Roteiro 1'), new RespostasDeAvaliacao(aluno, 8, 2, 1));

    expect(turma.toJSON().respostasDeRoteiros).toEqual([
      { roteiro: 'Roteiro 1', avaliacoes: [{ studentCPF: '11122233344', acertos: 8, erros: 2, tempoEntrega: 1 }] }
    ]);
  });
});

describe('Classes (TurmaList) busca pelo nome', () => {
  test('findByNome acha a turma pelo nome dos cenários', () => {
    const turmas = new Classes();
    const turma = new Class('ESS', 2, 2026, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    turmas.addClass(turma);

    expect(turmas.findByNome('ESS - 2026.2')).toBe(turma);
    expect(turmas.findByNome(' ESS - 2026.2 ')).toBe(turma);
    expect(turmas.findByNome('ESS - 2025.1')).toBeUndefined();
  });
});
