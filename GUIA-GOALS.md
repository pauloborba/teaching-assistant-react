# 📋 Guia Completo - Sistema de Goals (Metas)

## 🎯 O que é o Sistema de Goals?

O sistema de Goals permite que professores definam metas/objetivos de aprendizado para cada turma, com pesos percentuais. Por exemplo:
- Requirements Analysis (20%)
- Software Design (25%)
- Testing & Quality (20%)
- Refactoring (15%)
- Configuration Management (20%)

## 🚀 Como Testar o Sistema

### 1️⃣ Iniciar os Servidores

**Terminal 1 - Backend:**
```bash
cd teaching-assistant-react\backend
npm run dev
```
O backend rodará em: `http://localhost:3005`

**Terminal 2 - Frontend:**
```bash
cd teaching-assistant-react\frontend
npm start
```
O frontend rodará em: `http://localhost:3004`

### 2️⃣ Acessar a Aplicação

Abra o navegador em: `http://localhost:3004`

### 3️⃣ Gerenciar Goals de uma Turma

#### **Passo a Passo:**

1. **Acesse a lista de turmas**
   - Clique no menu superior em "**Classes**"
   - Você verá todas as turmas cadastradas

2. **Entre no gerenciamento de goals**
   - Clique no botão "**Manage Goals**" de uma turma
   - Você será redirecionado para `/classes/{classId}/goals`

3. **Visualize os goals existentes**
   - A turma "ESS 2025/1" já vem com 5 goals de exemplo:
     - Requirements Analysis (20%)
     - Software Design (25%)
     - Testing & Quality (20%)
     - Refactoring (15%)
     - Configuration Management (20%)
   - **Total Weight: 100%** (aparece em verde quando soma 100%)

### 4️⃣ Adicionar um Novo Goal

1. Role até a seção "➕ Add New Goal"
2. Preencha:
   - **Description**: Nome do goal (ex: "Project Management")
   - **Weight (%)**: Peso de 0 a 100 (ex: 10)
3. Clique em "➕ Add Goal"
4. O goal aparecerá na tabela acima

**Nota:** O indicador de peso total mudará de cor:
- 🟢 Verde: Exatamente 100%
- 🟡 Amarelo: Menos de 100%
- 🔴 Vermelho: Mais de 100%

### 5️⃣ Editar um Goal

1. Na tabela de goals, clique em "✏️ Edit" no goal desejado
2. Os campos aparecerão editáveis na linha
3. Modifique a descrição e/ou peso
4. Clique em "💾 Save" para salvar
5. Ou clique em "❌ Cancel" para cancelar

### 6️⃣ Deletar um Goal

1. Clique em "🗑️ Delete" no goal que deseja remover
2. Confirme a exclusão no popup
3. O goal será removido imediatamente

### 7️⃣ **TESTAR CLONE DE GOALS** 🎯

Esta é a funcionalidade principal! Permite copiar todos os goals de uma turma para outra.

#### **Cenário de Teste:**

1. **Prepare a turma de origem** (já está pronta!)
   - A turma "ESS 2025/1" tem 5 goals (100% de peso)

2. **Vá para a turma de destino**
   - Volte para "Classes" (menu superior)
   - Clique em "Manage Goals" da turma "ESS 2025/2"
   - Esta turma ainda não tem goals

3. **Use o Clone Goals**
   - No topo da página, você verá a caixa rosa:
     **"📋➡️📋 Clone Goals into this Class"**
   
4. **Selecione a fonte**
   - No dropdown "📚 Select Source Class"
   - Escolha "Engenharia de Software e Sistemas - 2025/1"

5. **Execute o clone**
   - Clique no botão "🚀 Clone Goals"
   - Aguarde a mensagem de sucesso: ✅ "Successfully cloned X goals"

6. **Verifique o resultado**
   - A página recarregará automaticamente
   - Todos os 5 goals aparecerão na lista
   - Cada um terá um **novo ID único**
   - As datas de criação serão **preservadas** da origem

7. **Teste a independência**
   - Edite um goal na turma de destino
   - Volte para a turma de origem (ESS 2025/1)
   - Verifique que o goal original **não foi alterado**
   - ✅ Os goals são independentes após a clonagem!

### 8️⃣ Casos de Teste Adicionais

#### **Teste 1: Clone para turma já com goals**
- Clone goals para uma turma que já tem goals próprios
- Os novos goals serão **adicionados** aos existentes (não substituem)

#### **Teste 2: Clone múltiplo**
- Clone goals da turma A para turma B
- Depois clone goals da turma B para turma C
- Cada operação cria novos IDs únicos

#### **Teste 3: Validação de peso**
- Adicione goals até ultrapassar 100%
- O indicador ficará vermelho
- Ajuste os pesos até totalizar 100% (verde)

## 📊 Estrutura de Dados

Cada goal tem:
```typescript
{
  id: string,           // UUID único
  description: string,  // Nome do goal
  weight: number,       // Peso de 0-100
  createdAt: Date      // Data de criação (ISO string)
}
```

## 🎨 Melhorias Visuais Implementadas

✅ **Indicador de peso total** com cores semafórica
✅ **Emojis** para melhor usabilidade
✅ **Tabela responsiva** com colunas organizadas
✅ **Formulários inline** para edição rápida
✅ **Mensagens de sucesso/erro** estilizadas
✅ **Datas formatadas** em português (dd/mm/aaaa)
✅ **Caixa destacada** para Clone Goals (rosa com borda vermelha)
✅ **Estado vazio amigável** quando não há goals

## 🧪 Testes Automatizados

**Backend:**
```bash
cd backend
npm test
```
- 20 testes unitários para o modelo Goal
- 100% de cobertura
- Testa: constructor, getters/setters, clone, JSON serialization, edge cases

**Frontend:**
```bash
cd frontend
npm test
```
- Testes de componentes: GoalsManagement, CloneGoalsForm
- React Testing Library

**E2E:**
```bash
cd frontend
npx playwright test
```
- Testa fluxo completo de navegação, criação, clone e validação

## 🐛 Troubleshooting

**Erro "Failed to fetch":**
- Verifique se o backend está rodando na porta 3005
- Execute: `cd backend && npm run dev`

**Goals não aparecem:**
- Recarregue a página (F5)
- Verifique o console do navegador (F12) para erros

**Total Weight errado:**
- Verifique os pesos individuais
- Edite os goals para ajustar

## 📝 Notas Importantes

1. **IDs únicos**: Cada goal tem um UUID único, mesmo após clone
2. **Data preservada**: A data de criação é mantida ao clonar
3. **Independência**: Goals clonados são cópias independentes
4. **Validação cliente**: Pesos devem ser 0-100
5. **Confirmação**: Delete requer confirmação do usuário

## 🎉 Pronto!

Agora você pode gerenciar e clonar goals entre turmas facilmente! 🚀

**Principais features:**
- ✅ CRUD completo de goals
- ✅ Clone entre turmas
- ✅ Validação de pesos
- ✅ Interface intuitiva
- ✅ Dados de exemplo incluídos
