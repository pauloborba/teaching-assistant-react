# Suíte complementar baseada nos cinco cenários ainda não automatizados
# do arquivo original criarQuestoes.feature.
# Esta suíte usa API simulada com cy.intercept; não testa a persistência real.
Feature: Cobertura complementar da criação de questões

  Scenario: Professor cria questão com o mesmo enunciado e alternativas diferentes
    Given já existe uma questão de gerência de configuração no banco de teste complementar
    When abro a criação de questões para o teste complementar
    And informo o assunto "gerência de configuração" da nova questão
    And informo o enunciado "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" da nova questão
    And adiciono a alternativa complementar "stash" como "verdadeira"
    And adiciono a alternativa complementar "pull" como "verdadeira"
    And adiciono a alternativa complementar "log" como "falsa"
    And tento salvar a nova questão
    Then a API simulada aceita a nova questão com as alternativas informadas
    And a lista contém duas versões da questão com alternativas diferentes

  Scenario: Professor cria uma nova questão quando já existe uma anterior
    Given já existe uma questão de gerência de configuração no banco de teste complementar
    When abro a criação de questões para o teste complementar
    And informo o assunto "gerência de configuração" da nova questão
    And informo o enunciado "Quais desses abaixo são comandos que não podem dar conflito textual?" da nova questão
    And adiciono a alternativa complementar "log" como "verdadeira"
    And adiciono a alternativa complementar "init" como "verdadeira"
    And adiciono a alternativa complementar "config" como "verdadeira"
    And tento salvar a nova questão
    Then a API simulada aceita a nova questão com as alternativas informadas
    And a lista contém a questão nova e preserva a questão anterior

  Scenario: Professor tenta criar uma questão sem assunto
    Given não existem questões no banco de teste complementar para validações
    When abro a criação de questões para o teste complementar
    And informo o enunciado "Quais comandos podem dar conflito textual?" da nova questão
    And adiciono a alternativa complementar "merge" como "verdadeira"
    And adiciono a alternativa complementar "log" como "falsa"
    And tento salvar a nova questão
    Then a interface informa o erro de questão "É preciso definir o assunto da questão"
    And nenhuma questão é incluída no banco de teste complementar

  Scenario: Professor tenta criar uma questão sem enunciado
    Given não existem questões no banco de teste complementar para validações
    When abro a criação de questões para o teste complementar
    And informo o assunto "gerência de configuração" da nova questão
    And adiciono a alternativa complementar "merge" como "verdadeira"
    And adiciono a alternativa complementar "log" como "falsa"
    And tento salvar a nova questão
    Then a interface informa o erro de questão "É preciso definir o enunciado da questão"
    And nenhuma questão é incluída no banco de teste complementar

  Scenario: Professor tenta criar uma questão sem alternativas
    Given não existem questões no banco de teste complementar para validações
    When abro a criação de questões para o teste complementar
    And informo o assunto "gerência de configuração" da nova questão
    And informo o enunciado "Quais comandos podem dar conflito textual?" da nova questão
    And tento salvar a nova questão
    Then a interface informa o erro de questão "É preciso adicionar alternativas para a questão"
    And nenhuma questão é incluída no banco de teste complementar
