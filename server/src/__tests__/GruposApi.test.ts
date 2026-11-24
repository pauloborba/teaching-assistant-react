import request from 'supertest';
import { app } from '../server';

/**
 * Testes de API da notificação de alocação de monitor e aluno.
 * Cada bloco segue um cenário de features/notification.feature, exercitando as
 * rotas HTTP (status, corpo e mensagens) e o histórico de notificações.
 * O envio de e-mail usa o EmailSenderSimulado (mock), sem depender de SMTP.
 */
describe('API de grupos, monitores e notificações', () => {
  type NotificacaoJson = { grupo: string; destinatario: string; tipo: string; resultado: string };

  const resetar = () => request(app).post('/api/test/reset').expect(204);
  const limparNotificacoes = () => request(app).post('/api/test/reset-notificacoes').expect(204);
  const cadastrarMonitor = (login: string) =>
    request(app).post('/api/monitores').send({ login }).expect(201);
  const criarGrupo = (nome: string, alunos: string[]) =>
    request(app).post('/api/grupos').send({ nome, alunos }).expect(201);
  const alocar = (nome: string, monitor?: string) =>
    request(app).post(`/api/grupos/${nome}/monitor`).send({ monitor });
  const notificacoes = async (grupo?: string): Promise<NotificacaoJson[]> =>
    (await request(app).get(grupo ? `/api/grupos/${grupo}/notificacoes` : '/api/notificacoes').expect(200)).body;
  const destinatarios = (lista: NotificacaoJson[], tipo: string) =>
    lista.filter(n => n.tipo === tipo).map(n => n.destinatario).sort();
  const grupo = async (nome: string) =>
    ((await request(app).get('/api/grupos').expect(200)).body as { nome: string; alunos: string[]; monitor: string | null }[])
      .find(g => g.nome === nome);

  /** Grupo com dois alunos e, opcionalmente, um monitor já alocado (sem notificações pendentes). */
  const grupoCom = async (nome: string, alunos: string[], monitor?: string) => {
    await criarGrupo(nome, alunos);
    if (monitor) {
      await cadastrarMonitor(monitor);
      await alocar(nome, monitor).expect(201);
      await limparNotificacoes();
    }
  };

  beforeEach(resetar);

  it('notifica alunos e monitor ao alocar o monitor', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro']);
    await cadastrarMonitor('joaosilva');

    const resposta = await alocar('ESS-G3', 'joaosilva').expect(201);

    expect(resposta.body.monitor).toBe('joaosilva');
    expect(destinatarios(await notificacoes('ESS-G3'), 'alocacao')).toEqual(['Mariana', 'Pedro', 'joaosilva']);
    expect((await notificacoes()).every(n => n.resultado === 'Enviado')).toBe(true);
  });

  it('notifica todos os participantes ao adicionar aluno a grupo com monitor', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro'], 'joaosilva');

    const resposta = await request(app).post('/api/grupos/ESS-G3/alunos').send({ aluno: 'Carla' }).expect(201);

    expect(resposta.body.alunos).toEqual(['Mariana', 'Pedro', 'Carla']);
    expect(destinatarios(await notificacoes('ESS-G3'), 'aviso')).toEqual(['Carla', 'Mariana', 'Pedro', 'joaosilva']);
  });

  it('responde 400 e não notifica quando não há monitor disponível', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro']);

    const resposta = await alocar('ESS-G3').expect(400);

    expect(resposta.body.error).toBe('Não há monitor disponível');
    expect(await notificacoes()).toEqual([]);
    expect((await grupo('ESS-G3'))!.monitor).toBeNull();
  });

  it('responde 400 e não notifica ao adicionar aluno que já pertence ao grupo', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro'], 'joaosilva');

    const resposta = await request(app).post('/api/grupos/ESS-G3/alunos').send({ aluno: 'Pedro' }).expect(400);

    expect(resposta.body.error).toBe('O aluno já pertence ao grupo');
    expect(await notificacoes()).toEqual([]);
    expect((await grupo('ESS-G3'))!.alunos).toEqual(['Mariana', 'Pedro']);
  });

  it('realoca o monitor entre grupos, avisa os alunos dos dois grupos e registra o histórico', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro'], 'joaosilva');
    await grupoCom('ESS-G4', ['Lucas', 'Beatriz']);

    await request(app).post('/api/grupos/ESS-G3/realocar-monitor')
      .send({ monitor: 'joaosilva', destino: 'ESS-G4' }).expect(201);

    expect(destinatarios(await notificacoes('ESS-G3'), 'saida')).toEqual(['Mariana', 'Pedro']);
    expect(destinatarios(await notificacoes('ESS-G4'), 'entrada')).toEqual(['Beatriz', 'Lucas']);
    expect((await grupo('ESS-G3'))!.monitor).toBeNull();
    expect((await grupo('ESS-G4'))!.monitor).toBe('joaosilva');
  });

  it('aloca automaticamente o único monitor livre e atualiza a lista de monitores', async () => {
    await grupoCom('ESS-G5', ['Rafael', 'Julia']);
    await cadastrarMonitor('mariaeduarda');

    const resposta = await request(app).post('/api/grupos/ESS-G5/alocacao-automatica').expect(201);

    expect(resposta.body).toMatchObject({ monitor: 'mariaeduarda', alocacaoAutomatica: true });
    expect(destinatarios(await notificacoes('ESS-G5'), 'alocacao')).toEqual(['Julia', 'Rafael', 'mariaeduarda']);
    expect((await request(app).get('/api/monitores/situacao').expect(200)).body).toEqual([
      { login: 'mariaeduarda', situacao: 'alocado', grupos: ['ESS-G5'], alocacaoAutomatica: true }
    ]);
    expect((await request(app).get('/api/monitores').expect(200)).body).toEqual([]);
  });

  it('remove o monitor sem realocação e avisa apenas os alunos', async () => {
    await grupoCom('ESS-G3', ['Mariana', 'Pedro'], 'joaosilva');

    const resposta = await request(app).delete('/api/grupos/ESS-G3/monitor').expect(200);

    expect(resposta.body.monitor).toBeNull();
    expect(destinatarios(await notificacoes('ESS-G3'), 'remocao')).toEqual(['Mariana', 'Pedro']);
  });

  it('responde 400 e não notifica quando o grupo de destino da realocação não existe', async () => {
    await grupoCom('ESS-G3', [], 'joaosilva');

    const resposta = await request(app).post('/api/grupos/ESS-G3/realocar-monitor')
      .send({ monitor: 'joaosilva', destino: 'ESS-G4' }).expect(400);

    expect(resposta.body.error).toBe('Grupo de destino não existe');
    expect(await notificacoes()).toEqual([]);
    expect((await grupo('ESS-G3'))!.monitor).toBe('joaosilva');
  });

  it('notifica apenas o novo monitor quando o grupo não tem alunos', async () => {
    await grupoCom('ESS-G6', []);
    await cadastrarMonitor('carloseduardo');

    await alocar('ESS-G6', 'carloseduardo').expect(201);

    expect(await notificacoes()).toEqual([
      expect.objectContaining({ grupo: 'ESS-G6', destinatario: 'carloseduardo', tipo: 'alocacao' })
    ]);
  });

  it('avisa os alunos e o monitor quando ele acumula grupos, sem alterar o grupo anterior', async () => {
    await grupoCom('ESS-G3', [], 'joaosilva');
    await grupoCom('ESS-G7', ['Ana', 'Bruno']);

    await alocar('ESS-G7', 'joaosilva').expect(201);

    const doG7 = await notificacoes('ESS-G7');
    expect(destinatarios(doG7, 'alocacao')).toEqual(['Ana', 'Bruno']);
    expect(destinatarios(doG7, 'acumulo')).toEqual(['joaosilva']);
    expect(await notificacoes('ESS-G3')).toEqual([]);
    expect((await grupo('ESS-G3'))!.monitor).toBe('joaosilva');
  });

  it('responde 400 para grupo inexistente e para monitor não cadastrado', async () => {
    expect((await alocar('ESS-G9', 'joaosilva').expect(400)).body.error).toBe('Grupo não existe');
    await criarGrupo('ESS-G3', []);
    expect((await alocar('ESS-G3', 'ninguem').expect(400)).body.error).toBe('Monitor não existe');
    expect(await notificacoes()).toEqual([]);
  });
});
