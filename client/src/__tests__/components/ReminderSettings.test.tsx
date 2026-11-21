import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReminderSettings from '../../components/ReminderSettings';
import { Class } from '../../types/Class';
import { ConfiguracaoLembretes, Lembrete, SalvarConfiguracaoLembretes } from '../../types/Reminder';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA } from '../../types/EspecificacaoDoCalculoDaMedia';

/**
 * Integração do componente com API simulada: cobre preenchimento, confirmação e reabertura do primeiro cenário.
 * Também verifica que uma rejeição preserva o resumo confirmado; não substitui um teste em navegador real.
 */
describe('GUI de configuração de lembretes', () => {
  const originalFetch = global.fetch;
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
  const turma: Class = {
    id: 'ESS-2099-2', topic: 'ESS', year: 2099, semester: 2, enrollments: [],
    especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
  };
  const empty: ConfiguracaoLembretes = {
    turmaId: turma.id,
    prazoAcademico: new Date('2099-08-31T23:59').toISOString(),
    lembretes: []
  };
  const response = (status: number, body: unknown): Response => ({
    ok: status >= 200 && status < 300, status, json: async () => body
  } as Response);
  const open = () => render(<ReminderSettings classInfo={turma} onBack={() => {}} />);

  const storedReminder = (
    id: string, dateTime: string, estado: Lembrete['estado'] = 'Não enviado'
  ): Lembrete => {
    const iso = new Date(dateTime).toISOString();
    return { id, data: iso.slice(0, 10), horario: iso.slice(11, 16), estado, motivo: null, proximoReenvioEm: null };
  };

  const reminderRow = (position: number) =>
    within(screen.getByRole('group', { name: `Data e horário do lembrete ${position}` }));

  beforeEach(() => {
    let sequence = 0;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true, value: { randomUUID: () => `novo-${++sequence}` }
    }); // Torna as identidades previsíveis apenas neste ambiente de teste.
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    else Reflect.deleteProperty(globalThis, 'crypto');
  });

  test('salva dois lembretes após confirmação da API e os recupera ao reabrir', async () => { // Caminho válido do primeiro cenário.
    let stored = empty;
    let finishSave: () => void = () => { throw new Error('Salvamento não iniciado'); };
    fetchMock.mockImplementation((_, options) => {
      if (options?.method !== 'PUT') return Promise.resolve(response(200, stored));
      const body: SalvarConfiguracaoLembretes = JSON.parse(String(options.body));
      return new Promise<Response>(resolve => {
        finishSave = () => {
          stored = { ...empty, lembretes: body.lembretes.map(lembrete => ({
            ...lembrete, estado: 'Não enviado', motivo: null, proximoReenvioEm: null
          })) };
          resolve(response(200, stored));
        };
      });
    });
    const first = open();
    await waitFor(() => expect(screen.getByLabelText('Quantidade de lembretes')).toHaveValue(0));
    expect(screen.getByText('31/08/2099 às 23:59')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade de lembretes'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Data e horário do lembrete 1', { selector: 'input' }), { target: { value: '2099-08-25T09:00' } });
    fireEvent.change(screen.getByLabelText('Data e horário do lembrete 2', { selector: 'input' }), { target: { value: '2099-08-29T14:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(screen.queryByText('Configuração salva com sucesso')).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    const sent = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(sent?.[0]).toBe('http://localhost:3005/api/classes/ESS-2099-2/lembretes');
    const body: SalvarConfiguracaoLembretes = JSON.parse(String(sent?.[1]?.body));
    expect(body.quantidade).toBe(2);
    expect(body.lembretes.map(item => `${item.data}T${item.horario}:00.000Z`)).toEqual([
      new Date('2099-08-25T09:00').toISOString(),
      new Date('2099-08-29T14:00').toISOString()
    ]); // Confere a conversão do horário local para UTC.

    await act(async () => { finishSave(); });
    expect(await screen.findByText('Configuração salva com sucesso')).toBeInTheDocument();
    expect(screen.getByText('Quantidade de lembretes: 2')).toBeInTheDocument();
    expect(screen.getByText('25/08/2099 às 09:00')).toBeInTheDocument();
    expect(screen.getByText('29/08/2099 às 14:00')).toBeInTheDocument();

    expect(screen.queryByLabelText('Quantidade de lembretes')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar lembretes' })).toBeInTheDocument();

    first.unmount();
    open(); // Reabre a turma para conferir que a configuração salva volta em modo de consulta.

    const editButton = await screen.findByRole('button', { name: 'Editar lembretes' });
    expect(screen.queryByLabelText('Quantidade de lembretes')).not.toBeInTheDocument();
    fireEvent.click(editButton);

    await waitFor(() => expect(screen.getByLabelText('Data e horário do lembrete 1', { selector: 'input' }))
      .toHaveValue('2099-08-25T09:00'));
    expect(screen.getByLabelText('Data e horário do lembrete 2', { selector: 'input' })).toHaveValue('2099-08-29T14:00');
  });

  test('mantém a remoção no rascunho e permite desfazê-la', async () => {
    const stored: ConfiguracaoLembretes = {
      ...empty,
      lembretes: [
        storedReminder('enviado', '2000-08-24T09:00', 'Enviado'),
        storedReminder('pendente', '2099-08-25T09:00')
      ]
    };
    fetchMock.mockResolvedValue(response(200, stored));

    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar lembretes' }));

    // O histórico continua visível, com a data bloqueada e sem ação de remoção.
    expect(reminderRow(1).getByText('Enviado')).toBeInTheDocument();
    expect(reminderRow(1).queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Data e horário do lembrete 1', { selector: 'input' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar lembrete' }));
    expect(screen.getByLabelText('Data e horário do lembrete 3', { selector: 'input' })).toHaveValue('');
    fireEvent.click(reminderRow(3).getByRole('button', { name: 'Remover' }));
    expect(screen.queryByLabelText('Data e horário do lembrete 3', { selector: 'input' })).not.toBeInTheDocument();

    fireEvent.click(reminderRow(2).getByRole('button', { name: 'Remover' }));
    expect(reminderRow(2).getByText('Será removido ao salvar')).toBeInTheDocument();
    const pendingInput = screen.getByLabelText('Data e horário do lembrete 2', { selector: 'input' });
    expect(pendingInput).toHaveValue('2099-08-25T09:00');
    expect(pendingInput).toBeDisabled();
    expect(screen.getByText('Quantidade de lembretes após salvar:')).toHaveTextContent('Quantidade de lembretes após salvar: 1');

    fireEvent.click(reminderRow(2).getByRole('button', { name: 'Desfazer' }));
    expect(pendingInput).toBeEnabled();
    expect(screen.getByText('Quantidade de lembretes após salvar:')).toHaveTextContent('Quantidade de lembretes após salvar: 2');

    // Adicionar, remover e desfazer alteram somente o rascunho.
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });

  test('mantém a remoção pendente após rejeição e a descarta ao cancelar', async () => {
    const stored: ConfiguracaoLembretes = {
      ...empty,
      lembretes: [
        storedReminder('existente', '2099-08-25T09:00'),
        storedReminder('a-remover', '2099-08-29T14:00')
      ]
    };
    fetchMock.mockImplementation((_, options) => Promise.resolve(options?.method === 'PUT'
      ? response(400, { error: 'Data posterior ao prazo acadêmico' }) : response(200, stored)));

    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar lembretes' }));
    const input = screen.getByLabelText('Data e horário do lembrete 1', { selector: 'input' });
    fireEvent.change(input, { target: { value: '2099-09-02T09:00' } });
    fireEvent.click(reminderRow(2).getByRole('button', { name: 'Remover' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    // A rejeição preserva tanto a data em edição quanto a remoção pendente.
    expect(await screen.findByRole('alert')).toHaveTextContent('Data posterior ao prazo acadêmico');
    expect(screen.queryByText('Configuração salva com sucesso')).toBeNull();
    expect(screen.getByText('25/08/2099 às 09:00')).toBeInTheDocument();
    expect(input).toHaveValue('2099-09-02T09:00');
    expect(reminderRow(2).getByText('Será removido ao salvar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    expect(screen.queryByLabelText('Data e horário do lembrete 1', { selector: 'input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('25/08/2099 às 09:00')).toBeInTheDocument();
    expect(screen.getByText('29/08/2099 às 14:00')).toBeInTheDocument();

    // O único PUT foi rejeitado. Reabrir recupera os dois registros confirmados.
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar lembretes' }));
    expect(screen.getByLabelText('Data e horário do lembrete 1', { selector: 'input' })).toHaveValue('2099-08-25T09:00');
    expect(screen.getByLabelText('Data e horário do lembrete 2', { selector: 'input' })).toBeEnabled();
    expect(screen.getByLabelText('Data e horário do lembrete 2', { selector: 'input' })).toHaveValue('2099-08-29T14:00');
  });

  test('bloqueia o salvamento quando a turma está sem prazo', async () => { // Orienta o cadastro do período antes da configuração.
    fetchMock.mockResolvedValue(response(200, { ...empty, prazoAcademico: null }));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cadastre o prazo acadêmico');
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
});
