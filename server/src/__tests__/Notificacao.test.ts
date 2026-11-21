import { HistoricoNotificacoes } from '../models/HistoricoNotificacoes';
import { Notificacao } from '../models/Notificacao';

/**
 * Testes de domínio do registro histórico dos lembretes.
 * Cobrem o contexto preservado e a identidade de cada tentativa de envio.
 */
describe('Notificação de lembrete', () => {
  test('preserva o prazo e as pendências que foram informados no aviso', () => {
    // Given: prazo e pendências que serão guardados com a tentativa.
    const historico = new HistoricoNotificacoes();
    const prazo = new Date('2026-09-01T02:59:00.000Z');
    const pendencias = [
      { alunoCpf: '12345678901', nomeAluno: 'João da Silva', meta: 'Design' }
    ];
    const notificacao = new Notificacao(
      historico.proximoId(),
      'professor@example.test',
      {
        lembreteId: 'lembrete-1',
        turmaRegistrada: '2026.2 de ESS',
        prazoRegistrado: prazo,
        pendenciasRegistradas: pendencias
      },
      new Date('2026-08-25T12:00:00.000Z'),
      'Enviado',
      'Notas pendentes'
    );

    // When: registra a tentativa e altera os dados originais e as cópias consultadas.
    historico.registrar(notificacao);
    prazo.setUTCDate(2);
    pendencias[0].meta = 'Tests';
    notificacao.prazoRegistrado?.setUTCDate(3);
    notificacao.pendenciasRegistradas[0].nomeAluno = 'Nome alterado';

    // Then: o histórico mantém os valores do aviso e os dados destinados ao professor.
    const registro = historico.buscar(notificacao.id);
    expect(registro?.lembreteId).toBe('lembrete-1');
    expect(registro?.turmaRegistrada).toBe('2026.2 de ESS');
    expect(registro?.prazoRegistrado?.toISOString()).toBe('2026-09-01T02:59:00.000Z');
    expect(registro?.pendenciasRegistradas).toEqual([
      { nomeAluno: 'João da Silva', meta: 'Design' }
    ]);
  });

  test('preserva duas tentativas com IDs distintos para o mesmo lembrete', () => {
    // Given: duas tentativas referentes ao mesmo lembrete.
    const historico = new HistoricoNotificacoes();
    const contexto = {
      lembreteId: 'lembrete-1',
      turmaRegistrada: '2026.2 de ESS',
      prazoRegistrado: new Date('2026-09-01T02:59:00.000Z'),
      pendenciasRegistradas: [{ nomeAluno: 'João da Silva', meta: 'Design' }]
    };
    const falha = new Notificacao(
      historico.proximoId(), 'professor@example.test', contexto,
      new Date('2026-08-25T12:00:00.000Z'), 'Falha', 'Notas pendentes', 'Falha temporária'
    );
    const sucesso = new Notificacao(
      historico.proximoId(), 'professor@example.test', contexto,
      new Date('2026-08-25T12:01:00.000Z'), 'Enviado', 'Notas pendentes'
    );

    // When: registra as duas tentativas na ordem em que ocorreram.
    historico.registrar(falha);
    historico.registrar(sucesso);

    // Then: o sucesso mantém a tentativa anterior disponível no histórico.
    expect(falha.id).not.toBe(sucesso.id);
    expect(historico.listar()).toEqual([falha, sucesso]);
    expect(historico.buscar(falha.id)?.descricaoFalha).toBe('Falha temporária');
    expect(historico.buscar(sucesso.id)?.resultado).toBe('Enviado');
  });
});
