// Acesso à API de grupos usado pelos steps de GUI e de serviço.

export interface GrupoJson { nome: string; alunos: string[]; monitor: string | null; alocacaoAutomatica: boolean }
export interface NotificacaoJson { grupo: string; destinatario: string; tipo: string; resultado: string }

const apiUrl = () => Cypress.env('apiUrl') as string;

export const requisitar = (method: string, caminho: string, body?: object) =>
  cy.request({ method, url: `${apiUrl()}${caminho}`, body, failOnStatusCode: false });

export const cadastrarMonitor = (login: string) =>
  requisitar('POST', '/api/monitores', { login }).its('status').should('eq', 201);

export const criarGrupo = (nome: string, alunos: string[]) =>
  requisitar('POST', '/api/grupos', { nome, alunos }).its('status').should('eq', 201);

export const alocarMonitor = (nome: string, monitor: string) =>
  requisitar('POST', `/api/grupos/${nome}/monitor`, { monitor }).its('status').should('eq', 201);

export const limparNotificacoes = () => requisitar('POST', '/api/test/reset-notificacoes');

export const monitoresLivres = () => requisitar('GET', '/api/monitores').its('body');

export const comGrupo = (nome: string, verificar: (grupo: GrupoJson) => void) =>
  requisitar('GET', '/api/grupos').its('body').then((grupos: GrupoJson[]) => {
    const grupo = grupos.find(g => g.nome === nome);
    expect(grupo, `grupo ${nome}`).to.exist;
    verificar(grupo!);
  });

export const comNotificacoes = (grupo: string | null, verificar: (lista: NotificacaoJson[]) => void) =>
  requisitar('GET', grupo ? `/api/grupos/${grupo}/notificacoes` : '/api/notificacoes').its('body').then(verificar);

/** Destinatários das notificações de um tipo, em ordem alfabética. */
export const destinatarios = (lista: NotificacaoJson[], tipo: string) =>
  lista.filter(n => n.tipo === tipo).map(n => n.destinatario).sort();

/** "saída" -> "saida", "remoção" -> "remocao": o tipo como a API o expõe. */
export const tipoDaNotificacao = (palavra: string) =>
  palavra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
