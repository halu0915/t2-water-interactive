import './style.css';
import { initialState, modes, layerNames, setMode, setTemp, branchFlow, demandEnabled, circulationEnabled, type Mode, type Layer } from './state';
import { equipment, modeNotes } from './content';
import { createScene, cameras, type WaterScene, type CameraName } from './scene';

const state = initialState();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) state.animationPlaying = false;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const title = ['01','02','03','04'];
$('#app').innerHTML = `
<header class="masthead"><a class="brand" href="./" aria-label="T2 水的路徑首頁"><span class="brand-mark">T2<span>水</span></span><div><span class="eyebrow">BUILDING SYSTEMS / INTERACTIVE ATLAS</span><h1>水的路徑<span>冷熱水系統互動圖解</span></h1></div></a><div class="header-actions"><span class="local-badge"><i></i> 本機運行 · 概念教學</span><button id="help">操作指南 ↗</button><button id="reset" title="重設所有控制與視角">重設</button></div></header>
<main>
  <section class="intro"><div><span class="eyebrow">T2 / WATER SYSTEM STUDY</span><h2>從供水，到每一次溫暖。</h2><p>轉動模型，沿著水流理解供水、溫控與支路平衡。</p></div><div class="legend"><span><i class="cold"></i>冷水供應</span><span><i class="hot"></i>熱水供應</span><span><i class="return"></i>回水循環</span></div></section>
  <div class="workspace">
    <aside class="controls panel" aria-label="場景控制"><div class="section-heading"><span class="eyebrow">EXPLORE</span><span class="tiny">01 — 場景</span></div><h3>系統如何運作？</h3><p class="muted">選擇情境，觀察水流的路徑。</p><div class="modes">${modes.map((m,i)=>`<button class="mode" data-mode="${m}" aria-pressed="${i===0}"><span>${title[i]}</span>${m}<b>↗</b></button>`).join('')}</div><p id="mode-note" class="mode-note"></p><div class="divider"></div><div class="section-heading"><h3>模型圖層</h3><span class="tiny">獨立顯示</span></div><div class="layers">${layerNames.map((l,i)=>`<label class="layer"><span><i class="layer-dot dot-${i}"></i>${l}</span><input type="checkbox" data-layer="${l}" ${l!=='標籤'?'checked':''}><span class="switch" aria-hidden="true"></span></label>`).join('')}</div><p class="tiny muted">標籤預設隱藏。點選模型圓環或設備清單，逐步探索。</p><div class="sidebar-foot"><span>模型來源</span><strong>t2-water-system.glb</strong><span>概念配置 · 非施工尺度</span></div></aside>
    <section class="viewer panel" aria-label="互動模型"><div class="viewer-bar"><span class="eyebrow">SPATIAL VIEW</span><span id="load-status" role="status">正在初始化 3D…</span></div><div class="camera-tabs" aria-label="相機視角">${cameras.map((c,i)=>`<button data-camera="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</div><div id="scene"></div><div id="load-error" hidden role="alert"><strong>無法顯示 3D 場景</strong><p id="error-message"></p><button id="retry">重新載入</button></div><div class="view-caption"><span>↔ 拖曳旋轉 · 右鍵平移 · 滾輪縮放</span><span>模型與水流皆為概念示意</span></div><div class="playback"><button id="play" aria-label="暫停水流動畫">Ⅱ 暫停</button><div class="speed-control"><label for="speed">流動速度</label><input id="speed" type="range" min="0.25" max="3" step="0.25" value="1"><output id="speed-value">1×</output></div><span class="tiny" id="flow-status">待機 · 無流動</span></div></section>
    <aside class="inspector panel" aria-label="設備與原理"><div class="section-heading"><span class="eyebrow">INSPECT</span><span class="tiny">02 — 設備</span></div><h3>讀懂每個節點</h3><label class="select-label" for="equipment">點選 3D 圓環，或選擇設備</label><select id="equipment"><option value="">選擇一個設備…</option>${equipment.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select><div id="detail" aria-live="polite"><div class="empty-icon">◎</div><h4>每個節點，都有角色。</h4><p class="muted">從儲熱桶開始，探索水如何被加壓、加熱，再回到循環中。</p><button id="start-explore" class="text-button">探索儲熱桶 →</button></div><div class="pressure-note"><span class="eyebrow">THE KEY IDEA</span><h4>供水壓力 ≠ 循環壓差</h4><p>共同冷水源提供基礎供水壓力；回水泵提供克服迴路阻力的循環壓差。</p><strong>兩者不能直接相加，當作末端壓力。</strong></div></aside>
  </div>
  <section class="lab-heading"><div><span class="eyebrow">LEARN BY ADJUSTING</span><h2>把原理，親手調一次。</h2></div><p>教學輸入，不代表現場設定或量測。</p></section>
  <div class="labs"><section class="lab panel" aria-labelledby="temp-title"><div class="section-heading"><span class="eyebrow">03 / TEMPERATURE CONTROL</span><span class="pill" id="pump-state">回水泵 OFF</span></div><h3 id="temp-title">留一段溫差，讓啟停更穩定。</h3><p class="muted">遲滯控制：低溫啟動、高溫停止，中間區間保留前一狀態。</p><div class="temp-inputs"><label for="start-temp">啟動 ≤ <input id="start-temp" type="number" min="30" max="64" step="1" value="45"> °C</label><span>→</span><label for="stop-temp">停止 ≥ <input id="stop-temp" type="number" min="31" max="65" step="1" value="50"> °C</label></div><p id="temp-error" class="validation" role="alert"></p><div class="temperature-readout"><label for="current-temp">模擬回水溫度</label><strong><output id="current-value">47</output><small> °C</small></strong></div><input id="current-temp" class="wide-range" type="range" min="30" max="65" step="0.5" value="47"><div class="range-scale"><span>30°C</span><span id="band">45–50°C 遲滯區</span><span>65°C</span></div><p id="pump-reason" class="explanation" aria-live="polite"></p><button id="demo" class="text-button">切換回水循環，降至啟動溫度 →</button></section>
  <section class="lab panel" aria-labelledby="balance-title"><div class="section-heading"><span class="eyebrow">04 / HYDRAULIC BALANCE</span><span class="tiny">無因次教學指標</span></div><h3 id="balance-title">近端收一點，遠端才到位。</h3><p class="muted">相同示意壓差下，低阻力近端需節流。100% 指標代表示意設計流量。</p>${['近端','中段','遠端'].map((name,i)=>`<div class="branch"><div class="branch-title"><label for="balance-${i}"><span class="branch-number">0${i+1}</span>${name}支路</label><span>開度 <output id="opening-${i}">${state.balances[i]}</output>%</span></div><input id="balance-${i}" type="range" min="0" max="100" value="${state.balances[i]}" data-balance="${i}"><div class="flow-bar"><i id="bar-${i}"></i><span class="design-line"></span></div><div class="branch-result"><span id="balance-note-${i}"></span><span>流量指標 <strong id="flow-${i}">100%</strong></span></div></div>`).join('')}<p class="tiny muted">簡化假設：相對流量 = 開度 ÷ 支路阻力係數。不計算實際 L/min、泵曲線或支路耦合。</p></section></div>
  <footer><strong>T2 / 水的路徑</strong><p>概念教學模型；設備位置、管徑與水流軌跡不作施工依據。實際系統須依設計圖、水力計算與現場調試確認。</p><span>PRIVATE BY DESIGN · 無追蹤 / 無外部服務</span></footer>
</main>
<dialog id="help-dialog"><div class="section-heading"><span class="eyebrow">QUICK GUIDE</span><button id="close-help" aria-label="關閉操作指南">✕</button></div><h2>沿著水流，開始探索。</h2><ol><li><strong>轉動模型</strong><p>滑鼠左鍵拖曳旋轉、右鍵平移、滾輪縮放；觸控使用單指旋轉、雙指平移與縮放。也可使用四個視角按鈕。</p></li><li><strong>切換運作模式</strong><p>待機沒有流動；用水模式顯示供水。循環模式還需符合溫控啟動條件，才會出現回水粒子。</p></li><li><strong>觀察遲滯</strong><p>按溫控示範按鈕啟泵，再調至 47°C：泵保持運轉；升至 50°C 停機，再回到 47°C：泵保持停止。</p></li><li><strong>調整支路</strong><p>把近端開到 100%，觀察過量指標；再節流回 45%。這是原理解說，非現場開度建議。</p></li></ol><p class="explanation">動畫速度只影響標記移動，不改變溫度或泵狀態。所有控制可用鍵盤操作；設備清單提供 3D 點選的替代方式。</p></dialog>`;

let world: WaterScene | undefined;
function selected(id: string | null) { state.selectedEquipment = id; $('#equipment').setAttribute('data-selected',id ?? ''); update(); }
function update() {
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.currentMode)));
  document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach(b=>b.checked=state.layers[b.dataset.layer as Layer]);
  $('#mode-note').textContent=modeNotes[state.currentMode];
  $('#play').textContent=state.animationPlaying?'Ⅱ 暫停':'▶ 播放'; $('#play').setAttribute('aria-label',state.animationPlaying?'暫停水流動畫':'播放水流動畫');
  $('#speed-value').textContent=`${state.speed}×`; $<HTMLInputElement>('#speed').value=String(state.speed);
  $('#flow-status').textContent=state.currentMode==='待機'?'待機 · 無流動':state.animationPlaying?'流動示意中':'動畫已暫停';
  $<HTMLSelectElement>('#equipment').value=state.selectedEquipment ?? '';
  const e = equipment.find(e=>e.id===state.selectedEquipment);
  if(e){
    const status = e.id==='return-pump' ? state.pumpState?'運轉中':'已停止' : e.id==='cold-pump' ? demandEnabled(state.currentMode)?'供水中':'保壓待命' : e.status;
    $('#detail').innerHTML=`<span class="detail-index">SYSTEM NODE / ${String(equipment.indexOf(e)+1).padStart(2,'0')}</span><h4>${e.name}</h4><span class="pill">${status}</span><h5>設備功能</h5><p>${e.function}</p><h5>壓力與溫度邏輯</h5><p>${e.logic}</p><p class="source"></p><p class="concept">概念示意，非確認施工位置或尺寸。</p>`;
    $('#detail .source').textContent=world?.source(e.id) ?? '正在載入定位資訊…';
  } else if(!$('#start-explore')) { /* initial empty panel is restored by reset below */ }
  $('#pump-state').textContent=`回水泵 ${state.pumpState?'ON · 運轉':'OFF · 停止'}`; $('#pump-state').classList.toggle('on',state.pumpState);
  $<HTMLInputElement>('#start-temp').value=String(state.temps.start); $<HTMLInputElement>('#stop-temp').value=String(state.temps.stop); $<HTMLInputElement>('#current-temp').value=String(state.temps.current);
  $('#current-value').textContent=String(state.temps.current); $('#band').textContent=`${state.temps.start}–${state.temps.stop}°C 遲滯區`;
  $('#pump-reason').textContent=!circulationEnabled(state.currentMode)?'目前模式未啟用循環，回水泵強制停止。切換回水循環或同時用水以體驗溫控。':state.temps.current<=state.temps.start?'溫度到達啟動門檻 → 回水泵運轉。':state.temps.current>=state.temps.stop?'溫度到達停止門檻 → 回水泵停止。':`位於遲滯區 → 保留前一狀態（${state.pumpState?'運轉':'停止'}）。`;
  state.balances.forEach((b,i)=>{ const flow=branchFlow(b,i); $<HTMLInputElement>(`#balance-${i}`).value=String(b); $(`#opening-${i}`).textContent=String(b); $(`#flow-${i}`).textContent=`${flow}%`; $(`#bar-${i}`).style.width=`${Math.min(100,flow/2.23)}%`; $(`#balance-note-${i}`).textContent=flow===100?'達示意設計流量':flow>100?'流量偏多 · 可適度節流':flow===0?'支路關閉':'低於示意設計流量'; });
}
const emptyDetail = $('#detail').innerHTML;
function chooseCamera(name: CameraName) { world?.setCamera(name); document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.camera===name))); }
function reset() { Object.assign(state, initialState()); if(matchMedia('(prefers-reduced-motion: reduce)').matches) state.animationPlaying=false; world?.reset(); chooseCamera('全景'); $('#detail').innerHTML=emptyDetail; $('#temp-error').textContent=''; update(); }
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>{setMode(state,b.dataset.mode as Mode);update();});
document.querySelectorAll<HTMLInputElement>('[data-layer]').forEach(b=>b.onchange=()=>{state.layers[b.dataset.layer as Layer]=b.checked;update();});
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>b.onclick=()=>chooseCamera(b.dataset.camera as CameraName));
$('#play').onclick=()=>{state.animationPlaying=!state.animationPlaying;update();};
$<HTMLInputElement>('#speed').oninput=e=>{state.speed=Number((e.target as HTMLInputElement).value);update();};
$<HTMLSelectElement>('#equipment').onchange=e=>{const id=(e.target as HTMLSelectElement).value;if(!id)$('#detail').innerHTML=emptyDetail;selected(id||null);};
$('#detail').onclick=e=>{if((e.target as HTMLElement).closest('#start-explore')){selected('tank');chooseCamera('設備間');}};
$('#reset').onclick=reset; $('#retry').onclick=()=>location.reload();
(['start','stop','current'] as const).forEach(k=>{ const input=$<HTMLInputElement>(`#${k}-temp`); input.addEventListener(k==='current'?'input':'change',()=>{ const ok=setTemp(state,k,input.valueAsNumber); $('#temp-error').textContent=ok?'':'請輸入有效溫度，且啟動值必須低於停止值。';update(); }); });
$('#demo').onclick=()=>{setMode(state,'回水循環');setTemp(state,'current',state.temps.start);update();};
document.querySelectorAll<HTMLInputElement>('[data-balance]').forEach(b=>b.oninput=()=>{state.balances[Number(b.dataset.balance)]=b.valueAsNumber;update();});
const dialog=$<HTMLDialogElement>('#help-dialog'); $('#help').onclick=()=>dialog.showModal(); $('#close-help').onclick=()=>dialog.close(); dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
update();
try { world=createScene($('#scene'),state,id=>selected(id),(message,error)=>{ $('#load-status').textContent=error?'模型無法使用':message; if(error){$('#load-error').hidden=false;$('#error-message').textContent=message;}update(); }); }
catch { $('#load-error').hidden=false; $('#error-message').textContent='此瀏覽器無法建立 WebGL。請啟用硬體加速，或使用支援 WebGL 的瀏覽器。下方教學控制仍可使用。'; $('#load-status').textContent='WebGL 無法使用'; }
const debug = { get loaded(){return world?.loaded??false;}, get currentMode(){return state.currentMode;}, get layers(){return {...state.layers};}, get animationPlaying(){return state.animationPlaying;}, get speed(){return state.speed;}, get pumpState(){return state.pumpState;}, get temps(){return {...state.temps};}, get balances(){return [...state.balances];}, get selectedEquipment(){return state.selectedEquipment;}, get modelNodes(){return world?.modelNodes??[];}, get camera(){return world?.currentCamera;}, get phase(){return world?.phase??0;}, setCamera:chooseCamera, setMode:(mode:Mode)=>{setMode(state,mode);update();}, projectEquipment:(id:string)=>world?.project(id), reset };
Object.defineProperty(window,'__T2_DEBUG__',{value:debug,configurable:true});
declare global { interface Window { __T2_DEBUG__: typeof debug } }
if(import.meta.hot) import.meta.hot.dispose(()=>world?.dispose());
