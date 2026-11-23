const { Given, When, Then } = require('@badeball/cypress-cucumber-preprocessor');

const original = {
  code: 'q-original',
  subject: 'gerência de configuração',
  statement: 'Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?',
  alternatives: [
    { text: 'merge', isTrue: true },
    { text: 'stash', isTrue: true },
    { text: 'pull', isTrue: true },
    { text: 'log', isTrue: false }
  ]
};

let newSubject = '';
let newStatement = '';
let enteredAlternatives = [];
let initialCount = 0;
let postCalls = 0;

// Lê as alternativas realmente exibidas no HTML, sem depender do
// tipo de travessão usado entre o texto e "Verdadeira"/"Falsa".
function alternativesInCard(card) {
  return Array.from(card.querySelectorAll('li')).map(li =>
    (li.textContent || '').replace(/\s+/g, ' ').trim()
  );
}

function matchesAlternatives(card, expected) {
  const items = alternativesInCard(card);
  return items.length === expected.length && expected.every(alternative => {
    const label = alternative.isTrue ? 'Verdadeira' : 'Falsa';
    return items.some(item => item.includes(alternative.text) && item.includes(label));
  });
}

function preparePostStub() {
  cy.intercept('POST', '**/api/questions', req => {
    postCalls += 1;

    const body = req.body || {};
    const alternatives = body.alternatives;

    let error = null;
    if (typeof body.subject !== 'string' || !body.subject.trim()) {
      error = 'É preciso definir o assunto da questão';
    } else if (typeof body.statement !== 'string' || !body.statement.trim()) {
      error = 'É preciso definir o enunciado da questão';
    } else if (!Array.isArray(alternatives) || alternatives.length === 0) {
      error = 'É preciso adicionar alternativas para a questão';
    } else if (alternatives.some(a => !a || typeof a.text !== 'string' || !a.text.trim())) {
      error = 'Alternativa inválida';
    }

    if (error) {
      req.reply({ statusCode: 400, body: { error } });
    } else {
      req.reply({
        statusCode: 201,
        body: { code: 'q-nova', ...body }
      });
    }
  }).as('postQuestionComplement');
}

Given('já existe uma questão de gerência de configuração no banco de teste complementar', () => {
  newSubject = '';
  newStatement = '';
  enteredAlternatives = [];
  postCalls = 0;
  initialCount = 1;

  cy.intercept('GET', '**/api/questions', {
    statusCode: 200,
    body: [original]
  }).as('getQuestionsComplement');

  preparePostStub();
});

Given('não existem questões no banco de teste complementar para validações', () => {
  newSubject = '';
  newStatement = '';
  enteredAlternatives = [];
  postCalls = 0;
  initialCount = 0;

  cy.intercept('GET', '**/api/questions', {
    statusCode: 200,
    body: []
  }).as('getQuestionsComplement');

  preparePostStub();
});

When('abro a criação de questões para o teste complementar', () => {
  cy.visit('/');
  cy.get('[data-testid="exams-tab"]').click();
  cy.wait('@getQuestionsComplement');
  cy.get('#question-subject').should('be.visible');
  cy.get('#question-statement').should('be.visible');
  cy.get('body').find('.question-card').should('have.length', initialCount);
});

When(/^informo o assunto "(.+)" da nova questão$/, subject => {
  newSubject = subject;
  cy.get('#question-subject').clear().type(subject);
});

When(/^informo o enunciado "(.+)" da nova questão$/, statement => {
  newStatement = statement;
  cy.get('#question-statement').clear().type(statement);
});

When(/^adiciono a alternativa complementar "(.+)" como "(verdadeira|falsa)"$/, (text, classification) => {
  const isTrue = classification === 'verdadeira';
  enteredAlternatives.push({ text, isTrue });

  cy.get('.question-alternative').last().find('input').invoke('val').then(value => {
    if (String(value || '').trim()) {
      cy.contains('button', 'Adicionar alternativa').click();
    }
  });

  cy.get('.question-alternative').last().within(() => {
    cy.get('input').type(text);
    cy.get('select').select(isTrue ? 'true' : 'false');
  });
});

When('tento salvar a nova questão', () => {
  cy.contains('button', 'Salvar questão').click();
});

Then('a API simulada aceita a nova questão com as alternativas informadas', () => {
  cy.wait('@postQuestionComplement').then(({ request, response }) => {
    expect(response.statusCode).to.eq(201);
    expect(request.body.subject).to.eq(newSubject);
    expect(request.body.statement).to.eq(newStatement);
    expect(request.body.alternatives).to.deep.eq(enteredAlternatives);
  });
  cy.get('.question-card').should('have.length', 2);
});

Then('a lista contém duas versões da questão com alternativas diferentes', () => {
  cy.get('.question-card').should($cards => {
    const cards = Array.from($cards);
    expect(cards).to.have.length(2);
    expect(cards.every(card => (card.textContent || '').includes(original.statement))).to.eq(true);
    expect(cards.some(card => matchesAlternatives(card, original.alternatives)),
      'A questão original com merge/stash/pull/log permanece').to.eq(true);
    expect(cards.some(card => matchesAlternatives(card, enteredAlternatives)),
      'A nova versão com stash/pull/log aparece').to.eq(true);
    expect(cards.some(card => alternativesInCard(card).length === 3 &&
      !alternativesInCard(card).some(text => text.includes('merge'))),
      'A nova versão não contém merge').to.eq(true);
  });
});

Then('a lista contém a questão nova e preserva a questão anterior', () => {
  cy.get('.question-card').should($cards => {
    const cards = Array.from($cards);
    expect(cards).to.have.length(2);
    expect(cards.some(card => (card.textContent || '').includes(original.statement) &&
      matchesAlternatives(card, original.alternatives)),
      'Questão anterior inalterada').to.eq(true);
    expect(cards.some(card => (card.textContent || '').includes(newStatement) &&
      (card.textContent || '').includes(newSubject) &&
      matchesAlternatives(card, enteredAlternatives)),
      'Nova questão com log/init/config').to.eq(true);
  });
});

Then(/^a interface informa o erro de questão "(.+)"$/, expected => {
  // Valida a mensagem pedida pelo Gherkin, seja emitida pelo frontend
  // ou após a resposta HTTP 400 da API simulada.
  cy.get('[role="alert"]')
    .should('be.visible')
    .and('contain.text', expected);
});

Then('nenhuma questão é incluída no banco de teste complementar', () => {
  // Este seletor funciona mesmo quando .questions-list não foi renderizada.
  cy.get('body').find('.question-card').should('have.length', initialCount);
  if (initialCount === 0) {
    // Pode não existir POST, caso o formulário valide localmente.
    // Se houve um POST, nosso stub o rejeitou com status 400.
    cy.then(() => {
      expect(postCalls, 'Quantidade de requisições POST').to.be.at.most(1);
    });
  }
});
