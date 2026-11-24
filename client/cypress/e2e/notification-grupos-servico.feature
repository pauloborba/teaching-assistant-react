# language: pt
@grupos-servico
Funcionalidade: Notificação de alocação de monitor e aluno (serviço)

  Como sistema que usa a API do SGM
  Eu quero que o servidor notifique os participantes quando a composição de um grupo muda
  Para que as regras de alocação valham independentemente da interface usada

  Cenário: alocar monitor ao grupo (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E o monitor "joaosilva" está cadastrado e livre
    Quando eu peço ao sistema para alocar o monitor "joaosilva" ao grupo "ESS-G3"
    Então o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    E o histórico do grupo "ESS-G3" registra notificações de alocação enviadas para "Mariana", "Pedro" e "joaosilva"

  Cenário: alocar monitor quando não há monitor disponível (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E não há nenhum monitor disponível no momento
    Quando eu peço ao sistema para alocar um monitor qualquer ao grupo "ESS-G3"
    Então o servidor retorna o erro "Não há monitor disponível"
    E o sistema não registra nenhuma notificação
    E o sistema armazena o grupo "ESS-G3" sem monitor

  Cenário: alocar monitor não cadastrado (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    E o monitor "ninguem" não está cadastrado
    Quando eu peço ao sistema para alocar o monitor "ninguem" ao grupo "ESS-G3"
    Então o servidor retorna o erro "Monitor não existe"
    E o sistema não registra nenhuma notificação
    E o sistema armazena o grupo "ESS-G3" sem monitor

  Cenário: adicionar aluno a grupo com monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    Quando eu peço ao sistema para adicionar o aluno "Carla" ao grupo "ESS-G3"
    Então o sistema armazena apenas "Mariana", "Pedro" e "Carla" como alunos do grupo "ESS-G3"
    E o histórico do grupo "ESS-G3" registra notificações de aviso enviadas para "Mariana", "Pedro", "Carla" e "joaosilva"

  Cenário: realocar monitor para grupo que já possui monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e o monitor "joaosilva"
    E o grupo "ESS-G4" existe com os alunos "Lucas" e "Beatriz" e o monitor "mariaeduarda"
    Quando eu peço ao sistema para realocar o monitor "joaosilva" do grupo "ESS-G3" para o grupo "ESS-G4"
    Então o servidor retorna o erro "O grupo de destino já possui monitor"
    E o sistema não registra nenhuma notificação
    E o sistema armazena "joaosilva" como monitor do grupo "ESS-G3"
    E o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G4"

  Cenário: remover monitor de grupo sem monitor (serviço)
    Dado o grupo "ESS-G3" existe com os alunos "Mariana" e "Pedro" e sem monitor definido
    Quando eu peço ao sistema para remover o monitor do grupo "ESS-G3"
    Então o servidor retorna o erro "O grupo não possui monitor"
    E o sistema não registra nenhuma notificação

  Cenário: alocação automática do único monitor livre (serviço)
    Dado o grupo "ESS-G5" existe com os alunos "Rafael" e "Julia" e sem monitor definido
    E o monitor "mariaeduarda" é o único monitor livre no momento
    Quando eu peço ao sistema a alocação automática de monitor para o grupo "ESS-G5"
    Então o sistema armazena "mariaeduarda" como monitor do grupo "ESS-G5"
    E o sistema não tem monitores livres
    E o histórico do grupo "ESS-G5" registra notificações de alocação enviadas para "Rafael", "Julia" e "mariaeduarda"
