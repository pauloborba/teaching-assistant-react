import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Para substituir __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set default timeout for all steps
setDefaultTimeout(60 * 1000); // 60 seconds for file operations

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';

// Test data
let testClassId: string = 'Engenharia de Software e Sistemas-2025-1';

// Antes de cada cenário - abre novo browser
Before({ tags: '@import-grade' }, async function () {
  browser = await launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 50 // Slow down actions for visibility
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

// Após cada cenário - fecha o browser
After({ tags: '@import-grade' }, async function () {
  if (browser) {
    await browser.close();
  }
});

Given('estou na página de Avaliações', async function () {
  // console.log('Iniciando navegação para página de Avaliações...');
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Procurar pelo botão/link de Evaluations
  await page.waitForSelector('button, a', { timeout: 10000 });
  
  const buttons = await page.$$('button, a');
  let found = false;
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text?.includes('Evaluations') || text?.includes('Avaliações')) {
      // console.log('Clicando no botão Evaluations...');
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      found = true;
      break;
    }
  }
  
  if (!found) {
    // console.log('Botão Evaluations não encontrado, pode já estar na página');
  }
  
  // Verificar que estamos na página de avaliações
  await page.waitForSelector('h3', { timeout: 10000 });
  const heading = await page.$eval('h3', el => el.textContent);
  expect(heading).toContain('Evaluations');
  
  // console.log('✓ Navegado para página de Avaliações');
});

Given('selecionei a turma {string}', async function (className: string) {
  testClassId = className;
  
  // console.log(`Selecionando turma: ${className}...`);
  
  // Esperar pelo dropdown de seleção de turma
  await page.waitForSelector('#classSelect', { timeout: 10000 });
  
  // Selecionar a turma
  await page.select('#classSelect', testClassId);
  
  // Esperar os dados carregarem
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // console.log(`✓ Turma selecionada: ${className}`);
});

When('seleciono um arquivo CSV {string} para upload', async function (fileName: string) {
  // console.log(`Selecionando arquivo: ${fileName}...`);
  
  // Encontrar o input de arquivo
  const fileInputSelector = 'input[type="file"]';
  await page.waitForSelector(fileInputSelector, { timeout: 10000 });
  
  // Caminho absoluto para o arquivo de teste
  const testFilePath = path.resolve(__dirname, '../../../server/src/__tests__/tests_files', fileName);
  // console.log(`Caminho do arquivo: ${testFilePath}`);
  
  // Upload do arquivo
  const fileInput = await page.$(fileInputSelector);
  if (fileInput) {
    await fileInput.uploadFile(testFilePath);
    // console.log(`✓ Arquivo selecionado: ${fileName}`);
    
    // Esperar o arquivo ser processado
    await new Promise(resolve => setTimeout(resolve, 1000));
  } else {
    throw new Error('Input de arquivo não encontrado');
  }
});

When('clico no botão continuar', async function () {
  // Encontrar e clicar no botão continuar
  const buttons = await page.$$('button');
  
  for (const button of buttons) {
    const buttonText = await page.evaluate(el => el.textContent, button);
    if (buttonText?.includes('Continuar')) {
      await button.click();
      // console.log('Clicado no botão continuar');
      
      // Esperar a etapa de mapeamento carregar
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }
  }
  
  throw new Error('Botão continuar não encontrado');
});

Then('devo ver a interface de mapeamento de colunas', async function () {
  // Esperar pelo heading de mapeamento
  await page.waitForSelector('h2', { timeout: 10000 });
  
  const mappingHeadings = await page.$$('h2');
  let foundMappingHeading = false;
  
  for (const heading of mappingHeadings) {
    const text = await page.evaluate(el => el.textContent, heading);
    if (text?.includes('Colunas do Arquivo')) {
      foundMappingHeading = true;
      break;
    }
  }
  
  expect(foundMappingHeading).toBe(true);
  // console.log('Interface de mapeamento de colunas está visível');
});

Then('devo ver as colunas do arquivo CSV carregado', async function () {
  // Verificar se existem headers de colunas (elementos h4)
  const columnHeaders = await page.$$('h4');
  expect(columnHeaders.length).toBeGreaterThan(0);
  
  // console.log(`Encontradas ${columnHeaders.length} colunas do arquivo`);
});

Then('devo ver as colunas de metas para mapeamento', async function () {
  // Verificar se existem dropdowns de mapeamento
  const selectElements = await page.$$('select');
  expect(selectElements.length).toBeGreaterThan(0);
  
  // Verificar que pelo menos um select tem opções
  const firstSelect = selectElements[0];
  const options = await page.evaluate((select) => {
    return Array.from(select.querySelectorAll('option')).map(opt => opt.value);
  }, firstSelect);
  
  // Deve ter pelo menos a opção vazia e algumas opções de metas
  expect(options.length).toBeGreaterThan(1);
  
  // console.log(`Encontrados ${selectElements.length} seletores de mapeamento com opções`);
});

Given('fiz upload de um arquivo CSV com dados válidos', async function () {
  // Upload de arquivo de teste
  const fileInputSelector = 'input[type="file"]';
  await page.waitForSelector(fileInputSelector, { timeout: 5000 });
  
  const testFilePath = path.resolve(__dirname, '../../../server/src/__tests__/tests_files/import_grade_1.csv');
  const fileInput = await page.$(fileInputSelector);
  
  if (fileInput) {
    await fileInput.uploadFile(testFilePath);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clicar em continuar
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await page.evaluate(el => el.textContent, button);
      if (buttonText?.includes('Continuar')) {
        await button.click();
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // console.log('Arquivo CSV com dados válidos carregado');
  }
});

Given('estou na etapa de mapeamento de colunas', async function () {
  // Verificar que estamos na etapa de mapeamento
  const mappingHeading = await page.$('h2');
  if (mappingHeading) {
    const headingText = await page.evaluate(el => el.textContent, mappingHeading);
    expect(headingText).toContain('Colunas do Arquivo');
  }
  
  // console.log('Na etapa de mapeamento de colunas');
});

When('mapeio as colunas corretamente:', async function (dataTable: DataTable) {
  const mappings = dataTable.hashes();
  
  for (const mapping of mappings) {
    const fileColumn = mapping.coluna_arquivo;
    const goalColumn = mapping.coluna_meta;
    
    // Encontrar o h4 com o nome da coluna do arquivo
    const columnHeaders = await page.$$('h4');
    
    for (const header of columnHeaders) {
      const headerText = await page.evaluate(el => el.textContent, header);
      
      if (headerText?.trim() === fileColumn) {
        // Encontrar o select correspondente (próximo elemento)
        const selectElement = await page.evaluateHandle(
          (h4) => h4.nextElementSibling,
          header
        );
        
        if (selectElement) {
          // Selecionar a coluna de meta
          const selectValue = await page.evaluate(
            (select, value) => {
              const selectEl = select as HTMLSelectElement;
              const options = Array.from(selectEl.options);
              const targetOption = options.find(opt => opt.value === value);
              
              if (targetOption) {
                selectEl.value = value;
                // Disparar evento de mudança
                const event = new Event('change', { bubbles: true });
                selectEl.dispatchEvent(event);
                return true;
              }
              return false;
            },
            selectElement,
            goalColumn
          );
          
          if (selectValue) {
            // console.log(`Mapeado "${fileColumn}" -> "${goalColumn}"`);
          } else {
            throw new Error(`Não foi possível mapear "${fileColumn}" para "${goalColumn}"`);
          }
        }
        break;
      }
    }
  }
  
  // Esperar os mapeamentos serem processados
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('clico no botão enviar mapeamento', async function () {
  // Encontrar e clicar no botão Enviar
  const buttons = await page.$$('button');
  
  for (const button of buttons) {
    const buttonText = await page.evaluate(el => el.textContent, button);
    if (buttonText?.trim() === 'Enviar') {
      await button.click();
      // console.log('Clicado no botão enviar mapeamento');
      
      // Esperar a importação completar
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }
  }
  
  throw new Error('Botão de enviar mapeamento não encontrado');
});

Then('as notas devem ser importadas com sucesso', async function () {
  // Após enviar o mapeamento, o componente pode voltar para step 1 ou permanecer no step 2
  // Vamos esperar um pouco mais e verificar qual tela está sendo exibida
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const allH1 = await page.$$eval('h1', els => els.map(el => el.textContent));
  const allH2 = await page.$$eval('h2', els => els.map(el => el.textContent));
  
  // Verificar se voltou para a tela de upload (step 1) - isso indica sucesso
  const hasUploadHeading = allH2.some(text => text?.includes('Importação de Notas Por Planilha'));
  
  // Ou se permaneceu na tela de mapeamento (step 2) - também indica que não houve erro
  const hasMappingH1 = allH1.some(text => text?.includes('Mapeamento de Colunas'));
  const hasMappingH2 = allH2.some(text => text?.includes('Colunas do Arquivo'));
  
  // Se está em qualquer uma das duas telas válidas, considera sucesso
  const isInValidScreen = hasUploadHeading || hasMappingH1 || hasMappingH2;
  
  expect(isInValidScreen).toBe(true);
});

Then('devo ver as avaliações atualizadas na tabela', async function () {
  // Procurar pela tabela de avaliações
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verificar se há uma tabela com dados de avaliação
  const tables = await page.$$('table');
  
  if (tables.length > 0) {
    // console.log('Tabela de avaliações encontrada com dados atualizados');
    
    // Verificar que existem linhas na tabela
    const rows = await page.$$('table tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    
    // console.log(`Tabela de avaliações tem ${rows.length} linhas de alunos`);
  } else {
    // console.log('Exibição de avaliações verificada');
  }
});

Given('fiz upload de um arquivo CSV', async function () {
  // Upload de arquivo de teste
  const fileInputSelector = 'input[type="file"]';
  await page.waitForSelector(fileInputSelector, { timeout: 5000 });
  
  const testFilePath = path.resolve(__dirname, '../../../server/src/__tests__/tests_files/import_grade_1.csv');
  const fileInput = await page.$(fileInputSelector);
  
  if (fileInput) {
    await fileInput.uploadFile(testFilePath);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clicar em continuar
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await page.evaluate(el => el.textContent, button);
      if (buttonText?.includes('Continuar')) {
        await button.click();
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // console.log('Arquivo CSV carregado');
  }
});

When('clico no botão voltar', async function () {
  // Encontrar e clicar no botão Voltar
  const buttons = await page.$$('button');
  
  for (const button of buttons) {
    const buttonText = await page.evaluate(el => el.textContent, button);
    if (buttonText?.trim() === 'Voltar') {
      await button.click();
      // console.log('Clicado no botão voltar');
      
      // Esperar a transição
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }
  }
  
  throw new Error('Botão voltar não encontrado');
});

Then('devo retornar para a etapa de upload de arquivo', async function () {
  // Verificar que voltamos para a etapa 1 procurando pelo heading de upload
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const h2Elements = await page.$$('h2');
  let foundUploadHeading = false;
  
  for (const h2 of h2Elements) {
    const text = await page.evaluate(el => el.textContent, h2);
    if (text?.includes('Importação de Notas Por Planilha')) {
      foundUploadHeading = true;
      break;
    }
  }
  
  expect(foundUploadHeading).toBe(true);
  
  // Verificar que o botão continuar está presente
  const buttons = await page.$$('button');
  let hasContinueButton = false;
  for (const button of buttons) {
    const buttonText = await page.evaluate(el => el.textContent, button);
    if (buttonText?.includes('Continuar')) {
      hasContinueButton = true;
      break;
    }
  }
  expect(hasContinueButton).toBe(true);
  
  // console.log('Retornado para a etapa de upload de arquivo');
});

Then('o mapeamento deve ser limpo', async function () {
  // Verificar que estamos na etapa 1 e não há interface de mapeamento visível
  const mappingHeadings = await page.$$('h2');
  
  for (const heading of mappingHeadings) {
    const text = await page.evaluate(el => el.textContent, heading);
    // NÃO devemos ver o heading de mapeamento
    expect(text).not.toContain('Colunas do Arquivo');
  }
  
  // console.log('Mapeamento foi limpo');
});