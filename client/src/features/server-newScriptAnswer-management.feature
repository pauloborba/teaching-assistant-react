@server
Feature: Server Script Answers Management
    As a system
    I want to manage script answers through the API
    So that student submissions are properly retrieved and updated

    Background:
        Given the server API is available

    Scenario: Criar um ScriptAnswer quando aluno inicia roteiro
        Given O estudante de CPF "11111111111" está cadastrado no sistema
        And O aluno está matriculado na turma "Math101-2024-2024"
        And Existe um roteiro de ID "script-001" na turma
        When O aluno cria um ScriptAnswer para o roteiro
        Then O servidor retorna status "201"
        And O ScriptAnswer tem status "in_progress"
        And O campo "started_at" contém um timestamp válido
        And O campo "answers" está vazio

    Scenario: Iniciar resposta de uma questão
        Given O estudante de CPF "11111111111" tem um ScriptAnswer ativo de ID "scriptanswer-start"
        And A tarefa "task-001" existe no roteiro
        And A tarefa ainda não foi iniciada
        When O aluno inicia a resposta da tarefa "task-001"
        Then O servidor retorna status "201"
        And A TaskAnswer tem status "started"
        And O campo "started_at" contém timestamp válido
        And O campo "submitted_at" está vazio

    Scenario: Enviar resposta de uma questão que não é a última
        Given O estudante de CPF "11111111111" tem um ScriptAnswer ativo de ID "scriptanswer-submit-nonfinal"
        And A tarefa "task-001" foi iniciada
        And A tarefa não é a última do roteiro
        When O aluno submete a resposta "Minha resposta aqui" para a tarefa
        Then O servidor retorna status "200"
        And A TaskAnswer tem status "submitted"
        And O campo "submitted_at" contém timestamp válido
        And O campo "time_taken_seconds" é calculado corretamente
        And O ScriptAnswer continua com status "in_progress"

    Scenario: Enviar resposta da última questão e finalizar roteiro
        Given O estudante de CPF "11111111111" tem um ScriptAnswer ativo de ID "scriptanswer-submit-final"
        And A tarefa "task-003" foi iniciada
        And A tarefa é a última do roteiro
        When O aluno submete a resposta "Resposta final" para a tarefa
        Then O servidor retorna status "200"
        And A TaskAnswer tem status "submitted"
        And O ScriptAnswer tem status "finished"
        And O campo "finished_at" do ScriptAnswer contém timestamp válido

    Scenario: Marcar roteiro como expirado por timeout
        Given O estudante de CPF "11111111111" tem um ScriptAnswer ativo de ID "scriptanswer-timeout"
        And Passaram-se do tempo limite para realizar o roteiro
        When O sistema verifica timeout do ScriptAnswer
        Then O servidor retorna status "200"
        And O ScriptAnswer tem status "finished"
        And As tarefas "started" foram marcadas como "submitted"
        And As tarefas "pending" foram marcadas como "timed_out"

    Scenario: Falha ao criar ScriptAnswer para aluno não matriculado
        Given O estudante de CPF "99999999999" está cadastrado no sistema
        And O aluno NÃO está matriculado na turma "Math101-2024-2024"
        And Existe um roteiro de ID "script-001" na turma
        When O aluno tenta criar um ScriptAnswer para o roteiro
        Then O servidor retorna status "403"
        And A mensagem de erro indica "Student is not enrolled in this class"
    
    Scenario: Falha ao submeter tarefa já submetida
        Given O estudante de CPF "11111111111" tem um ScriptAnswer ativo de ID "scriptanswer-resubmit-fail"
        And A tarefa "task-001" já foi submetida
        When O aluno tenta submeter novamente a tarefa "task-001" com resposta "Resposta duplicada"
        Then O servidor retorna status "409"
        And A mensagem de erro indica "Task answer already submitted and cannot be changed"

    Scenario: Buscar ScriptAnswers de uma turma
        Given A turma "Math101-2024-2024" tem "5" alunos com ScriptAnswers
        When O sistema busca todos os ScriptAnswers da turma
        Then O servidor retorna status "200"
        And A resposta contém pelo menos "5" ScriptAnswers
        And Todos os ScriptAnswers pertencem à turma correta

    Scenario: Buscar ScriptAnswers de um aluno matriculado em uma turma
        Given Existe uma turma com ID "Math101-2024-2024"
        And Existe um estudante com CPF "12345678901" matriculado na turma "Math101-2024-2024"
        And Este estudante possui ScriptAnswers de IDs "enrollment-001, enrollment-002" na turma "Math101-2024-2024"
        When Eu envio uma requisição GET para "/scriptanswers/enrollment?classId=Math101-2024-2024&studentId=12345678901"
        Then O servidor retorna status "200"
        And O servidor deve retornar uma lista contendo as respostas "enrollment-001, enrollment-002"
