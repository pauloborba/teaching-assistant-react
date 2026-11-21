# Cobertura dos cenários de lembretes

Esta análise acompanha os 25 cenários de
[Notificacao_falta_cadastrar_alguma_nota.feature](../../features/Notificacao_falta_cadastrar_alguma_nota.feature)
em relação ao modelo Mermaid e às regras documentadas no guia.
Os quatro arquivos de `features/` foram importados da `main` do fork,
commit `4e3272dac09339637986205a3c68ef5c26e3e449`. A feature de lembretes
recebeu comentários de acompanhamento do DDD e teve o cenário
**Restrição de configuração de lembretes às próprias turmas** retirado por decisão
do responsável pela feature: a funcionalidade será utilizada por um único professor,
com suas turmas disponíveis, sem controle de acesso entre professores.
O cenário de listagem foi ajustado, com aprovação do responsável, para
**Visualização do histórico de notificações**: começa na tela Turmas e preserva
as duas notificações de Paulo, sem autenticação ou registros de outros professores.
Nos outros 11 cenários GUI, a precondição de autenticação foi retirada com
aprovação do responsável. Cada um começa explicitamente com o professor Paulo
Borba na tela inicial validada, preservando a turma e os filtros indicados.
Os nomes, tags e demais passos desses cenários foram mantidos. Os nomes dos
13 cenários service permanecem inalterados. No cenário de ausência de envio,
o Then do lembrete futuro de 29/08 foi corrigido, com aprovação, para preservar
Não enviado, igual ao Given. No cenário de reenvio após falha temporária, duas
referências à causa do erro foram corrigidas, com aprovação, de motivo para
descrição da falha. Nos dois cenários de cancelamento, quatro referências ao erro
anterior também foram corrigidas para descrição da falha, preservando os motivos
de cancelamento. No cenário progressivo, duas referências ao erro também foram
corrigidas para descrição da falha. Os demais passos service permanecem iguais; as marcações
conceituais acompanham os incrementos aprovados do modelo.
As outras três features continuam idênticas à origem.

## Critério de completude do DDD

Os 25 cenários desta feature e suas marcações são o critério acordado para avaliar
a completude conceitual do DDD de lembretes de notas pendentes. Cada incremento
deve ser confrontado com esses cenários, atualizando as evidências e lacunas
neste documento e os comentários junto às tags.

O modelo estará completo para esta feature quando permitir explicar todos os
resultados de domínio esperados, incluindo rejeições, falhas e preservação dos
dados, com informações, responsabilidades, regras e contratos definidos.
Nos cenários GUI, essa avaliação considera o significado de negócio das ações e
dos resultados; não exige desenhar as telas no diagrama de classes.

`//ok DDD (regra central)` registra cobertura limitada e não basta para declarar
completude. Enquanto houver lacunas conceituais, classificações parciais ou
pendentes, a feature continua incompleta no modelo. Mudanças de classificação
exigem evidência no modelo ou nas regras documentadas e validação com o responsável
pela feature. A completude do modelo compartilhado também depende da análise
dos cenários das outras funcionalidades da equipe.

## Como interpretar a cobertura

- **Regra central representada:** o modelo e seus comentários explicitam a regra
  principal de domínio. Não significa que o cenário inteiro foi implementado ou testado.
- **Parcial:** existem elementos úteis, mas faltam informações, regras ou contratos
  necessários para explicar o resultado completo.
- **Pendente:** a decisão ou garantia principal do cenário ainda não está modelada.

Não há testes executáveis aprovados demonstrados para esta feature. As classificações
abaixo são uma análise conceitual, não resultados de execução de passos Cucumber.
Rejeições previstas pelos cenários são resultados corretos das regras de negócio.

## Marcações junto às tags

A feature apresenta a classificação ao lado de cada `@gui` ou `@service`:

```gherkin
@gui # //ok DDD (regra central)
@service # //parcial DDD
@service # //pendente DDD
```

O `#` inicia o comentário; `//ok`, `//parcial` e `//pendente` são marcadores
visuais dentro dele. Eles não são novas tags, não alteram passos e não indicam
resultados de execução. Cada cenário tem abaixo uma evidência ou lacuna do DDD.

`//ok DDD (regra central)` corresponde à classificação **Regra central representada**,
com as condições e limites das seções abaixo. Não há marcação de aprovação
integral dos cenários GUI ou service. As contagens são 12 GUI e 10 service com `//ok`,
2 cenários com `//parcial` e 1 com `//pendente`, totalizando 12 GUI e 13 service.

## Cenários GUI

Os oito casos de configuração classificados como regra central representada
consideram a turma, a configuração, o instante obtido do relógio pelo serviço e o
prazo representado em `Class`. A leitura da configuração é coordenada por
Services.consultarConfiguracaoLembretes, Classes.buscar,
Class.obterConfiguracaoLembretes e ConfiguracaoLembretes.listar, pelas relações
já desenhadas. Ela devolve os lembretes, o prazo e a quantidade derivada da lista.
Services.configurarLembretes recebe turma, quantidade e a proposta do conjunto final,
e retorna a confirmação de sucesso ou o motivo da rejeição definido nos cenários.
Navegação, mensagens visuais e persistência não são
validadas por essa classificação. Conforme a simplificação acordada, a funcionalidade
é utilizada por um único professor, com suas turmas disponíveis, sem autenticação
ou controle de acesso entre professores. A listagem coordena consultarHistorico
e listar pelas relações existentes do servidor. A consulta de uma falha considera
o registro já fornecido no Given e sua seleção por id; os dados de destinatário e
turma são obtidos do próprio registro histórico. A filtragem combina disciplina e
turma usando a identificação já existente em turmaRegistrada. As pendências históricas
e o prazo informado no aviso estão preservados em Notificacao e são devolvidos
pela consulta de detalhes existente. As telas iniciais dos 12 cenários GUI foram
validadas com o responsável e estão explícitas nas precondições, sem usuário ou
senha: dois começam em Turmas, três em Histórico de notificações e sete em
Configuração de lembretes da turma 2026.2 de ESS. As ações e resultados seguintes
foram preservados, incluindo a abertura dos detalhes ou da configuração quando
prevista no respectivo cenário.

| Cenário | Tela inicial aprovada | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- | --- |
| [Visualização do histórico de notificações](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L23) | Turmas | Regra central representada | Services.consultarHistorico coordena HistoricoNotificacoes.listar pela associação existente; a composição com Notificacao fornece as duas tentativas e seus dados registrados, sem seleção entre professores ou alteração do histórico. |
| [Visualização dos detalhes históricos de uma notificação](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L36) | Histórico de notificações | Regra central representada | Services.consultarDetalhesNotificacao usa buscar(idNotificacao) e devolve os dados da tentativa, incluindo pendenciasRegistradas e prazoRegistrado. NotificacaoService copia o prazo da Class ao compor o registro, pelas relações existentes. O cadastro posterior das notas preserva as pendências históricas. |
| [Filtragem do próprio histórico por disciplina e turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L50) | Histórico de notificações — sem filtros aplicados | Regra central representada | Services.filtrarHistorico coordena HistoricoNotificacoes.filtrar pelas relações existentes; turmaRegistrada já identifica disciplina e turma. A seleção combina os dois critérios, exclui ESS de outro semestre e outras disciplinas do resultado e preserva todos os registros. |
| [Visualização de uma falha no próprio histórico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L66) | Histórico de notificações | Regra central representada | consultarDetalhesNotificacao usa buscar(idNotificacao) e devolve nomeDestinatario, turmaRegistrada, dataHora, motivo, resultado e descricaoFalha do registro selecionado, preservando a falha original e todos os dados. |
| [Configuração da quantidade, datas e horários dos lembretes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L78) | Turmas — turma 2026.2 de ESS disponível | Regra central representada | `atualizar` valida o conjunto final, a quantidade e os agendamentos antes de alterar a configuração. |
| [Alteração de lembrete futuro sem afetar outra turma](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L100) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `reagendar` preserva identidade e demais lembretes; configurações ficam associadas às respectivas turmas. |
| [Rejeição de quantidade de datas incompatível](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L120) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | Quantidade e conjunto final devem corresponder; rejeição preserva a configuração anterior. |
| [Rejeição de lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L139) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | Novos agendamentos ou alterações após o prazo recebido são rejeitados sem alteração parcial. |
| [Bloqueio de alteração de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L156) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `reagendar` e a atualização completa preservam os lembretes Enviados. |
| [Aumento da quantidade de lembretes configurados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L174) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `atualizar` admite o conjunto ampliado válido, preservando os existentes; quantidade não é um novo atributo permanente. |
| [Redução da quantidade de lembretes sem excluir envios realizados](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L190) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | `remove` e `atualizar` preservam os enviados e validam o total final. |
| [Rejeição de criação de lembrete em data anterior à atual](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L209) | Configuração de lembretes — turma 2026.2 de ESS | Regra central representada | A configuração rejeita novos agendamentos anteriores a `instanteAtual`, preservando o conjunto anterior. |

## Cenários service

Os quatro bloqueios classificados como regra central representada consideram as
precondições fornecidas pelos respectivos Given. Nos dois bloqueios de reenvio,
o lembrete recebido já possui o estado atual Enviado. A conclusão considera
processamento sequencial; não supõe carregamento, persistência ou proteção
concorrente implementados na aplicação.

| Cenário | Cobertura conceitual | Evidência e lacuna |
| --- | --- | --- |
| [Envio de lembrete com notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L230) | Parcial | Pendências, prazo, emailProfessor, registro, marcação Enviado e contrato de EmailSender estão representados. O comentário complementar sobre processar foi dispensado pelo responsável e deixa de ser uma alteração pendente. A classificação foi preservada até a conclusão da revisão do cenário. |
| [Ausência de envio quando todas as notas foram cadastradas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L253) | Regra central representada | Consulta sem pendências permite ignorar o Lembrete e registrar Notificacao Ignorado pelos métodos existentes, sem email ou nova tentativa. As consultas de tentativas consideram apenas Enviado/Falha, preservando a última tentativa de 20/08. O Then aprovado preserva Não enviado para o lembrete futuro de 29/08, igual ao Given. |
| [Identificação correta das notas pendentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L278) | Regra central representada | Class.identificarPendencias consulta as metas da aba Avaliações em cada matrícula. MANA, MPA e MA contam como lançadas. Meta sem registro gera pendência, mesmo quando nenhum aluno recebeu nota nela. |
| [Envio independente de lembretes para múltiplas turmas](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L295) | Parcial | Busca e pendências ficam restritas à turma indicada, com o mesmo emailProfessor e contrato de EmailSender. O comentário complementar sobre processar foi dispensado pelo responsável e deixa de ser uma alteração pendente. A classificação foi preservada até a conclusão da revisão do cenário. |
| [Bloqueio de envio de lembrete não agendado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L316) | Regra central representada | processarAgendados consulta buscarLembretesPara na configuração da turma; lista vazia rejeita a solicitação sem email ou tentativa, preservando prazo, lembretes e histórico. |
| [Bloqueio de criação de novo lembrete após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L335) | Regra central representada | Class.prazoEncerrado verifica o instante do serviço; configurarLembretes rejeita criação com o motivo Prazo acadêmico encerrado, sem alterar configuração, enviados ou histórico nem solicitar email. |
| [Reenvio automático após falha temporária](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L354) | Regra central representada | proximoReenvioEm e programarReenvio representam a programação; processar aciona um único reenvio imediato após a primeira Falha e marcarComoEnviado esvazia a programação após o sucesso. Preservam-se duas tentativas e um único lembrete enviado. A correção aprovada dos dois passos usa descrição da falha para o erro, conforme descricaoFalha. |
| [Prevenção de envio duplicado por reprocessamento de lembrete já enviado](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L376) | Regra central representada | `jaFoiEnviado()` faz `processar` encerrar sem novo email, notificação de tentativa ou reenvio; preserva lembrete e histórico. |
| [Bloqueio de novo reenvio após sucesso de tentativa anterior](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L394) | Regra central representada | O mesmo bloqueio preserva as duas notificações anteriores e impede uma terceira tentativa quando o estado recebido já é Enviado. |
| [Reenvio progressivo após falhas persistentes](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L412) | Regra central representada | processarReenvios consulta a configuração da turma, seleciona proximoReenvioEm preenchido e menor ou igual ao instante atual e delega a processar. A terceira Falha de 09:01 preserva as anteriores e programa 09:03 pelo cálculo existente. A correção aprovada dos dois passos usa descrição da falha para o erro, conforme descricaoFalha. |
| [Prevenção de envio duplicado por processamento concorrente](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L432) | Pendente | Duas execuções podem observar o estado ainda não enviado. Consulta e marcação, isoladamente, não garantem um único envio ou registro. |
| [Cancelamento de reenvio após resolução das pendências](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L448) | Regra central representada | processar consulta as notas atuais e chama Lembrete.cancelar(Nenhuma nota pendente) no reenvio: estado Cancelado, motivo preservado e proximoReenvioEm vazio, sem email ou novo registro e com as três Falhas anteriores intactas. A correção aprovada usa descrição da falha nos dois passos do histórico anterior, conforme descricaoFalha. |
| [Interrupção dos reenvios após o prazo acadêmico](../../features/Notificacao_falta_cadastrar_alguma_nota.feature#L470) | Regra central representada | processar verifica o prazo e chama Lembrete.cancelar(Prazo acadêmico encerrado) no reenvio: estado Cancelado, motivo guardado e proximoReenvioEm vazio, sem email ou novo registro e com as três Falhas anteriores intactas. A correção aprovada usa descrição da falha nos dois passos do histórico anterior, conforme descricaoFalha. |

Resultado da análise: 22 regras centrais representadas (12 GUI e 10 service),
2 cenários parciais e 1 pendente. Isso não equivale a 22 cenários completos passando.

## Seleção e execução dos reenvios cujo horário chegou

`NotificacaoService.processarReenvios(turma)` concentra a seleção pelo horário
de reenvio e reutiliza `processar(Lembrete)` para tratar cada lembrete escolhido.
O serviço localiza a Class por Classes.buscar, obtém sua configuração por
obterConfiguracaoLembretes e usa ConfiguracaoLembretes.listar, pelos caminhos existentes.

O serviço obtém uma vez o instante atual do servidor para selecionar somente os
lembretes dessa configuração com proximoReenvioEm preenchido e menor ou igual
àquele instante. A lista de selecionados é formada antes do processamento, e
cada selecionado é encaminhado uma vez a processar nessa chamada. Não há nova
seleção na mesma chamada nem alteração do agendamento original.

| Instante atual | proximoReenvioEm | Ação |
| --- | --- | --- |
| 09:00 | 09:01 | Não encaminhar |
| 09:01 | 09:01 | Chamar processar para esse lembrete |
| 09:02 | 09:03 | Não encaminhar a quarta tentativa ainda |

No cenário progressivo, a seleção de 09:01 leva à terceira tentativa. processar
verifica estado, prazo e pendências e registra a Falha; o cálculo e a programação
existentes passam proximoReenvioEm para 09:03, sem executar esse quarto envio antes
do horário. Com lista vazia, não há email, registro ou alteração dos dados.

Selecionar não autoriza email automaticamente: as regras de Enviado, Cancelado,
prazo e notas permanecem em processar. Não há campo, classe ou seta nova, nem
ação do professor na GUI. Esta é a entrada do processamento automático dos reenvios;
o mecanismo técnico de disparo não é implementado nesta análise de DDD.
A seleção considera execução sequencial e não resolve a concorrência.

O cenário progressivo tem Regra central representada: foram corrigidas, com
aprovação, somente duas expressões dos passos de erro, de motivo para descrição
da falha. Nome, tags, horários e demais passos são preservados. A correção não
altera o DDD ou o PNG; não há testes da aplicação executados.

## Cálculo do próximo reenvio no cenário progressivo

Foi aprovado `NotificacaoService.calcularProximoReenvio(lembrete, instanteAtual)`.
O método lê o histórico existente do mesmo lembrete pela origem e considera apenas
as tentativas Enviado/Falha, excluindo Ignorado e registros de outros lembretes.
No fluxo de falhas deste cenário, a quantidade é derivada desses registros,
sem contador ou atributo adicional. instanteAtual é recebido do serviço e corresponde
ao processamento da tentativa que acabou de falhar.

| Tentativas com Falha no cenário | Horário devolvido |
| --- | --- |
| Uma | instanteAtual, preservando o primeiro reenvio imediato |
| Duas | instanteAtual mais 1 minuto: próxima tentativa às 09:01 no cenário |
| Três | instanteAtual mais 2 minutos: falha às 09:01 retorna 09:03 |

O cálculo apenas devolve o horário; não altera dados, consulta o relógio, envia
email ou registra Notificacao. Após registrar a Falha, o método existente
processar utiliza o resultado para chamar Lembrete.programarReenvio(dataHora).
Os horários futuros são guardados em proximoReenvioEm sem novo envio imediato.
O agendamento original de 09:00, as três Falhas anteriores, as notas, o prazo e
o estado de aguardando envio permanecem iguais; o lembrete não é contado como Enviado.

As relações existentes com HistoricoNotificacoes e Lembrete são reutilizadas.
Não há novo campo, contador, classe ou seta. A regra cobre os intervalos exigidos
até a quarta tentativa, sem inferir outros intervalos ou limites de tentativas.
processarReenvios representa a seleção pelos horários alcançados e delega a
execução a processar, conforme a seção acima. A correção aprovada dos dois passos
de erro alinha a descrição da falha a descricaoFalha e permite classificar o cenário
como Regra central representada. Nome, tags e demais passos são preservados;
não foram executados testes da aplicação.

## Cancelamento de reenvios por notas preenchidas ou prazo encerrado

Foi aprovado apenas `Lembrete.cancelar(motivo)`, reutilizando os atributos
existentes: estado passa para Cancelado, motivo recebe a justificativa e
proximoReenvioEm fica vazio. Identidade, data, horário, participação na configuração,
outros lembretes, notas e histórico são preservados. O método não consulta notas
ou relógio, remove o lembrete, envia email nem registra Notificacao.

NotificacaoService.processar utiliza os caminhos existentes para verificar o
prazo e as pendências atuais do reenvio programado. Enviado e Cancelado encerram
novas solicitações sem outra tentativa ou programação. No reenvio ativo:

| Cenário | Motivo do cancelamento | Resultado preservado |
| --- | --- | --- |
| Nota preenchida às 09:02 antes do reenvio de 09:03 | Nenhuma nota pendente | Cancelado, sem programação, sem quarto email e com as três Falhas anteriores. |
| Prazo 31/08 às 23:59, reenvio em 01/09 às 00:00 | Prazo acadêmico encerrado | Cancelado, sem programação, sem quarto email e com as três Falhas anteriores, mesmo havendo nota pendente. |

Não há novo atributo, classe, relação ou método no serviço. A seta existente
NotificacaoService → Lembrete permite chamar cancelar. Não se cria Notificacao
Ignorado ou Cancelado nesses dois casos, nem se contabiliza o lembrete como
Enviado. A primeira tentativa após o prazo preserva seu bloqueio anterior; o
primeiro processamento sem pendências e sem tentativa anterior permanece Ignorado.

Os nomes, tags e demais passos Gherkin são preservados. Com aprovação, foram
corrigidas apenas quatro referências nos passos do histórico anterior: motivo
passa para descrição da falha, e o mesmo motivo passa para a mesma descrição da
falha. Os motivos de cancelamento Nenhuma nota pendente e Prazo acadêmico encerrado
permanecem iguais. Os dois cenários passam de Parciais para Regra central representada;
o DDD e o PNG permanecem inalterados por essa correção textual.
Nenhum teste da aplicação foi executado.

## Primeiro reenvio imediato após falha temporária

Foram aprovados `Lembrete.proximoReenvioEm` e
`Lembrete.programarReenvio(dataHora)`, além de esvaziar esse campo ao passar para
Enviado em `marcarComoEnviado()`. Vazio significa nenhum reenvio programado;
identidade, data e horário originais, estado e motivo são preservados ao programar.
Não são acrescentados contadores, classes, relações ou métodos no serviço.

Depois de registrar a primeira tentativa Falha, o método existente
NotificacaoService.processar programa para imediato e aciona novamente o mesmo
lembrete, sem ação do professor. A primeira falha é reconhecida pelo histórico
existente do mesmo lembrete: somente uma tentativa, com resultado Falha. As
consultas consideram Enviado/Falha, excluindo Ignorado e outros lembretes.
A nova execução preserva os bloqueios de Enviado e prazo e consulta as notas atuais.

No cenário de 25/08 às 09:00, a primeira Falha é preservada e o reenvio aceito
produz outra Notificacao Enviado. O mesmo lembrete passa para Enviado, com
proximoReenvioEm vazio, duas tentativas no histórico e um único lembrete enviado.
O campo guarda a próxima tentativa; não substitui o agendamento original nem
Notificacao.dataHora, que registra um resultado já ocorrido.

Se o reenvio imediato também falhar, não há novo imediato em cadeia. Os intervalos
de 1 e 2 minutos e a programação estão definidos no cálculo acima. A seleção e
execução são coordenadas por processarReenvios e processar; a concorrência continua em revisão.
O cancelamento é descrito no incremento acima. A correção aprovada altera apenas duas
expressões nos passos de falha deste cenário: a causa do erro passa a ser
descrição da falha, correspondente a descricaoFalha, em vez de motivo.
O cenário passa para Regra central representada, com nome, tags e demais passos
preservados. Os demais cenários mantêm suas classificações nesse incremento.
As referências ao erro nos dois cenários de cancelamento foram corrigidas no
incremento acima; as referências ao erro no cenário progressivo também foram alinhadas
a descrição da falha no respectivo ajuste aprovado.
Nenhum teste da aplicação foi executado.

## Nome do serviço compartilhado

O serviço de processamento passa a se chamar **NotificaçãoService**
(`NotificacaoService` na fonte). A nomenclatura foi aprovada para que a equipe
compartilhe o serviço entre os diferentes tipos de notificação. Os atributos,
métodos, relações e classificações dos cenários são preservados. As operações
atuais tratam lembretes; a renomeação não define o processamento dos outros tipos.

## Lembrete ignorado quando não há notas pendentes

Foram aprovados `Lembrete.ignorar(motivo)` e o atributo `Lembrete.motivo`.
No cenário de todas as notas cadastradas, a consulta atual das pendências retorna
uma lista vazia. O serviço chama ignorar com o motivo `Nenhuma nota pendente`,
pela seta existente NotificacaoService → Lembrete, sem solicitar email nem registrar
uma Notificacao de tentativa. Não são acrescentados métodos em NotificacaoService
ou novas relações.

O método altera apenas estado e motivo do lembrete: ele passa para Ignorado,
preservando id, data e horário. A operação não consulta notas ou relógio, envia
email ou registra histórico. O motivo do Lembrete justifica ter sido ignorado;
essa justificativa também é guardada em Notificacao.motivo no registro Ignorado.
Nas tentativas de envio, Notificacao.motivo continua representando o propósito do aviso.

O lembrete de 25/08 às 09:00 é ignorado, sem contar como Enviado. O lembrete
enviado de 20/08, suas notificações, o lembrete futuro de 29/08, o prazo e os
demais dados são preservados. O nome e os demais passos Gherkin são preservados;
a única correção aprovada no cenário ajusta o Then do lembrete futuro.

O cenário passa para Regra central representada: a transição, a decisão de não
enviar e o registro do processamento Ignorado estão representados, e a correção
aprovada preserva Não enviado para o lembrete de 29/08 no Given e no Then.
Esse lembrete futuro não foi processado. A correção do Then não alterou o DDD
ou o PNG nem unificou estados. O cancelamento foi definido no incremento próprio.

A proposta de acrescentar `registrarProcessamento`, coleção ou classe de registro
foi substituída pelo reaproveitamento aprovado de Notificacao e dos métodos
existentes registrar e listar, detalhado a seguir.

## Reaproveitamento de Notificacao para o processamento Ignorado

Notificacao passa a representar o resultado de um processamento, que pode ser
Enviado, Falha ou Ignorado. Somente Enviado e Falha representam tentativas de
envio de email. O resultado Ignorado registra que o lembrete foi verificado e
dispensado porque não há notas pendentes, sem acrescentar campo, método, classe,
coleção ou relação. Uma anotação no PNG torna essa distinção visível.

| Campo existente | Registro Ignorado do cenário |
| --- | --- |
| resultado | Ignorado |
| motivo | Nenhuma nota pendente |
| descricaoFalha | Vazio |
| pendenciasRegistradas | Lista vazia |

O registro recebe seu próprio id e dataHora do processamento, preserva o professor,
a turma e seu prazo naquele momento e é acrescentado por
HistoricoNotificacoes.registrar(Notificacao), pela relação já existente com
NotificacaoService. Lembrete.ignorar continua alterando apenas o próprio lembrete.

HistoricoNotificacoes.listar retorna os três resultados. Nas consultas de
tentativas, selecionar somente Enviado e Falha pelo resultado. No cenário, o
processamento de 25/08 fica registrado como Ignorado, sem email ou nova tentativa;
a última tentativa continua sendo a de 20/08 com resultado Enviado. Os registros
anteriores e o lembrete futuro são preservados. Filtrar e buscar reutilizam os
dados históricos existentes, sem alterar registros.

O reaproveitamento preservou os nomes, passos, tags e classificações dos cenários.
A correção aprovada do Then de 29/08 encerra a divergência de estado e permite
classificar a ausência de envio como Regra central representada. Os demais
cenários preservam suas classificações nesse reaproveitamento. A concorrência continua em revisão.

## Destinatário dos lembretes

O atributo aprovado `NotificacaoService.emailProfessor` representa a configuração do
endereço do único professor, disponível antes do processamento automático.
`processar(Lembrete)` utiliza esse endereço como destinatário ao solicitar envio
a `EmailSender`, pela seta já existente. As turmas utilizam o mesmo destinatário.
No cenário de envio, o valor configurado é `paulo.borba@example.com`.

Este incremento acrescenta apenas esse atributo ao diagrama; não acrescenta
nomeProfessor, entidade Professor, operação de cadastro ou relação. Os nomes e
passos Gherkin permanecem iguais. Os dois cenários de envio continuam Parciais:
o contrato de envio foi detalhado no incremento de EmailSender abaixo. O comentário
complementar sobre processar foi dispensado pelo responsável e não será exigido
como alteração estrutural ou pendência adicional.

## Contrato aprovado de EmailSender

`EmailSender` recebe a operação `send(destinatario, assunto, conteudo)`. O retorno
informa aceitação pelo serviço de email ou falha acompanhada da descrição do erro.
Aceitação não confirma entrega ou leitura. O método `send(String[])` e a relação
com GradeNotification são preservados.

Este incremento não altera NotificacaoService ou as setas. O responsável dispensou
a proposta de comentário complementar sobre `processar(Lembrete)`: ela não
acrescentaria método, atributo ou seta. Os dois cenários de envio permanecem
Parciais até a conclusão da revisão conceitual; essa decisão não altera suas
classificações nem demonstra execução de testes.

## Responsabilidades e regra da identificação de pendências

`Class.identificarPendencias()` consulta as metas da aba Avaliações em cada
matrícula com `Enrollment.getEvaluationForGoal(meta)`. A ausência de registro
gera uma pendência com o CPF, o nome do aluno e a meta. O CPF permite agrupar
as metas de alunos homônimos e fica fora da mensagem. MANA, MPA e MA contam
como notas lançadas.

No cenário, João está sem nota em Design e Tests. Maria tem MANA em Design e
está sem nota em Tests. A consulta devolve essas três pendências e preserva as
notas. O prazo acadêmico é verificado pelo processamento do lembrete antes de
consultar as pendências para envio.

A lista pendenciasRegistradas de uma Notificacao antiga preserva o histórico e
não substitui a consulta das notas atuais. O processamento dos reenvios é
coordenado pela entrada processarReenvios, descrita acima.
As regras de Ignorado e Cancelado estão descritas nos incrementos acima.

## Percurso da consulta da configuração de lembretes

- **Métodos aprovados:** Services.consultarConfiguracaoLembretes(turma),
  Classes.buscar(turma), Class.obterConfiguracaoLembretes() e
  ConfiguracaoLembretes.listar() ficam visíveis nas respectivas classes.
- **Acesso:** Services localiza a Class selecionada por Classes e obtém sua
  configuração. A configuração lista seus lembretes pelas relações já existentes.
- **Dados apresentados:** devolver id, data, horário e estado de cada lembrete,
  o prazoAcademico da mesma Class e a quantidade calculada pelo total da lista,
  incluindo os lembretes Enviados. Não se acrescenta quantidade como atributo.
- **Configuração inicial:** sem lembretes, retornar lista vazia e quantidade zero,
  preservando o prazo da turma e as configurações das demais turmas.
- **Preservação:** a consulta não modifica registros, consulta o relógio, solicita
  email ou processa lembretes. Após uma atualização aceita, apresenta o conjunto
  salvo; após uma rejeição, continua apresentando o conjunto anterior preservado.

Essa consulta completa o percurso de leitura utilizado pelos oito cenários GUI
de configuração, alteração, aumento, redução e rejeições. O incremento acrescenta
somente quatro métodos no desenho; relações, atributos, cliente, Email Service,
Interface e todos os nomes, tags e passos Gherkin permanecem inalterados.
Os parâmetros e retornos de configurarLembretes foram detalhados no incremento
descrito a seguir. A retirada de autenticação foi aprovada posteriormente, com
as telas iniciais registradas na matriz GUI. As classificações não mudam neste
incremento.

## Percurso do salvamento da configuração

Services.configurarLembretes(turma, quantidade, lembretesPropostos) recebe os dados
da edição e retorna uma mensagem String. A turma é localizada por Classes.buscar;
Class.obterConfiguracaoLembretes permite acessar a configuração. O serviço obtém
o instante atual do relógio e o prazo da mesma Class para coordenar atualizar.
As associações existentes permitem todo esse percurso.

| Situação dos cenários GUI | Retorno esperado |
| --- | --- |
| Criar, reagendar, aumentar ou reduzir com uma proposta válida | Configuração salva com sucesso |
| Solicitar três lembretes e deixar o terceiro sem data e horário | Selecione exatamente 3 datas e horários |
| Agendamento proposto posterior ao prazo acadêmico | Data posterior ao prazo acadêmico |
| Tentar alterar um lembrete Enviado | Lembretes enviados não podem ser alterados |
| Agendamento proposto anterior ao instante atual | Não é possível agendar lembretes em datas anteriores à data atual |

O número na mensagem de quantidade corresponde ao total solicitado. Uma rejeição
preserva toda a configuração anterior, os identificadores, os estados, o prazo
da turma e o histórico. Uma proposta válida preserva os Enviados, as outras turmas
e o histórico, aplicando integralmente as regras já descritas em atualizar.
A consulta da configuração permite apresentar o conjunto salvo após o resultado.

A rejeição existente de criação de novo lembrete após o prazo continua com o
motivo Prazo acadêmico encerrado. Salvar não solicita email nem processa lembretes.
O incremento altera somente a assinatura de configurarLembretes no desenho;
atributos, relações, demais métodos e todos os cenários Gherkin são preservados.
As classificações permanecem iguais. Posteriormente, a retirada de autenticação
foi aprovada com a tela inicial explícita em cada cenário GUI, conforme a matriz.

## Percursos do incremento de prazo e busca por agendamento

- **Criação após o prazo:** Class fornece 31/08/2026 às 23:59; o serviço obtém
  01/09/2026 às 08:00 do relógio. A consulta retorna verdadeiro e a criação é
  rejeitada com o motivo do cenário, preservando o enviado de 25/08 e o histórico.
- **Agendamento inexistente:** a configuração contém somente 20/08 e 25/08;
  buscar 27/08 às 09:00 retorna lista vazia. O serviço rejeita a solicitação,
  preservando os dois enviados, o prazo e o histórico, sem nova tentativa.
- **Consultas sem efeitos:** antes do prazo ou exatamente nele, prazoEncerrado
  retorna falso; a busca pode retornar zero, um ou vários lembretes da mesma
  turma, preservando seus estados. Nenhuma consulta solicita email.
- **Reprocessamento preservado:** se a busca encontrar um Enviado, processar
  aplica jaFoiEnviado e mantém os registros anteriores. Uma solicitação atrasada
  usa o agendamento informado; a busca não o substitui pelo horário do relógio.
- **Configuração preservada:** continuam as validações de quantidade, datas,
  preservação de enviados e isolamento entre turmas dos oito casos GUI.

Os percursos são uma verificação conceitual das regras, sem implementação na
aplicação. O estado Ignorado, seu registro e a consulta de pendências foram
aprovados nos incrementos descritos acima. A obtenção automática de vencidos,
o mecanismo técnico de disparo dessa entrada e a concorrência não são implementados
nesta análise; processarReenvios representa a seleção e execução dos reenvios.

## Percursos do bloqueio por prazo no processamento

- **Reenvio após o prazo:** com prazo em 31/08/2026 às 23:59 e processamento em
  01/09/2026 às 00:00, processar verifica o prazo antes de EmailSender. Retorna
  Prazo acadêmico encerrado e chama cancelar, sem email ou nova tentativa,
  preservando as três falhas anteriores, id e agendamento; o estado passa para
  Cancelado, o motivo é guardado e proximoReenvioEm fica vazio.
- **Primeira tentativa após o prazo:** aplicar o mesmo bloqueio, sem alterar os
  dados do lembrete, da turma ou do histórico.
- **Antes ou exatamente no prazo:** a consulta retorna falso e o serviço continua
  com as demais verificações. Isso não comprova a identificação das pendências
  nem autoriza automaticamente o envio.
- **Enviado após o prazo:** o bloqueio de reprocessamento continua sendo a primeira
  verificação; não há nova tentativa ou mudança de Enviado para outro estado.

O cenário de interrupção tem Regra central representada. O comportamento inclui
cancelar e preservar o motivo no atributo existente, encerrando a programação.
A correção aprovada dos dois passos do histórico usa descrição da falha para o
erro anterior, preservando o motivo de cancelamento. Essa correção não altera
o DDD ou o PNG; os percursos continuam conceituais.

## Percursos da consulta de uma falha no histórico

- **Dados do cenário:** o id selecionado encontra o registro de Paulo Borba,
  turma 2026.2 de ESS, em 23/08/2026 às 09:00. O serviço devolve Notas pendentes,
  Falha e Tempo limite excedido no envio, além do nome, turma e data/hora registrados.
- **Seleção inequívoca:** uma falha e um reenvio imediato têm ids distintos,
  mesmo que apareçam com igual data e horário. A busca retorna a tentativa escolhida.
- **Preservação após sucesso:** registrar outra notificação Enviado não modifica
  o id, o resultado, o contexto ou a descrição da falha anterior.
- **Contexto preservado:** alterações posteriores na identificação atual da turma
  ou no nome do destinatário não alteram os valores da notificação registrada.
- **Ausência e leitura:** um id inexistente indica ausência; consultas não criam
  registros, alteram estados, solicitam email ou executam reenvios.

No incremento da consulta de falha, esse cenário mudou de Parcial para Regra
central representada. Os detalhes históricos têm as pendências e o prazo
preservados nos incrementos descritos adiante. A listagem foi completada no
incremento a seguir. Esses percursos
consideram os dados do Given, sem modelar autenticação, RBAC ou a navegação da interface.

## Percurso da listagem do histórico

- **Contexto aprovado:** um único professor utiliza a funcionalidade com suas turmas
  disponíveis. O cenário começa na tela Turmas e não exige autenticação nem seleção
  de notificações entre professores.
- **Métodos e relações:** Services.consultarHistorico acessa HistoricoNotificacoes
  pela seta já existente e coordena listar. A composição com Notificacao fornece
  os registros do histórico. listar está visível na classe do servidor; cliente,
  Email Service, Interface e suas relações permanecem inalterados.
- **Dados apresentados:** retornar a tentativa da turma 2026.2 de ESS, em
  25/08/2026 às 09:00, com motivo Notas pendentes e resultado Enviado, e a da turma
  2026.2 de Introdução a Programação, em 27/08/2026 às 09:00, com o mesmo motivo
  e resultado Falha. Os dados são os registrados nas respectivas notificações.
- **Preservação:** a consulta mantém todos os registros, seus identificadores e
  estados, sem solicitar email ou reenvio.

A regra central do cenário de listagem passa de Parcial para representada.
Esta é uma validação conceitual do domínio; não acrescenta métodos de navegação
às classes do cliente. A filtragem, as pendências históricas e o prazo registrado
nos detalhes são descritos a seguir.

## Percurso da filtragem do histórico

- **Métodos aprovados:** Services.filtrarHistorico(disciplina, turma) coordena
  HistoricoNotificacoes.filtrar(disciplina, turma). A associação entre as classes
  e a composição com Notificacao já existem; não são acrescentadas relações.
- **Dados existentes:** turmaRegistrada identifica a turma e sua disciplina,
  como 2026.2 de ESS. Não se acrescenta disciplinaRegistrada nem outro atributo
  em Notificacao. O filtro usa os dados históricos registrados.
- **Resultado do cenário:** selecionando ESS e 2026.2 de ESS, retornar a notificação
  de 25/08/2026 às 09:00, com motivo Notas pendentes e resultado Enviado. As
  notificações de 2026.1 de ESS e 2026.2 de Introdução a Programação ficam fora
  desse resultado, mas permanecem no histórico com todos os seus dados.
- **Preservação:** a filtragem mantém identificadores, datas, motivos, resultados
  e demais dados. A consulta não envia email nem executa reenvio.

A regra central de filtragem passa de Pendente para representada. As classes do
cliente, Email Service, Interface, Notificacao e todas as relações permanecem
inalteradas. No incremento da filtragem, o nome e os passos do cenário Gherkin
foram preservados. Depois, a autenticação foi retirada com aprovação do responsável:
o cenário começa com o professor no Histórico de notificações, sem filtros aplicados.

## Percurso das pendências históricas nos detalhes

- **Dado aprovado:** Notificacao acrescenta apenas pendenciasRegistradas, uma
  lista dos alunos e avaliações sem nota informados naquela tentativa.
- **Conteúdo preservado:** a notificação de 25/08/2026 às 09:00 registra João da
  Silva - Prova 2 e Maria Souza - Projeto 1. O cadastro das notas 8,0 e 9,0 em
  26/08/2026 às 10:00 não altera essa lista anterior.
- **Consulta existente:** Services.consultarDetalhesNotificacao coordena
  HistoricoNotificacoes.buscar(idNotificacao) e devolve também a lista registrada
  na tentativa selecionada. Não recalcula as pendências pelas notas atuais.
- **Tentativas distintas:** cada novo registro preserva sua própria lista; o
  registro de um reenvio não modifica a lista da tentativa anterior.

O único acréscimo no desenho é o atributo pendenciasRegistradas em Notificacao.
Os métodos e relações existentes atendem à consulta. Cliente, Email Service,
Interface, demais classes, nomes e passos dos cenários permanecem inalterados.
O prazo registrado foi acrescentado em um incremento separado, aprovado e
descrito a seguir.

## Percurso do prazo registrado nos detalhes

- **Dado aprovado:** Notificacao acrescenta prazoRegistrado, com o prazo acadêmico
  informado naquela tentativa. Class.prazoAcademico permanece como prazo oficial
  utilizado na configuração e no processamento dos lembretes.
- **Origem do valor:** NotificacaoService acessa a mesma Class por Classes, como já
  previsto no processamento, e copia seu prazo ao compor a Notificacao registrada
  em HistoricoNotificacoes. Todas essas relações já estão desenhadas.
- **Resultado do cenário:** a consulta da notificação de 25/08/2026 às 09:00
  devolve prazoRegistrado de 31/08/2026 às 23:59 e as pendências João da Silva -
  Prova 2 e Maria Souza - Projeto 1. A data/hora da tentativa continua distinta
  da data limite para cadastrar as notas.
- **Consulta e preservação:** Services.consultarDetalhesNotificacao usa o método
  buscar(idNotificacao) existente e devolve também prazoRegistrado. Registrar
  outra tentativa preserva o prazo e os demais dados dos registros anteriores.

O único acréscimo deste incremento no desenho é prazoRegistrado em Notificacao;
os métodos e as relações existentes são mantidos. O cenário de detalhes passa
de Parcial para Regra central representada. Seus nomes e passos permanecem
inalterados; esta classificação é conceitual e não comprova execução da interface.

## Verificação de descoberta e execução (registro histórico)

Os resultados desta seção referem-se à versão anterior com 26 cenários, antes da
retirada aprovada do cenário de restrição às próprias turmas. Não foram refeitos
nesta revisão conceitual e não representam uma verificação dos 25 cenários atuais.

O runner do projeto em `client/cucumber.js` aponta apenas para
`client/src/features/**/*.feature`. Importar `features/` na raiz torna os arquivos
visíveis nesta branch, mas não os inclui automaticamente nesse runner.
Os passos existentes em `client/src/step-definitions/` tratam de cadastro de alunos.
Também não foram encontradas implementações de Lembrete, Notificacao ou EmailSender
em `client/src/` e `server/src/`.

Foi feita uma verificação com Cucumber.js 12.2.0 instalado isoladamente em `/tmp`,
carregando os passos reais existentes em modo `--dry-run`, com publicação de
relatórios desabilitada. Nenhum passo ou hook foi executado na aplicação.
As dependências e configurações do projeto permaneceram inalteradas.

| Arquivo importado | Resultado do dry-run sobre o original da main, antes das marcações |
| --- | --- |
| `Notificacao_falta_cadastrar_alguma_nota.feature` | Erro de parsing na linha 234: o separador SERVICE não é um comentário Gherkin. |
| `atualizacao_notas.feature` | Erro de parsing desde a linha 1: os cenários não estão sob um cabeçalho Feature. |
| `desempenho.feature` | Erro de parsing no final do arquivo: o marcador de três crases é interpretado como início de doc string sem fechamento. |
| `notification.feature` | 10 cenários descobertos, com 54 passos undefined; não houve execução funcional. |

Para separar o problema de sintaxe da ausência de passos, foi usada uma cópia
temporária da feature de lembretes, apenas comentando os dois separadores de
seção; os textos de todos os passos foram preservados. Nessa cópia, foram
descobertos os 26 cenários: todos possuem passos undefined, totalizando 341
passos sem definição. As 14 definições existentes do projeto foram carregadas;
13 hooks Before e 13 After foram ignorados pelo modo dry-run.

O código de saída zero de um dry-run não comprova aprovação funcional. Nenhum
dos 26 cenários foi demonstrado como teste executável passando nesta verificação.
Na versão então verificada, as marcações de acompanhamento acrescentavam apenas
comentários à feature de lembretes e não corrigiam os separadores de seção.
Seus passos permaneciam idênticos aos da main, assim como o conteúdo completo
das outras três features. As correções
de sintaxe, a integração do runner e a implementação dos passos ficam para trabalho posterior.
As três outras features foram verificadas quanto à descoberta, sem avaliação
de sua cobertura de negócio neste modelo de lembretes.
