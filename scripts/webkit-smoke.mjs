import { webkit } from 'playwright';

const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__T2_DEBUG__?.loaded === true, null, { timeout: 30000 });
for (const view of ['設備間', '衛浴區', '最遠端', '全景']) await page.locator(`[data-camera="${view}"]`).click();
for (const mode of ['末端用水', '回水循環', '同時用水', '待機']) await page.locator(`[data-mode="${mode}"]`).click();
const state = await page.evaluate(() => ({ loaded: window.__T2_DEBUG__.loaded, modelNodes: window.__T2_DEBUG__.modelNodes.length, mode: window.__T2_DEBUG__.currentMode }));
if (!state.loaded || state.modelNodes < 80 || errors.length) throw new Error(JSON.stringify({ state, errors }));
console.log(JSON.stringify({ status: 'PASS', engine: 'Playwright WebKit', state, errors }, null, 2));
await browser.close();
