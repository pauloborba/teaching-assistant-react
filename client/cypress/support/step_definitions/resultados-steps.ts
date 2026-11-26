import { AfterStep, Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Steps dos cenários de GUI de notificacao-resultados.feature.
// Os Given preparam o estado pela API (servidor em NODE_ENV=test); os When usam a interface;
// os Then conferem a interface e, para os e-mails, o serviço de e-mail simulado do servidor.

interface EmailEnviado { destinatario: string; assunto: string; conteudo: string }
type Pagina = 'Resultados Finais' | 'Avaliações';

const METAS = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];

let estado: {
  turmaId: string;
  pagina: Pagina | null;
  aberta: boolean;
  alunos: Record<string, string>; // nome -> CPF
  emailsAntesDaAcao: number;
};
let proximoCpf = 0;

const api = (method: string, caminho: string, body?: object) =>
  cy.request({ method, url: `${Cypress.env('apiUrl')}${caminho}`, body, failOnStatusCode: false });

const urlTurma = (caminho = '') => `/api/classes/${encodeURIComponent(estado.turmaId)}${caminho}`;
const dc = (nome: string) => `[data-cy="${nome}"]`;
const semAcentos = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
const emailPadrao = (nome: string) => `${semAcentos(nome).toLowerCase().replace(/\s+/g, '.')}@cin.ufpe.br`;
const cpfDe = (nome: string) => {
  expect(estado.alunos, `aluno ${nome}`).to.have.property(nome);
  return estado.alunos[nome];
};

Before({ tags: '@resultados-gui' }, () => {
  estado = { turmaId: '', pagina: null, aberta: false, alunos: {}, emailsAntesDaAcao: 0 };
  api('POST', '/api/test/resultados/reset').its('status').should('eq', 204);
});

/**
 * Pausa para acompanhar os cenários na janela do Cypress (cypress open): 1,5 s depois de cada
 * passo que mexe na tela. No cypress run não há pausa. Para mudar: --env pausaMs=3000 (0 desliga).
 */
const pausaMs = (): number => {
  const configurada = Cypress.env('pausaMs');
  if (configurada !== undefined && Number.isFinite(Number(configurada))) return Number(configurada);
  return Cypress.config('isInteractive') ? 1500 : 0;
};

const pausar = () => {
  if (pausaMs() > 0) cy.wait(pausaMs(), { log: false });
};

// Os Given preparam dados pela API, antes de a página abrir; a pausa vale só depois disso.
AfterStep({ tags: '@resultados-gui' }, () => {
  if (estado.aberta) pausar();
});

// ---------- preparação pela API ----------

/** "2026.2 de ESS" -> turma ESS do período 2026.2 */
const criarTurma = (descricao: string) => {
  const partes = /^(\d{4})\.([12]) de (.+)$/.exec(descricao);
  expect(partes, `turma ${descricao}`).to.not.equal(null);
  const [, ano, semestre, topico] = partes!;
  const id = `${topico}-${ano}-${semestre}`;
  if (estado.turmaId === id) return;
  estado.turmaId = id;
  api('POST', '/api/classes', { topic: topico, year: Number(ano), semester: Number(semestre) })
    .its('status').should('eq', 201);
};

const criarAluno = (nome: string, email: string | null = emailPadrao(nome)) => {
  const cpf = String(10000000000 + ++proximoCpf);
  estado.alunos[nome] = cpf;
  api('POST', '/api/students', { name: nome, cpf, email: email ?? '' }).its('status').should('eq', 201);
  api('POST', urlTurma('/enroll'), { studentCPF: cpf }).its('status').should('eq', 201);
};

const lancarConceitos = (nome: string, conceito: string, excecoes: Record<string, string | null> = {}) => {
  for (const meta of METAS) {
    const nota = meta in excecoes ? excecoes[meta] : conceito;
    if (nota) {
      api('PUT', urlTurma(`/enrollments/${cpfDe(nome)}/evaluation`), { goal: meta, grade: nota })
        .its('status').should('eq', 200);
    }
  }
};

/** Conceitos que levam ao resultado pedido (MA = 10, MPA = 7, MANA = 4). */
const lancarResultado = (nome: string, resultado: string) => {
  if (resultado === 'Aprovado') lancarConceitos(nome, 'MA');
  else if (resultado === 'Final') lancarConceitos(nome, 'MPA', { Tests: 'MANA' }); // média 6,5
  else throw new Error(`Resultado sem preparação definida: ${resultado}`);
};

const alterarEmail = (nome: string, email: string) =>
  api('PUT', `/api/students/${cpfDe(nome)}`, { name: nome, email }).its('status').should('eq', 200);

const liberarPelaApi = (nomes: string[]) =>
  api('POST', urlTurma('/resultados/envio'), { alunos: nomes.map(cpfDe) }).its('status').should('eq', 200);

interface SituacaoDoAluno {
  nome: string;
  media: number | null;
  resultado: string | null;
  statusEnvio: string;
  resultadoEnviado: string | null;
  motivoFalha: string | null;
}

const situacaoNaApi = (nome: string): Cypress.Chainable<SituacaoDoAluno> =>
  api('GET', urlTurma('/resultados')).its('body.alunos')
    .then((alunos: SituacaoDoAluno[]) => alunos.find(a => a.nome === nome)!);

const conferirStatusInicial = (status: string) => expect(status).to.equal('Não enviado');

// ---------- interface ----------

const ABAS: Record<Pagina, string> = { 'Resultados Finais': 'results-tab', 'Avaliações': 'evaluations-tab' };

/** Abre a página do cenário na primeira ação e guarda quantos e-mails já existiam. */
const abrirPagina = () => {
  if (estado.aberta) return;
  estado.aberta = true;
  api('GET', '/api/test/resultados/emails').its('body').then((emails: EmailEnviado[]) => {
    estado.emailsAntesDaAcao = emails.length;
  });
  cy.visit('/');
  cy.get(`[data-testid="${ABAS[estado.pagina!]}"]`).click();
  if (estado.pagina === 'Resultados Finais') {
    cy.get(`${dc('turma-select')} option[value="${estado.turmaId}"]`).should('exist');
    cy.get(dc('turma-select')).select(estado.turmaId);
    cy.get(dc('resultados-tabela')).should('be.visible');
  } else {
    cy.get(`#classSelect option[value="${estado.turmaId}"]`).should('exist');
    cy.get('#classSelect').select(estado.turmaId);
    cy.get('.evaluation-table').should('be.visible');
  }
  pausar(); // mostra a página antes da primeira ação
};

const linhaResultado = (nome: string) => cy.get(`${dc('resultado-aluno')}[data-nome="${nome}"]`);
const linhaAvaliacao = (nome: string) => cy.contains('tr.student-row', nome);

const conferirStatus = (nome: string, status: string) => {
  if (estado.aberta && estado.pagina === 'Resultados Finais') {
    linhaResultado(nome).should('have.attr', 'data-status', status);
  } else {
    situacaoNaApi(nome).its('statusEnvio').should('eq', status);
  }
};

/** E-mails enviados durante a ação do cenário para o aluno (identificado pela saudação). */
const emailsNovosPara = (nome: string, tipo: 'resultado' | 'atualizacao') =>
  api('GET', '/api/test/resultados/emails').its('body').then((emails: EmailEnviado[]) =>
    emails.slice(estado.emailsAntesDaAcao).filter(e =>
      e.conteudo.includes(`Olá, ${nome}.`)
      && (tipo === 'resultado' ? e.assunto.startsWith('Resultado final') : e.assunto.startsWith('Atualização'))));

const conferirEmailDoProprioResultado = (nome: string, resultado?: string) => {
  emailsNovosPara(nome, 'resultado').then(emails => {
    expect(emails, `e-mails de resultado para ${nome}`).to.have.length(1);
    const outros = Object.keys(estado.alunos).filter(outro => outro !== nome);
    outros.forEach(outro => expect(emails[0].conteudo).not.to.contain(outro));
    if (resultado) {
      expect(emails[0].conteudo).to.contain(`é: ${resultado}.`);
    } else {
      situacaoNaApi(nome).then(aluno => expect(emails[0].conteudo).to.contain(`é: ${aluno.resultado}.`));
    }
  });
};

// ---------- Given ----------

Given('eu estou na página {string} da turma {string}', (pagina: Pagina, turma: string) => {
  expect(Object.keys(ABAS)).to.include(pagina);
  criarTurma(turma);
  estado.pagina = pagina;
});

Given('a turma {string} possui apenas os alunos {string} e {string}, ambos com e-mail cadastrado e status de envio {string}',
  (turma: string, aluno1: string, aluno2: string, status: string) => {
    criarTurma(turma);
    conferirStatusInicial(status);
    criarAluno(aluno1);
    criarAluno(aluno2);
  });

Given('a turma {string} possui apenas os alunos {string}, {string} e {string}, todos com e-mail cadastrado, resultado definido e status de envio {string}',
  (turma: string, aluno1: string, aluno2: string, aluno3: string, status: string) => {
    criarTurma(turma);
    conferirStatusInicial(status);
    [aluno1, aluno2, aluno3].forEach(nome => {
      criarAluno(nome);
      lancarResultado(nome, 'Aprovado');
    });
  });

Given('a turma {string} possui apenas os alunos {string} e {string}, ambos com resultado definido e status de envio {string}',
  (turma: string, aluno1: string, aluno2: string, status: string) => {
    criarTurma(turma);
    conferirStatusInicial(status);
    [aluno1, aluno2].forEach(nome => {
      criarAluno(nome, null); // o e-mail é definido no passo seguinte
      lancarResultado(nome, 'Aprovado');
    });
  });

Given('{string} possui o e-mail {string} e {string} não possui e-mail cadastrado',
  (comEmail: string, email: string, _semEmail: string) => {
    alterarEmail(comEmail, email);
  });

Given('{string} possui o resultado {string} e {string} possui o resultado {string}',
  (aluno1: string, resultado1: string, aluno2: string, resultado2: string) => {
    lancarResultado(aluno1, resultado1);
    lancarResultado(aluno2, resultado2);
  });

Given('{string} possui o resultado {string}', (nome: string, resultado: string) => {
  lancarResultado(nome, resultado);
});

Given('{string} está sem conceito cadastrado na meta {string}', (nome: string, meta: string) => {
  lancarConceitos(nome, 'MA', { [meta]: null });
});

Given('o aluno {string} possui o resultado {string}, e-mail cadastrado e status de envio {string}',
  (nome: string, resultado: string, status: string) => {
    conferirStatusInicial(status);
    criarAluno(nome);
    lancarResultado(nome, resultado);
  });

Given('o aluno {string} possui o resultado {string} com status de envio {string}',
  (nome: string, resultado: string, status: string) => {
    criarAluno(nome);
    lancarResultado(nome, resultado);
    if (status === 'Enviado') liberarPelaApi([nome]);
    situacaoNaApi(nome).its('statusEnvio').should('eq', status);
  });

Given('a aluna {string} possui o resultado {string} com status de envio {string}, após uma falha por não possuir e-mail cadastrado',
  (nome: string, resultado: string, status: string) => {
    criarAluno(nome, null);
    lancarResultado(nome, resultado);
    liberarPelaApi([nome]); // falha: a aluna não tem e-mail
    situacaoNaApi(nome).then(aluno => {
      expect(aluno.statusEnvio).to.equal(status);
      expect(aluno.motivoFalha).to.equal('não possui e-mail cadastrado');
    });
  });

Given('o e-mail {string} foi cadastrado para {string} depois da falha', (email: string, nome: string) => {
  alterarEmail(nome, email);
});

Given('a aluna {string} possui {string} em todas as metas, com média {string} e resultado {string}',
  (nome: string, conceito: string, media: string, resultado: string) => {
    criarAluno(nome);
    lancarConceitos(nome, conceito);
    situacaoNaApi(nome).then(aluno => {
      expect(aluno.media?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })).to.equal(media);
      expect(aluno.resultado).to.equal(resultado);
    });
  });

Given('o resultado {string} de {string} já foi enviado por e-mail', (resultado: string, nome: string) => {
  liberarPelaApi([nome]);
  situacaoNaApi(nome).then(aluno => {
    expect(aluno.statusEnvio).to.equal('Enviado');
    expect(aluno.resultadoEnviado).to.equal(resultado);
  });
});

// ---------- When ----------

When('eu libero o envio dos resultados para toda a turma', () => {
  abrirPagina();
  cy.get(dc('liberar-turma-btn')).click();
});

When('eu seleciono os alunos {string} e {string}', (aluno1: string, aluno2: string) => {
  abrirPagina();
  [aluno1, aluno2].forEach(nome => linhaResultado(nome).find(dc('selecionar-aluno')).check());
});

When('eu libero o envio dos resultados para os alunos selecionados', () => {
  abrirPagina();
  cy.get(dc('liberar-selecionados-btn')).click();
});

When('eu abro a pré-visualização do e-mail de {string}', (nome: string) => {
  abrirPagina();
  linhaResultado(nome).find(dc('previa-btn')).click();
  cy.get(dc('previa-email')).should('be.visible');
});

When('eu acrescento ao texto do e-mail a mensagem {string}', (mensagem: string) => {
  cy.get(dc('previa-texto')).should('not.have.value', '')
    .type(`{moveToEnd}\n\n${mensagem}`, { delay: pausaMs() > 0 ? 60 : 10 }); // digitação visível na janela
});

When('eu libero o envio do e-mail', () => {
  cy.get(dc('liberar-previa-btn')).click();
});

When('eu solicito uma nova tentativa de envio para os alunos com envio pendente', () => {
  abrirPagina();
  cy.get(dc('reenviar-pendentes-btn')).click();
});

When('eu tento liberar novamente o envio individual do resultado de {string}', (nome: string) => {
  abrirPagina();
  linhaResultado(nome).find(dc('enviar-individual-btn')).click();
});

When('eu altero o conceito de {string} na meta {string} para {string}', (nome: string, meta: string, conceito: string) => {
  abrirPagina();
  linhaAvaliacao(nome).find(dc(`conceito-${meta}`)).select(conceito);
});

// ---------- Then: mensagens ----------

Then('eu vejo a mensagem {string}', (texto: string) => {
  // Em caso de falha, o erro mostra o texto que a tela apresentou no lugar da mensagem esperada.
  cy.get('[role="alert"]').should('be.visible').and('contain.text', texto);
});

Then('eu vejo a mensagem de alerta {string}', (texto: string) => {
  cy.get(dc('mensagem-alerta')).should('be.visible').and('contain.text', texto);
});

Then('eu vejo a mensagem de erro {string}, com a seção {string} recolhida', (texto: string, secao: string) => {
  cy.get(dc('mensagem-erro')).should('be.visible').and('contain.text', texto);
  cy.get(dc('detalhes-falhas')).should('not.have.attr', 'open');
  cy.get(`${dc('detalhes-falhas')} summary`).should('have.text', secao);
});

Then('a seção {string} informa que {string} não recebeu o resultado porque não possui e-mail cadastrado',
  (_secao: string, nome: string) => {
    cy.get(dc('detalhes-falhas')).should('contain.text', `${nome} não recebeu o resultado porque não possui e-mail cadastrado`);
  });

Then('eu vejo a opção de tentar o envio novamente', () => {
  cy.get(dc('tentar-novamente-btn')).should('be.visible');
});

Then('eu vejo o aviso de que {string} não recebeu o resultado por ter nota pendente na meta {string}',
  (nome: string, meta: string) => {
    cy.get(dc('avisos-pendencias'))
      .should('contain.text', `${nome} não recebeu o resultado por ter nota pendente na meta "${meta}".`);
  });

Then('eu permaneço na página {string} da turma {string}', (_pagina: string, _turma: string) => {
  cy.get(dc('resultados-finais-pagina')).should('be.visible');
  cy.get(dc('turma-select')).should('have.value', estado.turmaId);
});

// ---------- Then: status de envio ----------

Then('o status de envio de {string} passa a ser {string}', (nome: string, status: string) => {
  conferirStatus(nome, status);
});

Then('o status de envio de {string} permanece {string}', (nome: string, status: string) => {
  conferirStatus(nome, status);
});

Then('o status de envio de {string} e de {string} passa a ser {string}', (aluno1: string, aluno2: string, status: string) => {
  conferirStatus(aluno1, status);
  conferirStatus(aluno2, status);
});

Then('o status de envio de {string} passa a ser {string} e o de {string} permanece {string}',
  (aluno1: string, status1: string, aluno2: string, status2: string) => {
    conferirStatus(aluno1, status1);
    conferirStatus(aluno2, status2);
  });

Then('o status de envio de {string} passa a ser {string} e o de {string} passa a ser {string}',
  (aluno1: string, status1: string, aluno2: string, status2: string) => {
    conferirStatus(aluno1, status1);
    conferirStatus(aluno2, status2);
  });

Then('o status de envio de {string} e de {string} passa a ser {string} e o de {string} permanece {string}',
  (aluno1: string, aluno2: string, status1: string, aluno3: string, status3: string) => {
    conferirStatus(aluno1, status1);
    conferirStatus(aluno2, status1);
    conferirStatus(aluno3, status3);
  });

// ---------- Then: e-mails ----------

Then('{string} recebe um e-mail informando apenas o próprio resultado {string}', (nome: string, resultado: string) => {
  conferirEmailDoProprioResultado(nome, resultado);
});

Then('{string} e {string} recebem um e-mail informando apenas o próprio resultado', (aluno1: string, aluno2: string) => {
  conferirEmailDoProprioResultado(aluno1);
  conferirEmailDoProprioResultado(aluno2);
});

Then('{string} recebe um e-mail com o resultado {string} e a mensagem {string}',
  (nome: string, resultado: string, mensagem: string) => {
    emailsNovosPara(nome, 'resultado').then(emails => {
      expect(emails).to.have.length(1);
      expect(emails[0].conteudo).to.contain(`é: ${resultado}.`);
      expect(emails[0].conteudo).to.contain(mensagem);
    });
  });

Then('nenhum e-mail de resultado final é enviado para {string}', (nome: string) => {
  emailsNovosPara(nome, 'resultado').should('have.length', 0);
});

Then('nenhum novo e-mail de resultado final é enviado para {string}', (nome: string) => {
  emailsNovosPara(nome, 'resultado').should('have.length', 0);
});

Then('{string} recebe um e-mail de atualização informando o resultado {string} no lugar do resultado {string}',
  (nome: string, novo: string, anterior: string) => {
    emailsNovosPara(nome, 'atualizacao').then(emails => {
      expect(emails).to.have.length(1);
      expect(emails[0].conteudo).to.contain(`Resultado anterior: ${anterior}.`);
      expect(emails[0].conteudo).to.contain(`Novo resultado: ${novo}.`);
    });
  });

Then('nenhum e-mail de atualização é enviado para {string}', (nome: string) => {
  emailsNovosPara(nome, 'atualizacao').should('have.length', 0);
});

// ---------- Then: aba Avaliações ----------

Then('o resultado de {string} passa a ser {string}', (nome: string, resultado: string) => {
  linhaAvaliacao(nome).find(dc('resultado-aluno')).should('have.text', resultado);
});

Then('a média de {string} passa a ser {string} e o resultado continua {string}',
  (nome: string, media: string, resultado: string) => {
    linhaAvaliacao(nome).find(dc('media-aluno')).should('have.text', media);
    linhaAvaliacao(nome).find(dc('resultado-aluno')).should('have.text', resultado);
  });
