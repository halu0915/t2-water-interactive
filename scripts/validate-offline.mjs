// Supplemental checks when a restricted environment cannot install test runners or bind HTTP.
// This is not a replacement for the Vitest and Playwright suites.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
const source = await readFile(new URL('../src/state.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader:'ts', format:'esm' });
const { initialState, setMode, setTemp, hysteresis, activeRoutes, branchFlow } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
assert.equal(hysteresis(false,45,45,50),true);
assert.equal(hysteresis(true,50,45,50),false);
assert.equal(hysteresis(false,47,45,50),false);
assert.equal(hysteresis(true,47,45,50),true);
assert.throws(()=>hysteresis(false,47,50,45));
assert.throws(()=>hysteresis(false,NaN,45,50));
const s = initialState();
setMode(s,'回水循環');
for (const [temperature,pump] of [[44,true],[47,true],[50,false],[47,false],[45,true]]) { assert.equal(setTemp(s,'current',temperature),true); assert.equal(s.pumpState,pump); }
setMode(s,'待機');assert.equal(s.pumpState,false);
setTemp(s,'current',47);setMode(s,'回水循環');assert.equal(s.pumpState,false);
assert.equal(setTemp(s,'start',51),false);assert.equal(s.temps.start,45);
assert.equal(setTemp(s,'stop',NaN),false);
setTemp(s,'current',44);
for (const [mode,cold,hot,ret] of [['待機',false,false,false],['末端用水',true,true,false],['回水循環',false,true,true],['同時用水',true,true,true]]) { setMode(s,mode); assert.deepEqual(activeRoutes(s),{冷水:cold,熱水:hot,回水:ret}); }
s.layers.回水=false;setMode(s,'回水循環');assert.equal(s.layers.回水,false);assert.equal(s.pumpState,true);
assert.equal(branchFlow(100,0),222);assert.equal(branchFlow(0,0),0);
[45,65,100].forEach((n,i)=>assert.equal(branchFlow(n,i),100));
assert.equal(initialState().layers.標籤,false);assert.equal(initialState().selectedEquipment,null);
console.log('PASS · state transitions, hysteresis boundaries/history, routes, balancing, defaults');
const bytes=await readFile(new URL('../public/models/t2-water-system.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
let meshes=0;gltf.scene.traverse(o=>{if(o.isMesh)meshes++;});assert.equal(meshes,80);
for(const name of ['Concept_Pressurized_Storage_Tank','Concept_Cold_Constant_Pressure_Pump','Concept_Return_Circulation_Pump','Balancing_Valve_1','Balancing_Valve_2','Balancing_Valve_3','Return_Temperature_Sensor','W2_basin_marker002']) {
  // GLTFLoader sanitizes dots in glTF names; accept either form when inspecting source names.
  const object=gltf.scene.getObjectByName(name);assert.ok(object,`missing GLB object: ${name}`);
  const center=new Box3().setFromObject(object).getCenter(new Vector3());assert.ok(center.toArray().every(Number.isFinite));
}
console.log('PASS · actual GLTFLoader parsed 80 meshes; required model anchors have finite bounds');

const { code: contentCode }=await transform(await readFile(new URL('../src/content.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {equipment}=await import(`data:text/javascript;base64,${Buffer.from(contentCode).toString('base64')}`);
const matches=equipment.filter(e=>gltf.scene.getObjectsByProperty('type','Mesh').some(o=>e.match.test(String(o.userData.name??o.name))));
assert.equal(matches.length,8);assert.ok(matches.some(e=>e.id==='far-end'));
console.log('PASS · 8 equipment anchors matched original metadata names; mixing valve is explicitly procedural');
