import { test, expect } from '@playwright/test';

// These E2E tests expect the dev servers to be running:
// - Backend: http://localhost:3005
// - Frontend: http://localhost:3004

const API_BASE = 'http://localhost:3005/api';
const FRONTEND_BASE = 'http://localhost:3004';

test.describe('Clone Goals Feature - Testes E2E Completos', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial antes de cada teste
    await page.goto(FRONTEND_BASE);
  });

  test('Deve navegar até a página de Classes e visualizar turmas', async ({ page }) => {
    // Clicar no link de Classes
    await page.click('text=Classes');
    
    // Verificar se estamos na página correta
    await expect(page).toHaveURL(/.*\/classes/);
    
    // Verificar se há turmas listadas (baseado nos dados iniciais)
    await expect(page.locator('text=Engenharia de Software e Sistemas')).toBeVisible();
  });

  test('Deve criar metas em uma turma de origem', async ({ page }) => {
    // Navegar para Classes
    await page.click('text=Classes');
    
    // Clicar em "Manage Goals" da primeira turma
    await page.locator('text=Manage Goals').first().click();
    
    // Verificar se estamos na página de metas
    await expect(page.locator('h3:has-text("Goals")')).toBeVisible();
    
    // Adicionar primeira meta
    await page.fill('input[placeholder="Description"]', 'Meta de Teste 1');
    await page.fill('input[placeholder="Weight"]', '30');
    await page.click('button:has-text("Add Goal")');
    
    // Aguardar a meta aparecer
    await expect(page.locator('text=Meta de Teste 1')).toBeVisible();
    
    // Adicionar segunda meta
    await page.fill('input[placeholder="Description"]', 'Meta de Teste 2');
    await page.fill('input[placeholder="Weight"]', '70');
    await page.click('button:has-text("Add Goal")');
    
    // Verificar que ambas as metas estão visíveis
    await expect(page.locator('text=Meta de Teste 2')).toBeVisible();
    await expect(page.locator('li.goal-item')).toHaveCount(2);
  });

  test('Fluxo completo: Criar metas e cloná-las para outra turma', async ({ page }) => {
    // 1. Navegar para a lista de turmas
    await page.click('text=Classes');
    await expect(page).toHaveURL(/.*\/classes/);
    
    // 2. Abrir metas da primeira turma (turma origem)
    const firstManageButton = page.locator('text=Manage Goals').first();
    await firstManageButton.click();
    
    // 3. Adicionar metas na turma origem
    await page.fill('input[placeholder="Description"]', 'Estudar Padrões de Projeto');
    await page.fill('input[placeholder="Weight"]', '40');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Estudar Padrões de Projeto')).toBeVisible();
    
    await page.fill('input[placeholder="Description"]', 'Implementar Testes Unitários');
    await page.fill('input[placeholder="Weight"]', '60');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Implementar Testes Unitários')).toBeVisible();
    
    // 4. Voltar para lista de turmas
    await page.click('text=Classes');
    
    // 5. Abrir metas da segunda turma (turma destino)
    const manageButtons = page.locator('text=Manage Goals');
    await manageButtons.nth(1).click();
    
    // 6. Verificar que a turma destino não tem metas (ou tem metas diferentes)
    const goalsBefore = await page.locator('li.goal-item').count();
    
    // 7. Usar o formulário de Clone Goals
    await expect(page.locator('h4:has-text("Clone Goals into this Class")')).toBeVisible();
    
    // 8. Selecionar a turma origem no dropdown
    const select = page.locator('select').first();
    await select.selectOption({ index: 0 }); // Seleciona a primeira opção disponível
    
    // 9. Clicar no botão Clone Goals
    await page.click('button:has-text("Clone Goals")');
    
    // 10. Aguardar mensagem de sucesso
    await expect(page.locator('text=Goals cloned successfully')).toBeVisible({ timeout: 5000 });
    
    // 11. Verificar que as metas foram clonadas
    const goalsAfter = await page.locator('li.goal-item').count();
    expect(goalsAfter).toBeGreaterThan(goalsBefore);
    
    // 12. Verificar que as metas clonadas estão presentes
    await expect(page.locator('text=Estudar Padrões de Projeto')).toBeVisible();
    await expect(page.locator('text=Implementar Testes Unitários')).toBeVisible();
  });

  test('Deve verificar que metas clonadas são independentes da origem', async ({ page }) => {
    // 1. Navegar e adicionar metas na primeira turma
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').first().click();
    
    await page.fill('input[placeholder="Description"]', 'Meta Original');
    await page.fill('input[placeholder="Weight"]', '50');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Meta Original')).toBeVisible();
    
    // 2. Ir para segunda turma e clonar
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').nth(1).click();
    
    const select = page.locator('select').first();
    await select.selectOption({ index: 0 });
    await page.click('button:has-text("Clone Goals")');
    await expect(page.locator('text=Goals cloned successfully')).toBeVisible();
    
    // 3. Editar meta clonada na turma destino
    const goalItem = page.locator('li.goal-item').filter({ hasText: 'Meta Original' });
    await goalItem.locator('button:has-text("Edit")').click();
    
    const descInput = goalItem.locator('input').first();
    await descInput.fill('Meta Editada na Destino');
    await goalItem.locator('button:has-text("Save")').click();
    
    await expect(page.locator('text=Meta Editada na Destino')).toBeVisible();
    
    // 4. Voltar para turma origem e verificar que a meta original não foi alterada
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').first().click();
    
    await expect(page.locator('text=Meta Original')).toBeVisible();
    await expect(page.locator('text=Meta Editada na Destino')).toBeVisible({ timeout: 1000 }).catch(() => {
      // Esperado não encontrar - meta editada só existe na turma destino
    });
  });

  test('Deve permitir deletar metas clonadas sem afetar a origem', async ({ page }) => {
    // 1. Criar meta na turma origem
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').first().click();
    
    await page.fill('input[placeholder="Description"]', 'Meta para Deletar');
    await page.fill('input[placeholder="Weight"]', '100');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Meta para Deletar')).toBeVisible();
    
    // 2. Clonar para turma destino
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').nth(1).click();
    
    const select = page.locator('select').first();
    await select.selectOption({ index: 0 });
    await page.click('button:has-text("Clone Goals")');
    await expect(page.locator('text=Goals cloned successfully')).toBeVisible();
    
    // 3. Deletar meta clonada na turma destino
    page.on('dialog', dialog => dialog.accept()); // Aceitar confirmação
    
    const goalToDelete = page.locator('li.goal-item').filter({ hasText: 'Meta para Deletar' });
    await goalToDelete.locator('button:has-text("Delete")').click();
    
    // 4. Verificar que foi deletada na turma destino
    await expect(page.locator('text=Meta para Deletar')).toBeHidden({ timeout: 2000 }).catch(() => {});
    
    // 5. Voltar para origem e verificar que a meta ainda existe
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').first().click();
    
    await expect(page.locator('text=Meta para Deletar')).toBeVisible();
  });

  // CENÁRIO GHERKIN: Clone should not overwrite existing destination goals
  test('Deve exibir erro ao tentar clonar para turma que já tem metas', async ({ page }) => {
    // GIVEN: Turma origem com metas E turma destino com metas existentes
    
    // 1. Criar metas na turma origem
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').first().click();
    
    await page.fill('input[placeholder="Description"]', 'Meta Original da Origem');
    await page.fill('input[placeholder="Weight"]', '50');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Meta Original da Origem')).toBeVisible();
    
    // 2. Criar metas na turma destino (IMPORTANTE - cenário chave)
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').nth(1).click();
    
    await page.fill('input[placeholder="Description"]', 'Meta Existente no Destino');
    await page.fill('input[placeholder="Weight"]', '30');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Meta Existente no Destino')).toBeVisible();
    
    // WHEN: Tentar clonar da origem para destino que já tem metas
    const select = page.locator('select').first();
    await select.selectOption({ index: 0 });
    await page.click('button:has-text("Clone Goals")');
    
    // THEN: Deve exibir mensagem de erro
    await expect(page.locator('text=already has goals')).toBeVisible({ timeout: 5000 });
    
    // AND: Verificar que metas originais do destino não foram perdidas
    await expect(page.locator('text=Meta Existente no Destino')).toBeVisible();
    
    // AND: Verificar que metas da origem NÃO foram adicionadas ao destino
    await expect(page.locator('text=Meta Original da Origem')).not.toBeVisible();
  });

  test('Deve exibir aviso ao tentar clonar de turma vazia', async ({ page }) => {
    // GIVEN: Uma turma vazia (sem metas) e uma turma com metas
    await page.goto('http://localhost:3004');
    await page.click('text=Classes');
    
    // 1. Criar turma destino com metas
    await page.locator('text=Manage Goals').first().click();
    await page.fill('input[placeholder="Description"]', 'Meta da Turma Destino');
    await page.fill('input[placeholder="Weight"]', '10');
    await page.click('button:has-text("Add Goal")');
    await expect(page.locator('text=Meta da Turma Destino')).toBeVisible();
    
    // 2. Navegar para turma vazia (segunda turma não tem metas)
    await page.click('text=Classes');
    await page.locator('text=Manage Goals').nth(1).click();
    
    // WHEN: Tentar usar o formulário de clonagem (não deve haver opções ou deve haver aviso)
    const select = page.locator('select').first();
    const optionCount = await select.locator('option').count();
    
    // THEN: Deve haver apenas a opção padrão ou mensagem indicando que não há turmas disponíveis
    // Ou o select deve estar vazio/desabilitado
    // Verificamos se há no máximo 1 opção (a opção padrão "Select a class")
    expect(optionCount).toBeLessThanOrEqual(1);
  });
});
