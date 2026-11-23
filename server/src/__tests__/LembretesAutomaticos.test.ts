import fs from 'node:fs';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';

describe('Lembretes automáticos no servidor', () => {
  const destinatario = 'professor@example.test';
  const rota = '/api/classes/ESS-2026-2/lembretes';
  const lembrete = { id: 'design', data: '2026-08-25', horario: '12:00' };
  const cpf = '12345678901';
  const gmail = { GMAIL_USER: 'remetente@example.test', GMAIL_APP_PASSWORD: 'senha-ficticia' };
  const ambienteAnterior = process.env;
  const pastaAnterior = process.cwd();
  const servidores: Server[] = [];
  let pasta: string;

  beforeEach(() => {
    pasta = fs.mkdtempSync(join(tmpdir(), 'ta-lembretes-automaticos-'));
    process.chdir(pasta);
    process.env = { ...ambienteAnterior, ...gmail, NODE_ENV: 'development' };
    jest.useFakeTimers({
      now: new Date('2026-08-25T08:59:45-03:00'),
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate']
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const servidor of servidores.splice(0)) servidor.emit('close');
    jest.useRealTimers();
    jest.restoreAllMocks();
    process.env = ambienteAnterior;
    process.chdir(pastaAnterior);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  function prepararDados(todasAsNotas = false) {
    fs.mkdirSync('data');
    fs.writeFileSync('data/app-data.json', JSON.stringify({
      emailDasTurmas: destinatario,
      periodosAcademicos: [
        { ano: 2026, semestre: 2, prazoAcademico: '2026-09-01T02:59:00.000Z' }
      ],
      students: [{ name: 'Aluno Fictício', cpf, email: 'aluno@example.test' }],
      classes: [{
        topic: 'ESS',
        year: 2026,
        semester: 2,
        especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA.toJSON(),
        enrollments: [{
          studentCPF: cpf,
          evaluations: EVALUATION_GOALS
            .filter(meta => todasAsNotas || meta !== 'Design')
            .map(goal => ({ goal, grade: 'MA' }))
        }]
      }]
    }));
  }

  function iniciar() {
    let aplicacao!: typeof import('../server');
    let send!: jest.SpyInstance;
    const servidor = new Server();
    servidores.push(servidor);

    jest.isolateModules(() => {
      aplicacao = require('../server');
      const { EmailSenderSmtp }: typeof import('../models/EmailSender') = require('../models/EmailSender');
      send = jest.spyOn(EmailSenderSmtp.prototype, 'send').mockResolvedValue({ aceito: true });
      // Exercita o index.ts sem ocupar sua porta fixa. O Supertest abre uma porta livre para as rotas.
      jest.spyOn(aplicacao.app, 'listen').mockImplementation((_porta, aoEscutar) => {
        if (aoEscutar) servidor.once('listening', aoEscutar);
        return servidor;
      });
      require('../index');
    });

    servidor.emit('listening');
    return { ...aplicacao, send, parar: () => servidor.emit('close') };
  }

  const resumoDoHistorico = (servidor: typeof import('../server')) =>
    servidor.historicoLembretes.listar().map(registro => registro.toJSON());

  test.each([
    { resultado: 'Enviado', estado: 'Enviado', envios: 1 },
    { resultado: 'Ignorado', estado: 'Ignorado', envios: 0 },
    { resultado: 'Falha', estado: 'Não enviado', envios: 1 }
  ])('recupera o resultado $resultado após reiniciar', async ({ resultado, estado, envios }) => {
    // Given: o professor salva um lembrete para as 09h de Brasília.
    prepararDados(resultado === 'Ignorado');
    const inicial = iniciar();
    const descricaoFalha = resultado === 'Falha' ? 'Transporte indisponível' : undefined;
    if (descricaoFalha) inicial.send.mockResolvedValue({ aceito: false, descricaoFalha });
    await request(inicial.app).put(rota).send({ quantidade: 1, lembretes: [lembrete] }).expect(200);

    // When: passa o horário e roda a primeira verificação elegível, às 09h00min15s.
    await jest.advanceTimersByTimeAsync(29_999);
    expect(inicial.send).not.toHaveBeenCalled();
    expect(resumoDoHistorico(inicial)).toEqual([]);
    await jest.advanceTimersByTimeAsync(1);

    // Then: o transporte e o resultado registrado correspondem ao cenário.
    expect(inicial.send).toHaveBeenCalledTimes(envios);
    if (envios) {
      expect(inicial.send).toHaveBeenCalledWith(
        destinatario, 'Notas pendentes — 2026.2 de ESS', expect.stringContaining('Aluno Fictício: Design')
      );
    }
    const historico = resumoDoHistorico(inicial);
    expect(historico).toEqual(Array.from({ length: envios || 1 }, (_, indice) => expect.objectContaining({
      id: indice + 1, lembreteId: lembrete.id, resultado, descricaoFalha
    })));

    inicial.parar();
    const reiniciado = iniciar();
    await jest.advanceTimersByTimeAsync(0);
    expect(resumoDoHistorico(reiniciado)).toEqual(historico);
    expect(reiniciado.send).not.toHaveBeenCalled();
    const consulta = await request(reiniciado.app).get(rota).expect(200);
    expect(consulta.body.lembretes).toEqual([expect.objectContaining({ id: lembrete.id, estado })]);
    if (resultado === 'Falha') {
      expect(consulta.body.lembretes[0].proximoReenvioEm).toBe('2026-08-25T12:00:30.000Z');

      const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
      reiniciado.send.mockResolvedValue({ aceito: false, descricaoFalha });
      await jest.advanceTimersByTimeAsync(14_999);
      expect(reiniciado.send).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(reiniciado.send).toHaveBeenCalledTimes(1);
      const segunda = await request(reiniciado.app).get(rota).expect(200);
      expect(segunda.body.lembretes[0].proximoReenvioEm).toBe('2026-08-25T12:01:00.000Z');

      await jest.advanceTimersByTimeAsync(29_999);
      expect(reiniciado.send).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(reiniciado.send).toHaveBeenCalledTimes(2);
      const terceira = await request(reiniciado.app).get(rota).expect(200);
      expect(terceira.body.lembretes[0].proximoReenvioEm).toBe('2026-08-25T12:01:45.000Z');

      await jest.advanceTimersByTimeAsync(44_999);
      expect(reiniciado.send).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1);
      await jest.advanceTimersByTimeAsync(300_000);
      expect(reiniciado.send).toHaveBeenCalledTimes(3); // Três reenvios após o envio original.
      expect(resumoDoHistorico(reiniciado).map(registro => registro.resultado))
        .toEqual(['Falha', 'Falha', 'Falha', 'Falha']);
      const encerrado = await request(reiniciado.app).get(rota).expect(200);
      expect(encerrado.body.lembretes).toEqual([expect.objectContaining({
        id: lembrete.id, estado: 'Cancelado', motivo: 'Limite de tentativas atingido', proximoReenvioEm: null
      })]);
      expect(erro).toHaveBeenCalledTimes(1);
      expect(erro).toHaveBeenCalledWith('Limite de tentativas do lembrete atingido.', {
        turma: '2026.2 de ESS', lembreteId: lembrete.id
      }); // Informa o esgotamento em vez de fazer um quinto envio.
    }
  });

  test('reenvia após 15 segundos e recupera as duas tentativas ao reiniciar', async () => {
    jest.setSystemTime(new Date('2026-08-25T08:59:30-03:00')); // Given: primeira rodada do cadastro às 09h.
    prepararDados(); // Given: destinatário, prazo e nota de Design pendente.
    const inicial = iniciar();
    const horaOriginal = '2026-08-25T12:00:00.000Z';
    const horaReenvio = '2026-08-25T12:00:15.000Z';
    const descricaoFalha = 'Indisponibilidade temporária do serviço de e-mail';
    inicial.send
      .mockResolvedValueOnce({ aceito: false, descricaoFalha }) // Given: falha temporária no envio original.
      .mockResolvedValueOnce({ aceito: true }); // Given: transporte disponível quando chegar o reenvio.
    await request(inicial.app).put(rota).send({ quantidade: 1, lembretes: [lembrete] }).expect(200);

    await jest.advanceTimersByTimeAsync(30_000);
    const tentativaOriginal = { id: 1, lembreteId: lembrete.id, resultado: 'Falha', descricaoFalha, dataHora: horaOriginal };
    expect(resumoDoHistorico(inicial)).toEqual([
      expect.objectContaining(tentativaOriginal)
    ]); // Given: a primeira falha foi registrada com a descrição original.
    const aguardando = await request(inicial.app).get(rota).expect(200);
    expect(aguardando.body.lembretes[0].proximoReenvioEm).toBe(horaReenvio); // Given: reenvio marcado para 09h00min15s.

    await jest.advanceTimersByTimeAsync(14_999);
    expect(inicial.send).toHaveBeenCalledTimes(1); // O transporte ainda recebeu só a primeira tentativa.
    await jest.advanceTimersByTimeAsync(1); // When: o agendador executa o reenvio às 09h00min15s.

    expect(inicial.send).toHaveBeenCalledTimes(2); // Then: um envio original e um reenvio.
    expect(inicial.send).toHaveBeenNthCalledWith(
      2, destinatario, 'Notas pendentes — 2026.2 de ESS',
      expect.stringContaining('Aluno Fictício: Design')
    ); // Then: o reenvio identifica o destinatário, a turma e a pendência.
    const historico = resumoDoHistorico(inicial);
    expect(historico).toEqual([
      expect.objectContaining(tentativaOriginal),
      expect.objectContaining({ id: 2, lembreteId: lembrete.id, resultado: 'Enviado', dataHora: horaReenvio })
    ]); // Then: a falha e a aceitação ficam em dois registros.

    inicial.parar();
    const reiniciado = iniciar();
    await jest.advanceTimersByTimeAsync(30_000);
    const consulta = await request(reiniciado.app).get(rota).expect(200);
    expect(consulta.body.lembretes).toEqual([
      { ...lembrete, estado: 'Enviado', motivo: null, proximoReenvioEm: null }
    ]); // Then: um único lembrete enviado e nenhum reenvio programado.
    expect(resumoDoHistorico(reiniciado)).toEqual(historico); // Os dois registros voltaram do arquivo.
    expect(reiniciado.send).not.toHaveBeenCalled();
  });

  test('tenta gravar novamente sem repetir o envio', async () => {
    // Given: o lembrete foi salvo e a próxima substituição do arquivo falhará.
    prepararDados();
    const inicial = iniciar();
    await request(inicial.app).put(rota).send({ quantidade: 1, lembretes: [lembrete] }).expect(200);
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
    const gravar = jest.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('Falha de gravação simulada');
    });
    const lerArquivo = () => JSON.parse(fs.readFileSync('data/app-data.json', 'utf8'));

    // When: o envio é aceito, mas o JSON ainda não pode ser atualizado.
    await jest.advanceTimersByTimeAsync(30_000);
    expect(erro).toHaveBeenCalledWith('Error saving application data:', expect.any(Error));
    expect(resumoDoHistorico(inicial)).toHaveLength(1);
    expect(lerArquivo().historicoLembretes).toEqual([]);

    // Then: a rodada seguinte grava o resultado pendente sem enviar novamente.
    await jest.advanceTimersByTimeAsync(30_000);
    expect(inicial.send).toHaveBeenCalledTimes(1);
    expect(gravar).toHaveBeenCalledTimes(2);
    expect(lerArquivo().historicoLembretes).toEqual([
      expect.objectContaining({ lembreteId: lembrete.id, resultado: 'Enviado' })
    ]);
    expect(lerArquivo().classes[0].configuracaoLembretes[0].estado).toBe('Enviado');
  });

  test('grava os resultados mesmo se a rodada for interrompida', async () => {
    // Given: dois lembretes vencem juntos e o segundo envio gera uma exceção.
    prepararDados();
    const inicial = iniciar();
    const segundo = { ...lembrete, id: 'segundo' };
    await request(inicial.app).put(rota).send({ quantidade: 2, lembretes: [lembrete, segundo] }).expect(200);
    inicial.send.mockResolvedValueOnce({ aceito: true }).mockRejectedValueOnce(new Error('Falha inesperada'));
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When: a rodada processa os lembretes elegíveis.
    await jest.advanceTimersByTimeAsync(30_000);

    // Then: a primeira tentativa é recuperável apesar da interrupção.
    expect(erro).toHaveBeenCalledWith('Erro ao verificar lembretes:', expect.any(Error));
    inicial.parar();
    delete process.env.GMAIL_USER;
    const reiniciado = iniciar();
    expect(resumoDoHistorico(reiniciado)).toEqual([
      expect.objectContaining({ lembreteId: lembrete.id, resultado: 'Enviado' })
    ]);
  });

  test('mantém a API disponível sem credenciais e avisa que a agenda está desativada', async () => {
    // Given: existe um lembrete que venceria durante a execução, mas falta o remetente.
    prepararDados();
    delete process.env.GMAIL_USER;
    const inicial = iniciar();
    await request(inicial.app).put(rota).send({ quantidade: 1, lembretes: [lembrete] }).expect(200);

    // When: passa o horário de processamento.
    await jest.advanceTimersByTimeAsync(30_000);

    // Then: a API responde e não houve envio nem alteração no histórico.
    await request(inicial.app).get(rota).expect(200);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Lembretes automáticos desativados'));
    expect(inicial.send).not.toHaveBeenCalled();
    expect(resumoDoHistorico(inicial)).toEqual([]);
  });
});
