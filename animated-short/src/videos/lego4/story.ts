// LEGO v4 timeline: same voice, same 11 shots and the same snap cues as v3 (src/videos/lego/Lego.tsx), restaged in
// four inked 3D sets. Everything here is a pure function of the frame: shot table, cameras, lens, brick motion.
//
// ===================== SCALE SHEET (1 unit = 1 metre; nothing changes size between shots) =====================
//   adult character ............ 1.70 m (toon card x 1.013)      kid ............... 1.17 m (kid build x 0.90)
//   door / shelf upright ....... 2.00 m                         workbench top ..... 0.90 m, 1.30 m long
//   play table top ............. 0.45 m                         shop counter top .. 1.00 m
//   judge's bench top .......... 0.95 m above a 0.30 m platform window sill ....... 1.10-1.25 m
//   injection press ............ 1.30 m wide, 1.95 m tall       balance ........... 0.50 m tall
//   DEMONSTRATION BRICKS: every brick in the film is the same oversize teaching brick, 6.25 : 1
//     pitch 0.05 m, 2x4 = 0.20 x 0.10 x 0.06 m, stud diameter 0.03 m, stud height 0.011 m
//     (a real brick is 8 mm pitch / 9.6 mm tall: unreadable next to a 1.70 m character in a vertical frame).
//   Size changes on screen come from the camera only (distance / framing), never from rescaling an object,
//   except the 6 % click pop (1 -> 1.06 -> 1 over ~5 frames) on the four snap cues.
// ==============================================================================================================
import * as THREE from "three";

export const FPS = 30;
export const TOTAL = 2601;
export type V3 = [number, number, number];

export const cl = (x: number) => Math.max(0, Math.min(1, x));
export const clamp01 = cl;
export const sm = (x: number) => { const u = cl(x); return u * u * (3 - 2 * u); };
export const eo = (u: number) => 1 - (1 - cl(u)) ** 3;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
export const linS = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + (y1 - y0) * sm((x - x0) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
};
export const fade = (tau: number, a: number, b: number, din = 0.6, dout = 0.5) => Math.min(cl((tau - a) / din), cl((b - tau) / dout));
/** tiny click pop 1 -> 1.06 -> 1 peaking exactly at t0 */
export const pop = (tau: number, t0: number, amt = 0.06, w = 0.075) => 1 + amt * Math.exp(-(((tau - t0) / w) ** 2));
/** accelerating final push that lands exactly at t1 (from `from` down to 0) */
export const push = (tau: number, t0: number, t1: number, from: number) => { const u = cl((tau - t0) / (t1 - t0)); return from * (1 - u * u); };
export const rnd = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- shots (seconds, identical to v3) ----------------
export const S = { s1: 0.0, s2: 5.6, s3: 12.5, s4: 15.9, s5: 19.8, s6: 25.0, s7: 35.7, s8: 46.6, s9: 51.1, s10: 65.8, s11: 80.0, end: 86.688 };
/** SFX cues: the click sounds are mixed at exactly these times */
export const SNAP = { hook: 2.6, lockIn: 31.0, lockOut: 33.0, final: 84.6 };

export type SetName = "room" | "work" | "shop" | "court";
/** world x offset of each set (they never see each other) */
export const OX: Record<SetName, number> = { room: 0, work: 100, shop: 200, court: 300 };
export type ShotDef = { id: number; a: number; b: number; set: SetName };
const T = [S.s1, S.s2, S.s3, S.s4, S.s5, S.s6, S.s7, S.s8, S.s9, S.s10, S.s11, S.end];
const SETS: SetName[] = ["room", "work", "work", "work", "work", "work", "shop", "shop", "court", "shop", "room"];
export const SHOTS: ShotDef[] = SETS.map((set, i) => ({ id: i + 1, a: Math.round(T[i] * FPS), b: i === 10 ? TOTAL : Math.round(T[i + 1] * FPS), set }));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- brick motion (metres) ----------------
export const P = 0.05, BH = 0.06, STUD_H = 0.011, STUD_R = 0.015;
/** S1: height of the dropping brick above its seat; lands exactly at SNAP.hook */
export const hookLift = (t: number) => (t < 2.45 ? linS([[0.25, 0.62], [1.5, 0.16], [2.1, 0.07], [2.45, 0.03]], t) : push(t, 2.45, SNAP.hook, 0.03));
/** S6: clutch offset in v3's card units: 190 = apart, 50 = studs at the mouth, 0 = locked (in at 31.0, out at 33.0) */
export const clutchOff = (tau: number) => {
  if (tau < 30.8) return linS([[27.0, 190], [29.3, 58], [29.8, 50], [30.8, 10]], tau);
  if (tau < SNAP.lockIn) return push(tau, 30.8, SNAP.lockIn, 10);
  if (tau < 32.5) return 0;
  if (tau < SNAP.lockOut) return 4 * sm((tau - 32.5) / 0.5);
  if (tau < 33.15) return 4 + 66 * eo((tau - SNAP.lockOut) / 0.15);
  return linS([[33.15, 70], [34.2, 190]], tau);
};
/** S11: the last brick glides in and lands exactly at SNAP.final */
export const finalX = (t: number) => linS([[S.s11 + 0.3, -0.34], [83.0, 0]], t);
export const finalLift = (t: number) => (t < 84.45 ? linS([[S.s11 + 0.3, 0.2], [83.0, 0.15], [84.0, 0.08], [84.45, 0.03]], t) : push(t, 84.45, SNAP.final, 0.03));
/** S8: compatible bricks land one after another on the display table (soft landings, no click cue) */
export const RAIN = [4, 3, 3, 2].flatMap((n, row) => Array.from({ length: n }, (_, k) => ({ x: -0.62 + (row % 2) * 0.1 + k * 0.2, y: row * BH })))
  .map((r, i) => ({ ...r, t: S.s8 + 0.45 + i * 0.3, col: i % 6 }));
/** S10: balance tilt in degrees (+ = right pan, "prix a la piece", goes down) */
export const balTilt = (t: number) => 10 * sm((t - (S.s10 + 4.8)) / 1.2) + Math.sin((t - S.s10) * 1.6) * 1.2;
/** S9: gavel strikes */
export const STRIKES = [S.s9 + 2.2, S.s9 + 6.5, S.s9 + 11];
/** 0 = gavel up, 1 = struck: 4 f wind-up, 7 f held, strike on the cue */
export const hammerK = (t: number, hits: number[]) => {
  let k = 1;
  for (const th of hits) {
    const n = (t - th) * FPS;
    if (n >= -11 && n < -7) k = Math.min(k, 1 - sm((n + 11) / 4));
    else if (n >= -7 && n < 0) k = 0;
  }
  return k;
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** frame a stage plane: cx = centre x, yb = world y at the bottom edge, v = visible height (m) at the stage plane z = cz */
const fr = (cx: number, yb: number, v: number, o: { fov?: number; dx?: number; dy?: number; cz?: number } = {}): Cam => {
  const fov = o.fov ?? 40, d = v / (2 * Math.tan((fov * Math.PI) / 360)), cy = yb + v / 2, cz = o.cz ?? 0;
  return { pos: [cx + (o.dx ?? 0), cy + (o.dy ?? -0.3), cz + d], look: [cx, cy, cz], fov, roll: 0 };
};
/** camera keys per shot in set-local metres: [time, framing]; smooth glide between keys, hard cut between shots */
const CAMS: Record<number, [number, Cam][]> = {
  1: [[0, fr(0.0, 0.14, 2.4, { dy: -0.05 })], [2.2, fr(0.0, 0.2, 2.1, { dy: -0.05 })], [S.s2, fr(0.0, 0.18, 2.2, { dy: -0.05, dx: 0.06 })]],
  2: [[S.s2, fr(-0.42, -0.16, 4.7)], [S.s3, fr(-0.4, -0.14, 4.4, { dx: 0.12 })]],
  3: [[S.s3, fr(-0.08, -0.1, 3.5)], [S.s4, fr(-0.08, -0.08, 3.3, { dx: -0.08 })]],
  4: [[S.s4, fr(1.3, -0.16, 4.5)], [S.s5, fr(1.34, -0.14, 4.25, { dx: 0.1 })]],
  5: [[S.s5, fr(-0.9, -0.18, 5.1)], [S.s6, fr(-0.9, -0.16, 4.85, { dx: -0.1 })]],
  6: [[S.s6, fr(-0.5, -0.13, 4.15)], [30.5, fr(-0.52, -0.12, 4.0)], [S.s7, fr(-0.5, -0.12, 4.05, { dx: 0.08 })]],
  7: [[S.s7, fr(-0.22, -0.16, 4.5)], [S.s8, fr(-0.22, -0.14, 4.3, { dx: 0.1 })]],
  8: [[S.s8, fr(-0.22, -0.14, 4.3, { dx: 0.1 })], [S.s9, fr(-0.24, -0.1, 4.45, { dx: 0.0 })]],
  9: [[S.s9, fr(0, -0.16, 4.3)], [S.s10, fr(0, -0.14, 4.1, { dx: -0.1 })]],
  10: [[S.s10, fr(4.42, -0.16, 4.4)], [S.s11, fr(4.42, -0.14, 4.2, { dx: 0.1 })]],
  11: [[S.s11, fr(0.0, 0.14, 2.4, { dy: -0.05, dx: -0.05 })], [S.end, fr(0.0, 0.18, 2.15, { dy: -0.05 })]],
};
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: 0,
});
export const camAt = (id: number, f: number): Cam => {
  const t = f / FPS, keys = CAMS[id], ox = OX[SHOTS[id - 1].set];
  let c = keys[keys.length - 1][1];
  if (t <= keys[0][0]) c = keys[0][1];
  else for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    // slow constant creep (calm camera): gentle ease only at the ends of each segment
    const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
    c = mixCam(keys[i - 1][1], keys[i][1], 0.7 * u + 0.3 * sm(u));
    break;
  }
  return { ...c, pos: [c.pos[0] + ox, c.pos[1], c.pos[2]], look: [c.look[0] + ox, c.look[1], c.look[2]] };
};

/** lens per shot: blur-disc radius of things at infinity (px at 1080x1920) and the z of the focus plane (set-local) */
const DOF: Record<number, { cInf: number; z: number }> = {
  1: { cInf: 14, z: -0.15 }, 2: { cInf: 19, z: 0 }, 3: { cInf: 17, z: 0 }, 4: { cInf: 19, z: -0.05 }, 5: { cInf: 20, z: 0 }, 6: { cInf: 18, z: 0 },
  7: { cInf: 19, z: 0 }, 8: { cInf: 19, z: 0 }, 9: { cInf: 15, z: -0.6 }, 10: { cInf: 18, z: -0.2 }, 11: { cInf: 14, z: -0.15 },
};
export const dofAt = (f: number) => { const s = shotAt(f), d = DOF[s.id], c = camAt(s.id, f); return { cInf: d.cInf, focus: [c.look[0], c.look[1], d.z] as V3 }; };

// ---------------- world -> screen (for labels that follow 3D things) ----------------
const pc = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.2, 1500), pv = new THREE.Vector3();
/** pixel position (1080 x 1920) of a set-local point of the current shot */
export const project = (f: number, p: V3): [number, number] => {
  const s = shotAt(f), c = camAt(s.id, f);
  pc.position.set(...c.pos); pc.up.set(0, 1, 0); pc.lookAt(...c.look); pc.fov = c.fov; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
  pv.set(p[0] + OX[s.set], p[1], p[2]).project(pc);
  return [(pv.x * 0.5 + 0.5) * 1080, (1 - (pv.y * 0.5 + 0.5)) * 1920];
};
