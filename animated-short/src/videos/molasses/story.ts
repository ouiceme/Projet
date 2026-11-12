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
export const STREET_Y = 0;          // street ground level
export const TANK_X = 4;            // tank centre x (offset slightly from centreline)
export const TANK_Z = 22;           // tank centre z (back of scene)
export const TANK_R = 13.7;         // tank radius (~90 ft / 2)
export const TANK_H = 15.2;         // tank height (~50 ft)
export const ELEVATED_Y = 5.8;      // elevated railway deck height
// tank burst timing (story seconds)
export const RIVET1_TAU  = 12.3;    // "A rivet pops."
export const RIVET2_TAU  = 13.9;    // "Then another."
export const BURST_TAU   = 15.8;    // "tears open" — full burst
export const WAVE_END_TAU = 23.0;   // wave has swept through

// ---------------- wave physics ----------------
export const waveFront = (tau: number): number =>
  tau < BURST_TAU ? TANK_Z - TANK_R :
  lin([[BURST_TAU, TANK_Z - TANK_R], [WAVE_END_TAU, -60]], tau);
export const waveHeight = (tau: number): number =>
  tau < BURST_TAU ? 0 :
  lin([[BURST_TAU, 7.6], [BURST_TAU + 1.5, 7.6], [WAVE_END_TAU, 1.4]], tau);
// tank damage progress (0 = intact, 1 = fully burst)
export const tankBurst = (tau: number): number =>
  tau < RIVET1_TAU ? 0 :
  tau < BURST_TAU ? lin([[RIVET1_TAU, 0], [RIVET2_TAU, 0.25], [BURST_TAU, 1]], tau) : 1;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "street" | "flee" | "aftermath" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number };
export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,    b: 130,  light: "day",    crowd: "street",   tau: (t) => t },            // hook wide
  { id: 2,  a: 130,  b: 310,  light: "day",    crowd: "street",   tau: (t) => t },            // aerial setting
  { id: 3,  a: 310,  b: 430,  light: "day",    crowd: "street",   tau: (t) => t },            // tank CU
  { id: 4,  a: 430,  b: 540,  light: "day",    crowd: "street",   tau: (t) => t },            // rivet pops
  { id: 5,  a: 540,  b: 710,  light: "day",    crowd: "flee",     tau: (t) => t },            // burst + wave wide
  { id: 6,  a: 710,  b: 820,  light: "day",    crowd: "flee",     tau: (t) => t },            // street level horses
  { id: 7,  a: 820,  b: 930,  light: "day",    crowd: "aftermath",tau: (t) => t },            // destruction
  { id: 8,  a: 930,  b: 1050, light: "day",    crowd: "aftermath",tau: (t) => t },            // harbour aftermath
  { id: 9,  a: 1050, b: 1200, light: "golden", crowd: "none",     tau: (t) => t },            // golden explanation
  { id: 10, a: 1200, b: 1500, light: "golden", crowd: "none",     tau: (t) => t },            // water balloon analogy
  { id: 11, a: 1500, b: 1700, light: "day",    crowd: "street",   tau: (t) => t },            // consequence
  { id: 12, a: 1700, b: TOTAL,light: "day",    crowd: "street",   tau: (t) => t },            // callback
];
export const XFADE: Record<number, number> = { 2: 6, 9: 10, 10: 8, 11: 10, 12: 8 };
export const FLASH_AT = 130;  // white flash after hook

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2)
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// Shot 1 (hook wide): street level, tank visible in background, slow push-in
const S1a = (f: number) => dolly([-3, 1.6, -18], [0, 1.4, TANK_Z], pushK(f, 0, 0.0018), { fov: 44 });
const S1b = (f: number) => dolly([-1.5, 1.4, -12], [0, 1.4, TANK_Z - 5], pushK(f, 50, 0.002), { fov: 42, roll: -0.03 });
// Shot 2 (aerial setting): high over North End looking down
const S2a = (f: number) => zoom([TANK_X, 28, TANK_Z - 35], [TANK_X - 2, 2, TANK_Z + 5], 44, pushK(f, 126, 0.0015));
const S2b = (f: number) => zoom([TANK_X - 3, 22, TANK_Z - 28], [TANK_X, 1.5, TANK_Z], 40, pushK(f, 190, 0.0015, 0.004, 32));
// Shot 3 (tank CU): close on tank surface, rivets
const S3a = (f: number) => dolly([TANK_X - TANK_R + 1.5, TANK_H * 0.6, TANK_Z - 3], [TANK_X - TANK_R + 0.3, TANK_H * 0.6, TANK_Z], pushK(f, 310, 0.003), { fov: 36 });
const S3b = (f: number) => dolly([TANK_X - TANK_R + 2, TANK_H * 0.4, TANK_Z - 2], [TANK_X - TANK_R + 0.3, TANK_H * 0.4, TANK_Z], pushK(f, 370, 0.003), { fov: 34, roll: 0.04 });
// Shot 4 (rivet CU + burst start): extreme close on rivet, then pull back on burst
const S4a = (f: number) => dolly([TANK_X - TANK_R + 0.8, TANK_H * 0.35, TANK_Z - 1.2], [TANK_X - TANK_R + 0.1, TANK_H * 0.35, TANK_Z], pushK(f, 430, 0.004, 0.009, 28), { fov: 32 });
const S4b = (f: number) => dolly([TANK_X - TANK_R - 2, TANK_H * 0.5, TANK_Z - 6], [TANK_X, TANK_H * 0.4, TANK_Z], pushK(f, 500, 0.0015), { fov: 44, roll: -0.04 });
// Shot 5 (burst + wave wide): pulled back wide watching the wave come
const S5a = (f: number) => dolly([TANK_X + 10, TANK_H * 0.3, TANK_Z - 20], [0, 1.8, 0], pushK(f, 540, 0.0012), { fov: 50 });
const S5b = (f: number) => dolly([TANK_X + 7, TANK_H * 0.2, TANK_Z - 25], [0, 1.5, -5], pushK(f, 640, 0.0018), { fov: 48, roll: 0.04 });
// Shot 6 (ground level horses): eye level, street, wave incoming
const S6a = (f: number) => dolly([3.5, 1.5, -8], [0, 1.4, 0], pushK(f, 710, 0.002), { fov: 42 });
const S6b = (f: number) => dolly([2.5, 1.0, -7], [-1, 0.8, 0], pushK(f, 760, 0.0025), { fov: 40, roll: -0.035 });
// Shot 7 (destruction): elevated railway crumbling
const S7a = (f: number) => dolly([6, ELEVATED_Y + 2, -15], [0, ELEVATED_Y + 0.5, 0], pushK(f, 820, 0.002), { fov: 44 });
const S7b = (f: number) => dolly([4, ELEVATED_Y, -12], [0, ELEVATED_Y * 0.8, 2], pushK(f, 870, 0.0025), { fov: 40, roll: 0.04 });
// Shot 8 (harbour aftermath): looking toward harbour, brown water
const S8a = (f: number) => zoom([-8, 3.5, -40], [0, 1.0, -60], 42, pushK(f, 930, 0.0015));
const S8b = (f: number) => dolly([-5, 1.8, -38], [0, 0.6, -50], pushK(f, 990, 0.002), { fov: 44, roll: -0.04 });
// Shot 9 (golden explanation): warm light, slow pull back over the street
const S9a = (f: number) => zoom([TANK_X, 18, TANK_Z - 30], [TANK_X, 1, TANK_Z + 5], 40, pushK(f, 1044, 0.001));
// Shot 10 (water balloon analogy): a child with a water balloon in a park, golden light
const S10a = (f: number) => dolly([5.5, 2.5, -12], [0, 1.4, -4], pushK(f, 1194, 0.0015), { fov: 40 });
const S10b = (f: number) => dolly([3, 2.2, -10], [0, 1.5, -3], pushK(f, 1310, 0.0012), { fov: 38, roll: 0.03 });
// Shot 11 (consequence): building with sign "Safety Inspection Required"
const S11a = (f: number) => dolly([-4, 1.9, -14], [0, 1.6, -6], pushK(f, 1494, 0.002), { fov: 42 });
const S11b = (f: number) => dolly([-3, 1.5, -11], [0, 1.4, -5], pushK(f, 1570, 0.0018), { fov: 40, roll: -0.035 });
// Shot 12 (callback): modern street, tourist smelling the air, wide then MS
const S12a = (f: number) => dolly([5, 2.8, -18], [0, 1.5, -4], pushK(f, 1694, 0.0015), { fov: 44 });
const S12b = (f: number) => dolly([2, 1.9, -10], [0, 1.65, -2], pushK(f, 1770, 0.0018, 0.005, 32), { fov: 40 });
const S12c = (f: number) => dolly([0.4, 1.7, -6], [0, 1.65, -1], pushK(f, 1860, 0.001), { fov: 38, roll: 0.035 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 50, dur: 32, s: S1b }],
  2: [{ f: 126, s: S2a }, { f: 190, dur: 22, s: S2b }],
  3: [{ f: 310, s: S3a }, { f: 370, dur: 28, s: S3b }],
  4: [{ f: 430, s: S4a }, { f: 500, cut: true, s: S4b }],
  5: [{ f: 540, s: S5a }, { f: 640, dur: 28, s: S5b }],
  6: [{ f: 710, s: S6a }, { f: 760, dur: 22, s: S6b }],
  7: [{ f: 820, s: S7a }, { f: 870, cut: true, s: S7b }],
  8: [{ f: 930, s: S8a }, { f: 990, dur: 24, s: S8b }],
  9: [{ f: 1044, s: S9a }],
  10: [{ f: 1194, s: S10a }, { f: 1310, dur: 28, s: S10b }],
  11: [{ f: 1494, s: S11a }, { f: 1570, dur: 22, s: S11b }],
  12: [{ f: 1694, s: S12a }, { f: 1770, dur: 26, s: S12b }, { f: 1860, dur: 20, s: S12c }],
};

// Impact kicks: burst moment + elevated railway collapse
const KICKS: [number, number][] = [[BURST_TAU, 1.4], [BURST_TAU + 0.5, 0.8], [30.1, 0.6], [32.5, 0.9]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0,    cInf: 12 },             // hook wide: tank in BG blurred
  { f: 310,  cInf: 15 },             // tank CU
  { f: 540,  cInf: 0  },             // burst wide: everything sharp
  { f: 710,  cInf: 13 },             // street level
  { f: 820,  cInf: 0  },             // destruction wide
  { f: 930,  cInf: 7  },             // harbour
  { f: 1050, cInf: 5  },             // golden wide
  { f: 1200, cInf: 10 },             // balloon analogy
  { f: 1500, cInf: 8  },             // consequence
  { f: 1700, cInf: 0  },             // callback wide
  { f: 1770, cInf: 10 },             // callback MS
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];  // No Kenney kit: foreground props procedural
