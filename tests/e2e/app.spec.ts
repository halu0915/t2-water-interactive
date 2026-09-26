import { test,expect } from '@playwright/test';
async function setRange(page: import('@playwright/test').Page, selector:string, value:string){await page.locator(selector).evaluate((el,value)=>{(el as HTMLInputElement).value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function ready(page: import('@playwright/test').Page){await page.goto('/');await page.waitForFunction(()=>window.__T2_DEBUG__?.loaded);}
test('loads real model locally, cameras, layers and playback',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const remote:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('data:'))remote.push(r.url());});
  await ready(page);expect(await page.evaluate(()=>window.__T2_DEBUG__.modelNodes.length)).toBeGreaterThanOrEqual(80);
  await expect(page.locator('canvas')).toBeVisible();
  for(const c of ['設備間','衛浴區','最遠端','全景']){await page.getByRole('button',{name:c,exact:true}).click();expect(await page.evaluate(()=>window.__T2_DEBUG__.camera)).toBe(c);}
  for(const l of ['建築','冷水','熱水','回水','設備','標籤']){const input=page.locator(`[data-layer="${l}"]`);const before=await input.isChecked();await input.setChecked(!before);expect(await page.evaluate(l=>window.__T2_DEBUG__.layers[l as keyof typeof window.__T2_DEBUG__.layers],l)).toBe(!before);await input.setChecked(before);}
  await page.getByRole('button',{name:'暫停水流動畫'}).click();const p=await page.evaluate(()=>window.__T2_DEBUG__.phase);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__T2_DEBUG__.phase)).toBe(p);
  await setRange(page,'#speed','2');expect(await page.evaluate(()=>window.__T2_DEBUG__.speed)).toBe(2);
  await page.getByRole('button',{name:'播放水流動畫'}).click();
  expect(errors).toEqual([]);expect(remote).toEqual([]);
});
test('thermal history, modes, balancing, help and full reset',async({page})=>{
  await ready(page);await page.locator('#demo').click();expect(await page.evaluate(()=>window.__T2_DEBUG__.pumpState)).toBe(true);
  for(const [temp,on] of [['47',true],['50',false],['47',false]] as const){await setRange(page,'#current-temp',temp);expect(await page.evaluate(()=>window.__T2_DEBUG__.pumpState)).toBe(on);}
  await page.locator('#start-temp').fill('55');await page.locator('#start-temp').blur();await expect(page.locator('#temp-error')).toContainText('啟動值必須低於停止值');
  for(const mode of ['待機','末端用水','回水循環','同時用水']){await page.locator(`[data-mode="${mode}"]`).click();expect(await page.evaluate(()=>window.__T2_DEBUG__.currentMode)).toBe(mode);}
  await page.locator('#balance-0').focus();await page.locator('#balance-0').press('End');await expect(page.locator('#flow-0')).toHaveText('222%');
  await page.locator('#help').click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
  await page.locator('#reset').click();expect(await page.evaluate(()=>({mode:window.__T2_DEBUG__.currentMode,temps:window.__T2_DEBUG__.temps,balances:window.__T2_DEBUG__.balances,labels:window.__T2_DEBUG__.layers.標籤}))).toEqual({mode:'待機',temps:{start:45,stop:50,current:47},balances:[45,65,100],labels:false});
});
test('real 3D hotspot and all equipment details',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'設備間',exact:true}).click();
  await page.locator('canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  const pos=await page.evaluate(()=>window.__T2_DEBUG__.projectEquipment('tank'));expect(pos).toBeTruthy();await page.mouse.click(pos!.x,pos!.y);
  await expect(page.locator('#detail h4')).toHaveText('儲熱桶');
  for(const id of ['cold-pump','return-pump','mixing-valve','balance-1','balance-2','balance-3','sensor','far-end']){await page.locator('#equipment').selectOption(id);expect(await page.evaluate(()=>window.__T2_DEBUG__.selectedEquipment)).toBe(id);await expect(page.locator('#detail')).toContainText('非確認施工位置');}
  await page.locator('#equipment').selectOption('mixing-valve');await expect(page.locator('#detail')).toContainText('補充教學幾何');
});
test('responsive layout and touch targets',async({page})=>{
  await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const short=await page.locator('button,select,input[type=range],input[type=number]').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44;}).map(e=>e.outerHTML));expect(short).toEqual([]);
  await page.screenshot({path:`test-results/layout-${test.info().project.name}.png`,fullPage:true});
});
test('model failure is actionable',async({page})=>{
  await page.route('**/models/*.glb',r=>r.abort());await page.goto('/');await expect(page.locator('#load-error')).toBeVisible();await expect(page.getByRole('button',{name:'重新載入',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__T2_DEBUG__.loaded)).toBe(false);
});
