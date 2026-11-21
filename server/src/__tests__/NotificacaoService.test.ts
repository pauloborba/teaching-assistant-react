import { Class } from '../models/Class';
import { Classes } from '../models/Classes';
import { EmailSenderSimulado } from '../models/EmailSender';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { EVALUATION_GOALS } from '../models/Evaluation';
import { HistoricoNotificacoes } from '../models/HistoricoNotificacoes';
import { Lembrete } from '../models/Lembrete';
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
});
