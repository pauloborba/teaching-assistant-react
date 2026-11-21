import { Lembrete } from '../models/Lembrete';

/**
 * Testes unitários de Lembrete: validam agendamentos e preservam identidade e estado.
 * Apoiam os cenários de alteração, bloqueio de enviados e rejeição de datas; não executam GUI ou envios.
 */
describe('Lembrete', () => {
  const instanteAtual = new Date('2026-08-20T08:00:00.000Z'); // Relógio fornecido pelo teste, independente do dia em que for executado.
  const prazo = new Date('2026-08-31T23:59:00.000Z'); // Limite usado somente nestes exemplos, sem definir um prazo fixo na aplicação.

  // Cobre a transição de estado após a aceitação do e-mail.
  test.each(['Não enviado', 'Agendado'] as const)(
    'marca um lembrete %s como enviado e limpa o reenvio',
    estado => {
      const lembrete = new Lembrete({
        id: 'primeiro',
        data: '2026-08-25',
        horario: '12:00',
        estado,
        motivo: 'Notas pendentes',
        proximoReenvioEm: new Date('2026-08-25T12:01:00.000Z')
      });
      const anterior = lembrete.toJSON();

      lembrete.marcarComoEnviado();

      expect(lembrete.toJSON()).toEqual({
        ...anterior,
        estado: 'Enviado',
        proximoReenvioEm: null
      });
    }
  );

  test('preserva o registro quando o lembrete já é enviado', () => {
    const lembrete = new Lembrete({
      id: 'primeiro', data: '2026-08-25', horario: '12:00', estado: 'Enviado'
    });
    const anterior = lembrete.toJSON();

    lembrete.marcarComoEnviado();

    expect(lembrete.toJSON()).toEqual(anterior);
  });

  test.each(['Ignorado', 'Cancelado'] as const)(
    'rejeita marcar um lembrete %s como enviado',
    estado => {
      const lembrete = new Lembrete({
        id: 'primeiro', data: '2026-08-25', horario: '12:00', estado
      });
      const anterior = lembrete.toJSON();

      // Uma transição rejeitada preserva integralmente o registro.
      expect(() => lembrete.marcarComoEnviado())
        .toThrow('Lembrete neste estado não pode ser marcado como enviado');
      expect(lembrete.toJSON()).toEqual(anterior);
    }
  );

  test('reagenda um lembrete pendente preservando sua identidade e estado', () => { // Regra do cenário de alteração de lembrete futuro.
    const lembrete = Lembrete.criar({ id: 'primeiro', data: '2026-08-25', horario: '09:00' }, instanteAtual, prazo);

    lembrete.reagendar('2026-08-26', '10:00', instanteAtual, prazo);

    expect(lembrete.getId()).toBe('primeiro'); // Editar data e horário não cria outro lembrete.
    expect(lembrete.getAgendamento()).toEqual(new Date('2026-08-26T10:00:00.000Z'));
    expect(lembrete.getEstado()).toBe('Não enviado');
  });

  test('preserva um lembrete enviado quando há tentativa de reagendamento', () => { // Um envio já realizado não pode ser reescrito pela configuração.
    const lembrete = new Lembrete({ id: 'enviado', data: '2026-08-19', horario: '09:00', estado: 'Enviado' });
    const anterior = lembrete.copiar(); // Guarda os valores anteriores para verificar que a rejeição não altera o registro.

    expect(() => lembrete.reagendar('2026-08-26', '10:00', instanteAtual, prazo))
      .toThrow('Lembretes enviados não podem ser alterados');
    expect(lembrete).toEqual(anterior);
  });

  test.each([
    { data: '2026-08-19', horario: '09:00', erro: 'Não é possível agendar lembretes em datas anteriores à data atual' }, // Rejeita datas passadas.
    { data: '2026-09-01', horario: '09:00', erro: 'Data posterior ao prazo acadêmico' } // Rejeita datas posteriores ao prazo.
  ])('rejeita o reagendamento para $data sem perder os valores anteriores', ({ data, horario, erro }) => {
    const lembrete = Lembrete.criar({ id: 'primeiro', data: '2026-08-25', horario: '09:00' }, instanteAtual, prazo);
    const anterior = lembrete.copiar();

    expect(() => lembrete.reagendar(data, horario, instanteAtual, prazo)).toThrow(erro);
    expect(lembrete).toEqual(anterior); // Confere data, horário, identidade e estado após a falha.
  });

  test.each([
    { data: '2026-08-20', horario: '08:00' }, // Exatamente no instante atual é permitido.
    { data: '2026-08-31', horario: '23:59' } // Exatamente no prazo acadêmico também é permitido.
  ])('aceita o limite válido $data às $horario', proposta => {
    expect(() => Lembrete.criar({ id: 'limite', ...proposta }, instanteAtual, prazo)).not.toThrow();
  });

  test.each([
    { data: '2026-02-30', horario: '09:00' }, // Date normalizaria esse dia inexistente para março; o domínio deve rejeitá-lo.
    { data: '2026-08-25', horario: '24:00' } // Evita que a normalização do horário transfira o lembrete para outro dia.
  ])('rejeita data ou horário inexistente: $data às $horario', proposta => {
    expect(() => new Lembrete({ id: 'invalido', ...proposta })).toThrow('Data ou horário do lembrete inválido');
  });

  test('protege a programação de reenvio contra alterações externas', () => { // Um Date mutável não pode contornar a futura validação do prazo do período.
    const reenvio = new Date('2026-08-27T09:00:00.000Z');
    const lembrete = new Lembrete({ id: 'pendente', data: '2026-08-25', horario: '09:00', estado: 'Agendado', proximoReenvioEm: reenvio });

    reenvio.setUTCDate(28); // Tenta modificar o Date entregue ao construtor.
    lembrete.getProximoReenvioEm()?.setUTCDate(29); // Tenta modificar o Date recebido em uma consulta.

    expect(lembrete.getProximoReenvioEm()).toEqual(new Date('2026-08-27T09:00:00.000Z'));
  });
});
