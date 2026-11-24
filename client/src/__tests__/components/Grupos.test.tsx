import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Grupos from '../../components/Grupos';
import { grupoService, Grupo, Notificacao, SituacaoMonitor } from '../../services/GrupoService';

jest.mock('../../services/GrupoService', () => ({
  grupoService: {
    listarGrupos: jest.fn(),
    situacaoDosMonitores: jest.fn(),
    listarNotificacoes: jest.fn(),
    alocarMonitor: jest.fn(),
    alocarAutomaticamente: jest.fn(),
    removerMonitor: jest.fn(),
    realocarMonitor: jest.fn(),
    adicionarAluno: jest.fn()
  }
}));

/**
 * Componente da aba Groups com o GrupoService simulado: verifica que as ações do
 * professor chamam o serviço certo, que a tela é recarregada com as notificações
 * enviadas e que uma regra rejeitada aparece como mensagem de erro.
 * O fluxo completo com servidor real fica nos cenários Cypress.
 */
describe('GUI de notificação de alocação de monitor e aluno', () => {
  const servico = grupoService as jest.Mocked<typeof grupoService>;

  const g3: Grupo = { nome: 'ESS-G3', alunos: ['Mariana', 'Pedro'], monitor: null, alocacaoAutomatica: false };
  const monitorLivre: SituacaoMonitor = { login: 'joaosilva', situacao: 'livre', grupos: [], alocacaoAutomatica: false };
  const alocacao = (id: number, destinatario: string): Notificacao => ({
    id, grupo: 'ESS-G3', destinatario, tipo: 'alocacao', mensagem: 'Alocação de monitor', resultado: 'Enviado'
  });

  const estado = (grupos: Grupo[], monitores: SituacaoMonitor[], notificacoes: Notificacao[]) => {
    servico.listarGrupos.mockResolvedValue(grupos);
    servico.situacaoDosMonitores.mockResolvedValue(monitores);
    servico.listarNotificacoes.mockResolvedValue(notificacoes);
  };

  const cardDoGrupo = async (nome: string) => {
    const nomeDoGrupo = await screen.findByRole('heading', { name: nome });
    return within(nomeDoGrupo.closest('article') as HTMLElement);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    estado([g3], [monitorLivre], []);
  });

  it('mostra o grupo sem monitor e nenhuma notificação enviada', async () => {
    render(<Grupos />);

    const card = await cardDoGrupo('ESS-G3');
    expect(card.getByText('Sem monitor')).toBeInTheDocument();
    expect(card.getByText('Mariana')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma notificação enviada.')).toBeInTheDocument();
  });

  it('aloca o monitor escolhido e exibe as notificações de alocação enviadas', async () => {
    servico.alocarMonitor.mockResolvedValue({ ...g3, monitor: 'joaosilva' });
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    estado(
      [{ ...g3, monitor: 'joaosilva' }],
      [{ ...monitorLivre, situacao: 'alocado', grupos: ['ESS-G3'] }],
      [alocacao(1, 'Mariana'), alocacao(2, 'Pedro'), alocacao(3, 'joaosilva')]
    );
    fireEvent.change(card.getByRole('combobox'), { target: { value: 'joaosilva' } });
    fireEvent.click(card.getByRole('button', { name: 'Alocar' }));

    expect(await screen.findByText('Monitor alocado com sucesso')).toBeInTheDocument();
    expect(servico.alocarMonitor).toHaveBeenCalledWith('ESS-G3', 'joaosilva');
    const lista = within(screen.getByText('Notificações enviadas').closest('section') as HTMLElement);
    await waitFor(() => expect(lista.getAllByText('Alocação')).toHaveLength(3));
    expect(lista.getByText('joaosilva')).toBeInTheDocument();
    expect(card.getByText('joaosilva', { selector: '[data-cy="grupo-monitor"]' })).toBeInTheDocument();
  });

  it('exibe a mensagem do servidor e não mostra notificação quando não há monitor disponível', async () => {
    servico.alocarMonitor.mockRejectedValue(new Error('Não há monitor disponível'));
    estado([g3], [], []);
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Alocar' }));

    expect(await screen.findByText('Não há monitor disponível')).toBeInTheDocument();
    expect(servico.alocarMonitor).toHaveBeenCalledWith('ESS-G3', undefined);
    expect(screen.getByText('Nenhuma notificação enviada.')).toBeInTheDocument();
    expect(card.getByText('Sem monitor')).toBeInTheDocument();
  });

  it('adiciona aluno pelo campo do grupo', async () => {
    servico.adicionarAluno.mockResolvedValue({ ...g3, alunos: [...g3.alunos, 'Carla'] });
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.change(card.getByPlaceholderText('Nome do aluno'), { target: { value: 'Carla' } });
    fireEvent.click(card.getByRole('button', { name: 'Adicionar aluno' }));

    expect(await screen.findByText('Aluno adicionado com sucesso')).toBeInTheDocument();
    expect(servico.adicionarAluno).toHaveBeenCalledWith('ESS-G3', 'Carla');
  });

  it('realoca o monitor atual para o grupo de destino digitado', async () => {
    estado([{ ...g3, monitor: 'joaosilva' }], [{ ...monitorLivre, situacao: 'alocado', grupos: ['ESS-G3'] }], []);
    servico.realocarMonitor.mockRejectedValue(new Error('Grupo de destino não existe'));
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.change(card.getByPlaceholderText('Grupo de destino'), { target: { value: 'ESS-G4' } });
    fireEvent.click(card.getByRole('button', { name: 'Realocar' }));

    expect(await screen.findByText('Grupo de destino não existe')).toBeInTheDocument();
    expect(servico.realocarMonitor).toHaveBeenCalledWith('ESS-G3', 'joaosilva', 'ESS-G4');
  });

  it('remove o monitor e executa a alocação automática pelos botões do grupo', async () => {
    servico.removerMonitor.mockResolvedValue(undefined);
    servico.alocarAutomaticamente.mockResolvedValue({ ...g3, monitor: 'joaosilva', alocacaoAutomatica: true });
    render(<Grupos />);
    const card = await cardDoGrupo('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Remover monitor' }));
    expect(await screen.findByText('Monitor removido do grupo')).toBeInTheDocument();
    expect(servico.removerMonitor).toHaveBeenCalledWith('ESS-G3');

    fireEvent.click(card.getByRole('button', { name: 'Alocação automática' }));
    expect(await screen.findByText('Monitor alocado automaticamente')).toBeInTheDocument();
    expect(servico.alocarAutomaticamente).toHaveBeenCalledWith('ESS-G3');
  });

  it('marca na lista de monitores a alocação automática e o grupo do monitor', async () => {
    estado(
      [{ ...g3, monitor: 'joaosilva', alocacaoAutomatica: true }],
      [{ login: 'joaosilva', situacao: 'alocado', grupos: ['ESS-G3'], alocacaoAutomatica: true }],
      []
    );
    render(<Grupos />);

    expect(await screen.findByText('alocação automática')).toBeInTheDocument();
    expect(screen.getByText('Alocado')).toBeInTheDocument();
    expect(screen.queryByText('Livre')).not.toBeInTheDocument();
  });
});
