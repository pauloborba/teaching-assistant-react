import { Given, When, Then, After } from '@cucumber/cucumber';
import expect from 'expect';
import { scope } from './setup';

const BASE = 'http://localhost:3004';
const API = 'http://localhost:3005';
const createdClassIds: string[] = [];
let currentOpenTopic = '';

const SELECTORS = {
  classesTab: '[data-testid="classes-tab"]',
  tableRows: 'table tbody tr',
  modal: '.enrollment-overlay .enrollment-modal',
  metaInput: '.enrollment-overlay .enrollment-modal input[placeholder="New meta"]',
  metaAddBtn: '.meta-add-btn',
  metaCreateBtn: '.meta-create-btn',
  modalClose: '.modal-close-btn',
  metaItems: '.local-metas-list li, .existing-metas li, .local-meta-item, .local-metas-list span',
  notification: '.success-message, .alert-success, [role="alert"], [aria-live]'
};

function toTopic(slug: string) { return slug.replace(/-/g, ' '); }
async function sleep(ms = 200) { return new Promise(r => setTimeout(r, ms)); }

async function clickIf(selector: string, opts = { timeout: 1000 }) {
  const el = await scope.page.waitForSelector(selector, { timeout: opts.timeout }).catch(() => null);
  if (el) await el.click();
  return el;
}

async function openMetasModalForTopic(topic: string) {
  // avoid reopening if already open for same topic
  if (currentOpenTopic === topic) return;

  // if modal open for another topic, close it first
  const existingModal = await scope.page.$(SELECTORS.modal);
  if (existingModal && currentOpenTopic && currentOpenTopic !== topic) {
    const closeBtn = await existingModal.$(SELECTORS.modalClose);
    if (closeBtn) await closeBtn.click().catch(() => {});
    currentOpenTopic = '';
    await scope.page.waitForSelector(SELECTORS.modal, { timeout: 1000 }).catch(() => {});
  }

  await scope.page.goto(BASE, { waitUntil: 'networkidle2' });
  await clickIf(SELECTORS.classesTab, { timeout: 2000 });
  await scope.page.waitForSelector(SELECTORS.tableRows, { timeout: 2000 });
  const rows = await scope.page.$$(SELECTORS.tableRows);
  for (const row of rows) {
    const head = await row.$('td strong');
    if (!head) continue;
    const txt = (await scope.page.evaluate(el => (el.textContent || '').trim(), head)) || '';
    if (txt.toLowerCase().includes(topic.toLowerCase())) {
      const btn = await row.$('.metas-btn');
      if (btn) {
        await btn.click();
        await scope.page.waitForSelector(SELECTORS.modal, { timeout: 2000 });
        currentOpenTopic = topic;
      }
      break;
    }
  }
}

async function ensureFreshClass(topic: string) {
  try {
    const resp = await fetch(`${API}/api/classes`);
    if (!resp.ok) return;
    const list = await resp.json();
    const matches = list.filter((c: any) => ((c.topic || '').toLowerCase() === topic.toLowerCase()));
    for (const m of matches) {
      await fetch(`${API}/api/classes/${encodeURIComponent(m.id)}`, { method: 'DELETE' }).catch(() => {});
    }
    const create = await fetch(`${API}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, semester: 1, year: new Date().getFullYear() })
    });
    if (create.ok) {
      const c = await create.json();
      if (c && c.id) createdClassIds.push(c.id);
    }
  } catch (e) { /* ignore network issues in setup */ }
}

async function addMetasToModal(titles: string[]) {
  for (const title of titles) { 
    await scope.page.waitForSelector(SELECTORS.metaInput, { timeout: 1500 });
    await scope.page.click(SELECTORS.metaInput, { clickCount: 3 });
    await scope.page.focus(SELECTORS.metaInput);
    await scope.page.keyboard.down('Control'); await scope.page.keyboard.press('A'); await scope.page.keyboard.up('Control');
    await scope.page.keyboard.press('Backspace');
    await scope.page.type(SELECTORS.metaInput, title);
    await scope.page.click(SELECTORS.metaAddBtn).catch(() => {});
    // wait until a metas item with the title appears
    await scope.page.waitForFunction((t, sel) => Array.from(document.querySelectorAll(sel)).some(n => (n.textContent||'').includes(t)), { timeout: 1500 }, title, SELECTORS.metaItems).catch(() => {});
    await sleep(100);
  }
}

async function captureNotificationNow() {
  const sel = await scope.page.waitForSelector(SELECTORS.notification, { timeout: 1200 }).catch(() => null);
  if (!sel) return '';
  return await scope.page.evaluate(el => (el.textContent || '').trim(), sel);
}

async function getMetasList() {
  return await scope.page.evaluate((sel) => Array.from(document.querySelectorAll(sel))
  .map(n => (n.textContent || '').trim())
  .filter(t => t && t !== 'No local metas added yet'), SELECTORS.metaItems)
    .catch(() => []);
}

After({ tags: '@gui' }, async function () {
  for (const id of createdClassIds) {
    try { await fetch(`${API}/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch {}
  }
  currentOpenTopic = '';
});

Given('a turma {string} existe no sistema', async function (slug: string) {
  await ensureFreshClass(toTopic(slug));
});

Given('estou na página de criação de metas da turma {string}', async function (slug: string) {
  await openMetasModalForTopic(toTopic(slug));
  await scope.page.waitForSelector(SELECTORS.metaInput, { timeout: 2000 });
});

Given('não existe nenhuma meta cadastrada na turma {string}', async function (slug: string) {
  const topic = toTopic(slug);
  await openMetasModalForTopic(topic);
  const modal = await scope.page.$(SELECTORS.modal);
  if (modal) {
    const closeBtn = await modal.$(SELECTORS.modalClose);
    if (closeBtn) await closeBtn.click();
    currentOpenTopic = '';
  }
  await ensureFreshClass(topic);
});

When('adiciono as metas {string} e {string} para a turma {string}', async function (t1: string, t2: string, slug: string) {
  await openMetasModalForTopic(toTopic(slug));
  await addMetasToModal([t1, t2]);
});

When('eu submeto a criação de metas', async function () {
  const modal = await scope.page.$(SELECTORS.modal);
  if (!modal) throw new Error('Modal não está aberto');
  const createBtn = await modal.$(SELECTORS.metaCreateBtn);
  if (!createBtn) throw new Error('Botão de criação de metas não encontrado.');
  await createBtn.click();
  // GUI-only notification capture (short wait)
  (this as any).lastNotification = await captureNotificationNow();
  // modal likely closed after submit
  currentOpenTopic = '';
});

Then('vejo a notificação {string}', async function (expected: string) {
  const captured: string = (this as any).lastNotification || '';
  if (captured === expected) return expect(true).toBeTruthy();
  // fallback: quick scan of body
  try {
    await scope.page.waitForFunction((exp) => document.body && (document.body.innerText || '').includes(exp), { timeout: 1000 }, expected);
    return expect(true).toBeTruthy();
  } catch {}
  throw new Error(`Notificação não encontrada na GUI. Esperado: "${expected}", Capturado: "${captured}"`);
});

Then('a listagem de metas da turma {string} exibe os itens com títulos {string} e {string}', async function (slug: string, t1: string, t2: string) {
  const topic = toTopic(slug);
  let metas: string[] = [];
  for (let i = 0; i < 3; i++) {
    await openMetasModalForTopic(topic);
    metas = await getMetasList();
    if (metas.some(m => m.includes(t1)) && metas.some(m => m.includes(t2))) return;
    await sleep(500);
  }
  throw new Error(`Metas não encontradas. Esperado: "${t1}", "${t2}". Lista atual: [${metas.join(', ')}]`);
});

When('tento adicionar uma meta sem título para a turma {string}', async function (slug: string) {
  const topic = toTopic(slug);
  await openMetasModalForTopic(topic);
  const modal = await scope.page.$(SELECTORS.modal);
  if (!modal) throw new Error('Modal não aberto');
  const input = await modal.$('input[placeholder="New meta"]');
  if (!input) throw new Error('Input de meta não encontrado');
  // ensure empty
  await input.click({ clickCount: 3 });
  await input.focus();
  await scope.page.keyboard.down('Control'); await scope.page.keyboard.press('A'); await scope.page.keyboard.up('Control'); await scope.page.keyboard.press('Backspace');
  const addBtn = await modal.$(SELECTORS.metaAddBtn);
  if (addBtn) await addBtn.click();
  // store state for next assertion
  const createBtn = await modal.$(SELECTORS.metaCreateBtn);
  const disabled = createBtn ? await scope.page.evaluate(el => (el as HTMLButtonElement).disabled, createBtn) : true;
  (this as any).lastCreateDisabled = disabled;
});

Then('eu vejo que não está disponível a opção de submissão de criação de metas', async function () {
  const disabled = (this as any).lastCreateDisabled;
  if (disabled) return expect(true).toBeTruthy();
  // fallback: check currently on screen
  const createBtn = await scope.page.$(SELECTORS.metaCreateBtn);
  const isDisabled = createBtn ? await scope.page.evaluate(el => (el as HTMLButtonElement).disabled, createBtn) : true;
  if (isDisabled) return expect(true).toBeTruthy();
  throw new Error('Opção de submissão de criação de metas está disponível');
});

Then('a listagem de metas da turma {string} permanece vazia', async function (slug: string) {
  const topic = toTopic(slug);
  await openMetasModalForTopic(topic);
  const metas = await getMetasList();
  if (metas.length === 0) return expect(true).toBeTruthy();
  throw new Error(`Lista de metas não está vazia: [${metas.join(', ')}]`);
});

When('cancelo a criação de metas para a turma {string}', async function (slug: string) {
  await openMetasModalForTopic(toTopic(slug));
  const modal = await scope.page.$(SELECTORS.modal);
  if (!modal) throw new Error('Modal não aberto');
  const cancelBtn = await modal.$('.cancel-btn');
  if (cancelBtn) await cancelBtn.click(); else {
    const closeBtn = await modal.$(SELECTORS.modalClose);
    if (closeBtn) await closeBtn.click();
  }
  // ensure modal is gone
  await scope.page.waitForSelector(SELECTORS.modal, { timeout: 1000 }).catch(() => {});
  const still = await scope.page.$(SELECTORS.modal);
  if (still) throw new Error('Modal ainda visível após cancelar');
  currentOpenTopic = '';
});

When('edito a meta {string} para {string} na turma {string}', async function (oldTitle: string, newTitle: string, slug: string) {
  // operate on currently-open modal; open only if missing
  const modalPresent = await scope.page.$(SELECTORS.modal);
  if (!modalPresent) await openMetasModalForTopic(toTopic(slug));
  // find local meta item containing oldTitle
  const handles = await scope.page.$$(SELECTORS.metaItems);
  let found = false;
  for (const h of handles) {
    const txt = (await scope.page.evaluate(el => (el.textContent || '').trim(), h));
    if (txt.includes(oldTitle)) {
      found = true;
      const editBtn = await h.$('.meta-edit-btn');
      if (!editBtn) throw new Error('Botão de editar não encontrado');
      await editBtn.click();
      await scope.page.waitForFunction((val) => {
        const input = document.querySelector('.enrollment-overlay .enrollment-modal input[placeholder="New meta"]') as HTMLInputElement;
        return input && input.value === val;
      }, { timeout: 1000 }, oldTitle);
      const input = await scope.page.$(SELECTORS.metaInput);
      if (!input) throw new Error('Input de meta não encontrado ao editar');
      await input.click({ clickCount: 3 });
      await input.focus();
      await scope.page.keyboard.down('Control'); await scope.page.keyboard.press('A'); await scope.page.keyboard.up('Control'); await scope.page.keyboard.press('Backspace');
      await input.type(newTitle);
      const saveBtn = await scope.page.$(SELECTORS.metaAddBtn);
      if (saveBtn) await saveBtn.click();
      // wait for notification or similar feedback
      await sleep(500);
      // ensure modal closed
      currentOpenTopic = '';
      break;
    }
  }
  if (!found) throw new Error(`Meta com título "${oldTitle}" não encontrada para edição`);
});

When('deleto a meta {string} na turma {string}', async function (title: string, slug: string) {
  const modalPresent = await scope.page.$(SELECTORS.modal);
  if (!modalPresent) await openMetasModalForTopic(toTopic(slug));
  const items = await scope.page.$$(SELECTORS.metaItems);
  let found = false;
  for (const item of items) {
    const txt = (await scope.page.evaluate(el => (el.textContent || '').trim(), item));
    if (txt.includes(title)) {
      found = true;
      const del = await item.$('.meta-delete-btn');
      if (!del) throw new Error('Botão de deletar não encontrado');
      await del.click();
      await sleep(200);
      break;
    }
  }
  if (!found) throw new Error('Meta para deletar não encontrada: ' + title);
});

Then('a listagem de metas da turma {string} exibe o item com título {string}', async function (slug: string, title: string) {
  await openMetasModalForTopic(toTopic(slug));
  const metas = await getMetasList();
  if (metas.some(m => m.includes(title))) return expect(true).toBeTruthy();
  throw new Error('Meta não encontrada: ' + title);
});

Given('a turma {string} possui as metas {string} e {string} cadastradas', async function (slug: string, m1: string, m2: string) {
  const topic = toTopic(slug);
  await ensureFreshClass(topic);
  const resp = await fetch(`${API}/api/classes`);
  const list = resp.ok ? await resp.json() : [];
  const cls = list.find((c:any)=> (c.topic || '').toLowerCase() === topic.toLowerCase());
  if (!cls) throw new Error('Classe não encontrada: ' + topic);
  await fetch(`${API}/api/classes/${encodeURIComponent(cls.id)}/metas`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ metas: [m1,m2] }) });
});

When('tento acessar a página de criação de metas da turma {string}', async function (slug: string) {
  await openMetasModalForTopic(toTopic(slug));
});

Then('eu vejo que não está disponível a opção de criação de metas para a turma {string}', async function (slug: string) {
  await openMetasModalForTopic(toTopic(slug));
  const createBtn = await scope.page.$(SELECTORS.metaCreateBtn);
  if (!createBtn) return expect(true).toBeTruthy();
  const disabled = await scope.page.evaluate(el => (el as HTMLButtonElement).disabled, createBtn);
  if (disabled) return expect(true).toBeTruthy();
  throw new Error('Opção de criação de metas está disponível para turma com metas existentes');
});