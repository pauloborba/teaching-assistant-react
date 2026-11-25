# Complementa, sem substituir, os cinco testes de criarProvas-e2e.feature.
# Todos os cenários executáveis usam cy.intercept(): validam GUI, não o backend real.
Feature: Cobertura complementar da criação de provas

  # Cenário original 1
  Scenario: Professor inicia seleção e encontra questões disponíveis
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    Then a lista disponível mostra 6 questões

  # Cenário original 4
  Scenario: Professor procura um assunto sem resultados em um catálogo não vazio
    Given o catálogo complementar possui 0 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    And pesquiso o assunto "requisitos" no filtro de provas
    Then a lista disponível mostra 0 questões
    And a mensagem de assunto sem resultado cita "requisitos"

  # Cenário original 5
  Scenario: Professor procura assunto que possui exatamente uma questão
    Given o catálogo complementar possui 1 questão de requisitos e 0 de configuração
    When abro a criação de provas para os testes complementares
    And pesquiso o assunto "requisitos" no filtro de provas
    Then a lista disponível mostra 1 questão
    And a questão "Quais abaixo são funcionalidades não operacionais?" está disponível

  # Cenário original 6 — exige a pequena correção indicada no LEIA-ME
  Scenario: Professor pesquisa por assunto sem nenhuma questão cadastrada
    Given o catálogo complementar possui 0 questões de requisitos e 0 de configuração
    When abro a criação de provas para os testes complementares
    And pesquiso o assunto "requisitos" no filtro de provas
    Then a lista disponível mostra 0 questões
    And vejo os avisos de catálogo vazio e ausência do assunto "requisitos"

  # Cenário original 7
  Scenario: Professor seleciona uma questão e vê o assunto selecionado
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    And seleciono no teste complementar a questão "q-req-1"
    Then a seleção complementar tem 1 item
    And a lista selecionada contém o enunciado "Quais abaixo são funcionalidades não operacionais?"
    And a seleção exibe somente o assunto "requisitos"

  # Cenário original 9
  Scenario: Professor seleciona duas questões do mesmo assunto
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    And seleciono no teste complementar a questão "q-req-1"
    And seleciono no teste complementar a questão "q-req-2"
    Then a seleção complementar tem 2 itens
    And a lista selecionada contém o enunciado "Quais abaixo são funcionalidades não operacionais?"
    And a lista selecionada contém o enunciado "Quais abaixo não são bons cenários?"
    And a seleção exibe somente o assunto "requisitos"

  # Cenário original 10
  Scenario: Professor repete uma questão e adiciona outra do mesmo assunto
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    And seleciono no teste complementar a questão "q-req-1"
    And seleciono no teste complementar a questão "q-req-1"
    Then recebo aviso de tentativa de seleção duplicada
    When seleciono no teste complementar a questão "q-req-2"
    Then a seleção complementar tem 2 itens
    And a lista selecionada contém o enunciado "Quais abaixo são funcionalidades não operacionais?"
    And a lista selecionada contém o enunciado "Quais abaixo não são bons cenários?"
    And a seleção exibe somente o assunto "requisitos"

  # Cenário original 12
  Scenario: Professor acrescenta assunto diferente após uma seleção existente
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    When abro a criação de provas para os testes complementares
    And seleciono no teste complementar a questão "q-req-1"
    And pesquiso o assunto "gerência de configuração" no filtro de provas
    And seleciono no teste complementar a questão "q-config-1"
    Then a seleção complementar tem 2 itens
    And a lista selecionada contém o enunciado "Quais abaixo são funcionalidades não operacionais?"
    And a lista selecionada contém o enunciado "Quais ações entre as seguintes podem dar conflito textual?"
    And a seleção exibe os assuntos "requisitos" e "gerência de configuração"

  # Cenário original 17
  Scenario: Professor tenta finalizar uma prova sem nenhuma questão selecionada
    Given o catálogo complementar possui 2 questões de requisitos e 4 de configuração
    And a API complementar monitora tentativas de salvar provas
    When abro a criação de provas para os testes complementares
    And tento salvar uma prova sem selecionar questões
    Then vejo mensagem impedindo prova sem questões
    And não houve tentativa de POST para a API de provas
