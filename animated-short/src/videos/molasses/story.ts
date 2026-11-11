// "The Wave That Outran the Horses": molasses flood, Boston 1919.
// Voice: ~/molasses-short/voice/voice.wav, word timings: words.json
// Total: 66.78 s = 2004 frames at 30 fps.
export const FPS = 30;
export const TOTAL = 2004;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- scene constants ----------------
export const STREET_Y = 0;
export const TANK_X = 4;
export const TANK_Z = 22;
export const TANK_R = 13.7;
export const TANK_H = 15.2;
export const ELEVATED_Y = 5.8;
export const RIVET1_TAU  = 12.3;
export const RIVET2_TAU  = 13.9;
export const BURST_TAU   = 15.8;
export const WAVE_END_TAU = 23.0;

export const waveFront = (tau: number): number =>
  tau < BURST_TAU ? TANK_Z - TANK_R :
  lin([[BURST_TAU, TANK_Z - TANK_R], [WAVE_END_TAU, -60]], tau);
export const waveHeight = (tau: number): number =>
  tau < BURST_TAU ? 0 :
  lin([[BURST_TAU, 7.6], [BURST_TAU + 1.5, 7.6], [WAVE_END_TAU, 1.4]], tau);
export const tankBurst = (tau: number): number =>
  tau < RIVET1_TAU ? 0 :
  tau < BURST_TAU ? lin([[RIVET1_TAU, 0], [RIVET2_TAU, 0.25], [BURST_TAU, 1]], tau) : 1;
