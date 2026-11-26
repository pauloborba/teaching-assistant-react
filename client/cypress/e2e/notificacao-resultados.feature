# Cenários de GUI de features/Notificação.feature, executados pelo Cypress.
# Rode com o servidor em modo de teste (NODE_ENV=test), que não lê nem grava server/data.
@resultados-gui
Feature: Notificação de resultados finais

  Enviar por e-mail a cada aluno o seu resultado final na disciplina

  # Cenários de GUI

  # Requisitos: RF1, RNF5
  @gui
  Scenario: Liberação do envio dos resultados para toda a turma
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva" e "João Souza", ambos com e-mail cadastrado e status de envio "Não enviado"
    And "Maria Silva" possui o resultado "Aprovado" e "João Souza" possui o resultado "Final"
    When eu libero o envio dos resultados para toda a turma
    Then eu vejo a mensagem "E-mails enviados com sucesso"
    And "Maria Silva" recebe um e-mail informando apenas o próprio resultado "Aprovado"
    And "João Souza" recebe um e-mail informando apenas o próprio resultado "Final"
    And o status de envio de "Maria Silva" e de "João Souza" passa a ser "Enviado"


  # Requisitos: RNF5
  @gui
  Scenario: Bloqueio do envio apenas para alunos com notas pendentes
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva" e "João Souza", ambos com e-mail cadastrado e status de envio "Não enviado"
    And "Maria Silva" possui o resultado "Aprovado"
    And "João Souza" está sem conceito cadastrado na meta "Tests"
    When eu libero o envio dos resultados para toda a turma
    Then eu vejo a mensagem "E-mails enviados com sucesso para os alunos com resultado definido"
    And eu vejo o aviso de que "João Souza" não recebeu o resultado por ter nota pendente na meta "Tests"
    And "Maria Silva" recebe um e-mail informando apenas o próprio resultado "Aprovado"
    And nenhum e-mail de resultado final é enviado para "João Souza"
    And o status de envio de "Maria Silva" passa a ser "Enviado" e o de "João Souza" permanece "Não enviado"


  # Requisitos: RF1, RNF5
  @gui
  Scenario: Envio individual apenas para os alunos selecionados
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva", "João Souza" e "Pedro Silva", todos com e-mail cadastrado, resultado definido e status de envio "Não enviado"
    When eu seleciono os alunos "Maria Silva" e "Pedro Silva"
    And eu libero o envio dos resultados para os alunos selecionados
    Then eu vejo a mensagem "E-mails enviados com sucesso"
    And "Maria Silva" e "Pedro Silva" recebem um e-mail informando apenas o próprio resultado
    And nenhum e-mail de resultado final é enviado para "João Souza"
    And o status de envio de "Maria Silva" e de "Pedro Silva" passa a ser "Enviado" e o de "João Souza" permanece "Não enviado"


  # Requisitos: RF4
  @gui
  Scenario: Edição do conteúdo do e-mail antes da liberação do envio
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And o aluno "Pedro Silva" possui o resultado "Aprovado", e-mail cadastrado e status de envio "Não enviado"
    When eu abro a pré-visualização do e-mail de "Pedro Silva"
    And eu acrescento ao texto do e-mail a mensagem "Parabéns pela dedicação durante o semestre!"
    And eu libero o envio do e-mail
    Then eu vejo a mensagem "E-mail enviado com sucesso"
    And "Pedro Silva" recebe um e-mail com o resultado "Aprovado" e a mensagem "Parabéns pela dedicação durante o semestre!"
    And o status de envio de "Pedro Silva" passa a ser "Enviado"


  # Requisitos: RNF2, RNF6
  @gui
  Scenario: Mensagem de erro com detalhes recolhidos quando um envio falha
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And a turma "2026.2 de ESS" possui apenas os alunos "João Souza" e "Ana Lima", ambos com resultado definido e status de envio "Não enviado"
    And "João Souza" possui o e-mail "joao@cin.ufpe.br" e "Ana Lima" não possui e-mail cadastrado
    When eu libero o envio dos resultados para toda a turma
    Then eu vejo a mensagem de erro "Erro ao enviar as mensagens", com a seção "Detalhes" recolhida
    And a seção "Detalhes" informa que "Ana Lima" não recebeu o resultado porque não possui e-mail cadastrado
    And eu vejo a opção de tentar o envio novamente
    And o status de envio de "João Souza" passa a ser "Enviado" e o de "Ana Lima" passa a ser "Pendente"


  # Requisitos: RNF2, RNF3
  @gui
  Scenario: Nova tentativa de envio apenas para alunos com envio pendente
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And o aluno "Pedro Silva" possui o resultado "Aprovado" com status de envio "Enviado"
    And a aluna "Ana Lima" possui o resultado "Final" com status de envio "Pendente", após uma falha por não possuir e-mail cadastrado
    And o e-mail "ana.lima@cin.ufpe.br" foi cadastrado para "Ana Lima" depois da falha
    When eu solicito uma nova tentativa de envio para os alunos com envio pendente
    Then eu vejo a mensagem "E-mails enviados com sucesso"
    And o status de envio de "Ana Lima" passa a ser "Enviado"
    And nenhum novo e-mail de resultado final é enviado para "Pedro Silva"


  # Requisitos: RNF3
  @gui
  Scenario: Bloqueio de reenvio individual de resultado já enviado
    Given eu estou na página "Resultados Finais" da turma "2026.2 de ESS"
    And o aluno "Pedro Silva" possui o resultado "Aprovado" com status de envio "Enviado"
    When eu tento liberar novamente o envio individual do resultado de "Pedro Silva"
    Then eu vejo a mensagem de alerta "O e-mail com o resultado final deste aluno já foi enviado"
    And eu permaneço na página "Resultados Finais" da turma "2026.2 de ESS"
    And nenhum novo e-mail de resultado final é enviado para "Pedro Silva"
    And o status de envio de "Pedro Silva" permanece "Enviado"


  # Requisitos: RF4
  @gui
  Scenario: E-mail de atualização enviado automaticamente após mudança de resultado
    Given eu estou na página "Avaliações" da turma "2026.2 de ESS"
    And a aluna "Maria Silva" possui "MPA" em todas as metas, com média "7,0" e resultado "Aprovado"
    And o resultado "Aprovado" de "Maria Silva" já foi enviado por e-mail
    When eu altero o conceito de "Maria Silva" na meta "Tests" para "MANA"
    Then eu vejo a mensagem "Resultado atualizado e e-mail de atualização enviado para Maria Silva"
    And o resultado de "Maria Silva" passa a ser "Final"
    And "Maria Silva" recebe um e-mail de atualização informando o resultado "Final" no lugar do resultado "Aprovado"


  # Requisitos: RF4, RNF3
  @gui
  Scenario: Alteração de conceito sem mudança de resultado não gera e-mail de atualização
    Given eu estou na página "Avaliações" da turma "2026.2 de ESS"
    And a aluna "Maria Silva" possui "MPA" em todas as metas, com média "7,0" e resultado "Aprovado"
    And o resultado "Aprovado" de "Maria Silva" já foi enviado por e-mail
    When eu altero o conceito de "Maria Silva" na meta "Tests" para "MA"
    Then a média de "Maria Silva" passa a ser "7,5" e o resultado continua "Aprovado"
    And nenhum e-mail de atualização é enviado para "Maria Silva"
    And o status de envio de "Maria Silva" permanece "Enviado"
