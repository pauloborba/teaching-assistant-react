@gui
Feature: Criacao de metas

  Background:
    Given a turma "engenharia-de-software-e-sistemas" existe no sistema
    And estou na página de criação de metas da turma "engenharia-de-software-e-sistemas"

  Scenario: Criar metas com sucesso
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    When adiciono as metas "Requisitos" e "Testes de software" para a turma "engenharia-de-software-e-sistemas"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas criadas com sucesso!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" exibe os itens com títulos "Requisitos" e "Testes de software"

  Scenario: Tentar criar metas sem título
    When tento adicionar uma meta sem título para a turma "engenharia-de-software-e-sistemas"
    Then eu vejo que não está disponível a opção de submissão de criação de metas
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" permanece vazia

  Scenario: Tentar criar metas duplicadas
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    When adiciono as metas "Requisitos" e "Requisitos" para a turma "engenharia-de-software-e-sistemas"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas não podem conter duplicatas!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" permanece vazia

  Scenario: Cancelar a criação de metas para uma turma e criar para outra 
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    And a turma "inteligencia-artificial" existe no sistema
    And não existe nenhuma meta cadastrada na turma "inteligencia-artificial"
    When adiciono as metas "Requisitos" e "Testes de software" para a turma "engenharia-de-software-e-sistemas"
    And cancelo a criação de metas para a turma "engenharia-de-software-e-sistemas"
    And adiciono as metas "Redes Neurais" e "Aprendizado de Máquina" para a turma "inteligencia-artificial"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas criadas com sucesso!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" permanece vazia
    And a listagem de metas da turma "inteligencia-artificial" exibe os itens com títulos "Redes Neurais" e "Aprendizado de Máquina"

  Scenario: Editar metas para serem cadastradas
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    When adiciono as metas "Requisitos" e "Testes de software" para a turma "engenharia-de-software-e-sistemas"
    And edito a meta "Testes de software" para "Validação de Software" na turma "engenharia-de-software-e-sistemas"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas criadas com sucesso!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" exibe os itens com títulos "Requisitos" e "Validação de Software"

  Scenario: Deletar metas para serem cadastradas
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    When adiciono as metas "Requisitos" e "Testes de software" para a turma "engenharia-de-software-e-sistemas"
    And deleto a meta "Testes de software" na turma "engenharia-de-software-e-sistemas"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas criadas com sucesso!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" exibe o item com título "Requisitos"

  Scenario: Turmas com metas já cadastradas não permitem criação de novas metas
    Given a turma "sistemas-distribuidos" existe no sistema
    And a turma "sistemas-distribuidos" possui as metas "Comunicação" e "Sincronização" cadastradas
    When tento acessar a página de criação de metas da turma "sistemas-distribuidos"
    Then eu vejo que não está disponível a opção de criação de metas para a turma "sistemas-distribuidos"