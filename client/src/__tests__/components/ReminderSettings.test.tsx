import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReminderSettings from '../../components/ReminderSettings';
import { Class } from '../../types/Class';
import { ConfiguracaoLembretes, SalvarConfiguracaoLembretes } from '../../types/Reminder';
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
    fireEvent.change(screen.getByLabelText('Data e horário do lembrete 1'), { target: { value: '2099-08-25T09:00' } });
    fireEvent.change(screen.getByLabelText('Data e horário do lembrete 2'), { target: { value: '2099-08-29T14:00' } });
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

    await waitFor(() => expect(screen.getByLabelText('Data e horário do lembrete 1'))
      .toHaveValue('2099-08-25T09:00'));
    expect(screen.getByLabelText('Data e horário do lembrete 2')).toHaveValue('2099-08-29T14:00');
  });

  test('mostra a rejeição do servidor, preserva o resumo e permite cancelar a edição', async () => {
    const iso = new Date('2099-08-25T09:00').toISOString();
    const stored: ConfiguracaoLembretes = {
      ...empty,
      lembretes: [{
        id: 'existente', data: iso.slice(0, 10), horario: iso.slice(11, 16),
        estado: 'Não enviado', motivo: null, proximoReenvioEm: null
      }]
    };

    fetchMock.mockImplementation((_, options) => Promise.resolve(options?.method === 'PUT'
      ? response(400, { error: 'Data posterior ao prazo acadêmico' }) : response(200, stored)));

    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar lembretes' }));
    const input = await screen.findByLabelText('Data e horário do lembrete 1');
    fireEvent.change(input, { target: { value: '2099-09-02T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    // Uma rejeição mantém o rascunho disponível para correção e preserva o resumo salvo.
    expect(await screen.findByRole('alert')).toHaveTextContent('Data posterior ao prazo acadêmico');
    expect(screen.queryByText('Configuração salva com sucesso')).toBeNull();
    expect(screen.getByText('25/08/2099 às 09:00')).toBeInTheDocument();
    expect(input).toHaveValue('2099-09-02T09:00');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    expect(screen.queryByLabelText('Data e horário do lembrete 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('25/08/2099 às 09:00')).toBeInTheDocument();

    // Cancelar descarta o rascunho local. O único PUT foi a tentativa rejeitada.
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar lembretes' }));
    expect(screen.getByLabelText('Data e horário do lembrete 1')).toHaveValue('2099-08-25T09:00');
  });

  test('bloqueia o salvamento quando a turma está sem prazo', async () => { // Orienta o cadastro do período antes da configuração.
    fetchMock.mockResolvedValue(response(200, { ...empty, prazoAcademico: null }));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cadastre o prazo acadêmico');
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });
});
