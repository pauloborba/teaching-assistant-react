# Integração — Criar Questões e Criar Provas

Teaching Assistant | Guia para a feature Gerar PDFs

## 1. Escopo e dependências

As features Criar Questões e Criar Provas cadastram, validam, consultam e persistem questões e conjuntos de questões. A geração dos documentos PDF, suas versões, gabaritos e arquivos de distribuição pertence à feature Gerar PDFs. A página específica de geração de PDFs não faz parte desta entrega.

Este guia descreve o contrato construído durante o desenvolvimento e validado nos testes relatados. Os nomes dos arquivos devem ser conferidos na branch integrada caso a equipe tenha feito alterações posteriores.

## 2. API HTTP

Todos os exemplos de códigos são ilustrativos. Na aplicação, os identificadores são UUIDs. Use a URL base configurada em `client/src/services/apiClient.ts`; o ambiente empregado durante o desenvolvimento usou a porta 3005 para o backend.

| Método | Rota | Resultado de sucesso |
|---|---|---|
| GET | `/api/questions` | 200: `Question[]` |
| POST | `/api/questions` | 201: `Question` |
| GET | `/api/exams` | 200: `Exam[]` |
| POST | `/api/exams` | 201: `Exam` |
| GET | `/api/exams/:code` | 200: `ExamDetail` |

Uma listagem vazia retorna `[]`. Requisições que violam regras de domínio retornam HTTP 400; a consulta de uma prova inexistente retorna HTTP 404. O formato de erro utilizado nas rotas é `{ "error": "mensagem" }`.

### Tipos do contrato

```ts
interface Alternative {
  text: string;
  isTrue: boolean;
}
interface Question {
  code: string;
  subject: string;
  statement: string;
  alternatives: Alternative[];
}
interface Exam {
  code: string;
  name: string;
  questionCodes: string[];
}
interface ExamDetail extends Exam {
  questions: Question[];
  subjects: string[];
}
```

### Cadastro de questão

`POST /api/questions` — corpo da requisição:

```json
{
  "subject": "Gerência de configuração",
  "statement": "Qual comando une branches?",
  "alternatives": [
    { "text": "merge", "isTrue": true },
    { "text": "log", "isTrue": false }
  ]
}
```

O identificador é gerado pelo servidor.

### Cadastro de prova

`POST /api/exams` — corpo da requisição:

```json
{
  "name": "Prova de Git",
  "questionCodes": ["q-001"]
}
```

Substitua `q-001` pelo código de uma questão existente.

### Consulta para geração de documentos

`GET /api/exams/:code` — exemplo de resposta:

```json
{
  "code": "exam-001",
  "name": "Prova de Git",
  "questionCodes": ["q-001"],
  "subjects": ["Gerência de configuração"],
  "questions": [
    {
      "code": "q-001",
      "subject": "Gerência de configuração",
      "statement": "Qual comando une branches?",
      "alternatives": [
        { "text": "merge", "isTrue": true },
        { "text": "log", "isTrue": false }
      ]
    }
  ]
}
```

A lista `questions` preserva a ordem de `questionCodes`. A lista `subjects` contém os assuntos distintos. A classificação é individual para cada alternativa: não se deve pressupor que exista exatamente uma alternativa verdadeira.

## 3. Reutilização no frontend

Arquivos relevantes em `client/src/`:

- `types/Question.ts`: formato de questões.
- `types/Exam.ts`: `Exam`, `CreateExamRequest` e `ExamDetail`.
- `services/QuestionService.ts`: consulta e criação de questões.
- `services/ExamService.ts`: consulta e criação de provas.
- `services/apiClient.ts`: comunicação HTTP e tratamento de erros.
- `components/ExamList.tsx`: consulta de provas cadastradas e detalhes; pode ser reutilizado ou adaptado pelo responsável pela próxima feature.

Exemplo, em um componente ou serviço que necessite dos dados:

```ts
import { examService } from '../services/ExamService';

const exams = await examService.getAllExams();
// selectedCode é o identificador escolhido pelo professor.
const detail = await examService.getExamByCode(selectedCode);
```

Trate carregamento, ausência de provas e falhas de requisição na tela de geração.

## 4. Reutilização no backend

Arquivos relevantes em `server/src/`:

| Arquivo | Responsabilidade |
|---|---|
| `models/Question.ts` | Representação e validação de questão |
| `models/QuestionBank.ts` | Coleção de questões e prevenção de duplicatas |
| `models/Exam.ts` | Nome, código e referências às questões de uma prova |
| `models/ExamBank.ts` | Cadastro, validações e consultas de provas |
| `routes/questions.ts` | API de questões |
| `routes/exams.ts` | API de provas |
| `persistence/JsonQuestionRepository.ts` | Persistência das questões |
| `persistence/JsonExamRepository.ts` | Persistência das provas |
| `app.ts` / `index.ts` | Injeção de dependências e inicialização |

Métodos de `ExamBank`:

```ts
getAllExams(): Exam[];
findExamByCode(code: string): Exam | undefined;
getQuestionsForExam(examCode: string): Question[];
getSubjectsForExam(examCode: string): string[];
```

O `Exam` fornece `getQuestionCodes(): string[]` e `toJSON()`. `Question.toJSON()` retorna os dados serializáveis da questão.

Se a geração for implementada no servidor, injete a mesma instância de `ExamBank` já criada em `index.ts`. Não crie coleções independentes nem faça requisições HTTP ao próprio servidor sem necessidade. O exemplo abaixo é uma função auxiliar ilustrativa para obter dados independentes dos objetos do domínio, não um gerador de PDFs:

```ts
import { ExamBank } from '../models/ExamBank';

export function readExamForGeneration(bank: ExamBank, code: string) {
  const exam = bank.findExamByCode(code);
  if (!exam) throw new Error('Prova não encontrada');

  return {
    ...exam.toJSON(),
    questions: bank.getQuestionsForExam(code).map(q => q.toJSON()),
    subjects: bank.getSubjectsForExam(code)
  };
}
```

Adapte o tratamento de prova inexistente ao padrão `HttpError` das rotas. Embaralhe cópias dos arrays de questões e alternativas; mantenha `text` e `isTrue` juntos ao permutar alternativas. Não altere os objetos cadastrados. Não exponha `isTrue` nos documentos destinados aos alunos: utilize-o somente na produção do gabarito e na lógica interna. A API atual é um contrato para o fluxo do professor; autenticação/autorização, se necessária, deve ser alinhada com a equipe.

## 5. Regras e persistência

- Questões exigem assunto, enunciado e pelo menos uma alternativa válida. As alternativas usam texto não vazio e classificação booleana.
- Questões equivalentes não devem ser cadastradas novamente apenas por reorganizar alternativas. Mesmo enunciado com alternativas diferentes é permitido.
- Provas exigem nome e pelo menos uma questão existente. Não admitem questões repetidas nem nomes duplicados; a ordem da seleção é preservada.
- Os arquivos são `server/data/questions.json` e `server/data/exams.json` no ambiente de execução habitual. As provas armazenam referências (`questionCodes`), não cópias completas das questões.
- As questões são recuperadas antes das provas no início do servidor. Os identificadores devem permanecer estáveis entre reinícios.
- Não remova ou altere identificadores diretamente nos arquivos JSON. Edição e exclusão de questões/provas não fazem parte deste contrato.
- A associação a turmas/alunos, numeração de versões, cálculo de combinações, geração de PDFs e empacotamento não são fornecidos pelos modelos atuais.

## 6. Validação e integração

Na pasta `server`:

```sh
npm run build
npm test -- --runInBand
```

Na pasta `client`:

```sh
npm run build
npm test -- --watchAll=false --runInBand
```

Os testes Cypress-Cucumber de interface utilizam respostas simuladas para preservar os dados reais; a validação das regras do backend é feita com Jest/Supertest e testes de persistência. No ambiente de desenvolvimento, valide a integração consultando uma prova real pela API antes de iniciar a geração dos documentos.
