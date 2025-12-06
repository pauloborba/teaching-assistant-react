import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

// Helper function to format CPF like the frontend does
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';
// track classes created during tests to clean up later
const createdClassIds: string[] = [];

// small helper sleep (avoids using page.waitForTimeout which may not exist on types)
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Before({ tags: '@gui' }, async function () {
  browser = await launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 50 // Slow down actions for visibility
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

Given('a turma {string} existe no sistema', async function (string) {
  // Ensure the backend has the turma (create if missing) and open the Classes UI
  const slug = string;
  const topic = slug.replace(/-/g, ' ');

  try {
    // Check all classes and find one with matching topic (case-insensitive)
    const resp = await fetch(`${serverUrl}/api/classes`);
    if (resp.ok) {
      const classesList = await resp.json();
      // delete any existing classes that match the topic to ensure a fresh start
      const matches = classesList.filter((c: any) => (c.topic || '').toLowerCase() === topic.toLowerCase() || (c.topic || '').toLowerCase().includes(topic.toLowerCase()));
      for (const m of matches) {
        try {
          await fetch(`${serverUrl}/api/classes/${encodeURIComponent(m.id)}`, { method: 'DELETE' });
        } catch {
          // ignore deletion errors, continue
        }
      }

      // create a new class for the test
      const year = new Date().getFullYear();
      const createResp = await fetch(`${serverUrl}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, semester: 1, year })
      });
      if (createResp.ok) {
        const created = await createResp.json();
        if (created && created.id) createdClassIds.push(created.id);
      } else {
        throw new Error(`Erro ao criar turma ${topic}: ${createResp.status}`);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Aviso: não foi possível verificar/criar turma via API (${error}). Tentando via UI.`);
  }

  // Open app and go to Classes tab, then find the class row and open Metas modal
  await page.goto(baseUrl, { waitUntil: 'networkidle2' }).catch(() => undefined);
  // click Classes tab
  const classesTab = await page.$('[data-testid="classes-tab"]');
  if (classesTab) {
    await classesTab.click();
  }

  // wait for classes table and find matching row by topic text
  await page.waitForSelector('table tbody tr', { timeout: 5000 }).catch(() => undefined);
  const rows = await page.$$('table tbody tr');
  for (const row of rows) {
    const topicCell = await row.$('td strong');
    if (!topicCell) continue;
    const txt = (await page.evaluate(el => (el.textContent || '').trim(), topicCell)) || '';
    if (txt.toLowerCase().includes(topic.toLowerCase())) {
      // click Metas button inside this row
      const metasBtn = await row.$('.metas-btn');
      if (metasBtn) {
        await metasBtn.click().catch(() => undefined);
        // wait for metas modal
        await page.waitForSelector('.enrollment-overlay .enrollment-modal', { timeout: 3000 }).catch(() => undefined);
      }
      break;
    }
  }

  return;
});

// Cleanup created classes after tests
After({ tags: '@gui' }, async function () {
  // delete classes created during the test run
  for (const id of createdClassIds) {
    try {
      await fetch(`${serverUrl}/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }

  // close browser if open
  if (browser) {
    await browser.close().catch(() => undefined);
  }
});

Given('estou na página de criação de metas da turma {string}', async function (string) {
  const slug = string;

  // Open Classes tab and open the Metas modal for the given class
  const topic = slug.replace(/-/g, ' ');
  await page.goto(baseUrl, { waitUntil: 'networkidle2' }).catch(() => undefined);
  const classesTab = await page.$('[data-testid="classes-tab"]');
  if (classesTab) await classesTab.click().catch(() => undefined);
  await page.waitForSelector('table tbody tr', { timeout: 5000 }).catch(() => undefined);

  const rows = await page.$$('table tbody tr');
  for (const row of rows) {
    const topicCell = await row.$('td strong');
    if (!topicCell) continue;
    const txt = (await page.evaluate(el => (el.textContent || '').trim(), topicCell)) || '';
    if (txt.toLowerCase().includes(topic.toLowerCase())) {
      const metasBtn = await row.$('.metas-btn');
      if (metasBtn) {
        await metasBtn.click().catch(() => undefined);
        // wait for metas modal
        await page.waitForSelector('.enrollment-overlay .enrollment-modal', { timeout: 3000 }).catch(() => undefined);
      }
      break;
    }
  }

  // ensure modal has the specific input
  await page.waitForSelector('.enrollment-overlay .enrollment-modal input[placeholder="New meta"]', { timeout: 3000 }).catch(() => undefined);
  return;
});

Given('não existe nenhuma meta cadastrada na turma {string}', async function (string) {
  const slug = string;
  // Ensure metas modal is open for this class (reuse previous step behavior)
  await page.waitForSelector('.enrollment-overlay .enrollment-modal', { timeout: 3000 }).catch(() => undefined);
  const modal = await page.$('.enrollment-overlay .enrollment-modal');
  if (!modal) return;

  // Remove any local metas present (click delete buttons inside modal)
  const deleteButtons = await modal.$$('.meta-delete-btn');
  for (const b of deleteButtons) {
    await b.click().catch(() => undefined);
    await sleep(150);
  }

  // If there is an existing-metas list (server-side metas), we cannot delete via UI; ensure it's empty or test will fail later
  const existingCount = await modal.$$eval('.existing-metas li', els => els.length).catch(() => 0);
  if (existingCount > 0) {
    // log for debugging; do not throw
    // eslint-disable-next-line no-console
    console.log('Aviso: turma já possui metas no servidor; tests podem falhar se metas estiverem lockadas.');
  }

  return;
});

When('adiciono as metas {string} e {string} para a turma {string}', async function (string, string2, string3) {
  const title1 = string;
  const title2 = string2;
  const slug = string3;
  // Work inside the modal to avoid touching other inputs
  await page.waitForSelector('.enrollment-overlay .enrollment-modal', { timeout: 3000 });
  const modal = await page.$('.enrollment-overlay .enrollment-modal');
  if (!modal) throw new Error('Metas modal not open');

  async function addToModal(title: string) {
  if (!modal) throw new Error('Metas modal not open');
  const input = await modal.$('input[placeholder="New meta"]');
  if (!input) throw new Error('Meta input not found in modal');
  await input.click({ clickCount: 3 }).catch(() => undefined);
  await input.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await input.type(title);

    const addBtn = await modal.$('.meta-add-btn');
    if (addBtn) {
      await addBtn.click().catch(() => undefined);
    } else {
      // try button by text inside modal
      const modalButtons = await modal.$$('button');
      for (const b of modalButtons) {
        const txt = await page.evaluate(el => (el.textContent || '').trim(), b);
        if (/add meta|add/i.test(txt)) { await b.click().catch(() => undefined); break; }
      }
    }

    // wait until the modal list contains the title
    await page.waitForFunction((t) => {
      const modalEl = document.querySelector('.enrollment-overlay .enrollment-modal');
      if (!modalEl) return false;
      return Array.from(modalEl.querySelectorAll('.local-metas-list li, .local-meta-item, .local-metas-list span')).some(n => (n.textContent || '').includes(t));
    }, { timeout: 2000 }, title);
  }

  await addToModal(title1);
  await addToModal(title2);

  return;
});


When('eu submeto a criação de metas', async function () {
  // Submit inside modal
  const modal = await page.$('.enrollment-overlay .enrollment-modal');
  if (!modal) throw new Error('Metas modal not open');
  const createBtn = await modal.$('.meta-create-btn');
  if (createBtn) {
    await createBtn.click().catch(() => undefined);
  } else {
    // try buttons by text inside modal
    const modalButtons = await modal.$$('button');
    for (const b of modalButtons) {
      const txt = await page.evaluate(el => (el.textContent || '').trim(), b);
      if (/create metas|create meta|create/i.test(txt)) { await b.click().catch(() => undefined); break; }
    }
  }
  // Prefer capturing the server response for the metas POST (reliable even if UI toast is fleeting)
  try {
    const resp = await page.waitForResponse((response) => {
      try {
        const url = response.url();
        return response.request().method() === 'POST' && url.includes('/metas');
      } catch {
        return false;
      }
    }, { timeout: 5000 });

    try {
      const json = await resp.json();
      // @ts-ignore
      this.lastNotification = (json && (json.message || json.msg)) ? (json.message || json.msg) : '';
    } catch {
      // ignore JSON parse errors
      // @ts-ignore
      this.lastNotification = '';
    }
  } catch {
    // If we didn't catch the network response, fallback to capturing visible notification briefly
    const notifSelectors = ['[data-testid="toast"]', '.toast', '.notification', '.alert-success', '.toastr', '[role="alert"]', '[aria-live]'];
    let captured = '';
    for (const s of notifSelectors) {
      try {
        await page.waitForSelector(s, { timeout: 1500 });
        const t = await page.$$eval(s, els => els.map(e => (e.textContent || '').trim()).find(t => t && t.length > 0) || '');
        if (t) { captured = t; break; }
      } catch {
        // try next selector
      }
    }
    if (!captured) {
      try {
        captured = await page.evaluate(() => (document.body && document.body.innerText) ? (document.body.innerText || '').trim() : '');
      } catch {
        captured = '';
      }
    }
    // @ts-ignore
    this.lastNotification = captured || '';
  }
  return;
});

Then('vejo a notificação {string}', async function (string) {
  const expected = string;
  const expectedLower = expected.toLowerCase();

  // Try multiple approaches to find notification text, with slightly longer timeouts
  const notifSelectors = [
    '[data-testid="toast"]',
    '.toast',
    '.notification',
    '.alert-success',
    '.toastr',
    '[role="alert"]',
    '[aria-live]'
  ];

  let foundText = '';

  // 1) Check explicit selectors
  for (const s of notifSelectors) {
    try {
      await page.waitForSelector(s, { timeout: 2000 });
      // get the first visible matching element's text
      const t = await page.$$eval(s, els => els.map(e => (e.textContent || '').trim()).find(t => t && t.length > 0) || '');
      if (t && t.length > 0) { foundText = t; break; }
    } catch {
      // no element for this selector, continue
    }
  }

  // 2) Inspect common toast containers by role/aria-live if still empty
  if (!foundText) {
    try {
      const aria = await page.$$eval('[aria-live], [role="status"], [role="alert"]', els => els.map(e => (e.textContent || '').trim()).find(t => t && t.length > 0) || '');
      if (aria) foundText = aria;
    } catch {
      // ignore
    }
  }

  // 3) Final fallback: scan visible text nodes for keywords (longer timeout)
  if (!foundText) {
    // first, wait a bit for any notification text to appear anywhere in the body
    try {
      await page.waitForFunction((exp) => (document && document.body && document.body.innerText || '').toLowerCase().includes(exp), { timeout: 5000 }, expectedLower);
    } catch {
      // ignore timeout, we'll still try to read text
    }

    foundText = await page.evaluate(() => {
      function visible(n: Element) {
        const style = window.getComputedStyle(n as HTMLElement);
        return style && style.visibility !== 'hidden' && style.display !== 'none' && (n as HTMLElement).offsetParent !== null;
      }
      const nodes = Array.from(document.querySelectorAll('body *')) as Element[];
      for (const n of nodes) {
        if (!visible(n)) continue;
        const txt = (n.textContent || '').trim();
        if (!txt) continue;
        if (/metas criadas com sucesso|metas criadas|criado|sucesso|erro/i.test(txt)) return txt;
      }
      // as a last resort, return the whole body text
      return (document && document.body && (document.body.innerText || '').trim()) || '';
    });
  }

  // normalize whitespace and assert
  const normalized = (foundText || '').replace(/\s+/g, ' ').trim();
  const foundLower = normalized.toLowerCase();
  if (foundLower.includes(expectedLower)) {
    expect(true).toBeTruthy();
    return;
  }

  // fallback: remove accents and punctuation and compare
  const strip = (s: string) => {
    // basic accent removal
    const accentMap: { [k: string]: string } = {
      'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a',
      'ç':'c',
      'è':'e','é':'e','ê':'e','ë':'e',
      'ì':'i','í':'i','î':'i','ï':'i',
      'ñ':'n',
      'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
      'ù':'u','ú':'u','û':'u','ü':'u',
      'ý':'y','ÿ':'y'
    };
  let out = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // replace known accents
    out = out.split('').map(ch => accentMap[ch] || ch).join('');
    // remove non-alphanumeric (keep spaces)
    out = out.replace(/[^a-z0-9\s]/gi, '');
    return out.toLowerCase().replace(/\s+/g, ' ').trim();
  };

  const strippedFound = strip(foundLower);
  const strippedExpected = strip(expectedLower);
  // final assertion: prefer lastNotification captured during submit if available
  // @ts-ignore
  const lastNotif = (this && this.lastNotification) ? (this.lastNotification as string) : '';
  if (lastNotif) {
    const ln = lastNotif.replace(/\s+/g, ' ').trim().toLowerCase();
    if (ln.includes(expectedLower) || strip(ln).includes(strip(expectedLower))) {
      expect(true).toBeTruthy();
      return;
    }
  }

  // otherwise use the found text from DOM
  if (strippedFound.includes(strippedExpected)) {
    expect(true).toBeTruthy();
    return;
  }

  // nothing matched: fail with the collected text for debugging
  throw new Error(`Notification not found. Collected text: "${foundLower}"`);
});



Then('a listagem de metas da turma {string} exibe os itens com títulos {string} e {string}', async function (string, string2, string3) {
  const slug = string;
  const title1 = string2;
  const title2 = string3;

  // After creation, metas are visible in the modal's existing-metas or local-metas-list; navigate to classes page to view
  await page.goto(baseUrl, { waitUntil: 'networkidle2' }).catch(() => undefined);
  const classesTab = await page.$('[data-testid="classes-tab"]');
  if (classesTab) await classesTab.click().catch(() => undefined);
  await page.waitForSelector('table tbody tr', { timeout: 5000 }).catch(() => undefined);

  // open metas modal for the class again
  const rows = await page.$$('table tbody tr');
  for (const row of rows) {
    const topicCell = await row.$('td strong');
    if (!topicCell) continue;
    const txt = (await page.evaluate(el => (el.textContent || '').trim(), topicCell)) || '';
    if (txt.toLowerCase().includes(slug.replace(/-/g, ' ').toLowerCase())) {
      const metasBtn = await row.$('.metas-btn');
      if (metasBtn) {
        await metasBtn.click().catch(() => undefined);
        await sleep(500);
      }
      break;
    }
  }

  // wait a bit for list to render
  await sleep(500);

  // In the metas modal, check local-metas-list and existing-metas
  const metasText = await page.evaluate(() => Array.from(document.querySelectorAll('.local-metas-list li, .existing-metas li, .local-meta-item, .local-metas-list .local-meta-item, .local-metas-list span')).map(n => (n.textContent || '').trim()));
  const found1 = metasText.some(t => t.includes(title1));
  const found2 = metasText.some(t => t.includes(title2));

  expect(found1).toBeTruthy();
  expect(found2).toBeTruthy();

  return;
});

