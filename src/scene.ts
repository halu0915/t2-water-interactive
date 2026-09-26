import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { equipment } from './content';
import { activeRoutes, branchFlow, demandEnabled, type Layer, type State } from './state';

export const cameras = ['全景', '設備間', '衛浴區', '最遠端'] as const;
export type CameraName = typeof cameras[number];
type Route = '冷水' | '熱水' | '回水';
const colors = { 冷水: 0x3287bf, 熱水: 0xc84e40, 回水: 0xe69c35 };
const v = (p: number[]) => new THREE.Vector3(...p);
export function createScene(host: HTMLElement, state: State, select: (id: string) => void, report: (text: string, error?: boolean) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xf0eadf, 1);
  renderer.domElement.setAttribute('aria-label', '冷熱水系統 3D 模型；拖曳旋轉、雙指平移或縮放。設備亦可由清單選取。');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 250);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .09; controls.minDistance = 2; controls.maxDistance = 95;
  controls.maxPolarAngle = Math.PI * .49;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc1b296, 2.8));
  const sun = new THREE.DirectionalLight(0xfff4de, 3.2); sun.position.set(-5, 20, 10); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd5e9ff, 1.5); fill.position.set(10, 8, -15); scene.add(fill);
  const groups = Object.fromEntries(['建築', '冷水', '熱水', '回水', '設備'].map(k => [k, new THREE.Group()])) as Record<Exclude<Layer, '標籤'>, THREE.Group>;
  Object.values(groups).forEach(g => scene.add(g));
  const grid = new THREE.GridHelper(50, 50, 0xc7bead, 0xdcd4c6); grid.position.set(10, -.4, -6); scene.add(grid);
  let loaded = false, disposed = false, phase = 0, lastTime = 0;
  const routeMaterials: { material: THREE.MeshStandardMaterial; layer: Route }[] = [];
  const pumpMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const originals = new Set<THREE.Material>();
  const originalGeometry = new Set<THREE.BufferGeometry>();
  let currentCamera: CameraName = '全景';
  const modelNodes: { name: string; layer: string; metadata: Record<string, unknown> }[] = [];
  const anchors = new Map<string, { point: THREE.Vector3; source: string; mesh: THREE.Mesh; halo: THREE.Mesh; label: HTMLButtonElement }>();
  const flows: { curve: THREE.CurvePath<THREE.Vector3>; markers: THREE.Mesh[]; layer: Route; branch?: number }[] = [];
  const geo = new THREE.SphereGeometry(.1, 10, 8);
  function addFlow(layer: Route, points: number[][], branch?: number) {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    points.slice(1).forEach((p, i) => curve.add(new THREE.LineCurve3(v(points[i]), v(p))));
    const markers = Array.from({ length: Math.max(3, Math.round(curve.getLength() * 1.4)) }, () => {
      const marker = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colors[layer], depthTest: false }));
      marker.renderOrder = 20; groups[layer].add(marker); return marker;
    });
    flows.push({ curve, markers, layer, branch });
  }
  // Approximate visual routes fitted to this conceptual GLB; these are not surveyed pipe centrelines.
  addFlow('冷水', [[-4,.65,-4.2],[-1.5,.65,-4.2],[-1.5,.65,-8],[-2.4,.45,-8]]);
  addFlow('冷水', [[-.2,.65,-4.2],[4.8,.65,-4.2],[4.8,.65,-10.8]]);
  addFlow('熱水', [[-2.4,2.55,-8],[4.8,2.55,-8],[4.8,2.55,-10]]);
  [4.8,2.2,.8].forEach((x, i) => {
    const z = [-9.5,-5.9,-2][i];
    addFlow('熱水', [[4.8,2.55,-10],[x,2.55,-10],[x,2.55,z],[3.6,2.55,z]], i);
    addFlow('回水', [[3.6,2.15,z],[2.8,2.15,z],[2.8,2.15,-5.25],[-1.1,2.15,-5.25],[-1.1,.72,-5.25],[-2.4,.72,-8]], i);
  });
  function setCamera(name: CameraName) {
    if (!cameras.includes(name)) return;
    currentCamera = name;
    const presets: Record<CameraName, number[][]> = { 全景: [[-16,30,29],[10,0,-6]], 設備間: [[-10,9,3],[-1.8,1.2,-6.6]], 衛浴區: [[12,15,7],[2.2,1,-6]], 最遠端: [[9,8,5],[2.8,1.3,-2.8]] };
    controls.target.copy(v(presets[name][1]));
    const offset = v(presets[name][0]).sub(controls.target);
    camera.position.copy(controls.target).add(offset.multiplyScalar(Math.max(1, .95 / camera.aspect))); controls.update();
  }
  setCamera('全景');
  const resize = new ResizeObserver(() => { const { width, height } = host.getBoundingClientRect(); camera.aspect = width / Math.max(1,height); camera.updateProjectionMatrix(); renderer.setSize(width,height); setCamera(currentCamera); });
  resize.observe(host);
  function classify(name: string): Exclude<Layer,'標籤'> {
    if (/^Cold_/.test(name)) return '冷水';
    if (/^Hot_/.test(name)) return '熱水';
    if (/^Return_(Near|Mid|Far|To_)/.test(name)) return '回水';
    if (/Concept_|Tank_|Pressure_Gauge|Sensor|Control|Balancing_/.test(name)) return '設備';
    return '建築';
  }
  new GLTFLoader().load(`${import.meta.env.BASE_URL}models/t2-water-system.glb`, gltf => {
    if (disposed) return;
    const root = gltf.scene; root.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    root.traverse(o => { if (o.name) modelNodes.push({ name: o.name, layer: classify(o.name), metadata: { ...o.userData } }); if (o instanceof THREE.Mesh) { meshes.push(o); originalGeometry.add(o.geometry); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>originals.add(m)); } });
    equipment.forEach(e => {
      const object = root.getObjectsByProperty('type','Mesh').find(o => e.match.test(String(o.userData.name ?? o.name)));
      const point = object ? new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()) : v(e.position);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,16,12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      mesh.position.copy(point); mesh.userData.equipmentId = e.id;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.26,.035,8,32),new THREE.MeshBasicMaterial({ color: 0x80734c, depthTest:false }));
      halo.position.copy(point); halo.renderOrder = 30;
      const label = document.createElement('button'); label.className = 'scene-label'; label.textContent = e.name; label.onclick = () => select(e.id); label.hidden = true; host.append(label);
      groups.設備.add(mesh, halo);
      anchors.set(e.id, { point, source: object ? `GLB 節點：${object.name}` : '補充教學幾何・示意定位', mesh, halo, label });
      if (!object) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(.6,.38,.38),new THREE.MeshStandardMaterial({ color:0xbc9b50, metalness:.55, roughness:.32 }));
        body.position.copy(point); body.userData.equipmentId = e.id; groups.設備.add(body);
      }
    });
    meshes.forEach(mesh => {
      if (/Flow_Bead|_Wave_/.test(mesh.name)) return;
      const layer = classify(mesh.name);
      mesh.applyMatrix4(mesh.matrixWorld.clone().multiply(mesh.matrix.clone().invert()));
      groups[layer].add(mesh);
      if (['冷水', '熱水', '回水'].includes(layer)) {
        const material = new THREE.MeshStandardMaterial({ color: colors[layer as Route], roughness:.4, metalness:.2, transparent:true });
        mesh.material = material; routeMaterials.push({ material, layer: layer as Route });
      }
      if (/Concept_(Cold_Constant_Pressure|Return_Circulation)_Pump/.test(mesh.name)) {
        const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone() as THREE.MeshStandardMaterial;
        mesh.material = material; pumpMaterials.set(mesh.name.includes('Cold')?'cold':'return',material);
      }
      if (layer === '建築') {
        mesh.material = new THREE.MeshStandardMaterial({ color: /floor|Ground|Envelope/i.test(mesh.name) ? 0xd5cbb7 : 0xd3c9b6, roughness: .92, transparent: true, opacity: /floor|Ground|Envelope/i.test(mesh.name) ? .65 : .2, depthWrite: false, side: THREE.DoubleSide });
      }
    });
    loaded = true; report(`模型已載入 · ${modelNodes.length} 個節點`);
  }, event => report(event.total ? `載入模型 ${Math.round(event.loaded / event.total * 100)}%` : '正在載入本機模型…'), () => report('模型載入失敗。請檢查模型檔案後重試。', true));
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  let down = { x:0, y:0 };
  renderer.domElement.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX-down.x,e.clientY-down.y)>6 || !state.layers.設備) return;
    const rect = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(pointer,camera);
    const hits = raycaster.intersectObjects([...anchors.values()].map(a=>a.mesh));
    if (hits[0]) select(hits[0].object.userData.equipmentId);
  });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); report('3D 繪圖連線中斷，請重新載入。', true); });
  function project(id: string) {
    const a = anchors.get(id); if (!a) return null;
    const p = a.point.clone().project(camera); const rect = host.getBoundingClientRect();
    return { x: rect.left+(p.x+1)/2*rect.width, y:rect.top+(1-p.y)/2*rect.height };
  }
  function render(time: number) {
    const dt = Math.min((time-lastTime)/1000,.05); lastTime = time;
    if (state.animationPlaying && !document.hidden) phase += dt*state.speed;
    controls.update();
    Object.entries(groups).forEach(([key,g]) => { g.visible = state.layers[key as keyof typeof groups]; }); grid.visible = state.layers.建築;
    const routes = activeRoutes(state);
    routeMaterials.forEach(({material,layer})=>{material.opacity=routes[layer]?1:.24;material.depthWrite=routes[layer];});
    pumpMaterials.forEach((m,key)=>{m.emissive.setHex(key==='cold'?colors.冷水:colors.回水);m.emissiveIntensity=(key==='cold'?demandEnabled(state.currentMode):state.pumpState)?.55:0;});
    flows.forEach(f => f.markers.forEach((m,i) => {
      const demand = f.layer==='熱水' && demandEnabled(state.currentMode);
      m.visible = routes[f.layer] && (demand || f.branch === undefined || state.balances[f.branch]>0);
      const factor = demand || f.branch === undefined ? 1 : branchFlow(state.balances[f.branch],f.branch)/100;
      m.position.copy(f.curve.getPoint((phase*.11*factor+i/f.markers.length)%1));
    }));
    anchors.forEach((a,id) => {
      const distance = camera.position.distanceTo(a.point);
      const worldPerPixel = 2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,host.clientHeight);
      a.mesh.scale.setScalar(Math.max(.24,worldPerPixel*22));
      a.halo.quaternion.copy(camera.quaternion);
      a.halo.scale.setScalar(state.selectedEquipment===id ? 1.5 : 1);
      (a.halo.material as THREE.MeshBasicMaterial).color.setHex(state.selectedEquipment===id ? 0xbf552f : 0x80734c);
      const p = a.point.clone().project(camera);
      a.label.hidden = !(state.layers.標籤 && state.layers.設備 && p.z<1 && p.z>-1 && Math.abs(p.x)<.95 && Math.abs(p.y)<.95);
      a.label.style.left = `${(p.x+1)*.5*host.clientWidth}px`; a.label.style.top = `${(1-p.y)*.5*host.clientHeight}px`;
    });
    renderer.render(scene,camera);
  }
  renderer.setAnimationLoop(render);
  return { get loaded(){return loaded;}, modelNodes, setCamera, get currentCamera(){return currentCamera;}, project,
    source: (id:string) => anchors.get(id)?.source ?? '模型尚未載入', reset: () => {phase=0;setCamera('全景');}, get phase(){return phase;},
    dispose: () => { disposed=true; renderer.setAnimationLoop(null); resize.disconnect(); controls.dispose(); scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}}); originalGeometry.forEach(g=>g.dispose()); originals.forEach(m=>m.dispose()); renderer.dispose(); anchors.forEach(a=>a.label.remove()); renderer.domElement.remove(); }
  };
}
export type WaterScene = ReturnType<typeof createScene>;
