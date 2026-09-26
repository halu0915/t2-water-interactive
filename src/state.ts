export const modes = ['待機', '末端用水', '回水循環', '同時用水'] as const;
export type Mode = typeof modes[number];
export const layerNames = ['建築', '冷水', '熱水', '回水', '設備', '標籤'] as const;
export type Layer = typeof layerNames[number];
export type State = ReturnType<typeof initialState>;
export function initialState() {
  return { currentMode: '待機' as Mode, layers: { 建築: true, 冷水: true, 熱水: true, 回水: true, 設備: true, 標籤: false }, animationPlaying: true, speed: 1,
    pumpState: false, temps: { start: 45, stop: 50, current: 47 }, balances: [45, 65, 100], selectedEquipment: null as string | null };
}
export function hysteresis(previous: boolean, temperature: number, start: number, stop: number): boolean {
  if (![temperature, start, stop].every(Number.isFinite) || start >= stop) throw new Error('啟動溫度必須低於停止溫度');
  return temperature <= start ? true : temperature >= stop ? false : previous;
}
export const circulationEnabled = (mode: Mode) => mode === '回水循環' || mode === '同時用水';
export const demandEnabled = (mode: Mode) => mode === '末端用水' || mode === '同時用水';
export function reconcile(s: State) {
  s.pumpState = circulationEnabled(s.currentMode) && hysteresis(s.pumpState, s.temps.current, s.temps.start, s.temps.stop);
}
export function setMode(s: State, mode: Mode) { if (!modes.includes(mode)) return; s.currentMode = mode; reconcile(s); }
export function setTemp(s: State, key: keyof State['temps'], value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const t = { ...s.temps, [key]: Math.min(65, Math.max(30, value)) };
  if (t.start >= t.stop) return false;
  s.temps = t; reconcile(s); return true;
}
export function activeRoutes(s: State) {
  return { 冷水: demandEnabled(s.currentMode), 熱水: demandEnabled(s.currentMode) || s.pumpState, 回水: s.pumpState };
}
// Dimensionless teaching proxy at a fixed illustrative differential, not a hydraulic solver.
export function branchFlow(opening: number, index: number) {
  const resistance = [0.45, 0.65, 1][index] ?? 1;
  return Math.round(Math.min(100, Math.max(0, opening)) / resistance);
}
