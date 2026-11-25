Feature: Responder roteiros (coletando tempo de resposta)
    As a aluno regurlarmente matriculado numa disciplina
    I want to responder aos roteiros da disciplina armazenando minhas respostas e o tempo utilizado
    So that o professor e os monitores possam corrigir minhas respostas e analisar o tempo que levei em cada questão

# Responder uma questão
Scenario: sistema registra o tempo gasto ao responder uma questão
  Given o aluno "Maria Silva" está matriculado na turma "Estruturas de Dados 2026.2"
  And o roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2" está liberado para resposta
  And a questão 1 do roteiro "Roteiro 3 - Árvores AVL" é "O que é um fator de balanceamento?"
  And o aluno "Maria Silva" está respondendo a questão 1 do roteiro "Roteiro 3 - Árvores AVL" há "42" segundos
  When o aluno "Maria Silva" envia a resposta "É a diferença de altura entre as subárvores." para a questão 1
  Then o sistema armazena a resposta "É a diferença de altura entre as subárvores." do aluno "Maria Silva" para a questão 1 do roteiro "Roteiro 3 - Árvores AVL"
  And o sistema registra "42" segundos como tempo de resposta do aluno "Maria Silva" para a questão 1 do roteiro "Roteiro 3 - Árvores AVL"


Scenario: aluno responde uma questão e avança para a próxima
  Given eu sou o aluno "Maria Silva" e estou matriculado na turma "Estruturas de Dados 2026.2"
  And estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2"
  And vejo a questão 1, "O que é um fator de balanceamento?"
  When eu informo a resposta "É a diferença de altura entre as subárvores."
  And eu confirmo o envio da resposta
  Then eu vejo a questão 2 do roteiro "Roteiro 3 - Árvores AVL"
  And eu vejo um mini gráfico indicando que a questão 1 foi respondida
  And eu ainda estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL"

# Concluir roteiro
Scenario: sistema marca o roteiro como concluído após a última questão ser respondida
  Given o roteiro "Roteiro 3 - Árvores AVL" possui 5 questões
  And o aluno "Maria Silva" já respondeu as questões 1 a 4 do roteiro "Roteiro 3 - Árvores AVL"
  And o aluno "Maria Silva" está respondendo a questão 5 do roteiro "Roteiro 3 - Árvores AVL" há "50" segundos
  When o aluno "Maria Silva" envia a resposta "Reduz a altura da subárvore desbalanceada." para a questão 5
  Then o sistema registra "50" segundos como tempo de resposta da questão 5 do aluno "Maria Silva"
  And o sistema marca o roteiro "Roteiro 3 - Árvores AVL" como respondido por completo pelo aluno "Maria Silva"
  And o sistema registra a data e a hora de conclusão do roteiro "Roteiro 3 - Árvores AVL" para o aluno "Maria Silva"

Scenario: aluno finaliza o roteiro após responder a última questão
  Given eu sou o aluno "Maria Silva" e estou matriculado na turma "Estruturas de Dados 2026.2"
  And já respondi as questões 1 a 4 do roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2"
  And estou na página "Responder Roteiro" vendo a questão 5, a última do roteiro
  When eu informo a resposta "Reduz a altura da subárvore desbalanceada."
  And eu confirmo o envio da resposta
  Then eu vejo a mensagem "Roteiro respondido com sucesso!"
  And eu sou redirecionado para a página "Meus Roteiros"
  And vejo o roteiro "Roteiro 3 - Árvores AVL" com o status "Respondido"

# Navegação entre questões
Scenario: sistema registra o tempo mesmo quando o aluno avança sem responder a questão
  Given o aluno "Carlos Andrade" está respondendo o roteiro "Roteiro 3 - Árvores AVL"
  And o aluno "Carlos Andrade" está na questão 4 do roteiro "Roteiro 3 - Árvores AVL" há "15" segundos, sem enviar resposta
  When o aluno "Carlos Andrade" avança para a questão 5 sem responder a questão 4
  Then o sistema registra a questão 4 do roteiro "Roteiro 3 - Árvores AVL" como não respondida pelo aluno "Carlos Andrade"
  And o sistema registra "15" segundos como tempo gasto pelo aluno "Carlos Andrade" na questão 4

Scenario: aluno navega para a questão seguinte usando o botão "próxima"
  Given eu sou o aluno "Maria Silva" e estou matriculado na turma "Estruturas de Dados 2026.2"
  And estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2"
  And o roteiro "Roteiro 3 - Árvores AVL" possui 8 questões
  And vejo a questão 4 como a questão atual, ainda sem resposta
  And a questão 5 já foi respondida por mim
  When eu seleciono a opção "próxima"
  Then eu vejo a questão 5 do roteiro "Roteiro 3 - Árvores AVL"
  And eu vejo o mini gráfico indicando que a questão 5 é a questão atual
  And eu vejo o mini gráfico indicando que a questão 4 foi vista e não foi respondida
  And eu ainda estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL"

Scenario: aluno navega para uma questão específica usando o mini gráfico
  Given eu sou o aluno "Maria Silva" e estou matriculado na turma "Estruturas de Dados 2026.2"
  And estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2"
  And o roteiro "Roteiro 3 - Árvores AVL" possui 8 questões
  And vejo a questão 4 como a questão atual, ainda sem resposta
  And vejo o mini gráfico indicando que a questão 2 ainda não foi vista
  When eu seleciono a questão 2 no mini gráfico
  Then eu vejo a questão 2 do roteiro "Roteiro 3 - Árvores AVL"
  And eu vejo o mini gráfico indicando que a questão 2 é a questão atual
  And eu vejo o mini gráfico indicando que a questão 4 foi vista e não foi respondida
  And eu ainda estou na página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL"


# Retomada após interrupção (roteiro inacabado)
Scenario: sistema mantém os tempos já registrados quando o aluno retoma um roteiro inacabado
  Given o aluno "João Pedro" respondeu as questões 1 e 2 do roteiro "Roteiro 3 - Árvores AVL", levando "40" e "60" segundos, respectivamente
  And o aluno "João Pedro" encerrou a sessão sem responder a questão 3
  When o aluno "João Pedro" acessa novamente o roteiro "Roteiro 3 - Árvores AVL"
  Then o sistema apresenta a questão 3 como a próxima questão a ser respondida pelo aluno "João Pedro"
  And o sistema mantém "40" segundos como tempo registrado para a questão 1 do aluno "João Pedro"
  And o sistema mantém "60" segundos como tempo registrado para a questão 2 do aluno "João Pedro"

Scenario: aluno retoma um roteiro inacabado a partir da lista de roteiros
  Given eu sou o aluno "João Pedro" e estou logado no sistema
  And já respondi as questões 1 e 2 do roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2"
  And estou na página "Meus Roteiros"
  And vejo o roteiro "Roteiro 3 - Árvores AVL" com o status "Em andamento"
  When eu seleciono o roteiro "Roteiro 3 - Árvores AVL"
  Then eu sou levado à página "Responder Roteiro" do roteiro "Roteiro 3 - Árvores AVL"
  And vejo a questão 3 como a questão atual

# Prazo expirado
Scenario: sistema não aceita respostas após o encerramento do prazo do roteiro
  Given o roteiro "Roteiro 3 - Árvores AVL" da turma "Estruturas de Dados 2026.2" tem prazo de resposta até "20/09/2026 23:59"
  And a data e a hora atuais do sistema são "21/09/2026 08:00"
  When o aluno "Maria Silva" tenta enviar uma resposta para a questão 1 do roteiro "Roteiro 3 - Árvores AVL"
  Then o sistema não armazena a resposta enviada pelo aluno "Maria Silva"
  And o sistema não altera o tempo de resposta já registrado para a questão 1 do aluno "Maria Silva"

Scenario: aluno tenta acessar roteiro com prazo já encerrado
  Given eu sou o aluno "Maria Silva" e estou logado no sistema
  And estou na página "Meus Roteiros"
  And vejo o roteiro "Roteiro 3 - Árvores AVL" com o status "Prazo encerrado"
  When eu seleciono o roteiro "Roteiro 3 - Árvores AVL"
  Then eu vejo a mensagem "O prazo para responder este roteiro já se encerrou."
  And eu não sou levado à página "Responder Roteiro"


# Alunos fora da turma
Scenario: aluno não pode responder roteiro de uma turma em que não está matriculado
  Given o aluno "Pedro Nunes" não está matriculado na turma "Estruturas de Dados 2026.2"
  And o roteiro "Roteiro 3 - Árvores AVL" pertence à turma "Estruturas de Dados 2026.2"
  When o aluno "Pedro Nunes" tenta enviar uma resposta para a questão 1 do roteiro "Roteiro 3 - Árvores AVL"
  Then o sistema não permite o envio da resposta
  And o sistema não registra nenhum tempo de resposta para o aluno "Pedro Nunes" no roteiro "Roteiro 3 - Árvores AVL"
  And o sistema exibe uma mensagem informando que o aluno não está matriculado na turma correspondente ao roteiro

Scenario: aluno não vê roteiros de turmas em que não está matriculado
  Given eu sou o aluno "Pedro Nunes" e estou logado no sistema
  And não estou matriculado na turma "Estruturas de Dados 2026.2"
  And estou na página "Meus Roteiros"
  Then eu não vejo o roteiro "Roteiro 3 - Árvores AVL" na minha lista de roteiros



# Envio automático
Scenario: sistema envia automaticamente o roteiro incompleto ao fim do prazo
  Given o roteiro "Roteiro 3 - Árvores AVL" possui 5 questões
  And o roteiro do aluno "Maria Silva" está em andamento com prazo até "20/09/2026 23:59"
  And o aluno "Maria Silva" informou resposta somente para as questões 1 e 2
  When o prazo do roteiro do aluno "Maria Silva" é atingido
  Then o sistema marca o roteiro "Roteiro 3 - Árvores AVL" como enviado pelo aluno "Maria Silva"
  And o sistema mantém as respostas e os tempos registrados para as questões 1 e 2
  And o sistema registra as questões 3, 4 e 5 como não respondidas pelo aluno "Maria Silva"
  And o sistema registra "20/09/2026 23:59" como data e hora de envio

Scenario: aluno vê o roteiro enviado automaticamente após o fim do prazo
  Given eu sou o aluno "Maria Silva" e estou matriculado na turma "Estruturas de Dados 2026.2"
  And o prazo do roteiro "Roteiro 3 - Árvores AVL" terminou em "20/09/2026 23:59" sem que eu o tivesse enviado
  And a data e a hora atuais do sistema são "21/09/2026 08:00"
  When eu acesso a página "Meus Roteiros"
  Then eu vejo o roteiro "Roteiro 3 - Árvores AVL" com o status "Enviado"

# Formatos de resposta
Scenario: sistema armazena resposta de múltipla escolha
  Given a questão 2 do roteiro "Roteiro 3 - Árvores AVL" é de múltipla escolha com as alternativas "A", "B", "C" e "D"
  And o aluno "Maria Silva" selecionou a alternativa "B" na questão 2
  When o aluno "Maria Silva" navega para a questão 3
  Then o sistema armazena a alternativa "B" como resposta do aluno "Maria Silva" para a questão 2

Scenario: sistema armazena imagem anexada como resposta
  Given a questão 3 do roteiro "Roteiro 3 - Árvores AVL" aceita imagem como resposta
  And o aluno "Maria Silva" anexou a imagem "arvore-avl.png" à questão 3
  When o aluno "Maria Silva" navega para a questão 4
  Then o sistema armazena a imagem "arvore-avl.png" como resposta do aluno "Maria Silva" para a questão 3