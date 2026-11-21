@relatorio-servico
Feature: relatório de desempenho do roteiro
  As a professor responsável por uma turma
  I want to comparar o desempenho da turma atual em um roteiro com o das turmas passadas que fizeram o mesmo roteiro
  so that eu possa avaliar o desempenho da turma atual em relação ao das turmas passadas

Scenario: obter desempenho do roteiro da turma atual comparado com o das turmas passadas
  Given o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  When eu peço ao sistema o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then o sistema retorna, para "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema retorna, para "Média das turmas passadas", média de acertos "7", média de erros "3" e tempo de entrega médio de "2 dias"
  And o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"

Scenario: ignorar na média das turmas passadas os roteiros diferentes do pedido
  Given o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "2 dias"
  When eu peço ao sistema o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com a turma "ESS - 2025.2"
  Then o sistema retorna, para "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema retorna, para "Média das turmas passadas", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "2 dias"

Scenario: obter desempenho do roteiro da turma atual sem turmas passadas com resultados nesse roteiro
  Given o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And o sistema não tem turma passada com resultados no "Roteiro 1"
  When eu peço ao sistema o relatório do "Roteiro 1" da turma "ESS - 2026.2"
  Then o sistema retorna a mensagem de erro "Não é possível fazer essa operação!"
  And o sistema tem a turma "ESS - 2026.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"

Scenario: obter desempenho das turmas passadas quando a turma atual não tem resultados no roteiro
  Given o sistema tem a turma "ESS - 2026.2" sem resultados no "Roteiro 1"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  When eu peço ao sistema o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then o sistema retorna, para "Média das turmas passadas", média de acertos "7", média de erros "3" e tempo de entrega médio de "2 dias"
  And o sistema não retorna "ESS - 2026.2"
  And o sistema tem a turma "ESS - 2026.2" sem resultados no "Roteiro 1"
  And o sistema tem a turma "ESS - 2025.1" com, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And o sistema tem a turma "ESS - 2025.2" com, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
