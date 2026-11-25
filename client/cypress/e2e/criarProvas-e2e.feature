# Suíte de GUI derivada dos cenários já implementados de criarProvas.feature.
# As respostas da API são simuladas no Cypress; isto não testa a persistência real.
Feature: Criação e consulta de provas pela interface

  Scenario: Professor inicia a criação sem questões cadastradas
    Given não existem questões disponíveis para criar provas
    When acesso à tela de criação de provas
    Then vejo a mensagem de ausência de questões cadastradas
    And não existem botões de seleção de questões

  Scenario: Professor filtra questões por assunto
    Given existem questões disponíveis para criar provas
    When acesso à tela de criação de provas
    And filtro as questões pelo assunto "requisitos"
    Then vejo 2 questões disponíveis
    When filtro as questões pelo assunto "assunto inexistente"
    Then vejo a mensagem de ausência de questões nesse assunto

  Scenario: Professor tenta selecionar uma questão repetida
    Given existem questões disponíveis para criar provas
    When acesso à tela de criação de provas
    And seleciono a questão de código "q-req-1"
    And seleciono a questão de código "q-req-1"
    Then vejo o aviso de que a questão já estava selecionada
    And a seleção possui 1 questão

  Scenario: Professor cria e consulta uma prova de assuntos diferentes
    Given existem questões disponíveis para criar provas
    And a API simulada permite cadastrar a prova
    When acesso à tela de criação de provas
    And seleciono a questão de código "q-req-1"
    And seleciono a questão de código "q-config-1"
    Then a seleção possui 2 questões
    And a seleção aborda "requisitos" e "gerência de configuração"
    When informo o nome da prova "Prova E2E"
    And salvo a prova
    Then a API recebe as questões "q-req-1" e "q-config-1"
    And vejo a confirmação da prova criada
    When abro a seção de provas criadas
    Then vejo a prova "Prova E2E"
    When visualizo a prova "Prova E2E"
    Then vejo as questões e assuntos da prova
    And consigo fechar os detalhes da prova

  Scenario: Professor tenta criar prova com nome já existente
    Given existem questões disponíveis para criar provas
    And a API simulada rejeita o nome repetido
    When acesso à tela de criação de provas
    And seleciono a questão de código "q-req-1"
    And informo o nome da prova "Prova existente"
    And salvo a prova
    Then vejo o aviso de nome de prova repetido
    And a seleção possui 1 questão
    And o nome da prova continua preenchido como "Prova existente"
