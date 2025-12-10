@student-status-color
Feature: Student status color
  Validate the colored border that indicates student status on the Students List

  Scenario: Validar cores Verde e Vermelho
    Given que o sistema possui a turma "Engenharia de Software e Sistemas-2025-2"
    And os seguintes alunos estão matriculados nesta turma:
      | nome               | cpf            | email             |
      | Maria Modularidade | 222.222.222-22 | maria@cin.ufpe.br |
      | João Elegância     | 333.333.333-33 | joao@cin.ufpe.br  |
    And estou na página de "Avaliações"
    And eu escolho a turma "Engenharia de Software e Sistemas-2025-2"
    When eu importo uma planilha de notas com o seguinte conteúdo:
      | cpf            | Requirements | Configuration Management | Project Management | Design | Tests | Refactoring |
      | 222.222.222-22 | MANA         | MANA                     | MANA               | MANA   | MANA  | MANA        |
      | 333.333.333-33 | MA           | MA                       | MA                 | MA     | MA    | MA          |
    Then eu vou para página de "Students"
    And eu escolho a turma "Engenharia de Software e Sistemas-2025-2"
    And vejo se cor de da borda de "Maria Modularidade" está "Vermelho"
    And vejo se cor de da borda de "João Elegância" está "Verde"

  Scenario: Validar cor Amarela 
    Given que o sistema possui a turma "Engenharia de Software e Sistemas-2026-1"
    And os seguintes alunos estão matriculados nesta turma:
      | nome           | cpf            | email             |
      | Pedro Perfeito | 888.888.888-88 | pedro@cin.ufpe.br |
      | Ana Quase      | 999.999.999-99 | ana@cin.ufpe.br   |
    And estou na página de "Avaliações"
    And eu escolho a turma "Engenharia de Software e Sistemas-2026-1"
    When eu importo uma planilha de notas com o seguinte conteúdo:
      # AJUSTE: Ana agora tem 3 MPAs. Isso garante que a média dela caia o suficiente para ser Amarela
      | cpf            | Requirements | Configuration Management | Project Management | Design | Tests | Refactoring |
      | 888.888.888-88 | MA           | MA                       | MA                 | MA     | MA    | MA          |
      | 999.999.999-99 | MA           | MA                       | MA                 | MPA    | MPA   | MPA         |
    Then eu vou para página de "Students"
    And eu escolho a turma "Engenharia de Software e Sistemas-2026-1"
    And vejo se cor de da borda de "Ana Quase" está "Amarelo"
    And vejo se cor de da borda de "Pedro Perfeito" está "Verde"

  Scenario: Validar cor Vermelha por Reprovação Anterior 
    Given que o sistema possui a turma "Engenharia de Software e Sistemas-2027-1"
    And que houve uma turma passada "Engenharia de Software e Sistemas-2026-2"
    And o aluno "Roberto Recorrente" (CPF "777.777.777-77") foi reprovado nessa turma passada
    And os seguintes alunos estão matriculados nesta turma:
      | nome               | cpf            | email               |
      | Roberto Recorrente | 777.777.777-77 | roberto@cin.ufpe.br |
    And estou na página de "Avaliações"
    And eu escolho a turma "Engenharia de Software e Sistemas-2027-1"
    When eu importo uma planilha de notas com o seguinte conteúdo:
      | cpf            | Requirements | Configuration Management | Project Management | Design | Tests | Refactoring |
      | 777.777.777-77 | MA           | MA                       | MA                 | MA     | MA    | MA          |
    Then eu vou para página de "Students"
    And eu escolho a turma "Engenharia de Software e Sistemas-2027-1"
    And vejo se cor de da borda de "Roberto Recorrente" está "Vermelho"