# Guia de Testes com Jest

Este documento descreve como criar e executar testes unitários do servidor usando Jest.

## Pré-requisitos

Certifique-se de que as dependências estão instaladas:

```bash
npm install
```

## Estrutura dos Testes

Os testes estão localizados no diretório `src/__tests__/`:

- `Student.test.ts` - Testes para a classe Student
- `server.test.ts` - Testes para as rotas da API
- `setup.ts` - Configuração inicial dos testes

## Configuração do Jest

A configuração do Jest está definida em `jest.config.json`:

- **Test Environment**: Node.js
- **Preset**: ts-jest (para suporte a TypeScript)
- **Test Match**: Arquivos `*.test.ts` e `*.spec.ts` no diretório `__tests__`
- **Coverage**: Coleta cobertura de todos os arquivos `.ts` em `src/`, exceto `server.ts`, `index.ts` e arquivos `.d.ts`

## Como Criar Testes

### Estrutura Básica de um Teste

Crie um arquivo com sufixo `.test.ts` no diretório `src/__tests__/`:

```typescript
import { describe, test, expect } from '@jest/globals';

describe('Nome do Componente/Classe', () => {
  test('deve descrever o comportamento esperado', () => {
    // Arrange (preparar)
    const valor = 2 + 2;
    
    // Act (executar)
    // ... código a ser testado
    
    // Assert (verificar)
    expect(valor).toBe(4);
  });
});
```

### Testando Classes

Exemplo de teste para uma classe:

```typescript
import { Student } from '../models/Student';

describe('Student', () => {
  test('deve criar um estudante com os dados corretos', () => {
    const student = new Student('123', 'João Silva', 'joao@example.com', 'CPF123');
    
    expect(student.getId()).toBe('123');
    expect(student.getName()).toBe('João Silva');
    expect(student.getEmail()).toBe('joao@example.com');
  });
  
  test('deve lançar erro quando dados são inválidos', () => {
    expect(() => {
      new Student('', 'Nome', 'email@test.com', 'CPF123');
    }).toThrow();
  });
});
```

### Testando Rotas da API

Use `supertest` para testar endpoints HTTP:

```typescript
import request from 'supertest';
import app from '../server';

describe('POST /students', () => {
  test('deve criar um novo estudante', async () => {
    const newStudent = {
      id: '123',
      name: 'Maria Santos',
      email: 'maria@example.com',
      cpf: 'CPF456'
    };
    
    const response = await request(app)
      .post('/students')
      .send(newStudent)
      .expect(201);
    
    expect(response.body).toMatchObject(newStudent);
  });
  
  test('deve retornar erro 400 com dados inválidos', async () => {
    const invalidStudent = { name: 'Sem ID' };
    
    await request(app)
      .post('/students')
      .send(invalidStudent)
      .expect(400);
  });
});
```

### Setup e Teardown

Use `beforeEach`, `afterEach`, `beforeAll`, `afterAll` para preparar e limpar o ambiente de testes:

```typescript
describe('Testes que precisam de setup', () => {
  beforeEach(() => {
    // Executado antes de cada teste
  });
  
  afterEach(() => {
    // Executado após cada teste
  });
  
  beforeAll(() => {
    // Executado uma vez antes de todos os testes
  });
  
  afterAll(() => {
    // Executado uma vez após todos os testes
  });
});
```

### Mocks e Spies

Para testar código que depende de serviços externos:

```typescript
import { jest } from '@jest/globals';

test('deve usar um mock', () => {
  const mockFunction = jest.fn();
  mockFunction.mockReturnValue('valor mockado');
  
  const result = mockFunction();
  
  expect(result).toBe('valor mockado');
  expect(mockFunction).toHaveBeenCalledTimes(1);
});
```

## Comandos de Teste

### Executar todos os testes

Para executar todos os testes uma vez:

```bash
npm test
```

### Executar testes em modo watch

Para executar os testes em modo watch (reexecuta automaticamente quando há mudanças nos arquivos):

```bash
npm run test:watch
```

### Executar testes com cobertura

Para executar os testes e gerar relatório de cobertura:

```bash
npm run test:coverage
```

O relatório de cobertura será gerado no diretório `coverage/` e você pode visualizar o relatório HTML em `coverage/index.html`.

### Executar um teste específico

```bash
npm test -- Student.test.ts
```

### Executar testes com verbose output

```bash
npm test -- --verbose
```

### Executar testes e atualizar snapshots

```bash
npm test -- -u
```

## Visualizando Relatórios de Cobertura

Após executar `npm run test:coverage`, abra o arquivo de relatório no navegador:

```bash
# Linux
xdg-open coverage/index.html

# macOS
open coverage/index.html

# Windows
start coverage/index.html
```

## Matchers Úteis

```typescript
// Igualdade
expect(value).toBe(4);                    // Igualdade estrita (===)
expect(obj).toEqual({ name: 'João' });    // Igualdade profunda

// Verdade
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Números
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);           // Para floats

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objetos
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ name: 'João' });

// Exceções
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('mensagem de erro');

// Funções mockadas
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
```
