import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';

/**
 * Testes unitários de Class: associação com o período, consulta do prazo e JSON.
 * Verificam o prazo compartilhado e a preservação dos dados da turma.
 * Datas fixas são exemplos; os testes não cobrem GUI, HTTP, arquivos ou cenários completos.
 */
describe('Prazo acadêmico da turma', () => {
  let turma: Class;
  let periodo: PeriodoAcademico;
  const instanteAtual = new Date('2026-08-20T08:00:00-03:00'); // Fornece um relógio fixo às operações de definição do prazo.
  const prazoAcademico = new Date('2026-08-31T23:59:00-03:00'); // Usa um fuso explícito para manter os testes independentes do computador.

  beforeEach(() => { // Recria a turma antes de cada caso para impedir que alterações de um teste afetem outro.
    periodo = new PeriodoAcademico(2026, 2);
    turma = new Class('ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA); // A turma recebe o período que fornecerá seu prazo.
  });

  // Verifica a compatibilidade com turmas criadas antes da inclusão do prazo acadêmico.
  // Sem prazo cadastrado, a entidade deve informar a ausência em vez de presumir que o prazo está aberto ou encerrado.
  test('não presume um prazo para uma turma que ainda não o possui', () => {
    expect(turma.getPrazoAcademico()).toBeNull(); // toBeNull confirma que nenhum prazo foi atribuído automaticamente.
    expect(() => turma.prazoEncerrado(prazoAcademico)) // A função adia a execução para que o Jest possa verificar o erro lançado.
      .toThrow('Prazo acadêmico não definido para o período');
  });

  // Verifica a integridade da entidade: uma tentativa de cadastrar uma data inválida não pode apagar o prazo válido.
  // new Date('data inválida') produz um objeto Date cujo getTime retorna NaN; a validação deve rejeitá-lo antes da alteração.
  test('rejeita um prazo inválido sem alterar o prazo anteriormente definido', () => {
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, [turma.obterConfiguracaoLembretes()]);

    expect(() => periodo.definirPrazoAcademico(new Date('data inválida'), instanteAtual, [turma.obterConfiguracaoLembretes()])) // A rejeição do período deve manter o valor consultado pela turma.
      .toThrow('Prazo acadêmico inválido');
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // A rejeição deve preservar o prazo já cadastrado.
  });

  // Verifica o contrato do instante recebido pelo método: uma data inválida deve ser rejeitada.
  // Uma comparação com NaN retornaria false e poderia indicar incorretamente que o prazo ainda está aberto.
  test('rejeita um instante atual inválido sem alterar o prazo', () => {
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, [turma.obterConfiguracaoLembretes()]);

    expect(() => turma.prazoEncerrado(new Date('data inválida')))
      .toThrow('Instante atual inválido');
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // toEqual compara o valor das datas, mesmo sendo objetos diferentes.
  });

  // test.each executa o mesmo teste para três instantes; cada linha abaixo conta como um teste independente.
  // Os limites de um milissegundo distinguem a regra "posterior ao prazo" de "no prazo ou depois".
  // Esses casos verificam a consulta usada pelos dois cenários citados no comentário inicial, sem testar criação ou reenvio.
  test.each([
    { descricao: 'antes do prazo', instante: '2026-08-31T23:58:59.999-03:00', encerrado: false }, // Um milissegundo antes: o prazo ainda está aberto.
    { descricao: 'exatamente no prazo', instante: '2026-08-31T23:59:00-03:00', encerrado: false }, // No limite: o DDD determina que o prazo ainda não encerrou.
    { descricao: 'depois do prazo', instante: '2026-08-31T23:59:00.001-03:00', encerrado: true } // Um milissegundo depois: o encerramento deve ser identificado.
  ])('$descricao: encerrado deve ser $encerrado', ({ instante, encerrado }) => {
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, [turma.obterConfiguracaoLembretes()]);

    expect(turma.prazoEncerrado(new Date(instante))).toBe(encerrado); // Compara o resultado com o booleano esperado para a linha atual.
    expect(turma.getPrazoAcademico()).toEqual(prazoAcademico); // Consultar o encerramento não modifica o prazo da turma.
  });

  // Teste unitário de serialização: verifica o formato padronizado usado para transportar e armazenar o prazo.
  test('representa o prazo em ISO preservando o instante original', () => {
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, [turma.obterConfiguracaoLembretes()]);

    expect(turma.toJSON().prazoAcademico)
      .toBe('2026-09-01T02:59:00.000Z'); // Confere a representação UTC do prazo definido no fuso -03:00.
  });

  // Teste unitário de ida e volta: verifica se a conversão para JSON e a reconstrução preservam o prazo.
  test('recupera o mesmo prazo após converter a turma para JSON', () => {
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, [turma.obterConfiguracaoLembretes()]);

    const dados = JSON.parse(JSON.stringify(turma.toJSON())); // Simula a conversão para texto JSON e sua leitura, sem acessar arquivos.
    const turmaRecuperada = Class.fromJSON(dados, [], periodo); // Reconstrói a turma ligada ao período já resolvido; não há alunos neste caso.

    expect(turmaRecuperada.getPrazoAcademico()).toEqual(prazoAcademico);
    expect(turmaRecuperada.obterPeriodoAcademico()).toBe(periodo); // Não cria outro período durante a reconstrução.
  });

  // Teste unitário de compatibilidade: verifica a leitura do formato anterior, que não possuía prazo.
  test('recupera uma turma antiga sem inventar um prazo acadêmico', () => {
    const dadosAntigos = {
      topic: 'ESS',
      semester: 2,
      year: 2026,
      especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA.toJSON(),
      enrollments: []
    }; // Representa os dados de uma turma anterior à inclusão do campo prazoAcademico.

    const turmaRecuperada = Class.fromJSON(dadosAntigos, [], periodo);

    expect(turmaRecuperada.getPrazoAcademico()).toBeNull();
  });

  test('duas turmas consultam a mesma alteração de prazo do período', () => { // Verifica diretamente a correção da antiga duplicação de prazos por turma.
    const outraTurma = new Class('Introdução a Programação', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const configuracoes = [turma.obterConfiguracaoLembretes(), outraTurma.obterConfiguracaoLembretes()];
    periodo.definirPrazoAcademico(prazoAcademico, instanteAtual, configuracoes);
    const novoPrazo = new Date('2026-08-30T23:59:00-03:00');

    periodo.definirPrazoAcademico(novoPrazo, instanteAtual, configuracoes);

    expect(turma.obterPeriodoAcademico()).toBe(outraTurma.obterPeriodoAcademico());
    expect(turma.getPrazoAcademico()).toEqual(novoPrazo);
    expect(outraTurma.getPrazoAcademico()).toEqual(novoPrazo);
    expect(turma.toJSON().prazoAcademico).toBe(novoPrazo.toISOString()); // A resposta para a GUI também consulta o prazo atualizado.
  });

  test('trocar o período preserva matrículas, avaliações e especificação de cálculo', () => { // Protege os comportamentos anteriores de Class durante a mudança da associação.
    const aluno = new Student('Aluno de teste', '12345678901', 'teste@example.test');
    const matricula = turma.addEnrollment(aluno);
    matricula.addOrUpdateEvaluation('Prova 1', 'MA');
    const configuracao = turma.obterConfiguracaoLembretes();
    const destino = new PeriodoAcademico(2027, 1, new Date('2027-02-28T23:59:00-03:00'));

    turma.definirPeriodoAcademico(destino);

    expect(turma.getYear()).toBe(2027);
    expect(turma.getSemester()).toBe(1);
    expect(turma.getClassId()).toBe('ESS-2027-1');
    expect(turma.getEnrollments()[0]).toBe(matricula);
    expect(turma.getEnrolledStudents()).toEqual([aluno]);
    expect(turma.findEnrollmentByStudentCPF(aluno.getCPF())?.getEvaluations()[0].getGrade()).toBe('MA');
    expect(turma.getEspecificacaoDoCalculoDaMedia()).toBe(DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    expect(turma.obterConfiguracaoLembretes()).toBe(configuracao);
  });
});

/**
 * Teste unitário de Class: protege o isolamento das configurações entre turmas.
 * Apoia o cenário de alteração sem afetar outra turma; não executa GUI, HTTP ou persistência.
 */
describe('Configuração de lembretes da turma', () => {
  test('configura um lembrete em uma turma sem modificar outra do mesmo semestre', () => {
    const instanteAtual = new Date('2026-08-20T08:00:00.000Z'); // Instante fixo para o teste não depender do relógio do computador.
    const prazo = new Date('2026-08-31T23:59:00.000Z'); // Limite compartilhado pelas turmas deste teste.
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    const turmaESS = new Class('ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA); // Turma que receberá o lembrete.
    const turmaIP = new Class('Introdução a Programação', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA); // Mesmo período, mas com configuração própria.
    const configuracao = turmaESS.obterConfiguracaoLembretes(); // Obtém a configuração associada à turma escolhida.

    configuracao.atualizar(1, [{ id: 'primeiro', data: '2026-08-25', horario: '09:00' }], instanteAtual, prazo); // Aplica uma proposta válida pelas regras do domínio.

    expect(turmaESS.obterConfiguracaoLembretes().listar()).toHaveLength(1); // Confirma que a alteração permanece na configuração da turma.
    expect(turmaIP.obterConfiguracaoLembretes().listar()).toEqual([]); // A outra turma deve continuar sem lembretes.
  });
});

/**
 * Teste unitário de Class para o cenário de identificação correta das notas pendentes.
 * Verifica metas sem nota, conceitos já lançados e preservação dos dados consultados.
 */
describe('Identificação de notas pendentes da turma', () => {
  test('identifica exatamente as metas sem nota nas matrículas', () => {
    // Given: dois alunos matriculados e as notas já lançadas em cada meta.
    const periodo = new PeriodoAcademico(2026, 2);
    const turma = new Class('ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    const joao = turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
    const maria = turma.addEnrollment(new Student('Maria Souza', '98765432101', 'maria@example.test'));
    const notasComuns = [
      ['Requirements', 'MA'],
      ['Configuration Management', 'MPA'],
      ['Project Management', 'MANA'],
      ['Refactoring', 'MA']
    ] as const;

    for (const [meta, conceito] of notasComuns) {
      joao.addOrUpdateEvaluation(meta, conceito);
      maria.addOrUpdateEvaluation(meta, conceito);
    }

    maria.addOrUpdateEvaluation('Design', 'MANA');
    const dadosAntesDaConsulta = turma.toJSON();

    // When: a turma consulta as metas que continuam sem nota.
    const pendencias = turma.identificarPendencias();

    // Then: Design de Maria está lançado, e Tests está pendente para ambos.
    expect(pendencias).toEqual([
      { nomeAluno: 'João da Silva', meta: 'Design' },
      { nomeAluno: 'João da Silva', meta: 'Tests' },
      { nomeAluno: 'Maria Souza', meta: 'Tests' }
    ]);
    expect(turma.toJSON()).toEqual(dadosAntesDaConsulta);
  });
});
