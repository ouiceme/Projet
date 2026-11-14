// The four sets of the Comet short as one three.js scene (1950s airport with the parked Comet, cut-away cabin in
// flight, the Farnborough water tank, a cut-away cabin of today), far apart on x so they never see each other.
// Static scenery is merged per material (Batch); the test hull (breathing, crack), the water and the clouds that
// stream past the cabins are posed every frame from story.ts; the cast are lit toon cards (cast.ts). Same light /
// ink / lens / grade pipeline as the Wald short. update(id, f, camera) is a pure function of the shot and the frame.
// Scale sheet: top of story.ts (1 unit = 1 m). No brand marks: the livery is plain white / blue line / bare metal.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, gloss, quad, tri } from "./build";
import { grassHD, cloudHD } from "./paint";
import { boards, wallpaper, checker, panels, stripes, slabs, hullTex, winTex, bezelTex, doorTex, tankTex, waterTex, caseTex, blueprint } from "./tex";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, OX, CUE, PLANE, TANK, FUS, HATCH, CRACK, skin, breath, planePt, camAt, lin, rnd, SetName } from "./story";

// ---------------- palette ----------------
const C = (c: string) => lam("c" + c, () => ({ color: c }));
const T = (key: string, map: THREE.Texture, color = "#ffffff", extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map, color, ...extra }));
const WOOD = "#c58f58", WOOD_D = "#8a5a34", WOOD_L = "#e3b983", STEEL = "#9aa3ad", BRASS = "#d9a93a";
const GLASS = "#bfe6f4", TYRE = "#2e2a36", HOLE = "#241726", BARE = "#cfd6dc", NAVY = "#1f4a9e";

/** closed solid between two matching quads (wing panels, fins): faces are wound outward automatically */
const hexa = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
  const c = new THREE.Vector3(); [...a, ...b].forEach((p) => c.add(p)); c.multiplyScalar(1 / 8);
  const faces: THREE.Vector3[][] = [[a[0], a[1], a[2], a[3]], [b[0], b[1], b[2], b[3]]];
  for (let i = 0; i < 4; i++) faces.push([a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]]);
  return mergeGeometries(faces.map((f) => {
    const n = new THREE.Vector3().subVectors(f[1], f[0]).cross(new THREE.Vector3().subVectors(f[3], f[0]));
    const fc = new THREE.Vector3().add(f[0]).add(f[1]).add(f[2]).add(f[3]).multiplyScalar(0.25).sub(c);
    return n.dot(fc) >= 0 ? quad(f[0], f[1], f[2], f[3]) : quad(f[0], f[3], f[2], f[1]);
  }), false);
};

// ======================= the Comet 1 (own axes: x to the nose, y up, z to the near wing tip; metres) =======================
// 28.0 m from tail (x = -14.5) to nose (x = +13.5), 35.0 m span (z = +-17.5), hull 3.0 m across.
const rAt = (x: number) => lin(FUS, x);
const lathe = (pts: [number, number][], seg = 32) => new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), seg).rotateZ(-Math.PI / 2);
/** cylinder / cone along x from x0 to x1 */
const xcyl = (r0: number, r1: number, x0: number, x1: number, seg = 20) => new THREE.CylinderGeometry(r1, r0, x1 - x0, seg).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
/** curved skin patch hugging the hull from x0 to x1, between elevations a0 < a1 (radians from the +z side) */
const patch = (x0: number, x1: number, a0: number, a1: number, off = 0.025) =>
  new THREE.CylinderGeometry(rAt(x1) + off, rAt(x0) + off, x1 - x0, 12, 1, true, -a1, a1 - a0).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
const kz = (z: number) => Math.max(0, (Math.abs(z) - 1.5) / 16);
const LE = (z: number) => 3.6 - 6.9 * kz(z), TE = (z: number) => -5.4 + 0.3 * kz(z), WY = (z: number) => -0.85 + 0.85 * kz(z), TH = (z: number) => 0.9 - 0.68 * kz(z);
const wsec = (z: number) => { const y = WY(z), t = TH(z); return [V(LE(z), y - t * 0.32, z), V(LE(z), y + t * 0.32, z), V(TE(z), y + t * 0.1, z), V(TE(z), y - t * 0.06, z)]; };
const ENG = [-3.9, -2.5, 2.5, 3.9];
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
/** thin rod between two points */
const rod = (a: number[], b: number[], r: number) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(vb, va), g = new THREE.CylinderGeometry(r, r, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
  return g;
};
const WIN_X = Array.from({ length: 9 }, (_, i) => -6.2 + i * 1.55), WIN_A = Math.asin(0.45 / 1.5);

const mkComet = (o: { gear: boolean; livery: boolean; stairs?: boolean }) => {
  const g = new THREE.Group(), hull = new THREE.Group(), b = new Batch(), hb = new Batch();
  const metal = gloss(BARE, 70, "#ffffff"), glass = gloss("#3f6aa0", 120), steel = gloss(STEEL, 70, "#eef3f8"), white = gloss("#f6f4ec", 80);
  const skinM = o.livery ? gloss("#fdfdfd", 80) : gloss("#aeb8c2", 80);
  if (o.livery) (skinM as THREE.MeshPhongMaterial).map = hullTex();
  // hull + flight-deck glazing
  hb.add(lathe(FUS), skinM);
  for (const [x0, x1, a0, a1] of [[11.0, 11.7, 0.42, 0.85], [11.75, 12.3, 0.5, 0.95], [11.85, 12.5, 1.15, 1.99], [11.0, 11.7, 2.29, 2.72], [11.75, 12.3, 2.19, 2.64]]) hb.add(patch(x0, x1, a0, a1, 0.03), glass);
  hb.build(hull);
  // cabin windows of the near side (nearly square, corners already slightly rounded), roof windows of the direction-finding aerials
  const wm = T("c_winC", winTex("comet", 26), "#ffffff", { alphaTest: 0.5, side: THREE.DoubleSide });
  for (const x of WIN_X) { const m = new THREE.Mesh(patch(x - 0.26, x + 0.26, WIN_A - 0.185, WIN_A + 0.185), wm); m.layers.set(NOINK); m.receiveShadow = true; hull.add(m); }
  for (const x of [5.0, 6.1]) { const m = new THREE.Mesh(patch(x - 0.24, x + 0.24, Math.PI / 2 - 0.15, Math.PI / 2 + 0.15), wm); m.layers.set(NOINK); hull.add(m); }
  if (o.livery) { const m = new THREE.Mesh(patch(-8.45, -7.55, -0.5, 0.5, 0.03), T("c_doorM", doorTex(), "#ffffff", { alphaTest: 0.5, side: THREE.DoubleSide })); m.layers.set(NOINK); hull.add(m); }
  g.add(hull);
  // wings (swept, low) with the four engines buried in the roots
  b.add(hexa(wsec(-1.5), wsec(1.5)), metal);
  for (const s of [-1, 1]) b.add(hexa(wsec(s * 1.5), wsec(s * 17.5)), metal);
  for (const z of ENG) {
    const y = WY(z) + 0.02;
    b.add(xcyl(0.5, 0.62, TE(z) + 0.4, LE(z) - 0.9), metal, at(0, y, z)); b.add(xcyl(0.62, 0.6, LE(z) - 0.9, LE(z) + 0.1), metal, at(0, y, z));
    b.add(xcyl(0.52, 0.52, LE(z) + 0.1, LE(z) + 0.14), C(HOLE), at(0, y, z));
    b.add(xcyl(0.3, 0.26, TE(z) - 0.3, TE(z) + 0.75), steel, at(0, y - 0.05, z)); b.add(xcyl(0.2, 0.2, TE(z) + 0.75, TE(z) + 0.78), C(HOLE), at(0, y - 0.05, z));
  }
  // tail: fin, stabilisers
  const sec = (x0: number, x1: number, y: number, th: number) => [V(x0, y, -th), V(x0, y, th), V(x1, y, th), V(x1, y, -th)];
  b.add(hexa(sec(-13.7, -9.4, 0.9, 0.17), sec(-14.45, -12.5, 6.0, 0.06)), o.livery ? white : metal);
  if (o.livery) b.add(hexa(sec(-14.2, -11.6, 4.0, 0.1), sec(-14.33, -12.05, 4.9, 0.085)), C(NAVY));
  for (const s of [-1, 1]) b.add(hexa([V(-13.5, 0.72, s * 0.3), V(-13.5, 0.98, s * 0.3), V(-10.4, 0.98, s * 0.3), V(-10.4, 0.72, s * 0.3)],
    [V(-13.6, 1.72, s * 7), V(-13.6, 1.8, s * 7), V(-12.3, 1.8, s * 7), V(-12.3, 1.72, s * 7)]), metal);
  // tricycle landing gear
  if (o.gear) {
    const wheel = (x: number, y: number, z: number, r: number, w: number) => { b.add(new THREE.CylinderGeometry(r, r, w, 22).rotateX(Math.PI / 2), C(TYRE), at(x, y, z)); b.add(new THREE.CylinderGeometry(r * 0.45, r * 0.45, w + 0.04, 14).rotateX(Math.PI / 2), steel, at(x, y, z)); };
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 10), steel, at(9.6, -1.95, 0)); for (const z of [-0.2, 0.2]) wheel(9.6, -2.52, z, 0.38, 0.2);
    for (const z of [-4.3, 4.3]) {
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 1.75, 10), steel, at(-1.2, -1.6, z)); b.add(boxGeo(V(-1.85, -2.5, z - 0.07), V(-0.55, -2.38, z + 0.07), 0, true), steel);
      for (const dx of [-0.55, 0.55]) for (const dz of [-0.26, 0.26]) wheel(-1.2 + dx, -2.45, z + dz, 0.45, 0.24);
    }
  }
  // airstairs at the rear door: 0.8 m wide, nine steps down to the apron
  if (o.stairs) {
    const blue = gloss("#2f6fb5", 60), y0 = -0.78, z0 = 1.5, z1 = 5.7, n = 9;
    for (let i = 0; i < n; i++) { const u = (i + 1) / (n + 1), y = y0 + (-2.9 - y0) * u, z = z0 + (z1 - z0) * u; b.add(boxGeo(V(-8.4, y - 0.06, z - 0.24), V(-7.6, y, z + 0.24), 0, true), white); }
    b.add(boxGeo(V(-8.45, y0 - 0.08, 1.3), V(-7.55, y0, z0 + 0.25), 0, true), white);
    for (const x of [-8.5, -7.55]) {
      b.add(hexa([V(x, y0 - 0.3, z0), V(x, y0, z0), V(x + 0.05, y0, z0), V(x + 0.05, y0 - 0.3, z0)], [V(x, -2.9, z1), V(x, -2.6, z1), V(x + 0.05, -2.6, z1), V(x + 0.05, -2.9, z1)]), blue);
      b.add(rod([x + 0.025, y0 + 0.95, z0], [x + 0.025, -1.75, z1], 0.03), steel);
      for (const u of [0, 0.5, 1]) { const y = y0 + (-2.7 - y0) * u, z = z0 + (z1 - z0) * u; b.add(rod([x + 0.025, y, z], [x + 0.025, y + 0.95, z], 0.025), steel); }
      b.add(rod([x + 0.025, y0 - 0.2, 2.2], [x + 0.025, -2.9, 2.2], 0.04), blue);
    }
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14).rotateZ(Math.PI / 2), C(TYRE), at(-8.0, -2.7, 2.2));
  }
  b.build(g);
  g.rotation.order = "YZX";
  return { g, hull };
};

/** builder bound to two batches (inked / not inked) and the set's x offset */
class Bd {
  constructor(public b: Batch, public n: Batch, public ox: number) {}
  box(m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, tile = 0) { this.b.add(boxGeo(V(this.ox + x0, y0, z0), V(this.ox + x1, y1, z1), tile, true), m); }
  geo(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0, noink = false) {
    (noink ? this.n : this.b).add(g, m, new THREE.Matrix4().makeRotationY(ry).setPosition(this.ox + x, y, z));
  }
  /** cylinder centred at (x, y, z); axis "y" (default), "x" or "z" */
  cyl(m: THREE.Material, x: number, y: number, z: number, r: number, h: number, axis: "x" | "y" | "z" = "y", rt = r, seg = 18) {
    const g = new THREE.CylinderGeometry(rt, r, h, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2); if (axis === "z") g.rotateX(Math.PI / 2);
    this.geo(g, m, x, y, z);
  }
  sph(m: THREE.Material, x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1) { this.geo(new THREE.SphereGeometry(r, 22, 14).scale(sx, sy, sz), m, x, y, z); }
  /** one-image quad facing the camera side (+z) */
  pic(m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number) { this.b.add(quad(V(this.ox + x0, y0, z), V(this.ox + x1, y0, z), V(this.ox + x1, y1, z), V(this.ox + x0, y1, z)), m); }
  /** a window in a wall at z: frame, cross bars and sill (the opening itself is left by the caller) */
  window(m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, nx = 2, ny = 2) {
    const t = 0.07;
    this.box(m, x0 - t, x1 + t, y1, y1 + t, z - 0.04, z + 0.08); this.box(m, x0 - t - 0.05, x1 + t + 0.05, y0 - t, y0, z - 0.04, z + 0.16);
    this.box(m, x0 - t, x0, y0, y1, z - 0.04, z + 0.08); this.box(m, x1, x1 + t, y0, y1, z - 0.04, z + 0.08);
    for (let i = 1; i < nx; i++) { const x = x0 + ((x1 - x0) * i) / nx; this.box(m, x - 0.025, x + 0.025, y0, y1, z - 0.02, z + 0.04); }
    for (let i = 1; i < ny; i++) { const y = y0 + ((y1 - y0) * i) / ny; this.box(m, x0, x1, y - 0.025, y + 0.025, z - 0.02, z + 0.04); }
  }
  /** wall slab at z (front face) with a list of rectangular openings on one row */
  wall(m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, holes: [number, number, number, number][] = [], tile = 2) {
    let x = x0;
    for (const [hx0, hx1, hy0, hy1] of [...holes].sort((a, b) => a[0] - b[0])) {
      this.box(m, x, hx0, y0, y1, z - 0.2, z, tile); this.box(m, hx0, hx1, y0, hy0, z - 0.2, z, tile); this.box(m, hx0, hx1, hy1, y1, z - 0.2, z, tile);
      x = hx1;
    }
    this.box(m, x, x1, y0, y1, z - 0.2, z, tile);
  }
  /** bunting: a sagging row of pennants on the wall */
  bunting(x0: number, x1: number, y: number, z: number, n: number) {
    const cols = ["#e2453c", "#ffc21a", "#2f7fb0", "#f4f1ea", "#35a84f"];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, yy = y - 0.28 * 4 * u * (1 - u), w = ((x1 - x0) / n) * 0.42;
      this.b.add(tri(V(this.ox + x - w, yy, z), V(this.ox + x + w, yy, z), V(this.ox + x, yy - 0.3, z)), C(cols[i % 5]));
    }
  }
  /** oil drum 0.88 m */
  drum(col: string, x: number, z: number, y = 0) {
    this.cyl(gloss(col, 50), x, y + 0.44, z, 0.29, 0.88);
    for (const h of [0.02, 0.3, 0.6, 0.86]) this.cyl(gloss(col, 50), x, y + h, z, 0.305, 0.04);
  }
  /** jeep, 3.4 m long, seen from the side */
  jeep(jx: number, jz: number) {
    const ol = C("#6f7a4a");
    this.box(ol, jx - 1.7, jx + 1.7, 0.42, 0.95, jz - 0.75, jz + 0.75); this.box(ol, jx + 0.55, jx + 1.7, 0.95, 1.2, jz - 0.7, jz + 0.7);
    this.box(gloss(GLASS, 120), jx + 0.48, jx + 0.54, 1.2, 1.75, jz - 0.7, jz + 0.7); this.box(C("#8a6a4a"), jx - 0.7, jx - 0.3, 0.95, 1.5, jz - 0.65, jz + 0.65);
    this.box(C("#59626e"), jx + 1.7, jx + 1.8, 0.5, 0.7, jz - 0.8, jz + 0.8); this.sph(gloss("#ffe9a8", 90), jx + 1.72, 1.0, jz + 0.5, 0.11);
    this.cyl(C(TYRE), jx - 1.78, 0.95, jz, 0.36, 0.2, "x");
    for (const dx of [-1.1, 1.1]) for (const dz of [-0.8, 0.8]) { this.cyl(C(TYRE), jx + dx, 0.38, jz + dz, 0.38, 0.26, "z"); this.cyl(C("#9aa3ad"), jx + dx, 0.38, jz + dz, 0.16, 0.3, "z"); }
  }
  /** desk: top at 0.78 m, panel legs, drawer block on the right */
  desk(x0: number, x1: number, z0: number, z1: number, top: THREE.Material) {
    this.box(top, x0, x1, 0.74, 0.78, z0, z1, 1.0);
    this.box(C(WOOD), x0 + 0.06, x0 + 0.12, 0, 0.74, z0 + 0.05, z1 - 0.05); this.box(C(WOOD), x1 - 0.45, x1 - 0.06, 0.12, 0.74, z0 + 0.05, z1 - 0.05);
    for (const y of [0.3, 0.52]) { this.box(C(WOOD_L), x1 - 0.42, x1 - 0.09, y - 0.08, y + 0.08, z1 - 0.05, z1 - 0.035); this.sph(C(BRASS), x1 - 0.255, y, z1 - 0.02, 0.022); }
    this.box(C(WOOD_D), x0 + 0.12, x1 - 0.45, 0.3, 0.7, z0 + 0.06, z0 + 0.09);
  }
  /** typewriter, 0.30 m wide, with a sheet in the roller */
  typewriter(x: number, z: number, y = 0.78) {
    const dk = gloss("#2e3440", 70);
    this.box(dk, x - 0.15, x + 0.15, y, y + 0.07, z - 0.14, z + 0.16); this.box(dk, x - 0.15, x + 0.15, y + 0.07, y + 0.13, z - 0.14, z + 0.0);
    this.cyl(gloss("#59626e", 60), x, y + 0.15, z - 0.09, 0.03, 0.36, "x");
    this.box(C("#fdf6ec"), x - 0.105, x + 0.105, y + 0.14, y + 0.36, z - 0.105, z - 0.098);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) this.cyl(C("#f4f1ea"), x - 0.108 + i * 0.036, y + 0.078 + (2 - j) * 0.008, z + 0.03 + j * 0.04, 0.012, 0.012, "y", 0.012, 8);
  }
  /** green banker's lamp */
  lamp(x: number, z: number, y = 0.78) {
    this.cyl(gloss(BRASS, 90), x, y + 0.012, z, 0.07, 0.024); this.cyl(gloss(BRASS, 90), x, y + 0.14, z, 0.012, 0.26);
    this.cyl(gloss("#2f8f5f", 90), x, y + 0.29, z + 0.03, 0.065, 0.26, "x");
  }
}

type Vis = { o: THREE.Object3D; ids: number[] };
const AIR_IDS = [2, 4, 5, 11], TANK_IDS = [6, 7, 8, 9, 10];
const PITCH = 1.0; // seat pitch of the cut-away cabins (m)
type Drift = { m: THREE.Mesh; ox: number; i: number; near: boolean };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private vis: Vis[] = [];
  private sunDir = new THREE.Vector3();
  private v = new THREE.Vector3();
  // dynamic things
  private tHull!: THREE.Group; private crack: THREE.Mesh[][] = [[], []]; private water!: THREE.Mesh;
  private drift: Drift[] = [];

  /** a group of static scenery shown only in the given shots (empty ids = always) */
  private part(ids: number[], set: SetName, fn: (s: Bd) => void, cast = true) {
    const g = new THREE.Group(), b = new Batch(), n = new Batch(), gn = new THREE.Group();
    fn(new Bd(b, n, OX[set]));
    b.build(g, cast); n.build(gn, false);
    gn.traverse((o) => o.layers.set(NOINK));
    g.add(gn); this.root.add(g);
    if (ids.length) this.vis.push({ o: g, ids });
  }
  private cloud(x: number, y: number, z: number, w: number, k: number, ids: number[] = []) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(k % 4, LOOK.day.cloud), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
    m.position.set(x, y, z); m.scale.set(w, w * 0.5, 1); m.layers.set(NOINK); this.root.add(m);
    if (ids.length) this.vis.push({ o: m, ids });
    return m;
  }

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.buildAirport(); this.buildTank(); this.buildCabin("cabin", false, [3]); this.buildCabin("today", true, [1, 12, 13]);
  }

  /** ground, hills, tree line and a cloudy sky shared by the two outdoor sets */
  private outdoors(set: SetName, ids: number[]) {
    const ox = OX[set];
    for (let i = 0; i < 14; i++) this.cloud(ox - 190 + i * 29 + rnd(i, 21) * 14, 50 + (i % 4) * 22 + rnd(i, 22) * 10, -330 - (i % 3) * 30, 62 + rnd(i, 23) * 40, i, ids);
    for (let i = 0; i < 8; i++) this.cloud(ox - 150 + i * 42, 165 + (i % 3) * 26, -340 - (i % 2) * 40, 80 + rnd(i, 24) * 30, i + 1, ids);
    if (set === "tank") for (let i = 0; i < 9; i++) this.cloud(ox - 330, 40 + (i % 3) * 30, -260 + i * 62, 70 + rnd(i, 25) * 30, i, ids).rotation.y = Math.PI / 2;
    this.part(ids, set, (s) => {
      s.box(T("w_slabsM", slabs()), -170, 170, -0.5, 0, -90, 70, 8);
      s.box(T("grassHD", grassHD(), "#9db592"), -500, 500, -0.6, -0.05, -700, 400, 9);
      for (let i = 0; i < 16; i++) s.sph(C(i % 2 ? "#6f9f5c" : "#628f52"), -330 + i * 44 + rnd(i, 1) * 16, -34, -430 - rnd(i, 2) * 90, 80 + rnd(i, 3) * 30, 1.6, 0.62, 1);
      for (let i = 0; i < 40; i++) { const x = -200 + i * 10.3 + rnd(i, 4) * 4, r = 4.5 + rnd(i, 5) * 3; s.sph(C(i % 3 ? "#4f8a4c" : "#3f7a44"), x, r * 0.9, -128 - rnd(i, 6) * 14, r, 1, 1.15, 1); }
      if (set === "tank") {
        for (let i = 0; i < 12; i++) s.sph(C(i % 2 ? "#6f9f5c" : "#628f52"), -420 - rnd(i, 7) * 60, -30, -330 + i * 60, 80 + rnd(i, 8) * 30, 1, 0.62, 1.6);
        for (let i = 0; i < 30; i++) { const z = -120 + i * 7.5 + rnd(i, 9) * 3, r = 4.5 + rnd(i, 10) * 3; s.sph(C(i % 3 ? "#4f8a4c" : "#3f7a44"), -176 - rnd(i, 11) * 10, r * 0.9, z, r, 1, 1.15, 1); }
      }
    });
  }
  /** corrugated hangar 44 m wide with half-open doors, front at z, centred on x */
  private hangar(s: Bd, cx: number, z: number) {
    const corr = T("w_corr", stripes("w_corr", "#a9b6bb", "#8d9ba2", 28)), door = T("w_door", stripes("w_door", "#d9c58f", "#bfa76c", 12));
    s.box(corr, cx - 22, cx + 22, 0, 8.5, z - 32, z);
    s.geo(new THREE.CylinderGeometry(22, 22, 32, 28).rotateX(Math.PI / 2).scale(1, 4.5 / 22, 1), corr, cx, 8.5, z - 16);
    s.box(C("#39404c"), cx - 18, cx + 18, 0, 8.4, z, z + 0.1);
    s.box(door, cx - 18, cx - 7.5, 0, 8.4, z + 0.1, z + 0.4); s.box(door, cx + 7.5, cx + 18, 0, 8.4, z + 0.1, z + 0.4);
    s.box(C("#6d7a82"), cx - 22.4, cx + 22.4, 8.5, 9.0, z - 0.2, z + 0.6);
    for (let i = 0; i < 9; i++) s.box(gloss("#ffe9a8", 40), cx - 16 + i * 4.2, cx - 13.6 + i * 4.2, 9.5, 10.6 + (i > 1 && i < 7 ? 0.8 : 0), z + 0.05, z + 0.15);
  }
  /** a pile of suitcases (0.6 m) */
  private cases(s: Bd, x: number, y: number, z: number, n: number, seed: number) {
    for (let i = 0; i < n; i++) {
      const w = 0.5 + rnd(i, seed) * 0.25, h = 0.34 + rnd(i, seed + 1) * 0.16, col = i % 3, lvl = Math.floor(i / 3);
      s.box(T("c_caseM" + ((i + seed) % 5), caseTex((i + seed) % 5)), x + col * 0.72, x + col * 0.72 + w, y + lvl * 0.46, y + lvl * 0.46 + h, z - 0.11, z + 0.11);
    }
  }

  // ======================= set 1: a 1950s airport (S2, S4, S5, S11) =======================
  private buildAirport() {
    this.outdoors("airport", AIR_IDS);
    this.part(AIR_IDS, "airport", (s) => {
      const yl = C("#f2b632"), wl = C("#f4f1ea");
      s.geo(boxGeo(V(-160, 0, -0.18), V(160, 0.006, 0.18)), yl, 0, 0, 8, 0, true);
      for (let i = 0; i < 40; i++) s.geo(boxGeo(V(-1.6, 0, -0.14), V(1.6, 0.006, 0.14)), wl, -156 + i * 8, 0, -40, 0, true);
      s.geo(boxGeo(V(-0.18, 0, -30), V(0.18, 0.006, 26)), yl, -19, 0, -4, 0, true);
      this.hangar(s, -52, -62);
      // terminal: two storeys, long window bands, flat roof terrace, 2 m doors, striped awning
      s.box(C("#efe3c4"), 16, 64, 0, 8, -80, -66); s.box(C("#d9c9a4"), 15.6, 64.4, 8, 8.5, -80.4, -65.6);
      for (let i = 0; i < 8; i++) { s.box(gloss("#9fd3ea", 110), 17.5 + i * 5.8, 21.9 + i * 5.8, 4.6, 7.0, -66.05, -65.95); s.box(gloss("#9fd3ea", 110), 17.5 + i * 5.8, 21.9 + i * 5.8, 2.3, 3.6, -66.05, -65.95); }
      for (let i = 0; i < 8; i++) { s.box(C("#5f4a34"), 19 + i * 5.8, 20.1 + i * 5.8, 0, 2.0, -66.06, -65.94); }
      s.box(T("c_awn", stripes("c_awn", "#e2453c", "#fdf6ec", 24)), 16, 64, 3.75, 3.95, -66, -63.5);
      for (let i = 0; i < 17; i++) s.box(C("#fdf6ec"), 16 + i * 3, 16.1 + i * 3, 8.5, 9.5, -65.8, -65.7);
      s.box(C("#fdf6ec"), 16, 64.1, 9.45, 9.55, -65.8, -65.7);
      for (let i = 0; i < 4; i++) { s.cyl(C("#f4f1ea"), 22 + i * 11, 12, -70, 0.07, 7); s.box(C(["#e2453c", "#1f4a9e", "#ffc21a", "#35a84f"][i]), 22.07 + i * 11, 24.2 + i * 11, 14, 15.4, -70.02, -69.98); }
      // control tower: 14 m
      s.box(C("#efe3c4"), 6.5, 13.5, 0, 9.5, -80, -73); s.box(T("w_chk", checker("w_chk", "#e0262f", "#f4f1ea", "#b0222e")), 6.4, 13.6, 7.6, 9.5, -80.1, -72.9, 1.9);
      s.box(C("#59626e"), 5.6, 14.4, 9.5, 9.8, -80.9, -72.1); s.box(gloss("#9fd3ea", 120), 6.6, 13.4, 9.8, 12.4, -79.9, -73.1);
      for (const x of [6.5, 8.8, 11.1, 13.4]) s.box(C("#39404c"), x - 0.1, x + 0.1, 9.8, 12.4, -73.15, -72.95);
      s.box(C("#59626e"), 6.0, 14.0, 12.4, 12.8, -80.5, -72.5); s.cyl(C("#39404c"), 10, 13.9, -76.5, 0.07, 2.2); s.sph(gloss("#e0262f", 80), 10, 15.1, -76.5, 0.22);
      for (let j = 0; j < 3; j++) s.box(gloss("#9fd3ea", 100), 8.6, 11.4, 1.6 + j * 2.1, 2.8 + j * 2.1, -73.05, -72.95);
      // windsock, fuel bowser behind the nose, tractor by the tail
      s.cyl(C("#f4f1ea"), 22, 3.5, -44, 0.09, 7); s.geo(new THREE.CylinderGeometry(0.16, 0.5, 2.6, 14).rotateZ(Math.PI / 2 + 0.25), T("w_sock", stripes("w_sock", "#f47a1f", "#f4f1ea", 6)), 23.4, 6.6, -44);
      const bx = 15, bz = -24;
      s.cyl(gloss("#f2b632", 70), bx, 1.75, bz, 0.95, 4.4, "x"); s.box(C("#59626e"), bx - 2.3, bx + 4.0, 0.6, 0.85, bz - 0.9, bz + 0.9);
      s.box(C("#c8453f"), bx + 2.4, bx + 4.0, 0.85, 2.3, bz - 0.95, bz + 0.95); s.box(gloss(GLASS, 120), bx + 3.2, bx + 4.02, 1.5, 2.15, bz - 0.8, bz + 0.8);
      for (const dx of [-1.7, -0.6, 3.2]) for (const dz of [-0.95, 0.95]) s.cyl(C(TYRE), bx + dx, 0.48, bz + dz, 0.48, 0.3, "z");
      s.jeep(-15, -22);
      // near the nose (S4, S11): ground power cart, chocks, cones, toolbox
      const [nx, , nz] = planePt(9.6, 0, 0);
      for (const d of [-0.55, 0.55]) s.box(C("#f2b632"), nx + d - 0.2, nx + d + 0.2, 0, 0.25, nz - 0.35, nz + 0.35);
      s.box(gloss("#f2b632", 60), 6.4, 7.9, 0.35, 1.25, -6.4, -5.5); s.box(C("#59626e"), 6.5, 7.8, 1.25, 1.33, -6.3, -5.6);
      for (const dx of [6.7, 7.6]) for (const dz of [-6.45, -5.45]) s.cyl(C(TYRE), dx, 0.25, dz, 0.25, 0.14, "z");
      for (const [x, z] of [[2.2, -5.2], [1.4, -6.6], [7.4, -3.4]]) { s.cyl(gloss("#f47a1f", 60), x, 0.3, z, 0.17, 0.6, "y", 0.04, 14); s.box(C("#f47a1f"), x - 0.2, x + 0.2, 0, 0.04, z - 0.2, z + 0.2); }
      s.box(gloss("#c8453f", 70), 2.7, 3.15, 0, 0.24, -7.6, -7.38); s.drum("#2f7fb0", 2.0, -8.4); s.drum("#c8453f", 7.3, -8.0);
      // foreground of the wide shots (S2, S5): baggage train, suitcases, barrier trestles
      const cart = (x: number, z: number, k: number) => {
        s.box(C("#3f6f9f"), x - 1.1, x + 1.1, 0.45, 0.55, z - 0.6, z + 0.6); s.box(C("#3f6f9f"), x - 1.1, x - 1.04, 0.55, 1.3, z - 0.6, z + 0.6);
        for (const dx of [-0.8, 0.8]) for (const dz of [-0.62, 0.62]) s.cyl(C(TYRE), x + dx, 0.24, z + dz, 0.24, 0.12, "z");
        this.cases(s, x - 0.95, 0.55, z + 0.3, 5, k); this.cases(s, x - 0.9, 0.55, z - 0.2, 6, k + 2);
      };
      cart(3.3, 27.5, 1); cart(10.4, 26.2, 4); s.jeep(14.6, 25.6);
      this.cases(s, 9.6, 0, 31.8, 3, 6);
    });
    this.part([5], "airport", (s) => {
      const bar = T("c_bar", stripes("c_bar", "#e0262f", "#fdf6ec", 8));
      for (let i = 0; i < 4; i++) { const x = -9.6 + i * 2.5; s.box(bar, x, x + 2.1, 0.75, 0.95, 16.9, 17.0); for (const dx of [0.15, 1.95]) s.box(C("#59626e"), x + dx - 0.04, x + dx + 0.04, 0, 0.75, 16.8, 17.1); }
      s.drum("#2f7fb0", -9.3, 21.5); this.cases(s, -1.6, 0, 21.4, 2, 9);
    });
    // the Comet, parked for the whole film, and a second one grounded further away
    for (const [x, z, stairs] of [[PLANE.x, PLANE.z, true], [-58, -36, false]] as const) {
      const pl = mkComet({ gear: true, livery: true, stairs });
      pl.g.position.set(OX.airport + x, PLANE.y, z); pl.g.rotation.set(0, PLANE.yaw, 0);
      pl.g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.root.add(pl.g); this.vis.push({ o: pl.g, ids: AIR_IDS });
    }
  }

  // ======================= set 2: the water tank at Farnborough (S6-S10) =======================
  private buildTank() {
    const ox = OX.tank;
    this.outdoors("tank", TANK_IDS);
    this.part(TANK_IDS, "tank", (s) => {
      const plate = T("c_tankM", tankTex()), beam = C("#5d7274"), yel = gloss("#f2b632", 60), W = TANK.wall;
      // the tank: 34 x 7 m of riveted steel, buttressed, open at the top
      s.box(plate, -17, 17, 0, W, -3.75, -3.5, 2); s.box(plate, -17, 17, 0, W, 3.5, 3.75, 2); s.box(plate, -17.25, -17, 0, W, -3.75, 3.75, 2); s.box(plate, 17, 17.25, 0, W, -3.75, 3.75, 2);
      s.box(C("#3d6f78"), -17, 17, 0, 0.2, -3.5, 3.5);
      for (let i = 0; i <= 17; i++) { const x = -17 + i * 2; s.box(beam, x - 0.09, x + 0.09, 0, W, 3.75, 4.0); s.box(beam, x - 0.09, x + 0.09, 0, W, -4.0, -3.75); }
      for (const z of [-2, 0, 2]) s.box(beam, 17.25, 17.5, 0, W, z - 0.09, z + 0.09);
      s.box(yel, -17.3, 17.3, W, W + 0.1, 3.45, 3.8); s.box(yel, -17.3, 17.3, W, W + 0.1, -3.8, -3.45); s.box(yel, 16.95, 17.3, W, W + 0.1, -3.8, 3.8);
      s.box(C(TYRE), -5.8, 4.0, 1.25, 2.6, 3.72, 3.84); // rubber collar where the wing comes out
      // gantry walkway along the near wall, posts, railing, a ladder
      s.box(T("benchTop", boards("benchTop", "#d9a868", "#7a5230", true)), -17, 17.6, 2.75, 2.9, 4.0, 6.4, 1.2);
      for (let i = 0; i <= 8; i++) { const x = -16 + i * 4.15; s.box(beam, x - 0.07, x + 0.07, 0, 2.75, 6.2, 6.34); s.box(yel, x - 0.03, x + 0.03, 2.9, 3.95, 6.3, 6.36); }
      s.box(yel, -17, 17.6, 3.93, 3.99, 6.3, 6.36); s.box(yel, -17, 17.6, 3.4, 3.44, 6.31, 6.35);
      for (const z of [4.1, 4.6]) s.box(beam, 17.5, 17.56, 0, 2.9, z, z + 0.05);
      for (let i = 0; i < 9; i++) s.box(beam, 17.5, 17.56, 0.3 * i + 0.2, 0.3 * i + 0.24, 4.1, 4.65);
      // pump house and pipes at the nose end
      s.box(C("#b5523b"), 13.2, 16.4, 0, 2.4, 8.4, 11.2); s.box(C("#59626e"), 13.0, 16.6, 2.4, 2.6, 8.2, 11.4);
      s.cyl(gloss("#2f8f5f", 70), 14.8, 2.3, 6.2, 0.22, 4.4, "z"); s.cyl(gloss("#2f8f5f", 70), 15.6, 0.6, 7.6, 0.22, 1.6, "z");
      s.cyl(gloss("#e0262f", 80), 14.8, 2.3, 8.42, 0.3, 0.06, "z", 0.3, 20);
      // trestles under the wing that sticks out
      for (const z of [8.5, 13]) { const y = TANK.y + WY(z) - 0.25; for (const x of [-3.6, -0.2]) s.box(beam, x - 0.08, x + 0.08, 0, y, z - 0.08, z + 0.08); s.box(beam, -3.7, -0.1, y - 0.12, y, z - 0.1, z + 0.1); }
      // the engineers' corner at ground level (S9, S10): drawing board, table, crates, drum
      s.box(C(WOOD_D), 8.35, 9.75, 0.95, 2.05, 6.78, 6.83); s.pic(T("c_blueM", blueprint()), 8.42, 9.68, 1.02, 1.98, 6.835);
      for (const x of [8.45, 9.6]) s.box(C(WOOD), x, x + 0.06, 0, 2.1, 6.72, 6.78);
      s.drum("#2f7fb0", 12.6, 6.9); s.drum("#c8453f", 13.2, 7.3);
      s.box(T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9)), 7.2, 7.9, 0, 0.7, 6.7, 7.4);
    });
    // foreground of the ground-level shots: a work table near the lens
    this.part([9, 10], "tank", (s) => {
      s.box(T("tableTop", boards("tableTop", "#edc78f", "#a8744a", true)), 9.3, 12.3, 0.72, 0.78, 9.7, 10.5, 1.1);
      for (const x of [9.4, 12.14]) s.box(C(WOOD_D), x, x + 0.06, 0, 0.72, 9.75, 10.45);
      s.lamp(9.75, 10.0); s.box(C("#fdf6ec"), 10.3, 10.75, 0.78, 0.8, 9.85, 10.2); s.cyl(gloss("#c8453f", 80), 11.9, 0.84, 10.0, 0.05, 0.12);
      s.box(gloss(STEEL, 70), 11.1, 11.5, 0.78, 0.84, 9.9, 10.1);
    });
    // far scenery: hangars and huts of the establishment, a water tower
    this.part(TANK_IDS, "tank", (s) => {
      this.hangar(s, -40, -34); this.hangar(s, 30, -40);
      for (let i = 0; i < 4; i++) { s.geo(new THREE.CylinderGeometry(3.2, 3.2, 11, 18).rotateZ(Math.PI / 2), T("w_hut", stripes("w_hut", "#8a9660", "#74804f", 20)), -62, 0, -6 + i * 9.5); }
      s.cyl(gloss("#c9d0d6", 60), -30, 14, 8, 3.2, 4.5); for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) s.cyl(C("#59626e"), -30 + dx, 6, 8 + dz, 0.16, 12);
      s.box(C("#b5523b"), -24, -10, 0, 5.5, -20, -12); s.box(C("#59626e"), -24.3, -9.7, 5.5, 5.9, -20.3, -11.7);
      for (let i = 0; i < 5; i++) s.box(gloss("#9fd3ea", 100), -23 + i * 2.7, -21.4 + i * 2.7, 2.0, 4.0, -11.98, -11.9);
      s.jeep(-9, 12);
    });
    // the test hull under water (bare metal, wings sticking out through the walls)
    const pl = mkComet({ gear: false, livery: false });
    pl.g.position.set(ox, TANK.y, 0); this.tHull = pl.hull;
    pl.g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const hm = new THREE.Mesh(patch(HATCH.x0, HATCH.x1, HATCH.a0, HATCH.a1), T("c_winH", winTex("hatch", 10), "#ffffff", { alphaTest: 0.5, side: THREE.DoubleSide }));
    hm.layers.set(NOINK); pl.hull.add(hm);
    const dark = new THREE.MeshBasicMaterial({ color: "#1a0f1c" });
    CRACK.forEach((line, k) => { for (let i = 1; i < line.length; i++) { const m = new THREE.Mesh(rod(skin(line[i - 1][0], line[i - 1][1], 0.035), skin(line[i][0], line[i][1], 0.035), 0.035 - i * 0.003), dark); m.layers.set(NOINK); this.crack[k].push(m); pl.hull.add(m); } });
    this.root.add(pl.g); this.vis.push({ o: pl.g, ids: TANK_IDS });
    const wt = waterTex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(4, 1.4);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(34, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false }));
    this.water.position.set(ox, TANK.water, 0); this.water.layers.set(NOINK); this.root.add(this.water); this.vis.push({ o: this.water, ids: TANK_IDS });
  }

  // ======================= sets 3 and 4: cut-away cabins in flight (1952: S3; today: S1, S12, S13) =======================
  private buildCabin(set: SetName, modern: boolean, ids: number[]) {
    const ox = OX[set], Z = -1.45, k = modern ? "M" : "5";
    const rows = Array.from({ length: 21 }, (_, i) => (i - 10) * PITCH);
    const ww = modern ? 0.26 : 0.4, y0 = modern ? 1.04 : 1.02, y1 = modern ? 1.4 : 1.44, WX = 0.42; // window centre = seat row + WX
    for (let i = 0; i < 12; i++) this.drift.push({ m: this.cloud(ox, 0, 0, 9 + rnd(i, 61) * 9, i, ids), ox, i, near: false });
    for (let i = 0; i < 2; i++) this.drift.push({ m: this.cloud(ox, 0, 0, 3.2, i + 2, ids), ox, i, near: true });
    this.part(ids, set, (s) => {
      // far wall with the row of windows, carpet, the hold underneath with the luggage, belly skin
      const wall = modern ? T("c_wallM", wallpaper("c_wallM", "#eef1f4", "#dde4ea", "plain")) : T("c_wall5", wallpaper("c_wall5", "#f3e6c8", "#e4d2a6", "stripes"));
      s.wall(wall, -10, 10, 0, 2.05, Z, rows.map((x) => [x + WX - ww / 2, x + WX + ww / 2, y0, y1] as [number, number, number, number]), 2);
      s.box(modern ? C("#c9d3dc") : T("c_dado", panels("c_dado", "#9a6844", "#62402a", "#b98258")), -10, 10, 0, 0.5, Z, Z + 0.025, 0.9);
      s.box(T("c_carp" + k, stripes("c_carp" + k, modern ? "#3b4a6a" : "#8a3b46", modern ? "#34425f" : "#7a3340", 16)), -10, 10, -0.1, 0, Z, 0.55, 1);
      s.box(gloss(STEEL, 60), -10, 10, -0.2, -0.1, Z, 0.56);
      s.box(C("#566270"), -10, 10, -1.05, -0.2, Z, Z + 0.15); s.box(gloss("#aab3bd", 60), -10, 10, -1.14, -1.05, Z, 0.56);
      s.box(gloss(modern ? "#eef1f4" : BARE, 80), -10, 10, -1.32, -1.14, Z - 0.1, 0.58);
      for (let i = 0; i < 9; i++) this.cases(s, -4.6 + i * 1.25 + rnd(i, 71) * 0.3, -1.05, -0.45 - (i % 2) * 0.5, 2 + (i % 3), i + (modern ? 3 : 0));
      for (let i = 0; i < 8; i++) s.box(C("#7d8794"), -4.4 + i * 1.5, -4.34 + i * 1.5, -1.05, -0.2, Z + 0.15, Z + 0.2);
      // window bezels: the 1952 pane is nearly square with slightly rounded corners; today's is fully rounded
      const bw = modern ? 0.37 : 0.57, bh = modern ? 0.512 : 0.597;
      const bez = T("c_bezM" + k, modern ? bezelTex("M", 180, 180, 86, "#f7f9fb", "#c9d3dc") : bezelTex("5", 180, 180, 27, "#e9d9b0", "#b98a55"), "#ffffff", { alphaTest: 0.5 });
      for (const x of rows) s.geo(quad(V(-bw / 2, -bh / 2, 0), V(bw / 2, -bh / 2, 0), V(bw / 2, bh / 2, 0), V(-bw / 2, bh / 2, 0)), bez, x + WX, (y0 + y1) / 2, Z + 0.014, 0, true);
      // seats: far-side row seen in profile, facing +x
      const seat = C(modern ? "#34518c" : "#2f7f8f"), seatD = C(modern ? "#27406e" : "#256a78"), head = C(modern ? "#e2453c" : "#fdf6ec"), arm = modern ? C("#59626e") : C(WOOD_D);
      for (const x of rows) {
        s.box(seat, x - 0.26, x + 0.24, 0.12, 0.45, -1.38, -0.36); s.box(seatD, x - 0.37, x - 0.26, 0.3, 1.2, -1.38, -0.36);
        s.box(head, x - 0.38, x - 0.25, 0.97, 1.215, -1.39, -0.35); s.box(arm, x - 0.26, x + 0.2, 0.45, 0.62, -0.4, -0.33);
        s.box(C("#39404c"), x - 0.2, x + 0.18, 0, 0.12, -1.3, -0.45);
      }
      if (modern) {
        const bin = gloss("#f4f6f8", 90);
        s.box(bin, -10, 10, 1.56, 2.05, Z, -0.85);
        for (const x of rows) { s.box(C("#aab3bd"), x + 0.44, x + 0.46, 1.58, 2.03, -0.85, -0.84); s.box(C("#7d8794"), x - 0.1, x + 0.1, 1.62, 1.66, -0.85, -0.835); }
        for (const x of rows) s.sph(gloss("#ffe9a8", 90), x + 0.2, 1.54, -1.0, 0.035);
      } else {
        s.box(C(WOOD), -10, 10, 1.66, 1.7, Z, -1.0); s.box(C(BRASS), -10, 10, 1.7, 1.74, -1.03, -1.0);
        for (const x of rows) { // curtains, a reading lamp, things on the rack
          for (const d of [-0.34, 0.29]) s.box(C("#b8454a"), x + WX + d, x + WX + d + 0.05, 0.98, 1.52, Z, Z + 0.04);
          s.box(C(BRASS), x + WX - 0.36, x + WX + 0.36, 1.52, 1.545, Z, Z + 0.05);
          s.sph(gloss("#ffe9a8", 90), x, 1.62, -1.15, 0.04);
        }
        rows.forEach((x, i) => { if (i % 3 === 0) s.box(T("c_caseM" + (i % 5), caseTex(i % 5)), x - 0.1, x + 0.42, 1.7, 1.98, -1.4, -1.1); else if (i % 3 === 1) { s.cyl(C("#5a4a3c"), x + 0.2, 1.72, -1.2, 0.2, 0.03); s.cyl(C("#5a4a3c"), x + 0.2, 1.8, -1.2, 0.11, 0.14); } });
      }
      // aisle: a trolley
      const tx = modern ? 2.0 : -1.75;
      s.box(gloss(modern ? "#c9d3dc" : "#d9a93a", 70), tx - 0.2, tx + 0.2, 0.1, 0.92, -0.2, 0.2); for (const d of [-0.15, 0.15]) s.cyl(C(TYRE), tx + d, 0.05, 0.21, 0.05, 0.03, "z");
      s.cyl(gloss("#fdf6ec", 80), tx - 0.07, 0.98, 0, 0.04, 0.12); s.cyl(gloss("#c8453f", 80), tx + 0.08, 0.97, 0.05, 0.035, 0.1);
    });
    // ceiling and crown skin (they do not cast: the cabin stays lit like a stage)
    this.part(ids, set, (s) => {
      s.box(C(modern ? "#f4f6f8" : "#f3e6c8"), -10, 10, 2.05, 2.16, Z - 0.2, 0.55); s.box(gloss(modern ? "#eef1f4" : "#fbfaf4", 80), -10, 10, 2.16, 2.34, Z - 0.3, 0.58);
    }, false);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS.day, K = LOOK.day, base = s.set === "airport" || s.set === "tank";
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = this.v.set(...c.look).clone(), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light: fixed per set. Airport: sun over the viewer's left shoulder (lights the hull side); elsewhere: right shoulder ----
    const az = ((s.set === "airport" ? -143 : 125) * Math.PI) / 180, el = (42 * Math.PI) / 180;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = base ? THREE.MathUtils.clamp(dist * 0.9 + 8, 22, 50) : THREE.MathUtils.clamp(dist * 1.25 + 2.5, 5, 14);
    if (s.set === "airport" && id !== 2 && id !== 5) focus.y = 2;
    this.sun.position.copy(focus).addScaledVector(this.sunDir, base ? 110 : 60); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 5; sc.far = base ? 230 : 130; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky + fog ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = 60; this.fog.far = 700;
    scene.fog = this.fog; scene.background = null;
    // ---- which scenery this shot shows ----
    for (const v of this.vis) v.o.visible = v.ids.includes(id);
    // ---- the test hull breathes with the pressure cycles, then cracks from the corners of an opening ----
    const br = id === 7 || id === 8 ? breath(t) : 1;
    this.tHull.scale.set(1, br, br);
    this.crack.forEach((segs, k) => segs.forEach((m, i) => { m.visible = id >= 8 && t >= CUE.crack - 0.04 + k * 0.45 + i * 0.09; }));
    (this.water.material as THREE.MeshBasicMaterial).map!.offset.set(t * 0.012, Math.sin(t * 0.7) * 0.01);
    this.water.position.y = TANK.water + 0.015 * Math.sin(t * 2.1);
    // ---- clouds stream past the flying cabins ----
    for (const d of this.drift) {
      const sp = d.near ? 5.5 : 2.2 + (d.i % 3) * 0.5, span = d.near ? 16 : 90, u = (((d.i * (d.near ? 8 : 7.7) + t * sp) % span) + span) % span;
      if (d.near) d.m.position.set(d.ox + span / 2 - u, d.i ? 3.75 : -1.75, 2.6 + d.i * 0.4);
      else d.m.position.set(d.ox + span / 2 - u, -5 + ((d.i * 5) % 13) * 1.05, -34 - (d.i % 4) * 9);
    }
    // ---- cast + contact shadows ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right }, this.sunDir);
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const a = this.actor(ai++), sc2 = p.scale ?? 1, [w, h, k] = p.size ?? [1080, 1800, 1.8];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true; // real card shadows on floor and wall, like the reference
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
