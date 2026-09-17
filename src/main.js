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

const groups={cold:[],hot:[],return:[],equipment:[],building:[]};
const clickable=new Set(['Concept_Pressurized_Storage_Tank','Concept_Cold_Constant_Pressure_Pump','Concept_Return_Circulation_Pump','Differential_Temperature_Control','Balancing_Valve_1','Balancing_Valve_2','Balancing_Valve_3']);
const info={
 Concept_Pressurized_Storage_Tank:['密閉式儲熱桶','冷水自下部補入，熱水由上部供出；供水壓力主要承接冷水側壓力，不靠桶內蒸氣壓。'],
 Concept_Cold_Constant_Pressure_Pump:['冷水恆壓泵','同一加壓水源同時供應冷水末端與儲熱桶，使冷、熱水壓力基準一致，降低混合水溫波動。'],
 Concept_Return_Circulation_Pump:['熱水回水泵','只克服回水環路阻力、維持管路溫度；它不是末端供水加壓泵，揚程不直接疊加為龍頭供水壓力。'],
 Differential_Temperature_Control:['回差溫控器','回水溫度跌到下限時啟動，升到上限時停止；上下限差值避免幫浦頻繁啟停。'],
 Balancing_Valve_1:['支路平衡閥 1','以增加低阻力支路阻力的方式，限制近端過流，讓設計循環流量分配到各回水支路。'],
 Balancing_Valve_2:['支路平衡閥 2','依支路散熱負荷與設計溫差設定流量，目的不是把所有閥門開度調成相同。'],
 Balancing_Valve_3:['支路平衡閥 3','最不利支路保留最低必要阻力，再由其他支路節流完成水力平衡。']
};
let model,activeMode='standby',playing=true,speed=1,elapsed=0;
function classify(o){const n=o.name;if(/Cold_|Cold_To|Cold_Common/.test(n))return'cold';if(/Hot_|Tank_Hot/.test(n))return'hot';if(/Return_|Flow_Bead|Differential|Balancing/.test(n))return'return';if(/Concept_|Pressure_Gauge|Temperature_Sensor|Control/.test(n))return'equipment';return'building'}
new GLTFLoader().load('./T2-system.glb',g=>{model=g.scene;model.traverse(o=>{if(o.isMesh){o.userData.baseMaterial=o.material;groups[classify(o)].push(o);if(clickable.has(o.name)){o.userData.clickable=true;o.material=o.material.clone();o.material.emissive=new THREE.Color(0x092a20);}}});scene.add(model);document.querySelector('#loading').classList.add('hidden');fit();},e=>{if(e.total){const p=Math.round(e.loaded/e.total*100);document.querySelector('#load-progress').textContent=p+'%';document.querySelector('#loading i').style.width=p+'%'}},()=>{document.querySelector('#loading span').textContent='模型載入失敗';});
function fit(){const b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());controls.target.copy(c);camera.position.set(c.x+s.x*.65,c.y-s.y*.9,c.z+s.x*.48);controls.update()}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),tip=document.querySelector('#tooltip');
function hit(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(model?.children||[],true).find(x=>x.object.userData.clickable)}
renderer.domElement.addEventListener('pointermove',e=>{const h=hit(e);renderer.domElement.style.cursor=h?'pointer':'grab';tip.style.display=h?'block':'none';if(h){tip.textContent=(info[h.object.name]||[h.object.name])[0];tip.style.left=(e.clientX-viewport.getBoundingClientRect().left+12)+'px';tip.style.top=(e.clientY-viewport.getBoundingClientRect().top+12)+'px'}});
renderer.domElement.addEventListener('click',e=>{const h=hit(e);if(!h)return;const [t,p]=info[h.object.name];document.querySelector('#info-title').textContent=t;document.querySelector('#info-text').textContent=p;document.querySelector('#info-drawer').classList.add('open')});
document.querySelector('#info-close').onclick=()=>document.querySelector('#info-drawer').classList.remove('open');document.querySelector('#reset-view').onclick=fit;
document.querySelector('#panel-toggle').onclick=e=>{document.querySelector('.controls').classList.toggle('collapsed');e.currentTarget.textContent=document.querySelector('.controls').classList.contains('collapsed')?'+':'−'};
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#modes button').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeMode=b.dataset.mode;document.querySelector('#mode-label').textContent={standby:'待機模式',draw:'末端用水模式',return:'回水循環模式',combined:'同時用水模式'}[activeMode];updateTelemetry()});
document.querySelectorAll('#layers input').forEach(i=>i.onchange=()=>groups[i.dataset.layer].forEach(o=>o.visible=i.checked));
document.querySelector('#play-toggle').onclick=e=>{playing=!playing;e.currentTarget.textContent=playing?'暫停':'播放'};
document.querySelector('#speed').oninput=e=>{speed=+e.target.value;document.querySelector('#speed-value').textContent=speed.toFixed(1)+'×'};
function updateTelemetry(){const map={standby:['60.0°C','52.0°C','停止'],draw:['58.5°C','47.0°C','停止'],return:['60.0°C','49.5°C','運轉'],combined:['57.8°C','48.0°C','運轉']}[activeMode];['temp-hot','temp-return','pump-status'].forEach((id,i)=>document.querySelector('#'+id).textContent=map[i])}updateTelemetry();
setInterval(()=>document.querySelector('#clock').textContent=new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}),1000);
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=clock.getDelta();if(playing)elapsed+=dt*speed;controls.update();if(model){groups.return.filter(o=>/Flow_Bead/.test(o.name)).forEach((o,i)=>{const active=activeMode==='return'||activeMode==='combined';o.visible=active&&Math.sin(elapsed*4-i*.8)>.05});groups.cold.filter(o=>/Base_Pressure_Wave/.test(o.name)).forEach((o,i)=>{o.visible=(activeMode==='draw'||activeMode==='combined')&&Math.sin(elapsed*3-i)>.1});}renderer.render(scene,camera)}animate();
