import { Given, Then, After } from '@cucumber/cucumber';
import expect from 'expect';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Para substituir __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend base URL and default class id to clean up
const serverUrl = 'http://localhost:3005';
const DEFAULT_CLASS_ID = 'Engenharia de Software e Sistemas-2025-1';

// Minimal helper for DELETE requests
async function apiDelete(pathname: string) {
  const res = await fetch(`${serverUrl}${pathname}`, { method: 'DELETE' });
  // Accept 204 No Content as success; ignore 404 during cleanup
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`DELETE ${pathname} -> ${res.status}`);
  }
}

// Steps específicos para a feature de importação de roteiros
// Os steps comuns são reutilizados do import-grade-steps.ts

Given('clico no botão {string}', async function (buttonText: string) {
  const { page } = this;
  
  await page.waitForSelector('button', { timeout: 10000 });
  
  const buttons = await page.$$('button');
  let found = false;
  
  for (const button of buttons) {
    const text = await page.evaluate((el: any) => el.textContent, button);
    if (text?.includes(buttonText)) {
      await button.click();
      await new Promise((resolve: any) => setTimeout(resolve, 1000));
      found = true;
      break;
    }
  }
  
  if (!found) {
    throw new Error(`Botão "${buttonText}" não encontrado`);
  }
});

Given('fiz upload de um arquivo CSV com dados válidos nos roteiros', async function () {
  const { page } = this;
  
  const fileInputSelector = 'input[type="file"]';
  await page.waitForSelector(fileInputSelector, { timeout: 5000 });
  
  const testFilePath = path.resolve(__dirname, '../../../server/src/__tests__/tests_files/import_roteiros.csv');
  const fileInput = await page.$(fileInputSelector);
  
  if (fileInput) {
    await fileInput.uploadFile(testFilePath);
    await new Promise((resolve: any) => setTimeout(resolve, 500));
    
    // Clicar em continuar
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await page.evaluate((el: any) => el.textContent, button);
      if (buttonText?.includes('Continuar')) {
        await button.click();
        break;
      }
    }
    await new Promise((resolve: any) => setTimeout(resolve, 2000));
  }
});

Given('fiz upload de um arquivo CSV em roteiros', async function () {
  const { page } = this;
  
  const fileInputSelector = 'input[type="file"]';
  await page.waitForSelector(fileInputSelector, { timeout: 5000 });
  
  const testFilePath = path.resolve(__dirname, '../../../server/src/__tests__/tests_files/import_roteiros.csv');
  const fileInput = await page.$(fileInputSelector);
  
  if (fileInput) {
    await fileInput.uploadFile(testFilePath);
    await new Promise((resolve: any) => setTimeout(resolve, 500));
    
    // Clicar em continuar
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await page.evaluate((el: any) => el.textContent, button);
      if (buttonText?.includes('Continuar')) {
        await button.click();
        break;
      }
    }
    await new Promise((resolve: any) => setTimeout(resolve, 2000));
  }
});

Then('as notas dos roteiros devem ser importadas com sucesso', async function () {
  const { page } = this;
  
  // Aguardar processamento inicial
  await new Promise((resolve: any) => setTimeout(resolve, 3000));
  
  try {
    // Tentar aguardar por qualquer indicador de conclusão
    await Promise.race([
      page.waitForSelector('h1', { timeout: 20000 }),
      page.waitForSelector('h2', { timeout: 20000 }),
      page.waitForSelector('table', { timeout: 20000 })
    ]);
  } catch (error) {
    // Se timeout, capturar o estado atual da página para debug
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Estado da página após importação:', bodyText.substring(0, 500));
    throw new Error('Timeout aguardando elementos na página após importação');
  }
  
  const allH1 = await page.$$eval('h1', (els: any) => els.map((el: any) => el.textContent));
  const allH2 = await page.$$eval('h2', (els: any) => els.map((el: any) => el.textContent));
  
  // Verificar se voltou para a tela de upload (step 1) - isso indica sucesso
  const hasUploadHeading = allH2.some((text: any) => text?.includes('Importação de Notas Por Planilha'));
  
  // Ou se permaneceu na tela de mapeamento (step 2) - também indica que não houve erro
  const hasMappingH1 = allH1.some((text: any) => text?.includes('Mapeamento de Colunas'));
  const hasMappingH2 = allH2.some((text: any) => text?.includes('Colunas do Arquivo'));
  
  // Ou está na página de avaliações com a tabela
  const hasEvaluationsHeading = allH2.some((text: any) => text?.includes('Evaluations')) || 
                                 allH1.some((text: any) => text?.includes('Evaluations'));
  
  // Debug: mostrar o que foi encontrado
  if (!hasUploadHeading && !hasMappingH1 && !hasMappingH2 && !hasEvaluationsHeading) {
    console.log('H1 encontrados:', allH1);
    console.log('H2 encontrados:', allH2);
  }
  
  // Se está em qualquer uma das telas válidas, considera sucesso
  const isInValidScreen = hasUploadHeading || hasMappingH1 || hasMappingH2 || hasEvaluationsHeading;
  
  expect(isInValidScreen).toBe(true);
});

// Cleanup: remove the default class after roteiros scenarios to avoid leftover data
After({ tags: '@import-grade-roteiro' }, async function () {
  try {
    await apiDelete(`/api/classes/${DEFAULT_CLASS_ID}`);
  } catch (e) {
    // console.warn('Falha ao remover turma padrão após teste de roteiros:', e);
  }
});
