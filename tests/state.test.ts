import { describe, expect, it } from 'vitest';
import { initialState, hysteresis, setTemp, setMode, activeRoutes, branchFlow } from '../src/state';

describe('deterministic hysteresis', () => {
  it('starts at lower threshold and stops at upper threshold inclusively', () => {
    expect(hysteresis(false,45,45,50)).toBe(true);
    expect(hysteresis(true,50,45,50)).toBe(false);
  });
  it('retains both possible histories inside the band', () => {
    expect(hysteresis(true,47,45,50)).toBe(true);
    expect(hysteresis(false,47,45,50)).toBe(false);
  });
  it('rejects inverted thresholds and non-finite inputs', () => {
    expect(()=>hysteresis(false,47,50,45)).toThrow();
    expect(()=>hysteresis(false,NaN,45,50)).toThrow();
    const s=initialState(); expect(setTemp(s,'start',50)).toBe(false); expect(s.temps.start).toBe(45);
    expect(setTemp(s,'stop',NaN)).toBe(false);
  });
  it('runs a full thermal cycle without depending on animation time', () => {
    const s=initialState(); setMode(s,'回水循環');
    [44,47,50,47,45].forEach((t,i)=>{setTemp(s,'current',t); expect(s.pumpState).toBe([true,true,false,false,true][i]);});
  });
  it('disables circulation when exiting modes and restarts from OFF in band', () => {
    const s=initialState(); setMode(s,'同時用水');setTemp(s,'current',44); expect(s.pumpState).toBe(true);
    setMode(s,'待機');expect(s.pumpState).toBe(false);setTemp(s,'current',47);setMode(s,'回水循環');expect(s.pumpState).toBe(false);
  });
  it('re-evaluates valid threshold edits immediately', () => {
    const s=initialState();setMode(s,'回水循環');setTemp(s,'start',48);expect(s.pumpState).toBe(true);
    setTemp(s,'start',40);setTemp(s,'stop',46);expect(s.pumpState).toBe(false);
  });
});
describe('routes and balancing',()=>{
  it('offers four distinct mode combinations when circulation is called',()=>{
    const s=initialState();setTemp(s,'current',44);
    const combinations=[['待機',false,false,false],['末端用水',true,true,false],['回水循環',false,true,true],['同時用水',true,true,true]] as const;
    combinations.forEach(([mode,cold,hot,ret])=>{setMode(s,mode);expect(activeRoutes(s)).toEqual({冷水:cold,熱水:hot,回水:ret});});
  });
  it('keeps layer preference independent from mode and pump',()=>{
    const s=initialState();s.layers.回水=false;setMode(s,'同時用水');setTemp(s,'current',40);expect(s.layers.回水).toBe(false);expect(s.pumpState).toBe(true);expect(s.layers.標籤).toBe(false);
  });
  it('illustrates near throttling, closure and far design flow',()=>{
    expect(branchFlow(100,0)).toBeGreaterThan(branchFlow(100,2));
    [45,65,100].forEach((n,i)=>expect(branchFlow(n,i)).toBe(100));
    expect(branchFlow(0,0)).toBe(0);expect(branchFlow(200,2)).toBe(100);
  });
  it('returns independent defaults for reset',()=>{
    const a=initialState();a.balances[0]=0;a.layers.標籤=true;
    expect(initialState().balances).toEqual([45,65,100]);expect(initialState().layers.標籤).toBe(false);
  });
});
