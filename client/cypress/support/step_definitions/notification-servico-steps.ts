import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { comGrupo, comNotificacoes, destinatarios, monitoresLivres, requisitar, tipoDaNotificacao } from '../grupos-api';

// Cenários de serviço: exercitam o servidor pela API, sem nenhum elemento da interface.
// Os Given são compartilhados com os cenários de GUI (notification-steps.ts).

let resposta: Cypress.Response<{ error?: string }>;

const pedir = (method: string, caminho: string, body?: object) =>
  requisitar(method, caminho, body).then(r => { resposta = r; });

// ---------- Given ----------
Given('o monitor {string} não está cadastrado', (monitor: string) => {
  requisitar('GET', '/api/monitores/situacao').its('body').should((lista: { login: string }[]) => {
    expect(lista.map(m => m.login)).not.to.include(monitor);
  });
});

// ---------- When ----------
When('eu peço ao sistema para alocar o monitor {string} ao grupo {string}', (monitor: string, nome: string) => {
  pedir('POST', `/api/grupos/${nome}/monitor`, { monitor });
});

When('eu peço ao sistema para alocar um monitor qualquer ao grupo {string}', (nome: string) => {
  pedir('POST', `/api/grupos/${nome}/monitor`, {});
});

When('eu peço ao sistema para adicionar o aluno {string} ao grupo {string}', (aluno: string, nome: string) => {
  pedir('POST', `/api/grupos/${nome}/alunos`, { aluno });
});

When('eu peço ao sistema para realocar o monitor {string} do grupo {string} para o grupo {string}',
  (monitor: string, origem: string, destino: string) => {
    pedir('POST', `/api/grupos/${origem}/realocar-monitor`, { monitor, destino });
  });

When('eu peço ao sistema para remover o monitor do grupo {string}', (nome: string) => {
  pedir('DELETE', `/api/grupos/${nome}/monitor`);
});

When('eu peço ao sistema a alocação automática de monitor para o grupo {string}', (nome: string) => {
  pedir('POST', `/api/grupos/${nome}/alocacao-automatica`);
});

// ---------- Then ----------
Then('o servidor retorna o erro {string}', (mensagem: string) => {
  cy.then(() => {
    expect(resposta.status).to.equal(400);
    expect(resposta.body.error).to.equal(mensagem);
  });
});

Then('o sistema não registra nenhuma notificação', () => {
  comNotificacoes(null, lista => expect(lista).to.deep.equal([]));
});

Then('o sistema armazena {string} como monitor do grupo {string}', (monitor: string, nome: string) => {
  comGrupo(nome, g => expect(g.monitor).to.equal(monitor));
});

Then('o sistema armazena o grupo {string} sem monitor', (nome: string) => {
  comGrupo(nome, g => expect(g.monitor).to.equal(null));
});

Then('o sistema armazena apenas {string}, {string} e {string} como alunos do grupo {string}',
  (a1: string, a2: string, a3: string, nome: string) => {
    comGrupo(nome, g => expect([...g.alunos].sort()).to.deep.equal([a1, a2, a3].sort()));
  });

Then('o sistema não tem monitores livres', () => {
  monitoresLivres().should('deep.equal', []);
});

const historicoEnviado = (nome: string, tipo: string, esperados: string[]) =>
  comNotificacoes(nome, lista => {
    const doTipo = lista.filter(n => n.tipo === tipoDaNotificacao(tipo));
    expect(destinatarios(lista, tipoDaNotificacao(tipo))).to.deep.equal([...esperados].sort());
    expect(doTipo.every(n => n.resultado === 'Enviado')).to.equal(true);
  });

Then('o histórico do grupo {string} registra notificações de {word} enviadas para {string}, {string} e {string}',
  (nome: string, tipo: string, d1: string, d2: string, d3: string) => historicoEnviado(nome, tipo, [d1, d2, d3]));

Then('o histórico do grupo {string} registra notificações de {word} enviadas para {string}, {string}, {string} e {string}',
  (nome: string, tipo: string, d1: string, d2: string, d3: string, d4: string) =>
    historicoEnviado(nome, tipo, [d1, d2, d3, d4]));
