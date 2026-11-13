// "Les trous sont au mauvais endroit" (Abraham Wald, 1943) — timeline. Everything here is a pure function of the
// frame: shot table, cameras, lens, cue times (taken from the word timings of voice_wald_fr.wav).
//
// ===================== SCALE SHEET (1 unit = 1 metre; nothing changes size between shots) =====================
//   adult character ............ 1.70 m (toon card x 1.013)
//   door ....................... 2.00 m tall                    desk top .......... 0.78 m, typewriter 0.30 m wide
//   B-17 bomber ................ 22.7 m long, 31.6 m wingspan, ~5.4 m to the fin tip, propeller disc 3.5 m,
//                                main wheels 1.4 m, fuselage 2.3 m across (tail-dragger: sits 6.3 degrees nose-up)
//   hangar ..................... 44 m wide, 13 m to the roof crown, door 36 x 8.5 m
//   control tower .............. 14 m, jeep 3.4 m long, oil drum 0.88 m tall, crate 0.6 m
//   blackboard ................. 3.4 x 1.7 m                    bookshop table .... 0.80 m
//   Bullet holes are drawn 0.20-0.34 m across (cartoon readability; the same size in every shot).
//   Size changes on screen come from the camera only (distance / framing), never from rescaling an object,
//   except the 6 % landing pop of the armour plates.
// ==============================================================================================================
import * as THREE from "three";

export const FPS = 30;
export const TOTAL = 2049;
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
/** tiny pop 1 -> 1.06 -> 1 peaking exactly at t0 */
export const pop = (tau: number, t0: number, amt = 0.06, w = 0.075) => 1 + amt * Math.exp(-(((tau - t0) / w) ** 2));
export const rnd = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- shots (seconds; cuts sit just before the first word of each sentence) ----------------
export const S = { s1: 0.0, s2: 4.7, s3: 8.65, s4: 15.38, s5: 19.45, s6: 24.92, s7: 28.6, s8: 33.55, s9: 43.42, s10: 51.63, s11: 56.32, s12: 62.9, end: TOTAL / FPS };
/** cue times = the spoken word they illustrate; the SFX are mixed at exactly these times (render_wald.sh) */
export const CUE = {
  tally: [10.81, 11.55, 12.1, 14.02],            // ailes, fuselage, queue, moteurs
  plates: [17.35, 17.72, 18.09],                  // "blinder" -> three plates land on the holed zones
  pages: [30.3, 30.62, 30.94, 31.26, 31.58, 31.9, 32.22, 32.54], // the eight memoranda
  ghosts: 44.35,                                  // "moteurs" -> the planes that never came back
  armour: [49.55, 49.75, 49.95, 50.15, 50.4],     // "blinder la ou il n'y a pas de trous"
  stamp: 53.32,                                   // "illustration moderne"
  bias: 57.44, winners: 59.77, others: 61.14, missing: 65.46,
};

export type SetName = "base" | "office" | "today";
/** world x offset of each set (they never see each other) */
export const OX: Record<SetName, number> = { base: 0, office: 300, today: 500 };
export type ShotDef = { id: number; a: number; b: number; set: SetName };
const T = [S.s1, S.s2, S.s3, S.s4, S.s5, S.s6, S.s7, S.s8, S.s9, S.s10, S.s11, S.s12, S.end];
const SETS: SetName[] = ["base", "base", "base", "base", "office", "office", "office", "office", "office", "office", "today", "base"];
export const SHOTS: ShotDef[] = SETS.map((set, i) => ({ id: i + 1, a: Math.round(T[i] * FPS), b: i === SETS.length - 1 ? TOTAL : Math.round(T[i + 1] * FPS), set }));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- the parked bomber: one fixed place in the base set for the whole film ----------------
export const PLANE = { x: 0, y: 2.49, z: -12, yaw: (-30 * Math.PI) / 180, pitch: (6.3 * Math.PI) / 180 };
/** base-set position of a point given in the aircraft's own axes (x toward the nose, y up, z toward the near wing tip) */
export const planePt = (lx: number, ly: number, lz: number): V3 => {
  const cp = Math.cos(PLANE.pitch), sp = Math.sin(PLANE.pitch), cy = Math.cos(PLANE.yaw), sy = Math.sin(PLANE.yaw);
  const x1 = lx * cp - ly * sp, y1 = lx * sp + ly * cp;
  return [PLANE.x + x1 * cy + lz * sy, PLANE.y + y1, PLANE.z - x1 * sy + lz * cy];
};
/** the second bomber coming home in the wide shot (base-set coordinates) */
export const flyer = (t: number): V3 => { const u = (t - S.s2) / (S.s3 - S.s2); return [-78 + 42 * u, 54 - 9 * u, -200]; };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** frame a stage plane: cx = centre x, yb = world y at the bottom edge, v = visible height (m) at the stage plane z = cz */
const fr = (cx: number, yb: number, v: number, o: { fov?: number; dx?: number; dy?: number; cz?: number } = {}): Cam => {
  const fov = o.fov ?? 40, d = v / (2 * Math.tan((fov * Math.PI) / 360)), cy = yb + v / 2, cz = o.cz ?? 0;
  return { pos: [cx + (o.dx ?? 0), cy + (o.dy ?? -0.3), cz + d], look: [cx, cy, cz], fov, roll: 0 };
};
const at = (pos: V3, look: V3, fov = 40): Cam => ({ pos, look, fov, roll: 0 });
/** camera keys per shot in set-local metres: [time, framing]; smooth glide between keys, hard cut between shots */
const CAMS: Record<number, [number, Cam][]> = {
  1: [[0, fr(-6.1, -0.3, 5.3, { cz: -11.6 })], [S.s2, fr(-5.9, -0.25, 4.9, { cz: -11.6, dx: 0.15 })]],
  2: [[S.s2, at([9, 4.2, 42], [-2.4, 7.4, -11])], [S.s3, at([7.4, 4.4, 39], [-2.2, 7.2, -11])]],
  3: [[S.s3, fr(-6.7, -0.3, 5.3, { cz: -12.1 })], [S.s4, fr(-6.9, -0.28, 5.0, { cz: -12.1, dx: -0.12 })]],
  4: [[S.s4, fr(-6.5, -0.3, 5.0, { cz: -12.1, dx: 0.2 })], [S.s5, fr(-6.4, -0.26, 4.7, { cz: -12.1, dx: 0.3 })]],
  5: [[S.s5, fr(0.0, -0.2, 5.6)], [S.s6, fr(0.05, -0.18, 5.25, { dx: 0.12 })]],
  6: [[S.s6, fr(-0.1, -0.14, 4.2)], [S.s7, fr(-0.06, -0.12, 3.95, { dx: -0.08 })]],
  7: [[S.s7, fr(-0.85, -0.15, 4.4)], [S.s8, fr(-0.85, -0.13, 4.15, { dx: 0.1 })]],
  8: [[S.s8, fr(0.5, -0.16, 4.6)], [S.s9, fr(0.54, -0.14, 4.4, { dx: 0.1 })]],
  9: [[S.s9, fr(0.6, -0.16, 4.5, { dx: -0.1 })], [S.s10, fr(0.56, -0.14, 4.3, { dx: 0.0 })]],
  10: [[S.s10, fr(0.45, -0.16, 4.7, { dx: 0.1 })], [S.s11, fr(0.45, -0.14, 4.5, { dx: 0.0 })]],
  11: [[S.s11, fr(-0.22, -0.16, 4.5)], [S.s12, fr(-0.22, -0.14, 4.25, { dx: 0.12 })]],
  12: [[S.s12, fr(0.5, -0.35, 6.4, { cz: 1.5, dy: -1.9 })], [S.end, fr(0.5, -0.32, 6.0, { cz: 1.5, dy: -1.8, dx: -0.15 })]],
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

/** lens per shot: blur-disc radius of things at infinity (px at 1080x1920) and the focus point (set-local) */
const DOF: Record<number, { cInf: number; p: V3 }> = {
  1: { cInf: 11, p: [-6, 1.5, -12.4] }, 2: { cInf: 5, p: [0, 2, -12] }, 3: { cInf: 11, p: [-6.6, 1.5, -12.8] }, 4: { cInf: 11, p: [-6.6, 1.5, -12.8] },
  5: { cInf: 12, p: [0, 1.2, -0.7] }, 6: { cInf: 16, p: [-0.1, 1.2, 0] }, 7: { cInf: 16, p: [-0.8, 1.2, 0] }, 8: { cInf: 15, p: [0.5, 1.2, 0] },
  9: { cInf: 15, p: [0.5, 1.2, 0] }, 10: { cInf: 15, p: [0.5, 1.2, 0] }, 11: { cInf: 19, p: [-0.2, 1.2, 0] }, 12: { cInf: 9, p: [0.5, 2, 0.2] },
};
export const dofAt = (f: number) => { const s = shotAt(f), d = DOF[s.id], ox = OX[s.set]; return { cInf: d.cInf, focus: [d.p[0] + ox, d.p[1], d.p[2]] as V3 }; };

// ---------------- world -> screen (for labels that follow 3D things) ----------------
const pc = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.2, 1500), pv = new THREE.Vector3();
/** pixel position (1080 x 1920) of a set-local point of the current shot */
export const project = (f: number, p: V3): [number, number] => {
  const s = shotAt(f), c = camAt(s.id, f);
  pc.position.set(...c.pos); pc.up.set(0, 1, 0); pc.lookAt(...c.look); pc.fov = c.fov; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
  pv.set(p[0] + OX[s.set], p[1], p[2]).project(pc);
  return [(pv.x * 0.5 + 0.5) * 1080, (1 - (pv.y * 0.5 + 0.5)) * 1920];
};
