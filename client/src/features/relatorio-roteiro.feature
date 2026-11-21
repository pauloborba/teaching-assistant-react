@relatorio-gui
Feature: relatório de desempenho do roteiro
  As a professor responsável por uma turma
  I want to comparar o desempenho da turma atual em um roteiro com o das turmas passadas que fizeram o mesmo roteiro
  so that eu possa avaliar o desempenho da turma atual em relação ao das turmas passadas

Scenario: comparar desempenho do roteiro da turma atual com o das turmas passadas web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then continuo na página "Relatório de desempenho do roteiro"
  And vejo na tabela, na linha "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And vejo na tabela, na linha "Média das turmas passadas", média de acertos "7", média de erros "3" e tempo de entrega médio de "2 dias"
  And não vejo na tabela linhas das turmas "ESS - 2025.1" e "ESS - 2025.2"

Scenario: ver só a turma atual na tabela quando nenhuma turma passada tem resultados no roteiro web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And nenhuma turma passada tem resultados no "Roteiro 1"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2"
  Then eu vejo uma mensagem de erro "Não é possível fazer essa operação!"
  And continuo na página "Relatório de desempenho do roteiro"
  And não vejo na tabela nenhuma linha

Scenario: ver só a média das turmas passadas na tabela quando a turma atual não tem resultados no roteiro web
  Given a turma "ESS - 2026.2" não tem resultados no "Roteiro 1"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then continuo na página "Relatório de desempenho do roteiro"
  And vejo na tabela, na linha "Média das turmas passadas", média de acertos "7", média de erros "3" e tempo de entrega médio de "2 dias"
  And não vejo na tabela a linha "ESS - 2026.2"
