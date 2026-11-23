import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { EmailSenderSimulado } from '../models/EmailSender';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';
import { HistoricoNotificacoes } from '../models/HistoricoNotificacoes';
import { Lembrete } from '../models/Lembrete';
import { Notificacao } from '../models/Notificacao';
import { NotificacaoService } from '../models/NotificacaoService';
import { PeriodoAcademico } from '../models/PeriodoAcademico';
import { Student } from '../models/Student';

/** Integração do cenário de envio com transporte simulado e histórico em memória. */
describe('Processamento do lembrete de notas pendentes', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('envia o aviso, registra a tentativa e marca o lembrete como enviado', async () => {
    // Given: o relógio chegou ao agendamento e o transporte aceita o e-mail.
    const instante = new Date('2026-08-25T09:00:00-03:00');
    const prazo = new Date('2026-08-31T23:59:00-03:00');
    jest.useFakeTimers({ now: instante });

    const destinatario = 'paulo.borba@example.com';
    const classes = new Classes();
    classes.definirEmailDasTurmas(destinatario);
    const turma = classes.addClass(new Class(
      'ESS', new PeriodoAcademico(2026, 2, prazo), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    ));
    const joao = turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
    const maria = turma.addEnrollment(new Student('Maria Souza', '98765432101', 'maria@example.test'));

    for (const meta of EVALUATION_GOALS) {
      if (meta !== 'Design' && meta !== 'Tests') joao.addOrUpdateEvaluation(meta, 'MA');
      if (meta !== 'Tests') maria.addOrUpdateEvaluation(meta, 'MANA');
    }

    const configuracao = turma.obterConfiguracaoLembretes();
    configuracao.add(new Lembrete({ id: 'lembrete-1', data: '2026-08-25', horario: '12:00' }));
    const historico = new HistoricoNotificacoes();
    const send = jest.fn().mockResolvedValue({ aceito: true });
    const servico = new NotificacaoService(historico, new EmailSenderSimulado(), {
      classes,
      emailSender: { send }
    });

    // When: o servidor processa o agendamento de 09h de Brasília, armazenado como 12h UTC.
    const [tentativa] = await servico.processarAgendados(turma.getClassId(), '2026-08-25', '12:00');

    // Then: o aviso, o histórico e o estado da turma correspondem à mesma tentativa.
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(destinatario, 'Notas pendentes — 2026.2 de ESS', [
      'Olá,',
      '',
      'Ainda há notas pendentes na turma 2026.2 de ESS.',
      '',
      '- João da Silva: Design, Tests',
      '- Maria Souza: Tests',
      '',
      'Prazo acadêmico para lançamento das notas: 31/08/2026 às 23:59 (horário de Brasília).'
    ].join('\n'));
    expect(historico.listar()).toEqual([tentativa]);
    expect(tentativa).toMatchObject({
      nomeDestinatario: destinatario,
      turmaRegistrada: '2026.2 de ESS',
      lembreteId: 'lembrete-1',
      dataHora: instante,
      motivo: 'Notas pendentes',
      resultado: 'Enviado'
    });
    expect(tentativa.prazoRegistrado).toEqual(prazo);
    expect(tentativa.pendenciasRegistradas).toEqual([
      { nomeAluno: 'João da Silva', meta: 'Design' },
      { nomeAluno: 'João da Silva', meta: 'Tests' },
      { nomeAluno: 'Maria Souza', meta: 'Tests' }
    ]);
    expect(configuracao.listar().map(lembrete => ({
      id: lembrete.getId(), estado: lembrete.getEstado()
    }))).toEqual([{ id: 'lembrete-1', estado: 'Enviado' }]);
  });

  test('ignora o lembrete sem pendências e preserva a última tentativa de envio', async () => {
    // Given: todas as metas têm nota e a turma tem registros passado, atual e futuro.
    const instante = new Date('2026-08-25T09:00:00-03:00');
    const prazo = new Date('2026-08-31T23:59:00-03:00');
    jest.useFakeTimers({ now: instante });

    const destinatario = 'paulo.borba@example.com';
    const classes = new Classes();
    classes.definirEmailDasTurmas(destinatario);
    const turma = classes.addClass(new Class(
      'ESS', new PeriodoAcademico(2026, 2, prazo), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    ));
    const joao = turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
    const maria = turma.addEnrollment(new Student('Maria Souza', '98765432101', 'maria@example.test'));
    for (const meta of EVALUATION_GOALS) {
      joao.addOrUpdateEvaluation(meta, 'MA');
      maria.addOrUpdateEvaluation(meta, 'MANA');
    }
    const dadosAntes = turma.toJSON();

    const configuracao = turma.obterConfiguracaoLembretes();
    configuracao.add(new Lembrete({
      id: 'anterior', data: '2026-08-20', horario: '12:00', estado: 'Enviado'
    }));
    configuracao.add(new Lembrete({ id: 'atual', data: '2026-08-25', horario: '12:00' }));
    configuracao.add(new Lembrete({ id: 'futuro', data: '2026-08-29', horario: '12:00' }));
    const lembretesAntes = configuracao.toJSON();

    const historico = new HistoricoNotificacoes();
    const envioAnterior = new Notificacao(
      historico.proximoId(),
      destinatario,
      {
        lembreteId: 'anterior',
        turmaRegistrada: '2026.2 de ESS',
        prazoRegistrado: prazo,
        pendenciasRegistradas: [{ nomeAluno: 'João da Silva', meta: 'Design' }]
      },
      new Date('2026-08-20T09:00:00-03:00'),
      'Enviado',
      'Notas pendentes'
    );
    historico.registrar(envioAnterior);
    const send = jest.fn().mockResolvedValue({ aceito: true });
    const servico = new NotificacaoService(historico, new EmailSenderSimulado(), {
      classes,
      emailSender: { send }
    });

    // When: chega o agendamento de 25/08 às 09h de Brasília.
    const [registro] = await servico.processarAgendados(turma.getClassId(), '2026-08-25', '12:00');

    // Then: somente o lembrete atual muda, e Ignorado fica fora das tentativas de envio.
    expect(send).not.toHaveBeenCalled();
    expect(registro).toMatchObject({
      lembreteId: 'atual',
      turmaRegistrada: '2026.2 de ESS',
      dataHora: instante,
      resultado: 'Ignorado',
      motivo: 'Nenhuma nota pendente'
    });
    expect(registro.prazoRegistrado).toEqual(prazo);
    expect(registro.pendenciasRegistradas).toEqual([]);
    expect(historico.listar()).toEqual([envioAnterior, registro]);
    expect(historico.listar().filter(item => item.resultado === 'Enviado' || item.resultado === 'Falha'))
      .toEqual([envioAnterior]);
    expect(configuracao.toJSON()).toEqual([
      lembretesAntes[0],
      { ...lembretesAntes[1], estado: 'Ignorado', motivo: 'Nenhuma nota pendente' },
      lembretesAntes[2]
    ]);
    expect(turma.toJSON()).toEqual(dadosAntes);
  });

  test('envia lembretes simultâneos com as pendências de cada turma', async () => {
    const instante = new Date('2026-08-25T09:00:00-03:00');
    const prazo = new Date('2026-08-31T23:59:00-03:00'); // Given: prazo compartilhado pelas duas turmas.
    jest.useFakeTimers({ now: instante }); // Fixa o relógio no horário do When.

    const destinatario = 'professor@example.test';
    const classes = new Classes();
    classes.definirEmailDasTurmas(destinatario); // Given: um endereço para as duas turmas.
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    const lembrete = { id: 'lembrete-1', data: '2026-08-25', horario: '12:00', estado: 'Agendado' } as const;
    const casos = [
      { topico: 'ESS', aluno: 'Aluno ESS', cpf: '12345678901', meta: 'Design' },
      { topico: 'Introdução a Programação', aluno: 'Aluna IP', cpf: '98765432101', meta: 'Tests' }
    ];
    const turmas = casos.map(({ topico, aluno, cpf, meta }) => {
      const turma = classes.addClass(new Class(topico, periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
      const matricula = turma.addEnrollment(new Student(aluno, cpf, 'aluno@example.test'));
      for (const metaAvaliada of EVALUATION_GOALS) {
        if (metaAvaliada !== meta) matricula.addOrUpdateEvaluation(metaAvaliada, 'MA'); // Given: deixa só a meta escolhida sem nota.
      }
      turma.obterConfiguracaoLembretes().add(new Lembrete(lembrete)); // Given: agenda as duas turmas para 09h de Brasília.
      return turma;
    });
    const historico = new HistoricoNotificacoes();
    const send = jest.fn().mockResolvedValue({ aceito: true }); // Given: o transporte simulado aceita os dois envios.
    const servico = new NotificacaoService(historico, new EmailSenderSimulado(), {
      classes, emailSender: { send }
    });

    const registros = await servico.processarLembretesAteAgora(); // When: uma rodada processa as duas turmas.

    expect(send).toHaveBeenCalledTimes(2); // Then: dois avisos foram solicitados ao transporte.
    expect(registros).toHaveLength(2);
    expect(historico.listar()).toEqual(registros); // Then: as duas tentativas entraram no histórico.
    for (const { topico, aluno, meta } of casos) {
      const nomeTurma = `2026.2 de ${topico}`;
      expect(send).toHaveBeenCalledWith(destinatario, `Notas pendentes — ${nomeTurma}`, [
        'Olá,',
        '',
        `Ainda há notas pendentes na turma ${nomeTurma}.`,
        '',
        `- ${aluno}: ${meta}`, // Then: o corpo completo contém apenas a pendência desta turma.
        '',
        'Prazo acadêmico para lançamento das notas: 31/08/2026 às 23:59 (horário de Brasília).'
      ].join('\n'));
      expect(registros).toContainEqual(expect.objectContaining({
        turmaRegistrada: nomeTurma,
        lembreteId: lembrete.id,
        dataHora: instante,
        prazoRegistrado: prazo,
        nomeDestinatario: destinatario,
        resultado: 'Enviado', // Then: a tentativa da turma foi registrada no horário esperado.
        pendenciasRegistradas: [{ nomeAluno: aluno, meta }]
      }));
    }
    for (const turma of turmas) {
      expect(turma.obterConfiguracaoLembretes().toJSON())
        .toEqual([expect.objectContaining({ id: lembrete.id, estado: 'Enviado' })]); // Then: cada turma tem seu próprio lembrete enviado.
    }
  });

  test('rejeita um agendamento que não existe na turma solicitada', async () => {
    jest.useFakeTimers({ now: new Date('2026-08-27T09:00:00-03:00') });

    const destinatario = 'professor@example.test';
    const prazo = new Date('2026-08-31T23:59:00-03:00');
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    const classes = new Classes();
    classes.definirEmailDasTurmas(destinatario); // Given: há um destinatário configurado.
    const turma = classes.addClass(new Class('ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
    const outraTurma = classes.addClass(new Class('IP', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA));
    const aluno = new Student('Aluno ESS', '12345678901', 'aluno@example.test');
    turma.addEnrollment(aluno); // Given: há um aluno matriculado com notas pendentes.
    outraTurma.addEnrollment(aluno);

    const historico = new HistoricoNotificacoes();
    const configuracao = turma.obterConfiguracaoLembretes();
    const outraConfiguracao = outraTurma.obterConfiguracaoLembretes();
    const horario = '12:00';
    const dataSolicitada = '2026-08-27';
    outraConfiguracao.add(new Lembrete({ id: 'outra-turma', data: dataSolicitada, horario })); // Given: só IP possui o horário solicitado.
    for (const data of ['2026-08-20', '2026-08-25']) {
      configuracao.add(new Lembrete({ id: data, data, horario, estado: 'Enviado' })); // Given: ESS tem dois lembretes já enviados.
      historico.registrar(new Notificacao(
        historico.proximoId(),
        destinatario,
        {
          lembreteId: data,
          turmaRegistrada: '2026.2 de ESS',
          prazoRegistrado: prazo,
          pendenciasRegistradas: [{ nomeAluno: 'Aluno ESS', meta: 'Design' }]
        },
        new Date(`${data}T12:00:00Z`),
        'Enviado',
        'Notas pendentes'
      )); // Given: o histórico contém o envio de cada um desses lembretes.
    }

    const lembretesAntes = configuracao.toJSON();
    const outraConfiguracaoAntes = outraConfiguracao.toJSON();
    const historicoAntes = historico.toJSON();
    const send = jest.fn().mockResolvedValue({ aceito: true });
    const servico = new NotificacaoService(historico, new EmailSenderSimulado(), {
      classes, emailSender: { send }
    });

    await expect(servico.processarAgendados(turma.getClassId(), dataSolicitada, horario)) // When: solicita 27/08 às 09h para ESS.
      .rejects.toThrow('Não existe lembrete para o agendamento informado'); // Then: rejeita pelo motivo esperado.

    expect(send).not.toHaveBeenCalled(); // Then: nenhum envio foi solicitado.
    expect(configuracao.toJSON()).toEqual(lembretesAntes); // Then: os dois lembretes de ESS continuam enviados.
    expect(outraConfiguracao.toJSON()).toEqual(outraConfiguracaoAntes); // O lembrete de IP também é preservado.
    expect(historico.toJSON()).toEqual(historicoAntes); // Then: nenhuma tentativa foi acrescentada.
    expect(turma.getPrazoAcademico()).toEqual(prazo); // Then: o prazo acadêmico permanece igual.
  });

  test.each([true, false])(
    'processa o atrasado ao iniciar e aguarda o próximo horário, com aceitação inicial %s',
    async (aceito) => {
      // Given: o servidor inicia às 08h59min45s com um lembrete atrasado e outro para 09h.
      jest.useFakeTimers({ now: new Date('2026-08-25T08:59:45-03:00') });
      const prazo = new Date('2026-08-31T23:59:00-03:00');
      const classes = new Classes();
      classes.definirEmailDasTurmas('paulo.borba@example.com');

      const turma = classes.addClass(new Class(
        'ESS', new PeriodoAcademico(2026, 2, prazo), DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
      ));
      turma.addEnrollment(new Student('João da Silva', '12345678901', 'joao@example.test'));
      const configuracao = turma.obterConfiguracaoLembretes();
      configuracao.add(new Lembrete({ id: 'atrasado', data: '2026-08-25', horario: '11:58' }));
      configuracao.add(new Lembrete({ id: 'na-hora', data: '2026-08-25', horario: '12:00' }));

      const encerrada = classes.addClass(new Class(
        'IP',
        new PeriodoAcademico(2026, 1, new Date('2026-08-24T23:59:00-03:00')),
        DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
      ));
      encerrada.addEnrollment(new Student('Maria Souza', '98765432101', 'maria@example.test'));
      encerrada.obterConfiguracaoLembretes().add(
        new Lembrete({ id: 'prazo-encerrado', data: '2026-08-24', horario: '12:00' })
      );

      const historico = new HistoricoNotificacoes();
      const send = jest.fn()
        .mockResolvedValueOnce(aceito ? { aceito: true } : { aceito: false, descricaoFalha: 'Falha temporária' })
        .mockResolvedValue({ aceito: true });
      const servico = new NotificacaoService(historico, new EmailSenderSimulado(), {
        classes, emailSender: { send }
      });

      // When: executa a verificação inicial e avança por mais dois ciclos.
      const parar = servico.iniciarVerificacaoDeLembretes();
      try {
        await jest.advanceTimersByTimeAsync(0);
        const aoIniciar = historico.listar().map(registro => registro.lembreteId);

        await jest.advanceTimersByTimeAsync(29_999);
        const antesDaVerificacao = historico.listar().map(registro => registro.lembreteId);

        await jest.advanceTimersByTimeAsync(1);
        const depoisDaVerificacao = historico.listar().map(registro => registro.lembreteId);

        await jest.advanceTimersByTimeAsync(30_000);

        // Then: o vencido entra na primeira verificação, o de 09h aguarda e o prazo encerrado bloqueia.
        const tentativasDoAtrasado = aceito ? ['atrasado'] : ['atrasado', 'atrasado'];
        expect(aoIniciar).toEqual(['atrasado']);
        expect(antesDaVerificacao).toEqual(tentativasDoAtrasado);
        expect(depoisDaVerificacao).toEqual([...tentativasDoAtrasado, 'na-hora']);
        expect(historico.listar().map(registro => registro.resultado))
          .toEqual(aceito ? ['Enviado', 'Enviado'] : ['Falha', 'Enviado', 'Enviado']);
        expect(send).toHaveBeenCalledTimes(aceito ? 2 : 3);
        expect(encerrada.obterConfiguracaoLembretes().listar()[0].getEstado()).toBe('Não enviado');
      } finally {
        parar();
      }
    }
  );

  test('mantém uma única verificação por vez e permite encerrá-la', async () => {
    // Given: a primeira verificação fica em andamento por mais de um intervalo.
    jest.useFakeTimers();
    const servico = new NotificacaoService(
      new HistoricoNotificacoes(),
      new EmailSenderSimulado(),
      { classes: new Classes(), emailSender: { send: jest.fn() } }
    );
    let concluir = () => {};
    const pendente = new Promise<Notificacao[]>(resolve => {
      concluir = () => resolve([]);
    });
    const verificar = jest.spyOn(servico, 'processarLembretesAteAgora')
      .mockReturnValueOnce(pendente)
      .mockResolvedValue([]);

    // When: inicia duas vezes, deixa passar dois ciclos e conclui a primeira execução.
    const parar = servico.iniciarVerificacaoDeLembretes();
    const pararSegundaChamada = servico.iniciarVerificacaoDeLembretes();
    try {
      await jest.advanceTimersByTimeAsync(60_000);
      const chamadasEnquantoOcupado = verificar.mock.calls.length;

      concluir();
      await jest.advanceTimersByTimeAsync(30_000);
      const chamadasDepoisDeConcluir = verificar.mock.calls.length;

      parar();
      await jest.advanceTimersByTimeAsync(30_000);

      // Then: as duas partidas compartilham o intervalo, sem sobreposição.
      expect(pararSegundaChamada).toBe(parar);
      expect(chamadasEnquantoOcupado).toBe(1);
      expect(chamadasDepoisDeConcluir).toBe(2);
      expect(verificar).toHaveBeenCalledTimes(2);
    } finally {
      parar();
    }
  });
});
