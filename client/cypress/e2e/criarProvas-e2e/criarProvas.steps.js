const { Given, When, Then } = require('@badeball/cypress-cucumber-preprocessor');

// Dados de teste: duas questões de requisitos e quatro de configuração.
// Os códigos são fixos somente para facilitar as verificações dos testes.
const makeQuestion = (code, subject, statement) => ({
  code,
  subject,
  statement,
  alternatives: [
    { text: 'Alternativa A', isTrue: true },
    { text: 'Alternativa B', isTrue: false }
  ]
});

const questions = [
  makeQuestion('q-req-1', 'requisitos', 'Quais abaixo são funcionalidades não operacionais?'),
  makeQuestion('q-req-2', 'requisitos', 'Quais abaixo não são bons cenários?'),
  makeQuestion('q-config-1', 'gerência de configuração', 'Quais ações entre as seguintes podem dar conflito textual?'),
  makeQuestion('q-config-2', 'gerência de configuração', 'Qual comando do Git une branches?'),
  makeQuestion('q-config-3', 'gerência de configuração', 'Qual comando mostra o histórico de commits?'),
  makeQuestion('q-config-4', 'gerência de configuração', 'Qual comando cria uma branch?')
];

const savedExam = {
  code: 'exam-e2e-1',
  name: 'Prova E2E',
  questionCodes: ['q-req-1', 'q-config-1']
};

Given('existem questões disponíveis para criar provas', () => {
  cy.intercept('GET', '**/api/questions', {
    statusCode: 200,
    body: questions
  }).as('getQuestions');
});

Given('não existem questões disponíveis para criar provas', () => {
  cy.intercept('GET', '**/api/questions', {
    statusCode: 200,
    body: []
  }).as('getQuestions');
});

Given('a API simulada permite cadastrar a prova', () => {
  cy.intercept('POST', '**/api/exams', req => {
    req.reply({
      statusCode: 201,
      body: { code: savedExam.code, ...req.body }
    });
  }).as('postExam');

  cy.intercept('GET', '**/api/exams', {
    statusCode: 200,
    body: [savedExam]
  }).as('getExams');

  cy.intercept('GET', '**/api/exams/exam-e2e-1', {
    statusCode: 200,
    body: {
      ...savedExam,
      questions: [questions[0], questions[2]],
      subjects: ['requisitos', 'gerência de configuração']
    }
  }).as('getExamDetail');
});

Given('a API simulada rejeita o nome repetido', () => {
  cy.intercept('POST', '**/api/exams', {
    statusCode: 400,
    body: { error: 'Já existe uma prova com esse nome' }
  }).as('postExam');
});

When('acesso à tela de criação de provas', () => {
  cy.visit('/');
  cy.get('[data-testid="exams-tab"]').click();
  cy.get('.exam-navigation').contains('button', 'Criar prova').click();
  cy.wait('@getQuestions');
  cy.get('.create-exam').should('be.visible');
});

When('filtro as questões pelo assunto {string}', subject => {
  cy.get('[data-testid="exam-subject-filter"]').clear().type(subject);
});

When('seleciono a questão de código {string}', code => {
  cy.get(`[data-testid="select-question-${code}"]`).click();
});

When('informo o nome da prova {string}', name => {
  cy.get('[data-testid="exam-name"]').clear().type(name);
});

When('salvo a prova', () => {
  cy.get('[data-testid="save-exam"]').click();
});

When('abro a seção de provas criadas', () => {
  cy.get('.exam-navigation').contains('button', 'Provas criadas').click();
  cy.wait('@getExams');
});

When('visualizo a prova {string}', name => {
  cy.contains('.exl-exam-item', name)
    .contains('button', 'Visualizar prova')
    .click();

  cy.wait('@getExamDetail');

  cy.get('[data-testid="exam-details-modal"]')
    .should('be.visible');
});

Then('vejo a mensagem de ausência de questões cadastradas', () => {
  cy.contains('Não há questões cadastradas. Não é possível criar uma prova.')
    .should('be.visible');
});

Then('não existem botões de seleção de questões', () => {
  cy.get('.create-exam')
    .find('[data-testid^="select-question-"]')
    .should('have.length', 0);
});

Then('vejo {int} questões disponíveis', number => {
  cy.get('.create-exam .exam-section')
    .first()
    .find('[data-testid^="select-question-"]')
    .should('have.length', number);
});

Then('vejo a mensagem de ausência de questões nesse assunto', () => {
  cy.contains('Não há questões do assunto').should('be.visible');
});

Then('vejo o aviso de que a questão já estava selecionada', () => {
  cy.get('[role="alert"]').should('contain.text', 'já está selecionada');
});

Then('a seleção possui {int} questão', number => {
  cy.contains('h3', `Questões selecionadas (${number})`).should('be.visible');
});

Then('a seleção possui {int} questões', number => {
  cy.contains('h3', `Questões selecionadas (${number})`).should('be.visible');
});

Then('a seleção aborda {string} e {string}', (subject1, subject2) => {
  cy.contains('.exam-section p', 'Assuntos abordados:')
    .should('contain.text', subject1)
    .and('contain.text', subject2);
});

Then('a API recebe as questões {string} e {string}', (code1, code2) => {
  cy.wait('@postExam').then(({ request, response }) => {
    expect(request.body).to.deep.equal({
      name: 'Prova E2E',
      questionCodes: [code1, code2]
    });
    expect(response.statusCode).to.eq(201);
  });
});

Then('vejo a confirmação da prova criada', () => {
  cy.get('[role="alert"]').should('contain.text', 'foi criada com sucesso');
});

Then('vejo a prova {string}', name => {
  cy.get('.exam-history').contains(name).should('be.visible');
});

Then('vejo as questões e assuntos da prova', () => {
  cy.get('[data-testid="exam-details-modal"]')
    .should('be.visible')
    .within(() => {

      // Verifica o nome da prova
      cy.contains('h3', 'Prova E2E')
        .should('be.visible');

      // Verifica os assuntos
      cy.get('.exl-subjects-line')
        .should('contain.text', 'requisitos')
        .and('contain.text', 'gerência de configuração');

      // Verifica a quantidade de questões
      cy.get('.exl-question-card')
        .should('have.length', 2);

      // Verifica os enunciados
      cy.contains(
        '.exl-question-card',
        'Quais abaixo são funcionalidades não operacionais?'
      ).should('be.visible');

      cy.contains(
        '.exl-question-card',
        'Quais ações entre as seguintes podem dar conflito textual?'
      ).should('be.visible');

      // Verifica as alternativas verdadeiras
      cy.get('.exl-alternative-true')
        .should('have.length', 2)
        .each($alternative => {
          expect($alternative.text()).to.contain('Verdadeira');
        });

      // Verifica as alternativas falsas
      cy.get('.exl-alternative-false')
        .should('have.length', 2)
        .each($alternative => {
          expect($alternative.text()).to.contain('Falsa');
        });
    });
});

Then('vejo o aviso de nome de prova repetido', () => {
  cy.wait('@postExam').its('response.statusCode').should('eq', 400);
  cy.get('[role="alert"]').should('contain.text', 'Já existe uma prova com esse nome');
});

Then('o nome da prova continua preenchido como {string}', name => {
  cy.get('[data-testid="exam-name"]').should('have.value', name);
});

Then('consigo fechar os detalhes da prova', () => {
  cy.get('[data-testid="exam-details-modal"]')
    .contains('button', 'Fechar')
    .click();

  cy.get('[data-testid="exam-details-modal"]')
    .should('not.exist');
});