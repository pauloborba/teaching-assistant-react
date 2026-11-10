Feature: Class Report
    As a professor
    I want to see the generated performance report from my previous class
    So that I can see how many and why my students passed or failed and reflect on my teaching method.

Scenario: Successful generation of class report with student performance metrics
    Given the class "ESS 2025.2" has the following students and academic statuses:
        | student      | average | status            |
        | Ana Souza    | 3.0     | reprovado por nota|
        | João Silva   | 8.5     | passou por média  |
        | Maria Costa  | 7.0     | passou por média  |
        | Pedro Alves  | 5.0     | vai para a final  |
    And I am logged in as professor "Paulo Borba"
    And I am at the "Class Reports" page
    When I view the performance report for class "ESS 2025.2"
    Then I should see the performance metrics for "ESS 2025.2"
    And the report should display:
        | metric                           | percentage |
        | percentual de passou por média   | 50%        |
        | percentual de vai para a final   | 25%        |
        | percentual de reprovado por nota | 25%        |

Scenario: Attempt to view report for a class with no graded students
    Given the class "ESS 2026.1" has no student grades recorded in the system
    And I am logged in as professor "Paulo Borba"
    And I am at the "Class Reports" page
    When I view the performance report for class "ESS 2026.1"
    Then I should see the error message "Relatório de desempenho indisponível para turmas sem notas registradas"
    And I should be redirected to my home page

Scenario: Unauthorized student attempts to view class performance report
    Given I am logged in as student "Pedro Alves"
    And the class "ESS 2025.2" has active student records
    When I attempt to access the performance report page for class "ESS 2025.2"
    Then I should see an unauthorized access message "Você não tem permissão para acessar este relatório"
    And I should be redirected to my student dashboard

Scenario: Professor attempts to view report of a class they do not teach
    Given the class "BD 2025.2" is taught by professor "Robson Fidalgo"
    And I am logged in as professor "Paulo Borba"
    When I attempt to view the performance report for class "BD 2025.2"
    Then I should see an error message "Acesso negado: Você não é o professor responsável por esta turma"
    And I should be redirected to my home page

Scenario: Generation of class report including attendance-based failures
    Given the class "ESS 2025.2" has the following student performance records:
        | student      | average | attendance | status              |
        | João Silva   | 8.5     | 95%        | passou por média    |
        | Maria Costa  | 7.0     | 80%        | passou por média    |
        | Pedro Alves  | 6.0     | 70%        | reprovado por falta |
        | Ana Souza    | 3.0     | 90%        | reprovado por nota  |
    And I am logged in as professor "Paulo Borba"
    And I am at the "Class Reports" page
    When I view the performance report for class "ESS 2025.2"
    Then I should see the performance metrics for "ESS 2025.2"
    And the report should display:
        | metric                            | percentage |
        | percentual de passou por média    | 50%        |
        | percentual de reprovado por falta | 25%        |
        | percentual de reprovado por nota  | 25%        |

Scenario: Filter class performance report by registration period and enrollment status
    Given the class "ESS 2025.2" has the following student enrollment records:
        | student      | registration period | status   |
        | João Silva   | Matrícula           | Ativo    |
        | Maria Costa  | Matrícula           | Ativo    |
        | Pedro Alves  | Rematrícula         | Trancado |
        | Ana Souza    | Rematrícula         | Trancado |
        | Carlos Lima  | Matrícula           | Trancado |
    And I am logged in as professor "Paulo Borba"
    And I am at the "Class Reports" page for "ESS 2025.2"
    When I filter the report by period "Rematrícula" and status "Trancado"
    Then I should see "Pedro Alves" and "Ana Souza" in the filtered report
    And the report list should display:
        | student     | registration period | status   |
        | Pedro Alves | Rematrícula         | Trancado |
        | Ana Souza   | Rematrícula         | Trancado |
    And I should not see "Carlos Lima", "João Silva" or "Maria Costa" in the filtered list

Scenario: Change the visualization chart format for the class performance report
    Given the class "ESS 2025.2" has performance records in the system
    And I am logged in as the instructor "Paulo Borba"
    And I am viewing the performance report for class "ESS 2025.2" as a "bar chart"
    When I request to view the performance report as a "pie chart"
    Then I should see the performance report displayed as a "pie chart"
    And the chart should accurately represent the proportions of performance statuses for class "ESS 2025.2"