import { Enrollment } from '../models/Enrollment';
import { Evaluation, EVALUATION_GOALS } from '../models/Evaluation';
import { Student } from '../models/Student';

type Conceito = 'MANA' | 'MPA' | 'MA';

// Matrícula com o mesmo conceito em todas as metas, exceto as indicadas em `excecoes`.
function matriculaCom(conceito: Conceito, excecoes: Record<string, Conceito | null> = {}): Enrollment {
  const matricula = new Enrollment(new Student('Maria Silva', '12345678901', 'maria@cin.ufpe.br'));
  for (const meta of EVALUATION_GOALS) {
    const nota = meta in excecoes ? excecoes[meta] : conceito;
    if (nota) matricula.addOrUpdateEvaluation(meta, nota);
  }
  return matricula;
}

describe('Enrollment - média antes da prova final (MA = 10, MPA = 7, MANA = 4)', () => {
  it.each([
    ['MA', 10],
    ['MPA', 7],
    ['MANA', 4],
  ] as const)('com %s em todas as metas a média é %d', (conceito, media) => {
    expect(matriculaCom(conceito).calculateMediaPreFinal()).toBe(media);
  });

  it('dá o mesmo peso a todas as metas', () => {
    // (5 × 7 + 10) / 6 = 7,5
    expect(matriculaCom('MPA', { Tests: 'MA' }).calculateMediaPreFinal()).toBeCloseTo(7.5);
    // (5 × 7 + 4) / 6 = 6,5
    expect(matriculaCom('MPA', { Tests: 'MANA' }).calculateMediaPreFinal()).toBeCloseTo(6.5);
  });

  it('não calcula a média enquanto alguma meta estiver sem conceito', () => {
    const matricula = matriculaCom('MA', { Tests: null });

    expect(matricula.calculateMediaPreFinal()).toBeNull();
    expect(matricula.getMediaPreFinal()).toBeNull();
  });

  it('atualiza a média guardada quando um conceito é alterado ou removido', () => {
    const matricula = matriculaCom('MPA');
    expect(matricula.getMediaPreFinal()).toBe(7);

    matricula.addOrUpdateEvaluation('Tests', 'MA');
    expect(matricula.getMediaPreFinal()).toBeCloseTo(7.5);
    expect(matricula.toJSON().mediaPreFinal).toBeCloseTo(7.5);

    matricula.removeEvaluation('Tests');
    expect(matricula.getMediaPreFinal()).toBeNull();
  });

  it('ignora metas que não fazem parte do cálculo', () => {
    const matricula = matriculaCom('MPA');
    matricula.addOrUpdateEvaluation('Meta extra', 'MANA');

    expect(matricula.getMediaPreFinal()).toBe(7);
  });

  it('recalcula a média a partir das notas ao carregar do arquivo, ignorando o valor salvo', () => {
    const aluno = new Student('Maria Silva', '12345678901', 'maria@cin.ufpe.br');
    const matricula = Enrollment.fromJSON({
      student: aluno.toJSON(),
      evaluations: EVALUATION_GOALS.map(meta => new Evaluation(meta, 'MPA').toJSON()),
      mediaPreFinal: 0
    }, aluno);

    expect(matricula.getMediaPreFinal()).toBe(7);
  });
});
