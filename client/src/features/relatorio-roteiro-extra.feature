@relatorio-gui-extra
Feature: relatório de desempenho do roteiro (cenários extras de GUI, só para teste)
  As a professor responsável por uma turma
  I want to comparar o desempenho da turma atual em um roteiro com o das turmas passadas que fizeram o mesmo roteiro
  so that eu possa avaliar o desempenho da turma atual em relação ao das turmas passadas

# Estes cenários NÃO foram validados pelo professor.
# São versões de GUI dos testes de serviço e dos testes Jest, para testar a página.

Scenario: ignorar na tabela os roteiros diferentes do pedido web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "3 dias"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.2" tem, no "Roteiro 2", média de acertos "4", média de erros "6" e tempo de entrega médio de "2 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com a turma "ESS - 2025.2"
  Then continuo na página "Relatório de desempenho do roteiro"
  And vejo na tabela, na linha "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And vejo na tabela, na linha "Média das turmas passadas", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"

Scenario: ver médias com casas decimais na tabela web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "7", média de erros "3" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "2 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then vejo na tabela, na linha "Média das turmas passadas", média de acertos "7,5", média de erros "2,5" e tempo de entrega médio de "1,5 dias"

Scenario: ignorar na média a turma passada escolhida sem resultados no roteiro web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" não tem resultados no "Roteiro 1"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "2 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2025.1" e "ESS - 2025.2"
  Then vejo na tabela, na linha "Média das turmas passadas", média de acertos "6", média de erros "4" e tempo de entrega médio de "2 dias"
  And não vejo na tabela linhas das turmas "ESS - 2025.1" e "ESS - 2025.2"

Scenario: comparar com três turmas passadas web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2024.2" tem, no "Roteiro 1", média de acertos "4", média de erros "6" e tempo de entrega médio de "4 dias"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And a turma "ESS - 2025.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "2 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com as turmas "ESS - 2024.2", "ESS - 2025.1" e "ESS - 2025.2"
  Then vejo na tabela, na linha "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And vejo na tabela, na linha "Média das turmas passadas", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"

Scenario: ver mensagem de erro para um roteiro que nenhuma turma tem web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 9" da turma "ESS - 2026.2" em comparação com a turma "ESS - 2025.1"
  Then eu vejo uma mensagem de erro "Não é possível fazer essa operação!"
  And não vejo na tabela nenhuma linha

Scenario: a turma atual não aparece entre as turmas passadas web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu escolho a turma atual "ESS - 2026.2"
  Then não vejo "ESS - 2026.2" entre as turmas passadas para comparar
  And vejo "ESS - 2025.1" entre as turmas passadas para comparar

Scenario: a mensagem de erro some ao gerar um relatório válido web
  Given a turma "ESS - 2026.2" tem, no "Roteiro 1", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And a turma "ESS - 2025.1" tem, no "Roteiro 1", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
  And eu estou na página "Relatório de desempenho do roteiro"
  When eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2"
  And eu peço o relatório do "Roteiro 1" da turma "ESS - 2026.2" em comparação com a turma "ESS - 2025.1"
  Then não vejo mensagem de erro
  And vejo na tabela, na linha "ESS - 2026.2", média de acertos "8", média de erros "2" e tempo de entrega médio de "1 dia"
  And vejo na tabela, na linha "Média das turmas passadas", média de acertos "6", média de erros "4" e tempo de entrega médio de "3 dias"
