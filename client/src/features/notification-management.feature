@notification
Feature: Gerenciamento de Notificações por Email

  Como um professor
  Eu quero enviar notificações de resultado por email
  Para informar os alunos sobre seu desempenho

  Background:
    Dado que o servidor e o cliente estão rodando
    E que a página de Notificações está aberta

  @gui
Scenario: Envio de Notificação Individual com Sucesso
    Quando eu seleciono o tipo de notificação "Resultado da Disciplina (Individual)"
    E eu seleciono a turma "Engenharia de Software e Sistemas (1/2025)"
    E eu seleciono o aluno "11111111111"
    E eu clico no botão de enviar notificação
    Então eu devo ver a mensagem de sucesso "Notificação de resultado enviada com sucesso!"

  @gui
Scenario: Envio de Notificação em Lote com Sucesso
    Quando eu seleciono o tipo de notificação "Resultado da Disciplina (Lote)"
    E eu seleciono a turma "Engenharia de Software e Sistemas (2/2025)"
    E eu clico no botão de enviar notificação
    Então eu devo ver a mensagem de sucesso "Notificações de resultado enviadas com sucesso para 2 aluno(s)!"
