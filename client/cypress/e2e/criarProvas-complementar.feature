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

  # Os 4 cenários seguintes pertencem ao arquivo original.
  # Não estão implementados: dependem da aba "Geração de PDFs".
  # @skip garante que NÃO sejam relatados como aprovados.

  @skip @pendente_pdf
  Scenario: Professor finaliza com uma questão e não havia provas no histórico de PDFs
    Given estou na página de geração de PDFs sem provas criadas
    When crio uma prova com uma questão de requisitos
    Then a nova prova aparece no histórico da página de geração de PDFs
    And consigo visualizar sua questão e assunto

  @skip @pendente_pdf
  Scenario: Professor finaliza com duas questões e não havia provas no histórico de PDFs
    Given estou na página de geração de PDFs sem provas criadas
    When crio uma prova com questões de requisitos e configuração
    Then a nova prova aparece no histórico da página de geração de PDFs
    And consigo visualizar ambas as questões e assuntos

  @skip @pendente_pdf
  Scenario: Professor finaliza com uma questão quando já havia provas no histórico de PDFs
    Given estou na página de geração de PDFs com uma prova já cadastrada
    When crio uma segunda prova com uma questão de requisitos
    Then o histórico da página de geração de PDFs mostra as duas provas
    And a nova prova mantém sua questão e assunto

  @skip @pendente_pdf
  Scenario: Professor tenta usar nome já existente sem modificar o histórico de PDFs
    Given estou na página de geração de PDFs com a prova "Prova de requisitos"
    When tento cadastrar outra prova também chamada "Prova de requisitos"
    Then recebo mensagem de nome repetido e mantenho minha seleção
    And o histórico da página de geração de PDFs preserva a prova anterior
