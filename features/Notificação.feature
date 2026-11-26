Feature: Notificação de resultados finais

  enviar por e-mail a cada aluno o seu resultado final na disciplina

  Requisitos levantados com o :
  - RF1: ao fim do período de correção, os resultados ainda não enviados são enviados automaticamente; antes disso, só são enviados quando o professor libera o envio, em massa ou individual
  - RF2: apenas o professor pode liberar o envio dos e-mails (só o professor acessa o sistema, então não há validação de usuário)
  - RF3: o e-mail apresenta o resultado, o nome da disciplina, o período atual e o nome do corretor
  - RF4: antes da liberação, o professor pode editar livremente o conteúdo do e-mail; se o resultado mudar depois do envio, um e-mail de atualização é enviado automaticamente
  - RF6: a plataforma não mantém histórico dos e-mails enviados
  - RNF2: em caso de falha, aparece uma mensagem de erro em linguagem usual e uma nova tentativa pode ser feita
  - RNF3: cada resultado é enviado uma única vez após a liberação pelo professor
  - RNF4: o e-mail não apresenta CPF do aluno ou do professor nem outros dados pessoais
  - RNF5: o professor escolhe entre o envio em massa, para todos os alunos com resultado definido, e o envio individual, para os alunos que escolher
  - RNF6: os detalhes das falhas ficam em uma seção "Detalhes" recolhida dentro da mensagem de erro

  Regras de resultado usadas nos exemplos:
  - média maior ou igual a 7,0: "Aprovado"; média maior ou igual a 3,0 e menor que 7,0: "Final"; média menor que 3,0: "Reprovado"
  - após a prova final, média final = (média + nota da prova final) / 2; maior ou igual a 5,0: "Aprovado na final"


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


  # Cenários de serviço

  # Requisitos: RF1, RNF3, RNF5
  @service
  Scenario: Envio automático dos resultados não enviados ao fim do período de correção
    Given o período de correção da turma "2026.2 de ESS" termina em "31/08/2026 às 23:59"
    And a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva", "Pedro Silva" e "João Souza", todos com e-mail cadastrado
    And "Maria Silva" possui o resultado "Aprovado" com status de envio "Não enviado"
    And "Pedro Silva" possui o resultado "Final" com status de envio "Enviado"
    And "João Souza" está sem conceito cadastrado na meta "Tests"
    And o serviço de e-mail aceita os envios
    When o serviço verifica os envios automáticos da turma "2026.2 de ESS" em "01/09/2026 às 00:00"
    Then um e-mail de resultado final é aceito para "Maria Silva"
    And nenhum novo e-mail de resultado final é enviado para "Pedro Silva"
    And nenhum e-mail de resultado final é enviado para "João Souza"
    And o status de envio de "Maria Silva" passa a ser "Enviado" e o de "João Souza" permanece "Não enviado"


  # Requisitos: RF1
  @service
  Scenario: Resultado definido não é enviado automaticamente antes do fim do período de correção
    Given o período de correção da turma "2026.2 de ESS" termina em "31/08/2026 às 23:59"
    And a aluna "Maria Silva" possui o resultado "Aprovado", e-mail cadastrado e status de envio "Não enviado"
    And o professor não liberou o envio do resultado de "Maria Silva"
    When o serviço verifica os envios automáticos da turma "2026.2 de ESS" em "31/08/2026 às 23:58"
    Then nenhum e-mail de resultado final é enviado para "Maria Silva"
    And o status de envio de "Maria Silva" permanece "Não enviado"


  # Requisitos: RF3, RNF4
  @service
  Scenario: Conteúdo do e-mail de resultado sem dados pessoais desnecessários
    Given a turma "2026.2 de ESS", da disciplina "Engenharia de Software e Sistemas", tem o professor "Paulo Borba" como corretor
    And a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva", com o resultado "Aprovado", e "João Souza", com o resultado "Final", ambos com e-mail cadastrado e status de envio "Não enviado"
    And o serviço de e-mail aceita os envios
    When o professor "Paulo Borba" libera o envio dos resultados da turma "2026.2 de ESS"
    Then o e-mail aceito para "Maria Silva" apresenta a disciplina "Engenharia de Software e Sistemas", o período "2026.2", o corretor "Paulo Borba" e o resultado "Aprovado"
    And o e-mail de "Maria Silva" não apresenta o CPF de "Maria Silva", o CPF de "Paulo Borba" nem outros dados pessoais do professor
    And o e-mail de "Maria Silva" não apresenta o nome nem o resultado de "João Souza"


  # Requisitos: RF4
  @service
  Scenario: E-mail de atualização após o cadastro da nota da prova final
    Given a aluna "Ana Lima", da turma "2026.2 de ESS", possui média "6,0" antes da prova final e o resultado "Final" já enviado por e-mail
    And o serviço de e-mail aceita o envio
    When a nota "4,0" da prova final de "Ana Lima" é cadastrada
    Then o resultado de "Ana Lima" passa a ser "Aprovado na final", com média final "5,0"
    And um e-mail de atualização é aceito para "Ana Lima", informando o resultado "Aprovado na final" no lugar do resultado "Final"
    And nenhum outro aluno da turma "2026.2 de ESS" recebe e-mail


  # Requisitos: RNF3
  @service
  Scenario: Prevenção de envio duplicado por solicitações simultâneas
    Given a turma "2026.2 de ESS" possui apenas os alunos "Maria Silva" e "João Souza", ambos com e-mail cadastrado e status de envio "Não enviado"
    And "Maria Silva" possui o resultado "Aprovado" e "João Souza" possui o resultado "Final"
    And o serviço de e-mail aceita os envios
    When o serviço recebe duas solicitações simultâneas do professor "Paulo Borba" para liberar o envio dos resultados da turma "2026.2 de ESS"
    Then exatamente um e-mail de resultado final é aceito para "Maria Silva"
    And exatamente um e-mail de resultado final é aceito para "João Souza"
    And o status de envio de "Maria Silva" e de "João Souza" passa a ser "Enviado"


  # Requisitos: RNF2, RNF6
  @service
  Scenario: Falha no envio para um aluno não interrompe o envio aos demais
    Given a turma "2026.2 de ESS" possui apenas os alunos "Ana Lima", "Bruno Costa" e "Carla Dias", nessa ordem, todos com resultado definido, e-mail cadastrado e status de envio "Não enviado"
    And o serviço de e-mail não responde a tempo ao envio para "Ana Lima"
    And o serviço de e-mail aceita os envios para "Bruno Costa" e "Carla Dias"
    When o professor "Paulo Borba" libera o envio dos resultados da turma "2026.2 de ESS"
    Then os e-mails de resultado final de "Bruno Costa" e "Carla Dias" são aceitos
    And a resposta informa o erro "Erro ao enviar as mensagens", com o detalhe de que o servidor de e-mail não respondeu a tempo ao envio para "Ana Lima"
    And o status de envio de "Ana Lima" passa a ser "Pendente", permitindo uma nova tentativa
    And o status de envio de "Bruno Costa" e de "Carla Dias" passa a ser "Enviado"
