# 🎯 Guia: Criar Turmas e Clonar Goals

## 📋 O que é Clone Goals?

**Clone Goals** permite copiar todos os goals (metas de avaliação) de uma turma antiga para uma turma nova, economizando tempo ao reutilizar a estrutura de avaliação entre semestres.

## 🚀 Como Executar

```bash
npm run dev
```
- Backend: http://localhost:3005
- Frontend: http://localhost:3004 (abre automaticamente)

## ✅ Passo a Passo Completo

### **1. Verificar Turmas Existentes**

1. Acesse http://localhost:3004
2. Clique em **"Classes"** no menu lateral
3. Você verá as turmas existentes:
   - ✅ **ESS 2025/1** (tem 5 goals definidos)
   - 📝 **ESS 2025/2** (sem goals - pronta para clonagem)

### **2. Criar uma Nova Turma**

1. Na página **Classes**, role até o formulário **"Add New Class"**
2. Preencha:
   - **Topic**: `Programação Orientada a Objetos`
   - **Year**: `2026`
   - **Semester**: `1st Semester`
3. Clique em **"Add Class"**
4. ✅ Nova turma criada: **POO 2026/1** (sem goals)

### **3. Acessar Goals da Turma Nova**

1. Na lista de turmas, encontre **POO 2026/1**
2. Clique no botão **"🎯 Manage Goals"**
3. Você verá:
   - Mensagem: "📝 No goals defined for this class yet"
   - Seção rosa: **"📋➡️📋 Clone Goals into this Class"**

### **4. Clonar Goals de Turma Antiga**

1. Na seção **"Clone Goals into this Class"**:
   - No dropdown **"📚 Select Source Class"**, selecione:
     - `Engenharia de Software e Sistemas - 2025/1`
   - Clique no botão **"🚀 Clone Goals"**

2. ✅ **Sucesso!** Mensagem verde aparecerá:
   - "✅ Goals cloned successfully"

3. A página atualizará automaticamente mostrando os 5 goals clonados:
   - Requirements Analysis (20%)
   - Software Design (25%)
   - Testing & Quality (20%)
   - Refactoring (15%)
   - Configuration Management (20%)
   - **Total Weight: 100%** (indicador verde)

### **5. Editar Goals Clonados (Opcional)**

Após clonar, você pode personalizar os goals:

1. Clique no botão **"✏️ Edit"** de qualquer goal
2. Modifique a descrição ou peso
3. Clique em **"💾 Save"**

Ou adicione novos goals usando o formulário **"➕ Add New Goal"**

## ⚠️ Regras Importantes

### ✅ **Permite Clonar Quando:**
- A turma de destino **não tem goals** (array vazio)
- A turma de origem **tem pelo menos 1 goal**

### ❌ **NÃO Permite Clonar Quando:**
- A turma de destino **já possui goals**
  - Mensagem: "❌ This class already has goals defined. Please delete all existing goals before cloning"
- A turma de origem **não tem goals**
  - Mensagem: "⚠️ The source class has no goals to clone. Please select a different class."

## 💡 Dicas

### **Reutilizar Estrutura de Avaliação:**
```
ESS 2025/1 (5 goals) ──┐
                        ├──> POO 2026/1 (5 goals clonados)
                        ├──> ESS 2026/2 (5 goals clonados)
                        └──> Estruturas de Dados 2026/1 (5 goals clonados)
```

### **Workflow Típico:**
1. No primeiro semestre, crie goals manualmente na turma inicial
2. Nos semestres seguintes:
   - Crie nova turma
   - Clone goals da turma anterior
   - Ajuste os pesos/descrições conforme necessário

### **Deletar Goals (se necessário):**
Se você clonou por engano e quer reclonar:
1. Delete todos os goals individualmente (botão 🗑️ Delete)
2. Confirme cada exclusão
3. Quando todos forem deletados, você pode clonar novamente

## 📊 Estrutura de Dados

### **Turma Sem Goals:**
```json
{
  "topic": "Programação Orientada a Objetos",
  "semester": 1,
  "year": 2026,
  "goals": [],
  "enrollments": []
}
```

### **Turma Com Goals (após clonagem):**
```json
{
  "topic": "Programação Orientada a Objetos",
  "semester": 1,
  "year": 2026,
  "goals": [
    {
      "id": "uuid-novo-1",
      "description": "Requirements Analysis",
      "weight": 20,
      "createdAt": "2025-11-30T20:00:00.000Z"
    },
    // ... mais 4 goals
  ],
  "enrollments": []
}
```

## 🎓 Casos de Uso

### **Caso 1: Disciplina Regular (mesma ementa)**
- Clone goals da turma anterior do mesmo semestre
- Exemplo: ESS 2024/1 → ESS 2025/1

### **Caso 2: Disciplina Similar (ementa parecida)**
- Clone goals de disciplina relacionada
- Ajuste pesos conforme necessário
- Exemplo: ESS → Arquitetura de Software

### **Caso 3: Evolução de Ementa**
- Clone goals da turma anterior
- Delete goals obsoletos
- Adicione novos goals
- Rebalanceie pesos para 100%

## ✅ Checklist de Teste

- [ ] Criar nova turma via formulário
- [ ] Acessar "Manage Goals" da turma nova
- [ ] Verificar que não tem goals (array vazio)
- [ ] Selecionar turma de origem no dropdown
- [ ] Clicar em "Clone Goals"
- [ ] Verificar mensagem de sucesso
- [ ] Confirmar que os 5 goals apareceram
- [ ] Verificar que o Total Weight = 100%
- [ ] Editar um goal clonado (opcional)
- [ ] Adicionar um novo goal (opcional)
- [ ] Verificar que mudanças são salvas

## 🐛 Solução de Problemas

### **Erro: "Destination class already has goals"**
- **Causa**: A turma já possui goals
- **Solução**: Delete todos os goals antes de clonar

### **Erro: "Source class has no goals to clone"**
- **Causa**: A turma selecionada não tem goals
- **Solução**: Selecione outra turma com goals definidos

### **Goals não aparecem após clonar**
- **Causa**: Cache do navegador
- **Solução**: Recarregue a página (F5 ou Ctrl+R)

### **Total Weight não é 100%**
- **Causa**: Goals clonados podem ter pesos desbalanceados
- **Solução**: Edite os pesos para somar 100%

## 📚 Referências

- **Backend**: `/api/classes/:sourceClassId/clone-goals/:destClassId` (POST)
- **Modelo**: `backend/src/models/Goal.ts` (método `clone()`)
- **Componente**: `frontend/src/components/CloneGoalsForm.tsx`
- **Serviço**: `frontend/src/services/GoalService.ts`

---

**🎉 Pronto!** Agora você pode criar turmas novas e reutilizar goals de turmas antigas facilmente!
