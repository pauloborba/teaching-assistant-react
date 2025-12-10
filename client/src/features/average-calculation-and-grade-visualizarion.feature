Feature: Visualização de Notas
  As a student
  I want to visualize my grades
  So that I can see if I'm approved

  Scenario: Student approved on the final
    Given estou na página "Evaluations" da turma "Engenharia de Software e Sistemas (2025/2)"
    And o estudante tem média "5,2" e tem nota final como "MPA"
    When eu vejo que a média final é "6,1"
    Then eu sei que fui aprovado na final

  Scenario: Student verifying that is on the final
    Given estou na página "Evaluations" da turma "Engenharia de Software e Sistemas (2025/2)"
    When eu vejo que a média é "5,7"
    And nota final está vazia
    Then eu sei que estou na final

  Scenario: Student approved
    Given estou na página "Evaluations" da turma "Engenharia de Software e Sistemas (2025/2)"
    When eu vejo que a média é "7,8"
    Then eu sei que estou aprovado