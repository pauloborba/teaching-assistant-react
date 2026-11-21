import { ConfiguracaoLembretes } from '../models/ConfiguracaoLembretes';
import { EstadoLembrete, Lembrete, LembreteProposto } from '../models/Lembrete';

/**
 * Testes unitários da configuração: quantidade, edição e rejeição sem alterações parciais.
 * Apoiam os cenários GUI de configuração; persistência, HTTP e interação com a tela não são executados aqui.
 */
describe('ConfiguracaoLembretes', () => {
  const instanteAtual = new Date('2026-08-20T08:00:00.000Z');
  const prazo = new Date('2026-08-31T23:59:00.000Z');
  const primeiro: LembreteProposto = { id: 'primeiro', data: '2026-08-25', horario: '09:00' };
  const segundo: LembreteProposto = { id: 'segundo', data: '2026-08-29', horario: '14:00' };

  test('marca como enviado apenas o lembrete do ID informado', () => {
    const configuracao = new ConfiguracaoLembretes([
      new Lembrete(primeiro), new Lembrete(segundo)
    ]);
    const anterior = configuracao.toJSON();
    const [copia] = configuracao.buscarLembretesPara(primeiro.data, primeiro.horario);

    configuracao.marcarComoEnviado(primeiro.id);

    // O registro armazenado muda. A cópia e o segundo lembrete preservam os valores.
    expect(configuracao.toJSON()).toEqual([
      { ...anterior[0], estado: 'Enviado' },
      anterior[1]
    ]);
    expect(copia.toJSON()).toEqual(anterior[0]);
  });

  test('rejeita marcar um ID inexistente sem alterar a configuração', () => {
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro)]);
    const anterior = configuracao.toJSON();

    expect(() => configuracao.marcarComoEnviado('inexistente'))
      .toThrow('Lembrete não encontrado na configuração');
    expect(configuracao.toJSON()).toEqual(anterior);
  });

  test('configura dois lembretes e deriva a quantidade da lista', () => { // Regra central do cenário de configuração da quantidade, datas e horários.
    const configuracao = new ConfiguracaoLembretes();

    configuracao.atualizar(2, [primeiro, segundo], instanteAtual, prazo);

    expect(configuracao.listar()).toEqual([new Lembrete(primeiro), new Lembrete(segundo)]);
    expect(configuracao.listar()).toHaveLength(2); // Não existe outro contador que possa divergir da lista salva.
  });

  test('aumenta a quantidade preservando os identificadores existentes', () => { // Acrescentar lembrete não recria os anteriores.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro), new Lembrete(segundo)]);
    const terceiro = { id: 'terceiro', data: '2026-08-30', horario: '10:00' };

    configuracao.atualizar(3, [primeiro, segundo, terceiro], instanteAtual, prazo);

    expect(configuracao.listar().map(lembrete => lembrete.getId())).toEqual(['primeiro', 'segundo', 'terceiro']);
    expect(configuracao.listar().slice(0, 2)).toEqual([new Lembrete(primeiro), new Lembrete(segundo)]);
  });

  test('reduz a quantidade mantendo o lembrete enviado e removendo apenas o pendente escolhido', () => { // A redução deve considerar também os enviados no total final.
    const enviado = new Lembrete({ id: 'enviado', data: '2026-08-19', horario: '09:00', estado: 'Enviado' });
    const configuracao = new ConfiguracaoLembretes([enviado, new Lembrete(primeiro), new Lembrete(segundo)]);

    configuracao.atualizar(2, [{ id: enviado.getId(), data: enviado.getData(), horario: enviado.getHorario() }, segundo], instanteAtual, prazo);

    expect(configuracao.listar()).toEqual([enviado, new Lembrete(segundo)]);
  });

  test.each([
    { descricao: 'exclusão', propostas: [] },
    { descricao: 'alteração', propostas: [{ id: 'enviado', data: '2026-08-26', horario: '10:00' }] }
  ])('rejeita $descricao de enviado preservando toda a configuração', ({ propostas }) => { // As duas operações devem proteger o mesmo registro histórico.
    const configuracao = new ConfiguracaoLembretes([new Lembrete({ id: 'enviado', data: '2026-08-19', horario: '09:00', estado: 'Enviado' })]);
    const anterior = configuracao.listar();

    expect(() => configuracao.atualizar(propostas.length, propostas, instanteAtual, prazo))
      .toThrow('Lembretes enviados não podem ser alterados');
    expect(configuracao.listar()).toEqual(anterior);
  });

  test.each([
    { propostas: [primeiro, segundo] }, // A quantidade solicitada é maior do que a lista fornecida.
    { propostas: [primeiro, segundo, { id: 'terceiro', data: '', horario: '' }] } // O total coincide, mas falta preencher um agendamento.
  ])('rejeita uma proposta incompleta sem substituir a configuração salva', ({ propostas }) => {
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro)]);
    const anterior = configuracao.listar();

    expect(() => configuracao.atualizar(3, propostas, instanteAtual, prazo)).toThrow('Selecione exatamente 3 datas e horários');
    expect(configuracao.listar()).toEqual(anterior);
  });

  test('não aplica a primeira alteração quando o segundo agendamento é inválido', () => { // Verifica a atualização indivisível do conjunto, além de validar uma data isolada.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro), new Lembrete(segundo)]);
    const anterior = configuracao.listar();
    const propostas = [{ ...primeiro, data: '2026-08-26' }, { ...segundo, data: '2026-09-01' }];

    expect(() => configuracao.atualizar(2, propostas, instanteAtual, prazo)).toThrow('Data posterior ao prazo acadêmico');
    expect(configuracao.listar()).toEqual(anterior); // Nem mesmo a alteração válida do primeiro lembrete pode permanecer.
  });

  test('rejeita um novo lembrete passado preservando os existentes', () => { // Regra do cenário de rejeição de data anterior à atual.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro)]);
    const anterior = configuracao.listar();

    expect(() => configuracao.atualizar(2, [primeiro, { id: 'novo', data: '2026-08-19', horario: '09:00' }], instanteAtual, prazo))
      .toThrow('Não é possível agendar lembretes em datas anteriores à data atual');
    expect(configuracao.listar()).toEqual(anterior);
  });

  test('bloqueia novas criações após o prazo e permite uma redução sem novos agendamentos', () => { // Encerramento bloqueia criação; não impede remover um pendente.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro), new Lembrete(segundo)]);
    const depoisDoPrazo = new Date('2026-09-01T08:00:00.000Z');
    const anterior = configuracao.listar();

    expect(() => configuracao.atualizar(3, [primeiro, segundo, { id: 'novo', data: '2026-09-02', horario: '09:00' }], depoisDoPrazo, prazo))
      .toThrow('Prazo acadêmico encerrado');
    expect(configuracao.listar()).toEqual(anterior);

    configuracao.atualizar(1, [primeiro], depoisDoPrazo, prazo);
    expect(configuracao.listar()).toEqual([new Lembrete(primeiro)]); // A data existente inalterada pode ser histórica.
  });

  test('altera uma configuração sem modificar outra nem suas entidades de origem', () => { // Apoia o cenário de alteração sem afetar outra turma; a associação com Class virá na integração.
    const origem = new Lembrete(primeiro);
    const configuracao = new ConfiguracaoLembretes([origem]);
    const outraConfiguracao = new ConfiguracaoLembretes([origem]);

    configuracao.atualizar(1, [{ ...primeiro, data: '2026-08-26' }], instanteAtual, prazo);

    expect(configuracao.listar()[0].getData()).toBe('2026-08-26');
    expect(outraConfiguracao.listar()).toEqual([new Lembrete(primeiro)]);
    expect(origem.getData()).toBe(primeiro.data);
  });

  test('rejeita identidade duplicada sem tratar horários iguais como duplicação', () => { // O identificador distingue lembretes, inclusive quando seus agendamentos coincidem.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro)]);

    expect(() => configuracao.atualizar(2, [primeiro, primeiro], instanteAtual, prazo)).toThrow('Identificador de lembrete duplicado');
    expect(configuracao.listar()).toEqual([new Lembrete(primeiro)]);

    configuracao.atualizar(2, [primeiro, { ...primeiro, id: 'outro' }], instanteAtual, prazo);
    expect(configuracao.buscarLembretesPara(primeiro.data, primeiro.horario)).toHaveLength(2);
    expect(configuracao.buscarLembretesPara('2026-08-26', primeiro.horario)).toEqual([]);
  });

  test('não permite remover enviado usando outro objeto com o mesmo id e estado pendente', () => { // A proteção usa o estado armazenado, não o informado no argumento da remoção.
    const enviado = new Lembrete({ ...primeiro, estado: 'Enviado' });
    const configuracao = new ConfiguracaoLembretes([enviado]);

    expect(() => configuracao.remove(new Lembrete(primeiro))).toThrow('Lembretes enviados não podem ser alterados');
    expect(configuracao.listar()).toEqual([enviado]);
  });

  test('a listagem devolve cópias que não alteram a configuração consultada', () => { // Consultar a lista não deve permitir contornar atualizar.
    const configuracao = new ConfiguracaoLembretes([new Lembrete(primeiro)]);
    const consulta = configuracao.listar();

    consulta[0].reagendar('2026-08-26', '10:00', instanteAtual, prazo);
    consulta.splice(0, 1);

    expect(configuracao.listar()).toEqual([new Lembrete(primeiro)]);
  });

  test.each<EstadoLembrete>(['Não enviado', 'Agendado'])('considera o reenvio pendente no estado %s ao consultar conflito com o prazo', estado => { // Ambos os estados bloqueiam prazo incompatível, sem serem unificados.
    const configuracao = new ConfiguracaoLembretes([new Lembrete({ ...primeiro, estado, proximoReenvioEm: new Date('2026-08-29T14:00:00.000Z') })]);

    expect(configuracao.possuiAgendamentosPendentesApos(new Date('2026-08-28T23:59:00.000Z'))).toBe(true);
    expect(configuracao.possuiAgendamentosPendentesApos(new Date('2026-08-29T14:00:00.000Z'))).toBe(false); // Igualdade com o reenvio é compatível.
  });

  test.each<EstadoLembrete>(['Enviado', 'Ignorado', 'Cancelado'])('não bloqueia a alteração de prazo por lembrete %s', estado => { // Esses registros permanecem preservados, mas não são pendências de envio.
    const configuracao = new ConfiguracaoLembretes([new Lembrete({ ...primeiro, estado })]);
    const anterior = configuracao.listar();

    expect(configuracao.possuiAgendamentosPendentesApos(new Date('2026-08-24T23:59:00.000Z'))).toBe(false);
    expect(configuracao.listar()).toEqual(anterior);
  });
});
