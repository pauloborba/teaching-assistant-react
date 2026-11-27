import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { Student } from '../models/Student';
import { Roteiro } from '../models/Roteiro';
import { RespostasDeAvaliacao } from '../models/RespostasDeAvaliacao';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { ComparacaoService, MEDIA_DAS_TURMAS_PASSADAS, MENSAGEM_DE_ERRO } from '../models/ComparacaoService';

describe('ComparacaoService', () => {
  let turmas: Classes;
  let service: ComparacaoService;
  const aluno = new Student('Aluno Teste', '11122233344', 'aluno@cin.ufpe.br');
  const outroAluno = new Student('Outro Aluno', '55566677788', 'outro@cin.ufpe.br');

  // Cria a turma com os dois alunos matriculados
  function criarTurma(year: number, semester: number): Class {
    const turma = new Class('ESS', semester, year, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    turma.addEnrollment(aluno);
    turma.addEnrollment(outroAluno);
    turmas.addClass(turma);
    return turma;
  }

  function cadastrarResultado(turma: Class, roteiro: string, acertos: number, erros: number, tempo: number, quem: Student = aluno): void {
    turma.addRespostasDeAvaliacao(new Roteiro(roteiro), new RespostasDeAvaliacao(quem, acertos, erros, tempo));
  }

  beforeEach(() => {
    turmas = new Classes();
    service = new ComparacaoService(turmas);
  });

  describe('relatório com turma atual e turmas passadas', () => {
    test('compara a turma atual com a média das turmas passadas (cenário 1)', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 8, 2, 1);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas).toEqual([
        { turma: 'ESS - 2026.2', mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 },
        { turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 7, mediaErros: 3, mediaTempoEntrega: 2 }
      ]);
    });

    test('a turma atual vem antes da linha da média das passadas', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas.map(l => l.turma)).toEqual(['ESS - 2026.2', MEDIA_DAS_TURMAS_PASSADAS]);
    });

    test('com uma só turma passada, a média das passadas é o desempenho dela', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 6, mediaErros: 4, mediaTempoEntrega: 3 });
    });

    test('faz a média de três turmas passadas', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2024, 2), 'Roteiro 1', 4, 6, 4);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 8, 2, 2);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2024.2', 'ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 6, mediaErros: 4, mediaTempoEntrega: 3 });
    });

    test('só usa as turmas passadas que o professor escolheu', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 2, 8, 5); // não escolhida
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.2']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 6, mediaErros: 4, mediaTempoEntrega: 3 });
    });
  });

  describe('cálculo das médias', () => {
    test('calcula a média da turma a partir dos resultados de cada aluno', () => {
      const turmaAtual = criarTurma(2026, 2);
      cadastrarResultado(turmaAtual, 'Roteiro 1', 10, 0, 1);
      cadastrarResultado(turmaAtual, 'Roteiro 1', 6, 4, 2, outroAluno);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas[0]).toEqual({ turma: 'ESS - 2026.2', mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1.5 });
    });

    test('a média das passadas dá o mesmo peso a cada turma, não a cada aluno', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      const turmaComDoisAlunos = criarTurma(2025, 1);
      cadastrarResultado(turmaComDoisAlunos, 'Roteiro 1', 10, 0, 1);
      cadastrarResultado(turmaComDoisAlunos, 'Roteiro 1', 10, 0, 1, outroAluno);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 4, 6, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2']);

      // (10 + 4) / 2 = 7, e não (10 + 10 + 4) / 3 = 8
      expect(linhas[1].mediaAcertos).toBe(7);
    });

    test('mostra médias com casas decimais', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 7, 3, 1);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 8, 2, 2);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 7.5, mediaErros: 2.5, mediaTempoEntrega: 1.5 });
    });

    test('arredonda as médias para duas casas decimais', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2024, 2), 'Roteiro 1', 1, 1, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 2, 2, 2);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 2, 2, 2);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2024.2', 'ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas[1].mediaAcertos).toBe(1.67);
    });

    test('aceita resultados com zero acertos', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 0, 10, 0);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 0, 10, 0);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas[0]).toEqual({ turma: 'ESS - 2026.2', mediaAcertos: 0, mediaErros: 10, mediaTempoEntrega: 0 });
    });
  });

  describe('roteiros diferentes do pedido', () => {
    test('ignora resultados de outros roteiros (cenário 2)', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 2', 4, 6, 3);
      const turmaPassada = criarTurma(2025, 2);
      cadastrarResultado(turmaPassada, 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(turmaPassada, 'Roteiro 2', 4, 6, 2);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.2']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 });
    });

    test('turma passada escolhida sem esse roteiro fica fora da média', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 2', 4, 6, 3);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 6, 4, 2);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas[1]).toEqual({ turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 6, mediaErros: 4, mediaTempoEntrega: 2 });
    });

    test('ignora os resultados de outro roteiro da própria turma atual', () => {
      const turmaAtual = criarTurma(2026, 2);
      cadastrarResultado(turmaAtual, 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(turmaAtual, 'Roteiro 2', 1, 9, 5);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas[0]).toEqual({ turma: 'ESS - 2026.2', mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 });
    });

    test('encontra o roteiro mesmo com espaços sobrando no título pedido', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', '  Roteiro 1 ', ['ESS - 2025.1']);

      expect(linhas).toHaveLength(2);
    });
  });

  describe('turma atual sem resultados', () => {
    test('mostra só a média das passadas (cenário 4)', () => {
      criarTurma(2026, 2);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);
      cadastrarResultado(criarTurma(2025, 2), 'Roteiro 1', 8, 2, 1);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2']);

      expect(linhas).toEqual([
        { turma: MEDIA_DAS_TURMAS_PASSADAS, mediaAcertos: 7, mediaErros: 3, mediaTempoEntrega: 2 }
      ]);
    });

    test('mostra só a média das passadas quando a atual só tem outro roteiro', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 2', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      const linhas = service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

      expect(linhas.map(l => l.turma)).toEqual([MEDIA_DAS_TURMAS_PASSADAS]);
    });
  });

  describe('erros', () => {
    test('dá erro quando nenhuma turma passada é escolhida (cenário 3)', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);

      expect(() => service.comparar('ESS - 2026.2', 'Roteiro 1', [])).toThrow(MENSAGEM_DE_ERRO);
    });

    test('dá erro quando as turmas passadas escolhidas não têm resultados nesse roteiro', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 2', 4, 6, 3);
      criarTurma(2025, 2);

      expect(() => service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2025.2'])).toThrow(MENSAGEM_DE_ERRO);
    });

    test('dá erro quando nem a turma atual nem as passadas têm resultados', () => {
      criarTurma(2026, 2);
      criarTurma(2025, 1);

      expect(() => service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1'])).toThrow(MENSAGEM_DE_ERRO);
    });

    test('dá erro quando a turma atual não existe', () => {
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      expect(() => service.comparar('ESS - 2030.1', 'Roteiro 1', ['ESS - 2025.1'])).toThrow(MENSAGEM_DE_ERRO);
    });

    test('dá erro quando uma das turmas passadas não existe', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      expect(() => service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1', 'ESS - 2019.1'])).toThrow(MENSAGEM_DE_ERRO);
    });

    test('dá erro para um roteiro que nenhuma turma tem', () => {
      cadastrarResultado(criarTurma(2026, 2), 'Roteiro 1', 8, 2, 1);
      cadastrarResultado(criarTurma(2025, 1), 'Roteiro 1', 6, 4, 3);

      expect(() => service.comparar('ESS - 2026.2', 'Roteiro 9', ['ESS - 2025.1'])).toThrow(MENSAGEM_DE_ERRO);
    });
  });

  test('pedir o relatório não altera os resultados das turmas', () => {
    const turmaAtual = criarTurma(2026, 2);
    const turmaPassada = criarTurma(2025, 1);
    cadastrarResultado(turmaAtual, 'Roteiro 1', 8, 2, 1);
    cadastrarResultado(turmaPassada, 'Roteiro 1', 6, 4, 3);
    const antes = [turmaAtual.toJSON(), turmaPassada.toJSON()];

    service.comparar('ESS - 2026.2', 'Roteiro 1', ['ESS - 2025.1']);

    expect([turmaAtual.toJSON(), turmaPassada.toJSON()]).toEqual(antes);
  });
});
