// "Pourquoi les hublots sont ronds" (de Havilland Comet, 1954) — timeline. Everything here is a pure function of the
// frame: shot table, cameras, lens, cue times (taken from the word timings of voice_comet_fr.wav).
//
// ===================== SCALE SHEET (1 unit = 1 metre; nothing changes size between shots) =====================
//   adult character ............ 1.70 m (toon card x 1.013); seated passengers are the same card lowered 0.45 m
//   building door .............. 2.00 m tall
//   de Havilland Comet 1 ....... 28.0 m long (x -14.5 .. +13.5), 35.0 m wingspan, hull 3.0 m across, fin tip 8.9 m
//                                above the ground, hull axis 2.9 m above the apron, main wheels 0.9 m
//   cabin window (1952) ........ 0.40 x 0.42 m, nearly square, corner radius 6 cm (already slightly rounded)
//   cabin window (today) ....... 0.26 x 0.36 m, fully rounded       cabin: 2.9 m wide, 2.05 m floor to ceiling
//   aircraft passenger door .... 0.9 x 1.45 m (the Comet's doors were small), airstairs 0.8 m wide
//   Farnborough test tank ...... 34 x 7 m, 4.3 m deep (published sizes differ; drawn about 34 x 7 x 4.3 m)
//   control tower 14 m, hangar 44 m wide, jeep 3.4 m, suitcase 0.6 m, oil drum 0.88 m
//   Size changes on screen come from the camera only. The one exception is physical: during the tank test the hull
//   "breathes" by +-2 % (the real stretch is far smaller; exaggerated so that the pressure cycle can be seen).
// ==============================================================================================================
import * as THREE from "three";

export const FPS = 30;
export const TOTAL = 1998;
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
export const S = { s1: 0.0, s2: 2.55, s3: 8.3, s4: 11.8, s5: 17.95, s6: 20.25, s7: 24.95, s8: 29.28, s9: 35.55, s10: 42.35, s11: 50.4, s12: 55.15, s13: 60.55, end: TOTAL / FPS };
/** cue times = the spoken word they illustrate; the SFX are mixed at exactly these times (render_comet.sh) */
export const CUE = {
  jet: 5.5,                                        // "premier avion de ligne a reaction"
  y1954: 12.23, two: 13.52, none: 16.38, ground: 18.71,
  plunge: 22.02,                                   // "plongent un fuselage entier"
  pump: [25.33, 25.77, 26.54, 26.9, 27.61, 28.15], // gonflent / degonflent / encore / encore / comme autant / de vols
  crack: 30.37, corner: 31.7, fatigue: 33.83,
  balloon: 37.25, corners: 39.36, focus: 41.02,
  wreck: 43.85, roof: 46.82, aerial: 47.68, notWin: 48.73,
  almost: 51.76, rounded: 53.98,
  lesson: 56.73, round: 57.7, spread: 58.02, conc: 59.2,
  today: 61.71, yours: 62.7, allRound: 63.62,
};

export type SetName = "airport" | "cabin" | "tank" | "today";
/** world x offset of each set (they never see each other) */
export const OX: Record<SetName, number> = { airport: 0, cabin: 300, tank: 500, today: 800 };
export type ShotDef = { id: number; a: number; b: number; set: SetName };
const T = [S.s1, S.s2, S.s3, S.s4, S.s5, S.s6, S.s7, S.s8, S.s9, S.s10, S.s11, S.s12, S.s13, S.end];
const SETS: SetName[] = ["today", "airport", "cabin", "airport", "airport", "tank", "tank", "tank", "tank", "tank", "airport", "today", "today"];
export const SHOTS: ShotDef[] = SETS.map((set, i) => ({ id: i + 1, a: Math.round(T[i] * FPS), b: i === SETS.length - 1 ? TOTAL : Math.round(T[i + 1] * FPS), set }));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- the parked Comet: one fixed place in the airport set for the whole film ----------------
export const PLANE = { x: 0, y: 2.9, z: -14, yaw: (-30 * Math.PI) / 180, pitch: 0 };
/** airport-set position of a point given in the aircraft's own axes (x toward the nose, y up, z toward the near wing tip) */
export const planePt = (lx: number, ly: number, lz: number): V3 => {
  const cy = Math.cos(PLANE.yaw), sy = Math.sin(PLANE.yaw);
  return [PLANE.x + lx * cy + lz * sy, PLANE.y + ly, PLANE.z - lx * sy + lz * cy];
};
/** the test hull in the Farnborough tank (tank-set coordinates of its axis; nose toward +x) */
export const TANK = { y: 2.65, wall: 4.3, water: 3.9 }; // the crown of the hull just breaks the surface so the opening can be read (the real hull was fully under water)
/** hull radius profile of the Comet (x along the axis, r) and a point on its skin at elevation a (radians from the +z side) */
export const FUS: [number, number][] = [[-14.5, 0.05], [-14.2, 0.32], [-12, 0.82], [-8, 1.3], [-4, 1.5], [8, 1.5], [10.5, 1.32], [12, 0.98], [13, 0.52], [13.4, 0.22], [13.5, 0.02]];
export const skin = (x: number, a: number, off = 0.02): V3 => { const r = lin(FUS, x) + off; return [x, r * Math.sin(a), r * Math.cos(a)]; };
/** the crack of the tank test: zig-zag from two corners of an upper-hull opening, in (x, elevation) on the skin */
export const HATCH = { x0: 6.55, x1: 7.05, a0: 0.78, a1: 1.1 };
export const CRACK: [number, number][][] = [
  [[7.05, 1.1], [7.3, 1.17], [7.48, 1.1], [7.78, 1.2], [7.98, 1.13], [8.3, 1.24], [8.55, 1.19]],
  [[6.55, 0.78], [6.33, 0.7], [6.15, 0.77], [5.88, 0.66], [5.7, 0.72]],
];
/** breathing of the test hull (1 = at rest): swells on "gonflent", relaxes on "degonflent", again and again */
export const breath = (t: number) => {
  if (t < CUE.pump[0] - 0.2 || t > CUE.crack + 0.2) return 1;
  const k: [number, number][] = [[CUE.pump[0] - 0.2, 0], [CUE.pump[0] + 0.15, 1], [CUE.pump[1] + 0.2, 0], [CUE.pump[2] + 0.1, 1], [CUE.pump[3] + 0.25, 0], [CUE.pump[4] + 0.1, 1], [CUE.pump[5] + 0.2, 0], [29.0, 1], [29.6, 0.2], [CUE.crack, 1], [CUE.crack + 0.2, 0]];
  return 1 + 0.02 * linS(k, t);
};

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
  1: [[0, fr(0.1, -0.95, 4.1, { cz: -0.5 })], [S.s2, fr(0.15, -0.9, 3.9, { cz: -0.5, dx: 0.1 })]],
  2: [[S.s2, at([10, 4.2, 47], [-1.6, 7.6, -12])], [S.s3, at([8.2, 4.4, 44], [-1.4, 7.4, -12])]],
  3: [[S.s3, fr(0.1, -1.25, 4.9, { cz: -0.5 })], [S.s4, fr(0.3, -1.2, 4.7, { cz: -0.5, dx: 0.1 })]],
  4: [[S.s4, fr(4.3, -0.3, 5.3, { cz: -4.2 })], [S.s5, fr(4.4, -0.26, 4.9, { cz: -4.2, dx: 0.2 })]],
  5: [[S.s5, at([-7, 2.6, 33], [1.5, 5.6, -12])], [S.s6, at([-6.4, 2.7, 31.6], [1.5, 5.5, -12])]],
  6: [[S.s6, at([21, 8.8, 14.5], [1.5, 3.2, -0.3])], [S.s7, at([19.8, 8.4, 13.6], [2, 3.3, -0.3])]],
  7: [[S.s7, at([14.2, 6.5, 12.2], [7.6, 3.75, 0.6])], [S.s8, at([13.6, 6.3, 11.4], [7.6, 3.8, 0.6])]],
  8: [[S.s8, at([12.2, 6.1, 10.4], [7.7, 3.95, 0.6])], [S.s9, at([11.6, 5.9, 9.7], [7.7, 4.0, 0.6])]],
  9: [[S.s9, fr(10.6, -0.2, 4.7, { cz: 7.6 })], [S.s10, fr(10.7, -0.17, 4.5, { cz: 7.6, dx: 0.12 })]],
  10: [[S.s10, fr(10.8, -0.2, 4.6, { cz: 7.6, dx: 0.1 })], [S.s11, fr(10.7, -0.17, 4.4, { cz: 7.6, dx: -0.05 })]],
  11: [[S.s11, fr(4.55, -0.3, 5.3, { cz: -8.8 })], [S.s12, fr(4.65, -0.26, 5.0, { cz: -8.8, dx: 0.15 })]],
  12: [[S.s12, fr(0.0, -1.0, 4.3, { cz: -0.5, dx: -0.1 })], [S.s13, fr(0.05, -0.96, 4.1, { cz: -0.5 })]],
  13: [[S.s13, fr(0.1, -0.9, 4.0, { cz: -0.5 })], [S.end, fr(0.2, -0.82, 3.6, { cz: -0.5, dx: 0.12 })]],
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
  1: { cInf: 9, p: [0.4, 1, -0.7] }, 2: { cInf: 3, p: [7, 1.2, 31] }, 3: { cInf: 9, p: [0, 1, -0.7] }, 4: { cInf: 9, p: [4.3, 1.5, -4.6] },
  5: { cInf: 3, p: [-4.4, 1.2, 19.4] }, 6: { cInf: 4, p: [6, 3.5, 2] }, 7: { cInf: 6, p: [8, 3.8, 2] }, 8: { cInf: 6, p: [7.7, 4, 1.5] },
  9: { cInf: 10, p: [10.6, 1.3, 7.4] }, 10: { cInf: 10, p: [10.7, 1.3, 7.4] }, 11: { cInf: 8, p: [4.9, 2, -9.4] }, 12: { cInf: 9, p: [0.4, 1, -0.7] }, 13: { cInf: 9, p: [0.5, 1, -0.7] },
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
