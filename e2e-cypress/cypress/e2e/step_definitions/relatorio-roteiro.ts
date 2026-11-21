import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";

const SERVER = "http://localhost:3005";

// Aluno usado para cadastrar os resultados das turmas
const ALUNO = { name: "Aluno Teste Cypress", cpf: "999.888.777-55", email: "aluno.cypress@teste.com" };

// Turmas criadas no cenário, para apagar no final
let turmasCriadas: string[] = [];

// "ESS - 2026.2" -> { topic: "ESS", year: 2026, semester: 2 }
const dadosDaTurma = (nome: string) => {
  const [, topic, year, semester] = nome.match(/^(.*) - (\d{4})\.(\d)$/)!;
  return { topic, year: Number(year), semester: Number(semester) };
};

const idDaTurma = (nome: string) => {
  const { topic, year, semester } = dadosDaTurma(nome);
  return `${topic}-${year}-${semester}`;
};

// "1 dia" -> 1, "7,5" -> 7.5
const numero = (valor: string) => parseFloat(valor.replace(",", "."));

// Cria a turma do zero (apaga antes, caso tenha sobrado de outra execução) e matricula o aluno
const criarTurma = (nome: string) => {
  cy.request({ method: "DELETE", url: `${SERVER}/api/classes/${idDaTurma(nome)}`, failOnStatusCode: false });
  cy.request("POST", `${SERVER}/api/classes`, dadosDaTurma(nome));
  cy.request({ method: "POST", url: `${SERVER}/api/students`, body: ALUNO, failOnStatusCode: false });
  cy.request("POST", `${SERVER}/api/classes/${idDaTurma(nome)}/enroll`, { studentCPF: ALUNO.cpf });
  turmasCriadas.push(nome);
};

// Preenche o formulário, clica em "Gerar relatório" e espera a resposta do servidor
const pedirRelatorio = (roteiro: string, turmaAtual: string, passadas: string[]) => {
  cy.intercept("GET", "**/api/relatorio-roteiro*").as("relatorio");
  cy.get("#turma-atual").should("contain", turmaAtual).select(turmaAtual);
  cy.get("#roteiro").clear().type(roteiro);
  passadas.forEach((passada) => {
    cy.contains(".turma-passada", passada).find("input").check();
  });
  cy.get('[data-testid="gerar-relatorio"]').click();
  cy.wait("@relatorio");
};

After(() => {
  turmasCriadas.forEach((nome) => {
    cy.request({ method: "DELETE", url: `${SERVER}/api/classes/${idDaTurma(nome)}`, failOnStatusCode: false });
  });
  turmasCriadas = [];
  cy.request({ method: "DELETE", url: `${SERVER}/api/students/${ALUNO.cpf}`, failOnStatusCode: false });
});

// ---------- Given ----------

Given(
  "a turma {string} tem, no {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}",
  (turma: string, roteiro: string, acertos: string, erros: string, tempo: string) => {
    criarTurma(turma);
    cy.request("POST", `${SERVER}/api/classes/${idDaTurma(turma)}/roteiros/${encodeURIComponent(roteiro)}/respostas`, {
      studentCPF: ALUNO.cpf,
      acertos: numero(acertos),
      erros: numero(erros),
      tempoEntrega: numero(tempo),
    });
  }
);

Given("a turma {string} não tem resultados no {string}", (turma: string, _roteiro: string) => {
  criarTurma(turma); // a turma existe, mas sem resultados
});

Given("nenhuma turma passada tem resultados no {string}", (_roteiro: string) => {
  // Nada a cadastrar: só existem as turmas criadas no próprio cenário
});

Given("eu estou na página {string}", (pagina: string) => {
  cy.visit("/");
  cy.get('[data-testid="relatorio-roteiro-tab"]').click();
  cy.get('[data-testid="titulo-pagina"]').should("have.text", pagina);
});

// ---------- When ----------

When(
  "eu peço o relatório do {string} da turma {string} em comparação com as turmas {string} e {string}",
  (roteiro: string, atual: string, passada1: string, passada2: string) => {
    pedirRelatorio(roteiro, atual, [passada1, passada2]);
  }
);

When("eu peço o relatório do {string} da turma {string}", (roteiro: string, atual: string) => {
  pedirRelatorio(roteiro, atual, []);
});

// ---------- Then ----------

Then("continuo na página {string}", (pagina: string) => {
  cy.get('[data-testid="titulo-pagina"]').should("have.text", pagina);
});

Then(
  "vejo na tabela, na linha {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}",
  (linha: string, acertos: string, erros: string, tempo: string) => {
    cy.contains('[data-testid="linha-relatorio"]', linha).within(() => {
      cy.get('[data-testid="linha-acertos"]').should("have.text", acertos);
      cy.get('[data-testid="linha-erros"]').should("have.text", erros);
      cy.get('[data-testid="linha-tempo"]').should("have.text", tempo);
    });
  }
);

Then("não vejo na tabela linhas das turmas {string} e {string}", (turma1: string, turma2: string) => {
  cy.get('[data-testid="tabela-relatorio"]').should("not.contain", turma1).and("not.contain", turma2);
});

Then("não vejo na tabela a linha {string}", (linha: string) => {
  cy.get('[data-testid="tabela-relatorio"]').should("not.contain", linha);
});

Then("não vejo na tabela nenhuma linha", () => {
  cy.get('[data-testid="linha-relatorio"]').should("not.exist");
});

Then("eu vejo uma mensagem de erro {string}", (mensagem: string) => {
  cy.get('[data-testid="mensagem-erro"]').should("be.visible").and("have.text", mensagem);
});
