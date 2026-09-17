import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './main.css';

const viewport=document.querySelector('#viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2;
viewport.prepend(renderer.domElement);
const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x09110f,.018);
const camera=new THREE.PerspectiveCamera(42,1,.1,300); camera.position.set(34,-42,27);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.target.set(8,5,1.5); controls.minDistance=7; controls.maxDistance=90;
scene.add(new THREE.HemisphereLight(0xbfe8db,0x10221c,2.3)); const sun=new THREE.DirectionalLight(0xffffff,3.6);sun.position.set(14,-18,34);scene.add(sun);
const rim=new THREE.DirectionalLight(0x3bbd92,2);rim.position.set(-25,20,10);scene.add(rim);

const groups={cold:[],hot:[],return:[],equipment:[],fixtures:[],building:[]};
const clickable=new Set(['Concept_Pressurized_Storage_Tank','Concept_Cold_Constant_Pressure_Pump','Concept_Return_Circulation_Pump','Differential_Temperature_Control','Balancing_Valve_1','Balancing_Valve_2','Balancing_Valve_3']);
const info={
 Concept_Pressurized_Storage_Tank:['密閉式儲熱桶','冷水自下部補入，熱水由上部供出；供水壓力主要承接冷水側壓力，不靠桶內蒸氣壓。','https://assets.aosmith.com/damroot/Original/10004/aostt35200-submittal-sheet.pdf','桶體接管與檢修口配置參考 A. O. Smith TJV 系列原廠大樣；T2 實際容量、桶徑、接管口徑與材質仍待選型。'],
 Concept_Cold_Constant_Pressure_Pump:['冷水恆壓泵','同一加壓水源同時供應冷水末端與儲熱桶，使冷、熱水壓力基準一致，降低混合水溫波動。'],
 Concept_Return_Circulation_Pump:['熱水回水泵','只克服回水環路阻力、維持管路溫度；它不是末端供水加壓泵，揚程不直接疊加為龍頭供水壓力。','https://portals.grundfos.com/content/dam/portals/extranet-landing/gca/2024-pricing/GCA_EN_DBS_09_17_24_sm.pdf','外型與用途參考 Grundfos COMFORT 飲用熱水循環泵資料；實際流量、揚程與型號須依 T2 管路散熱及阻力計算。'],
 Differential_Temperature_Control:['回差溫控器','回水溫度跌到下限時啟動，升到上限時停止；上下限差值避免幫浦頻繁啟停。'],
 Balancing_Valve_1:['支路平衡閥 1','以增加低阻力支路阻力的方式，限制近端過流，讓設計循環流量分配到各回水支路。','https://www.caleffi.com/sites/default/files/media/external-file/01362_EN_5.pdf','配置原理與外型參考 Caleffi 116 系列回水熱平衡閥；實際口徑與設定溫度待水力計算。'],
 Balancing_Valve_2:['支路平衡閥 2','依支路散熱負荷與設計溫差設定流量，目的不是把所有閥門開度調成相同。','https://www.caleffi.com/sites/default/files/media/external-file/01362_EN_5.pdf','配置原理與外型參考 Caleffi 116 系列回水熱平衡閥；實際口徑與設定溫度待水力計算。'],
 Balancing_Valve_3:['支路平衡閥 3','最不利支路保留最低必要阻力，再由其他支路節流完成水力平衡。','https://www.caleffi.com/sites/default/files/media/external-file/01362_EN_5.pdf','配置原理與外型參考 Caleffi 116 系列回水熱平衡閥；實際口徑與設定溫度待水力計算。'],
 Shower_Terminal:['淋浴末端','冷、熱水管必須實際接至混合閥，混合後才送往蓮蓬頭。本模型以 T2 圖面既有 W2 標記定位。','https://techcomm.kohler.com/techcomm/pdf/K-27031-9_spec_US-CA_Kohler_en.pdf','外型與接口邏輯參考 KOHLER K-27031-9 原廠尺寸圖；T2 實際品牌、型號與安裝尺寸仍待選型確認。'],
 Basin_Terminal:['洗手盆末端','冷、熱水支管接至龍頭角閥，排水另接存水彎。本模型以 T2 圖面既有 W2 洗手盆標記定位。','https://techcomm.kohler.com/techcomm/pdf/K-2084_spec_US-CA_Kohler_en.pdf','盆體與給排水接口參考 KOHLER K-2084 原廠尺寸圖；T2 實際品牌、型號與安裝尺寸仍待選型確認。']
};
let model,activeMode='standby',playing=true,speed=1,elapsed=0;
function classify(o){const n=o.name;if(/Equipment_Pad|Presentation_Ground/.test(n))return'building';if(/Cold_|Cold_To|Cold_Common/.test(n))return'cold';if(/Hot_|Tank_Hot/.test(n))return'hot';if(/Return_|Flow_Bead|Differential|Balancing/.test(n))return'return';if(/Concept_|Pressure_Gauge|Temperature_Sensor|Control/.test(n))return'equipment';return'building'}
new GLTFLoader().load('./T2-system.glb',g=>{model=g.scene;model.traverse(o=>{if(o.isMesh){const group=classify(o);o.userData.baseMaterial=o.material;groups[group].push(o);if(group==='building'){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.1;o.material.depthWrite=false}if(clickable.has(o.name)){o.userData.clickable=true;o.userData.infoKey=o.name;o.material=o.material.clone();o.material.emissive=new THREE.Color(0x092a20);}}});scene.add(model);buildFixtures();document.querySelector('#loading').classList.add('hidden');fit('system');},e=>{if(e.total){const p=Math.round(e.loaded/e.total*100);document.querySelector('#load-progress').textContent=p+'%';document.querySelector('#loading i').style.width=p+'%'}},()=>{document.querySelector('#loading span').textContent='模型載入失敗';});

const fixtureMaterial=new THREE.MeshStandardMaterial({color:0xe8efec,roughness:.45,metalness:.22});
const chromeMaterial=new THREE.MeshStandardMaterial({color:0xaabbb5,roughness:.22,metalness:.8});
const pipeMaterials={cold:new THREE.MeshStandardMaterial({color:0x2f9df4}),hot:new THREE.MeshStandardMaterial({color:0xf05f4b})};
function cylinderBetween(a,b,r,material){const d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());return m}
function markFixture(mesh,key){mesh.userData.clickable=true;mesh.userData.infoKey=key;mesh.material=mesh.material.clone();mesh.material.emissive=new THREE.Color(0x071b16);groups.fixtures.push(mesh)}
function buildShower(marker,index){const p=new THREE.Vector3();marker.getWorldPosition(p);const u=.22;const root=new THREE.Group();root.name=`Shower_Terminal_${index}`;root.position.copy(p);const rail=cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,u*6),u*.11,chromeMaterial);const arm=cylinderBetween(new THREE.Vector3(0,0,u*5.7),new THREE.Vector3(u*1.45,0,u*5.7),u*.1,chromeMaterial);const head=new THREE.Mesh(new THREE.CylinderGeometry(u*.68,u*.68,u*.12,24),chromeMaterial);head.rotation.z=Math.PI/2;head.position.set(u*1.45,0,u*5.55);const mixer=new THREE.Mesh(new THREE.BoxGeometry(u*1.5,u*.42,u*.42),chromeMaterial);mixer.position.set(0,0,u*1.75);[rail,arm,head,mixer].forEach(x=>{root.add(x);markFixture(x,'Shower_Terminal')});const hot=cylinderBetween(new THREE.Vector3(-u*.38,0,-u*1.25),new THREE.Vector3(-u*.38,0,u*1.75),u*.075,pipeMaterials.hot);const cold=cylinderBetween(new THREE.Vector3(u*.38,0,-u*1.25),new THREE.Vector3(u*.38,0,u*1.75),u*.075,pipeMaterials.cold);root.add(hot,cold);groups.hot.push(hot);groups.cold.push(cold);scene.add(root);marker.visible=false}
function buildBasin(marker,index){const p=new THREE.Vector3();marker.getWorldPosition(p);const u=.2;const root=new THREE.Group();root.name=`Basin_Terminal_${index}`;root.position.copy(p);const bowl=new THREE.Mesh(new THREE.BoxGeometry(u*3.2,u*1.8,u*.48),fixtureMaterial);bowl.position.z=u*.55;const inner=new THREE.Mesh(new THREE.BoxGeometry(u*2.45,u*1.2,u*.26),new THREE.MeshStandardMaterial({color:0xbccbc6,roughness:.55}));inner.position.set(0,0,u*.83);const tap=cylinderBetween(new THREE.Vector3(0,u*.45,u*.82),new THREE.Vector3(0,u*.45,u*2.05),u*.1,chromeMaterial);const spout=cylinderBetween(new THREE.Vector3(0,u*.45,u*2.05),new THREE.Vector3(0,0,u*2.05),u*.1,chromeMaterial);[bowl,inner,tap,spout].forEach(x=>{root.add(x);markFixture(x,'Basin_Terminal')});const hot=cylinderBetween(new THREE.Vector3(-u*.38,u*.45,-u*.7),new THREE.Vector3(-u*.38,u*.45,u*.7),u*.07,pipeMaterials.hot);const cold=cylinderBetween(new THREE.Vector3(u*.38,u*.45,-u*.7),new THREE.Vector3(u*.38,u*.45,u*.7),u*.07,pipeMaterials.cold);root.add(hot,cold);groups.hot.push(hot);groups.cold.push(cold);scene.add(root);marker.visible=false}
function buildFixtures(){const showers=[],basins=[];model.traverse(o=>{if(/^W2_fixture_marker/.test(o.name))showers.push(o);if(/^W2_basin_marker/.test(o.name))basins.push(o)});showers.forEach(buildShower);basins.forEach(buildBasin)}
function boundsFor(view){if(view==='all')return new THREE.Box3().setFromObject(model);const items=view==='wet'?groups.fixtures:[...groups.cold,...groups.hot,...groups.return,...groups.equipment,...groups.fixtures];const b=new THREE.Box3();items.filter(o=>o.visible).forEach(o=>b.expandByObject(o));return b.isEmpty()?new THREE.Box3().setFromObject(model):b}
function frameBox(b,view='system'){const s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z,.8);groups.building.forEach(o=>o.material.opacity=view==='all'?.24:.08);controls.target.copy(c);camera.position.set(c.x+d*.9,c.y-d*1.15,c.z+d*.75);controls.minDistance=Math.max(.25,d*.16);controls.maxDistance=Math.max(20,d*4);controls.update()}
function fit(view='system'){frameBox(boundsFor(view),view)}
function focusTarget(prefix){const b=new THREE.Box3();scene.traverse(o=>{if(o.name?.startsWith(prefix))b.expandByObject(o)});if(!b.isEmpty())frameBox(b,'detail')}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),tip=document.querySelector('#tooltip');
function hit(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(model?.children||[],true).find(x=>x.object.userData.clickable)}
renderer.domElement.addEventListener('pointermove',e=>{const h=hit(e);renderer.domElement.style.cursor=h?'pointer':'grab';tip.style.display=h?'block':'none';if(h){tip.textContent=(info[h.object.name]||[h.object.name])[0];tip.style.left=(e.clientX-viewport.getBoundingClientRect().left+12)+'px';tip.style.top=(e.clientY-viewport.getBoundingClientRect().top+12)+'px'}});
function closeInfo(){document.querySelector('#info-drawer').classList.remove('open')}
function openInfo(key){const [t,p,url,note]=info[key];document.querySelector('#info-title').textContent=t;document.querySelector('#info-text').textContent=p;const ref=document.querySelector('#info-reference');ref.hidden=!url;if(url){document.querySelector('#info-link').href=url;document.querySelector('#info-note').textContent=note}document.querySelector('#info-drawer').classList.add('open')}
renderer.domElement.addEventListener('click',e=>{const h=hit(e);if(h)openInfo(h.object.userData.infoKey||h.object.name)});
document.querySelector('#info-close').onclick=closeInfo;document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeInfo();closePanel()}});document.querySelector('#reset-view').onclick=()=>fit(document.querySelector('.view-presets .active')?.dataset.view||'system');
document.querySelectorAll('.view-presets button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view-presets button').forEach(x=>x.classList.remove('active'));b.classList.add('active');fit(b.dataset.view)});
document.querySelectorAll('#equipment-index button').forEach(b=>b.onclick=()=>{focusTarget(b.dataset.focus);openInfo(b.dataset.info);closePanel()});
const panel=document.querySelector('.controls'),mobileButton=document.querySelector('#mobile-controls'),backdrop=document.querySelector('#panel-backdrop');
function isMobile(){return matchMedia('(max-width:760px)').matches}
function openPanel(){if(!isMobile())return;panel.classList.add('open');backdrop.hidden=false;mobileButton.setAttribute('aria-expanded','true')}
function closePanel(){if(!isMobile())return;panel.classList.remove('open');backdrop.hidden=true;mobileButton.setAttribute('aria-expanded','false')}
mobileButton.onclick=openPanel;backdrop.onclick=closePanel;
document.querySelector('#panel-toggle').onclick=e=>{if(isMobile()){closePanel();return}panel.classList.toggle('collapsed');e.currentTarget.textContent=panel.classList.contains('collapsed')?'+':'−'};
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#modes button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeMode=b.dataset.mode;document.querySelector('#mode-label').textContent={standby:'待機模式',draw:'末端用水模式',return:'回水循環模式',combined:'同時用水模式'}[activeMode];updateTelemetry()});
document.querySelectorAll('#layers input').forEach(i=>i.onchange=()=>groups[i.dataset.layer].forEach(o=>o.visible=i.checked));
document.querySelector('#play-toggle').onclick=e=>{playing=!playing;e.currentTarget.textContent=playing?'暫停':'播放'};
document.querySelector('#speed').oninput=e=>{speed=+e.target.value;document.querySelector('#speed-value').textContent=speed.toFixed(1)+'×'};
function updateTelemetry(){const map={standby:['60.0°C','52.0°C','停止'],draw:['58.5°C','47.0°C','停止'],return:['60.0°C','49.5°C','運轉'],combined:['57.8°C','48.0°C','運轉']}[activeMode];['temp-hot','temp-return','pump-status'].forEach((id,i)=>document.querySelector('#'+id).textContent=map[i])}updateTelemetry();
setInterval(()=>document.querySelector('#clock').textContent=new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}),1000);
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=clock.getDelta();if(playing)elapsed+=dt*speed;controls.update();if(model){groups.return.filter(o=>/Flow_Bead/.test(o.name)).forEach((o,i)=>{const active=activeMode==='return'||activeMode==='combined';o.visible=active&&Math.sin(elapsed*4-i*.8)>.05});groups.cold.filter(o=>/Base_Pressure_Wave/.test(o.name)).forEach((o,i)=>{o.visible=(activeMode==='draw'||activeMode==='combined')&&Math.sin(elapsed*3-i)>.1});}renderer.render(scene,camera)}animate();
