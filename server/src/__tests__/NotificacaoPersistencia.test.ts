import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Class } from '../models/Class';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { Lembrete } from '../models/Lembrete';
import { Notificacao } from '../models/Notificacao';
import { PeriodoAcademico } from '../models/PeriodoAcademico';

/** Integração com a gravação em disco e o carregamento após reiniciar. */
test('recupera o lembrete enviado e seu histórico após reiniciar', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ta-historico-lembretes-'));
  const arquivo = join(pasta, 'data', 'app-data.json');
  const pastaAnterior = process.cwd();
  const ambienteAnterior = process.env.NODE_ENV;

  const carregarServidor = (): typeof import('../server') => {
    let servidor!: typeof import('../server');
    jest.isolateModules(() => { servidor = require('../server'); });
    return servidor;
  };

  try {
    // Given: o servidor lê um arquivo anterior à inclusão do histórico.
    mkdirSync(dirname(arquivo), { recursive: true });
    writeFileSync(arquivo, JSON.stringify({ students: [], classes: [] }), 'utf8');
    process.chdir(pasta);
    process.env.NODE_ENV = 'development';

    const inicial = carregarServidor();
    const historicoInicial = inicial.historicoLembretes.listar();
    const prazo = new Date('2026-08-31T23:59:00-03:00');
    const periodo = new PeriodoAcademico(2026, 2, prazo);
    inicial.periodosAcademicos.set(periodo.getIdentificador(), periodo);
    const turma = inicial.classes.addClass(new Class(
      'ESS', periodo, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    ));

    const configuracao = turma.obterConfiguracaoLembretes();
    configuracao.add(new Lembrete({ id: 'lembrete-1', data: '2026-08-25', horario: '12:00' }));
    configuracao.marcarComoEnviado('lembrete-1');

    const tentativa = new Notificacao(
      inicial.historicoLembretes.proximoId(),
      'professor@example.test',
      {
        lembreteId: 'lembrete-1',
        turmaRegistrada: '2026.2 de ESS',
        prazoRegistrado: prazo,
        pendenciasRegistradas: [{ nomeAluno: 'João da Silva', meta: 'Design' }]
      },
      new Date('2026-08-25T09:00:00-03:00'),
      'Enviado',
      'Notas pendentes'
    );
    inicial.historicoLembretes.registrar(tentativa);

    // When: grava o resultado e cria outra instância a partir do mesmo arquivo.
    const gravou = inicial.saveDataToFile();
    const arquivoGravado = JSON.parse(readFileSync(arquivo, 'utf8'));
    const reiniciado = carregarServidor();
    const proximoId = reiniciado.historicoLembretes.proximoId();

    // Then: estado e histórico são recuperados juntos, com IDs preservados.
    expect(historicoInicial).toEqual([]);
    expect(gravou).toBe(true);
    expect(arquivoGravado.historicoLembretes).toEqual([tentativa.toJSON()]);
    expect(reiniciado.historicoLembretes.buscar(tentativa.id)?.toJSON()).toEqual(tentativa.toJSON());
    expect(reiniciado.classes.findClassById(turma.getClassId())?.obterConfiguracaoLembretes().toJSON())
      .toEqual(configuracao.toJSON());
    expect(proximoId).toBe(tentativa.id + 1);
  } finally {
    process.chdir(pastaAnterior);
    if (ambienteAnterior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = ambienteAnterior;
    rmSync(pasta, { recursive: true, force: true });
  }
});
