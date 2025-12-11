# Feature: Geração de Lotes de Provas (PDF/ZIP)

## 📄 Descrição da Funcionalidade

Esta feature implementa o fluxo completo de **Geração, Embaralhamento e Exportação de Provas**. O objetivo é permitir que o professor gere múltiplas versões de uma mesma prova para evitar "cola", entregando tudo em um pacote ZIP organizado.

**Capacidades principais:**
1.  **Geração de Versões:** Criação automática de $N$ variações da prova, onde a ordem das questões e das alternativas é embaralhada (`Shuffle`).
2.  **PDFs Automatizados:** Geração dinâmica de PDFs contendo a Prova (Aluno) e o Gabarito (Professor).
3.  **Empacotamento (ZIP):** Download de um único arquivo `.zip` contendo todos os arquivos gerados.
4.  **Histórico (Gerações):** Persistência dos metadados da geração para consulta futura.

---

## 🧪 Estratégia de Testes

A suíte de testes foi desenhada seguindo a Pirâmide de Testes e os conceitos apresentados nos slides da disciplina (**Testing.pdf** e **Requirements.pdf**).

### 1. Testes de Unidade / Classe (Unit Testing)
**Foco:** Verificar a **Corretude** (Correctness) e **Robustez** da lógica interna, isolando dependências externas (Slide 122, 370).

| Arquivo de Teste | O que testa | Justificativa Teórica | Como Rodar |
| :--- | :--- | :--- | :--- |
| `algorithms.test.ts` | Algoritmos de embaralhamento (`shuffleArray`). | **Slide 7 (Correctness):** Garante matematicamente que a ordem das questões é alterada. Se falhar, a prova perde a validade. | `cd server && npm test -- algorithms` |
| `dataService.generation.test.ts` | Lógica de geração de IDs (`getNextGenerationId`) no serviço de dados. | **Slide 122 (Stubs):** Testa a lógica de negócio do serviço isolada do sistema de arquivos (usando Mocks/Stubs). | `cd server && npm test -- dataService` |

### 2. Testes de Integração (Integration Testing)
**Foco:** Verificar se os módulos (Controller, Gerador PDF, Banco de Dados) conversam corretamente (Slide 128).

| Arquivo de Teste | O que testa | Justificativa Teórica | Como Rodar |
| :--- | :--- | :--- | :--- |
| `pdfContent.test.ts` | Gera um PDF real, extrai o texto e valida Data, Professor e Questões. | **Slide 128 (Integration):** Valida a integração entre a API e a lib `pdfkit`. Garante a integridade dos dados gerados. | `cd server && npm test -- pdfContent` |
| `examFlow.test.ts` | Fluxo de Geração e Histórico: Simula uma requisição real de ZIP, verificando se o arquivo é retornado (200 OK) e se o registro da geração é persistido corretamente na memória do servidor. | Slide 128 (Integration): Testa a integração completa: Rota API -> Lógica de Negócio -> Atualização do Estado (Banco em Memória). | `cd server && npm test -- examFlow` |
| `generation.test.ts` | Criação e persistência do registro de geração (histórico). | **Slide 128:** Valida se, ao gerar o ZIP, o registro é salvo corretamente no "banco" (JSON). | `cd server && npm test -- generation` |

### 3. Testes de Sistema / Aceitação de API (API System Testing)
**Foco:** Validar os requisitos funcionais e cenários de erro via API (Slide 132).

| Arquivo (Feature/Steps) | O que testa | Justificativa Teórica | Como Rodar |
| :--- | :--- | :--- | :--- |
| `pdf-generation/success.feature`<br>`pdf-generation/success.steps.ts` | Caminho feliz: API retorna 200, Headers corretos e ZIP válido. | **Slide 132 (Requirements):** Validação de requisitos funcionais de sucesso. | `cd server && npm test -- success` |
| `pdf-generation/validation.feature`<br>`pdf-generation/success.failure.ts` | Robustez: Envio de IDs inválidos, datas erradas ou turmas inexistentes. | **Slide 7 (Robustness):** O sistema deve rejeitar entradas inválidas (*Fail Fast*). | `cd server && npm test -- validation` |

### 4. Testes de Sistema GUI / Unidade de GUI (GUI Testing)
**Foco:** Validar a interface visual e o fluxo do usuário no navegador (Slide 370).

| Arquivo (Feature/Steps) | O que testa | Justificativa Teórica | Como Rodar |
| :--- | :--- | :--- | :--- |
| `pdf-generation.feature`<br>`pdf-generation.steps.ts` | Simula o clique no botão, abertura do modal e trigger de download. Inclui cenário `@unit` para verificar estado do botão. | **Slide 370 (Presentation & GUI):** Teste focado na camada de apresentação e usabilidade (botões visíveis/habilitados). | `cd client && npx cucumber-js --tags "@pdf-only"` |

---

## ♻️ Refatorações Aplicadas

O código foi refatorado para eliminar "Maus Cheiros" (Bad Smells) e melhorar a manutenibilidade, conforme o material **Refactoring.pdf**.

### 1. Extract Method (Extração de Método)
* **Onde:** `server/src/routes/exams.ts`
* **Ação:** A função `handleGetExamZIP` era um "Long Method". Extraímos a lógica complexa para:
    * `createRandomizedVersion()`: Responsável pelo embaralhamento.
    * `mapVersionAnswers()`: Responsável pelo mapeamento de gabaritos.
* **Justificativa (Slide 16):** *"Break down long methods"*. Melhora a legibilidade e permite testar o embaralhamento isoladamente.

### 2. Rename Variable / Explaining Variable
* **Onde:** `server/src/routes/exams.ts`
* **Ação:** Substituição de variáveis curtas ou acessos diretos (`req.query.quantity`) por variáveis explicativas (`copiesRequested`, `downloadFileName`).
* **Justificativa (Slide 16):** *"Code communicates intent"*. O código documenta a intenção sem necessidade de comentários excessivos.

### 3. Remove Duplication (Remoção de Duplicidade)
* **Onde:** `server/src/services/dataService.ts`
* **Ação:** Centralização da lógica de escrita de arquivos JSON com tratamento de erro na função `writeJsonSafe`, usada por `saveExams` e `saveGenerations`.
* **Justificativa (Slide 15):** *"Duplicated code is the number one bad smell"*. Centraliza a manutenção da persistência.

### 4. Fail Fast (Robustez)
* **Onde:** `isValidDate` em `server/src/routes/exams.ts`.
* **Ação:** Adição de Cláusulas de Guarda para validar a data recebida antes de processar o PDF.
* **Justificativa:** Aumenta a **Robustez** (Slide 7 do Testing.pdf), garantindo que dados inválidos sejam rejeitados imediatamente com erro 400.