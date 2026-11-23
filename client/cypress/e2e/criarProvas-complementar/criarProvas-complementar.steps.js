const { Given, When, Then } = require('@badeball/cypress-cucumber-preprocessor');

// Mesmo catálogo de seis questões utilizado nos cinco cenários já aprovados.
const makeQuestion = (code, subject, statement) => ({
  code,
  subject,
  statement,
  alternatives: [
    { text: 'Alternativa A', isTrue: true },
    { text: 'Alternativa B', isTrue: false }
  ]
});

const requirements = [
  makeQuestion('q-req-1', 'requisitos', 'Quais abaixo são funcionalidades não operacionais?'),
  makeQuestion('q-req-2', 'requisitos', 'Quais abaixo não são bons cenários?')
];

const configuration = [
  makeQuestion('q-config-1', 'gerência de configuração', 'Quais ações entre as seguintes podem dar conflito textual?'),
  makeQuestion('q-config-2', 'gerência de configuração', 'Qual comando do Git une branches?'),
  makeQuestion('q-config-3', 'gerência de configuração', 'Qual comando mostra o histórico de commits?'),
  makeQuestion('q-config-4', 'gerência de configuração', 'Qual comando cria uma branch?')
];

// Repetimos a definição do catálogo (mas não o texto dos steps) para que
// esta suíte seja independente do arquivo de testes anterior.
Given(
  /^o catálogo complementar possui (\d+) quest(?:ão|ões) de requisitos e (\d+) de configuração$/,
  (requirementsCount, configurationCount) => {
    const nRequirements = Number(requirementsCount);
    const nConfiguration = Number(configurationCount);
    expect(nRequirements).to.be.within(0, requirements.length);
    expect(nConfiguration).to.be.within(0, configuration.length);
    const questions = [
      ...requirements.slice(0, nRequirements),
      ...configuration.slice(0, nConfiguration)
    ];
    cy.intercept('GET', '**/api/questions', {
      statusCode: 200,
      body: questions
    }).as('getQuestionsComplementar');
  }
);

Given('a API complementar monitora tentativas de salvar provas', () => {
  cy.intercept('POST', '**/api/exams', req => {
    req.reply({
      statusCode: 201,
      body: { code: 'exam-complementar', ...req.body }
    });
  }).as('postExamComplementar');
});

When('abro a criação de provas para os testes complementares', () => {
  cy.visit('/');
  cy.get('[data-testid="exams-tab"]').click();
  cy.get('.exam-navigation').contains('button', 'Criar prova').click();
  cy.wait('@getQuestionsComplementar');
  cy.get('.create-exam').should('be.visible');
});

When('pesquiso o assunto {string} no filtro de provas', subject => {
  cy.get('[data-testid="exam-subject-filter"]').clear().type(subject);
});

When('seleciono no teste complementar a questão {string}', code => {
  cy.get(`[data-testid="select-question-${code}"]`).click();
});

When('tento salvar uma prova sem selecionar questões', () => {
  cy.get('[data-testid="save-exam"]').click();
});

Then(/^a lista disponível mostra (\d+) quest(?:ão|ões)$/, count => {
  const expectedCount = Number(count);
  cy.get('.create-exam .exam-section')
    .first()
    .find('[data-testid^="select-question-"]')
    .should('have.length', expectedCount);
});

Then('a questão {string} está disponível', statement => {
  cy.get('.create-exam .exam-section').first()
    .contains(statement)
    .should('be.visible');
});

Then('a mensagem de assunto sem resultado cita {string}', subject => {
  cy.get('.create-exam')
    .contains('Não há questões do assunto')
    .should('be.visible')
    .and('contain.text', subject);
});

Then('vejo os avisos de catálogo vazio e ausência do assunto {string}', subject => {
  cy.get('.create-exam')
    .contains('Não há questões cadastradas. Não é possível criar uma prova.')
    .should('be.visible');
  cy.get('.create-exam')
    .contains('Não há questões do assunto')
    .should('be.visible')
    .and('contain.text', subject);
});

Then(/^a seleção complementar tem (\d+) (?:item|itens)$/, count => {
  const expectedCount = Number(count);
  cy.contains('h3', `Questões selecionadas (${expectedCount})`)
    .should('be.visible');
  cy.get('.create-exam ol.exam-question-list')
    .find('li')
    .should('have.length', expectedCount);
});

Then('a lista selecionada contém o enunciado {string}', statement => {
  cy.get('.create-exam ol.exam-question-list')
    .contains('li', statement)
    .should('be.visible');
});

Then('a seleção exibe somente o assunto {string}', subject => {
  cy.contains('.create-exam .exam-section p', 'Assuntos abordados:')
    .should('contain.text', subject)
    .and('not.contain.text', subject === 'requisitos'
      ? 'gerência de configuração'
      : 'requisitos');
});

Then('a seleção exibe os assuntos {string} e {string}', (subject1, subject2) => {
  cy.contains('.create-exam .exam-section p', 'Assuntos abordados:')
    .should('contain.text', subject1)
    .and('contain.text', subject2);
});

Then('recebo aviso de tentativa de seleção duplicada', () => {
  cy.get('.create-exam [role="alert"]')
    .should('be.visible')
    .and('contain.text', 'já está selecionada');
});

Then('vejo mensagem impedindo prova sem questões', () => {
  cy.get('.create-exam [role="alert"]')
    .should('be.visible')
    .and('contain.text', 'Não é possível criar uma prova sem questões');
});

Then('não houve tentativa de POST para a API de provas', () => {
  cy.get('@postExamComplementar.all').should('have.length', 0);
});
