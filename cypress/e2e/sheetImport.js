import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

const API_URL = 'http://localhost:3005';
const STUDENTS = `${API_URL}/api/students`;
const IMPORT = `${STUDENTS}/import`;
const FORM = 'form[data-testid="student-form"]';
const SUBMIT = '[data-testid="submit-student-button"]';
const FIELD = Cypress.expose('IMPORT_FIELD') || 'file';
const limparCPF = cpf => String(cpf ?? '').replace(/\D/g, '');
const normalizar = alunos => alunos.map(({ name, cpf, email }) => ({
  name, cpf: limparCPF(cpf), email
})).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const aluno = (name, email, cpf) => ({ name, email, cpf });
const norman = aluno('Norman Osborn', 'no@cin.ufpe.br', '123.433.444-10');
const otto = aluno('Otto Octavius', 'oo@cin.ufpe.br', '123.533.444-10');
const peter = aluno('Peter Parker', 'pp@cin.ufpe.br', '12345678910');
const dadosPadrao = [norman, otto];
const listar = () => cy.request('GET', STUDENTS).its('body').should('be.an', 'array');
const formulario = () => cy.get(FORM).filter(':has(input[type="file"])')
  .filter(':visible').should('have.length', 1);
const inputArquivo = () => formulario().find('input[type="file"]');
const botaoImportar = () => formulario().find(SUBMIT);
const csv = (colunas, linhas) => [colunas, ...linhas].map(linha => linha.map(v => {
  const s = String(v ?? '');
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',')).join('\n') + '\n';
const csvAlunos = alunos => csv(['name', 'email', 'cpf'], alunos.map(a => [a.name, a.email, a.cpf]));
const arquivoCSV = (conteudo, fileName = 'alunos.csv') => ({
  contents: Cypress.Buffer.from(conteudo, 'utf8'), fileName, mimeType: 'text/csv'
});
let alunosAntes, respostaImportacao, esperados, cadastrados, arquivoSelecionado, paginaAberta, monitorando, requisicoes;

// Isolamento: somente registros de teste que os cenários tentam importar.
// Execute exclusivamente em um banco descartável de testes.
Before({ tags: '@importacao' }, () => {
  alunosAntes = null;
  respostaImportacao = null;
  esperados = [];
  cadastrados = [];
  arquivoSelecionado = null;
  paginaAberta = false;
  monitorando = false;
  requisicoes = 0;
  return listar().then(alunos => {
    const sobras = alunos.filter(a => [norman, otto, peter].some(b =>
      a.name === b.name && (limparCPF(a.cpf) === limparCPF(b.cpf) ||
        a.email === b.email || (b === norman && a.email === 'no.cin.ufpe.br'))));
    if (sobras.length) {
      expect(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(API_URL) || Cypress.expose('ALLOW_TEST_CLEANUP') === true,
        'limpeza permitida somente em API local ou banco de testes autorizado').to.be.true;
    }
    return cy.wrap(sobras, { log: false }).each(a => {
      // Ajuste se a API usar outro identificador ou rota de exclusão.
      const id = a.id ?? a._id ?? a.cpf;
      expect(id, 'Identificador do aluno').to.exist;
      return cy.request('DELETE', `${STUDENTS}/${encodeURIComponent(id)}`);
    });
  });
});

function cadastrar(a) {
  return listar().then(alunos => {
    const existente = alunos.find(x => limparCPF(x.cpf) === limparCPF(a.cpf));
    if (existente) {
      expect(existente.name).to.eq(a.name);
      expect(existente.email).to.eq(a.email);
      return;
    }
    return cy.request('POST', STUDENTS, a);
  }).then(() => { cadastrados.push(a); });
}
function abrirPagina() {
  paginaAberta = true;
  return cy.visit('/');
}
function prepararAlunos(alunos) {
  return cy.wrap(alunos, { log: false }).each(a => cadastrar(a)).then(() => {
    if (paginaAberta) return cy.reload();
  });
}
function guardarEstado() {
  if (alunosAntes !== null) return cy.wrap(alunosAntes, { log: false });
  return listar().then(alunos => { alunosAntes = normalizar(alunos); });
}
function conferirInalterado() {
  expect(alunosAntes, 'estado anterior à ação').to.be.an('array');
  return listar().then(alunos => expect(normalizar(alunos)).to.deep.equal(alunosAntes));
}
function conferirAluno(alunos, a) {
  const encontrados = alunos.filter(x => limparCPF(x.cpf) === limparCPF(a.cpf));
  expect(encontrados, `CPF de ${a.name}`).to.have.length(1);
  expect(encontrados[0].name).to.eq(a.name);
  expect(encontrados[0].email).to.eq(a.email);
}
function conferirPreservados(nomes) {
  return listar().then(alunos => nomes.forEach(nome => {
    const original = cadastrados.find(a => a.name === nome);
    expect(original, `Given de ${nome}`).to.exist;
    conferirAluno(alunos, original);
  }));
}
function conferirInseridos(nomes) {

  expect(respostaImportacao).to.exist;

  // Exibir a resposta completa do backend
  console.log('Resposta da importação:', respostaImportacao);

  expect(
    respostaImportacao.statusCode,
    `Resposta do backend: ${JSON.stringify(respostaImportacao.body)}`
  ).to.be.within(200, 299);

  return listar().then(alunos => {
    nomes.forEach(nome => {

      const original = esperados.find(
        a => a.name === nome
      );

      expect(
        original,
        `Dados enviados de ${nome}`
      ).to.exist;

      expect(
        alunosAntes.some(
          a => a.cpf === limparCPF(original.cpf)
        ),
        'CPF não existia antes'
      ).to.be.false;

      conferirAluno(alunos, original);
    });

    expect(normalizar(alunos)).to.deep.equal(
      normalizar([...alunosAntes, ...esperados])
    );
  });
}

// SERVIÇO: multipart real, sem passar pelas validações da interface.
// Usa fetch do navegador para que o boundary e os bytes sejam gerados corretamente.
function enviarAPI(arquivo, alunos = []) {
  esperados = alunos;
  return guardarEstado().then(() => abrirPagina()).then(() => cy.window()).then(win => {
    const dados = new win.FormData();
    const blob = new win.Blob([new Uint8Array(arquivo.contents)], { type: arquivo.mimeType });
    dados.append(FIELD, blob, arquivo.fileName);
    return win.fetch(IMPORT, { method: 'POST', body: dados }).then(async response => ({
      statusCode: response.status,
      body: await response.json()
    }));
  }).then(resposta => { respostaImportacao = resposta; });
}
function enviarCSV(conteudo, alunos = [], nome = 'alunos.csv') {
  return enviarAPI(arquivoCSV(conteudo, nome), alunos);
}


function fixtureArquivo(formato) {
  const tipos = {
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PDF: 'application/pdf',
    TXT: 'text/plain'
  };

  const fileName = `alunos.${formato.toLowerCase()}`;

  return cy.fixture(`importacao/${fileName}`, null)
    .then((contents) => ({
      contents,
      fileName,
      mimeType: tipos[formato]
    }));
}

// GIVEN compartilhados: aceita aspas tipográficas ou retas no e-mail.
Given(/^o sistema possui os alunos “([^”]+)” com e-mail “([^”]+)” e CPF “([^”]+)” e “([^”]+)” com e-mail “([^”]+)” e CPF “([^”]+)”$/, (n1, e1, c1, n2, e2, c2) =>
  prepararAlunos([aluno(n1, e1, c1), aluno(n2, e2, c2)]));
Given(/^o sistema possui (?:o aluno )?“([^”]+)” com e-mail [“"]([^”"]+)[”"] e CPF “([^”]+)”$/, (n, e, c) =>
  prepararAlunos([aluno(n, e, c)]));

// TESTE 1 - Importar planilha vazia
When('envio uma planilha sem registros de alunos', () => enviarCSV('name,email,cpf\n', [], 'vazia.csv'));
Then('nenhum novo aluno é inserido no sistema', conferirInalterado);

// TESTE 2 - Coluna incorreta
When(/^envio uma planilha contendo os nomes “([^”]+)” e “([^”]+)”, suas matrículas “([^”]+)” e “([^”]+)” e CPFs “([^”]+)” e “([^”]+)”$/, (n1, n2, m1, m2, c1, c2) =>
  enviarCSV(csv(['name', 'matricula', 'cpf'], [[n1, m1, c1], [n2, m2, c2]])));

// TESTE 3 - Coluna faltante
When(/^envio uma planilha contendo os nomes “([^”]+)” e “([^”]+)” e seus e-mails “([^”]+)” e “([^”]+)”$/, (n1, n2, e1, e2) =>
  enviarCSV(csv(['name', 'email'], [[n1, e1], [n2, e2]])));

// TESTE 4 - Coluna extra
When(/^envio uma planilha contendo os nomes “([^”]+)” e “([^”]+)”, seus e-mails “([^”]+)” e “([^”]+)”, CPFs “([^”]+)” e “([^”]+)” e telefones “([^”]+)” e “([^”]+)”$/, (n1, n2, e1, e2, c1, c2, t1, t2) =>
  enviarCSV(csv(['name', 'email', 'cpf', 'telefone'], [[n1, e1, c1, t1], [n2, e2, c2, t2]])));

// TESTE 5 - Dados faltando
When(/^envio uma planilha contendo os nomes “([^”]+)” e “([^”]+)”, seus e-mails “([^”]+)” e “([^”]+)” e seus CPFs vazios$/, (n1, n2, e1, e2) =>
  enviarCSV(csvAlunos([aluno(n1, e1, ''), aluno(n2, e2, '')])));

// TESTES 6, 7, 8 - E-mail inválido, CPF inválido e aluno duplicado
When(/^envio uma planilha contendo o nome “([^”]+)”, seu e-mail “([^”]+)” e seu CPF “([^”]+)”$/, (n, e, c) =>
  enviarCSV(csvAlunos([aluno(n, e, c)])));
Then(/^o aluno “([^”]+)” não é duplicado no sistema$/, nome => {
  return conferirInalterado().then(() => conferirPreservados([nome]));
});
Then(/^o aluno permanece cadastrado no sistema com o e-mail “([^”]+)” e CPF “([^”]+)”\.?$/, (email, cpf) => {
  const original = cadastrados.find(a => limparCPF(a.cpf) === limparCPF(cpf));
  expect(original).to.exist;
  expect(original.email).to.eq(email);
  return conferirPreservados([original.name]);
});
Then(/^é retornada uma mensagem "([^"]+)"\.?$/, codigo => {
  expect(respostaImportacao).to.exist;
  expect(respostaImportacao.body.error ?? respostaImportacao.body.message).to.eq(codigo);
});

// TESTES 9 e 10 - Formatos compatíveis e incompatíveis (Scenario Outline)
When(/^envio um arquivo (CSV|XLSX|PDF|TXT) contendo os nomes “([^”]+)” e “([^”]+)”, seus e-mails “([^”]+)” e “([^”]+)” e (?:seus )?CPFs “([^”]+)” e “([^”]+)”$/, (formato, n1, n2, e1, e2, c1, c2) => {
  const alunos = [aluno(n1, e1, c1), aluno(n2, e2, c2)];
  if (formato === 'CSV') return enviarCSV(csvAlunos(alunos), alunos);
  // Os fixtures binários contêm exatamente os dados do Scenario Outline original.
  expect(alunos).to.deep.equal(dadosPadrao);
  return fixtureArquivo(formato).then(arquivo => enviarAPI(arquivo, alunos));
});

// THEN compartilhados de serviço e preservação dos registros
Then(/^os alunos “([^”]+)” e “([^”]+)” são inseridos no sistema com os respectivos dados\.?$/, (n1, n2) => conferirInseridos([n1, n2]));
Then(/^os alunos “([^”]+)” e “([^”]+)” não são inseridos no sistema\.?$/, (n1, n2) =>
  conferirInalterado().then(() => listar()).then(alunos => {
    expect(alunos.some(a => a.name === n1 || a.name === n2)).to.be.false;
  }));
Then(/^o aluno “([^”]+)” não é inserido no sistema\.?$/, nome =>
  conferirInalterado().then(() => listar()).then(alunos => {
    expect(alunos.some(a => a.name === nome)).to.be.false;
  }));
Then(/^os alunos “([^”]+)” e “([^”]+)” permanecem cadastrados no sistema\.?$/, (n1, n2) => conferirPreservados([n1, n2]));
Then(
  /^o aluno “([^”]+)” permanece cadastrado no sistema(?: com o e-mail [“"]([^”"]+)[”"] e CPF “([^”]+)”)?\.?$/,
  (nome, email, cpf) => {

    const original = cadastrados.find(
      a => a.name === nome
    );

    expect(original).to.exist;

    if (email !== undefined && email !== null) {
      expect(original.email).to.eq(email);
    }

    if (cpf !== undefined && cpf !== null) {
      expect(limparCPF(original.cpf))
        .to.eq(limparCPF(cpf));
    }

    return conferirPreservados([nome]);
  }
);
Then(/^é retornada uma mensagem de erro "([^"]+)"\.?$/, codigo => {
  expect(respostaImportacao).to.exist;
  expect(respostaImportacao.statusCode).to.eq(400);
  expect(respostaImportacao.body.error).to.eq(codigo);
});

// GUI - funções auxiliares
function monitorarGUI() {
  if (!monitorando) {
    monitorando = true;
    cy.intercept('POST', '**/api/students/import', req => {
      requisicoes += 1;
    }).as('importacaoGUI');
  }
}
function selecionarGUI(arquivo) {
  return guardarEstado().then(() => {
    monitorarGUI();
    arquivoSelecionado = arquivo.fileName;
    return inputArquivo().selectFile(arquivo, { force: true });
  });
}
function alunosGUI(n1, n2) {
  expect([n1, n2]).to.deep.equal(dadosPadrao.map(a => a.name));
  return dadosPadrao;
}
function confirmarArquivo() {
  formulario().contains('Arquivo pronto:').should('contain.text', arquivoSelecionado);
}
function conferirInterface() {
  return formulario().contains('Sheet Import').should('be.visible');
}
// TESTE 11 - Acessar funcionalidade de importação
Given('estou na interface de importação de alunos', () => {
  abrirPagina();
  conferirInterface();
});

// TESTE 12 - Selecionar uma planilha válida
When(/^seleciono um arquivo CSV contendo os alunos “([^”]+)” e “([^”]+)”$/, (n1, n2) =>
  selecionarGUI(arquivoCSV(csvAlunos(alunosGUI(n1, n2)))));
Then('o nome do arquivo selecionado é exibido na interface', confirmarArquivo);
Then('a opção de importar os alunos fica disponível', () => {
  botaoImportar().should('be.visible').and('be.enabled');
  cy.then(() => expect(requisicoes, 'selecionar não importa').to.eq(0));
  conferirInalterado();
});

When('aciono a opção de importar os alunos', () => {
  return guardarEstado().then(() => {
    monitorarGUI();
    // Sem force: se o botão estiver desabilitado, o cenário que exige mensagem deve falhar.
    return botaoImportar().should('be.enabled').click();
  });
});
Then(/^é exibida uma mensagem "([^"]+)"$/, mensagem => {
  cy.contains(mensagem).should('be.visible');
  cy.then(() => expect(requisicoes, 'nenhuma requisição sem arquivo').to.eq(0));
  return conferirInalterado();
});
Then(/^os alunos “([^”]+)” e “([^”]+)” permanecem exibidos na lista de alunos\.?$/, (n1, n2) => {
  cy.contains(n1).should('be.visible');
  cy.contains(n2).should('be.visible');
});

// TESTE 13 - Importar sem selecionar planilha
Given('nenhuma planilha foi selecionada', () => inputArquivo().should('have.value', ''));
Then('a importação não é realizada', conferirInalterado);

// TESTE 14 - Arquivo incompatível na GUI
When('seleciono um arquivo PDF contendo dados de alunos', () =>
  fixtureArquivo('PDF').then(selecionarGUI));
Then(/^é exibida uma mensagem de erro "([^"]+)"$/, mensagem => {
  cy.contains(mensagem).should('be.visible');
  cy.then(() => expect(requisicoes, 'arquivo incompatível não enviado').to.eq(0));
  conferirInalterado();
});

// TESTE 15 - Erro de validação da planilha na GUI
When(/^seleciono uma planilha contendo os alunos “([^”]+)” e “([^”]+)” sem a coluna CPF$/, (n1, n2) => {
  const alunos = alunosGUI(n1, n2);
  return selecionarGUI(arquivoCSV(csv(['name', 'email'], alunos.map(a => [a.name, a.email])), 'sem-cpf.csv'));
});
Then(/^é exibida a mensagem de erro "([^"]+)"$/, mensagem => {
  cy.contains(mensagem).should('be.visible');
  return conferirInalterado();
});
Then(/^os alunos “([^”]+)” e “([^”]+)” não são exibidos na lista de alunos\.?$/, (n1, n2) => {
  cy.contains(n1).should('not.exist');
  cy.contains(n2).should('not.exist');
});
