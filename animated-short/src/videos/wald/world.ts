// The three sets of the Wald short as one three.js scene (air base, statisticians' office, bookshop of today), far
// apart on x so they never see each other. Static scenery is merged per material (Batch); the bomber, its armour
// plates, the homecoming bomber and the memoranda are posed every frame from story.ts; the cast are lit toon cards
// (cast.ts). Same light / ink / lens / grade pipeline as the skill's bridge template (copied from lego4).
// update(id, f, camera) is a pure function of the shot and the frame. Scale sheet: top of story.ts (1 unit = 1 m).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, gloss, quad, tri } from "./build";
import { planksHD, grassHD, cloudHD } from "./paint";
import { boards, wallpaper, checker, panels, stripes, picture, slabs, chalk, skyline, spines, plateTex, starTex, poster } from "./tex";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, OX, S, CUE, PLANE, planePt, camAt, flyer, pop, lin, eo, rnd, SetName } from "./story";

// ---------------- palette ----------------
const C = (c: string) => lam("c" + c, () => ({ color: c }));
const T = (key: string, map: THREE.Texture, color = "#ffffff", extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map, color, ...extra }));
const WOOD = "#c58f58", WOOD_D = "#8a5a34", WOOD_L = "#e3b983", STEEL = "#9aa3ad", BRASS = "#d9a93a";
const OLIVE = "#7f8a4c", OLIVE_D = "#5f6a3a", GLASS = "#bfe6f4", TYRE = "#2e2a36", HOLE = "#241726", BARE = "#c9d0d6";
const BOOKS = ["#c8453f", "#2f7fb0", "#ffc21a", "#35a84f", "#7b5ac9", "#f47a1f", "#f4f1ea", "#21a08f"];

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

// ======================= the bomber (own axes: x to the nose, y up, z to the near wing tip; metres) =======================
// 22.7 m from tail (x = -13.2) to nose (x = +9.5), 31.6 m span (z = +-15.8).
const FUS: [number, number][] = [[-13.2, 0.06], [-13.0, 0.3], [-12, 0.55], [-9, 0.8], [-5, 1.02], [-1, 1.14], [4, 1.15], [6.6, 1.06], [8.0, 0.86], [8.6, 0.7]];
const rAt = (x: number) => lin(FUS, x);
const lathe = (pts: [number, number][], seg = 24) => new THREE.LatheGeometry(pts.map(([x, r]) => new THREE.Vector2(r, x)), seg).rotateZ(-Math.PI / 2);
/** cylinder / cone along x from x0 to x1 */
const xcyl = (r0: number, r1: number, x0: number, x1: number, seg = 20) => new THREE.CylinderGeometry(r1, r0, x1 - x0, seg).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
/** curved skin patch hugging the hull from x0 to x1, between elevations a0 < a1 (radians from the +z side) */
const patch = (x0: number, x1: number, a0: number, a1: number, off = 0.025) =>
  new THREE.CylinderGeometry(rAt(x1) + off, rAt(x0) + off, x1 - x0, 12, 1, true, -a1, a1 - a0).rotateZ(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
const kz = (z: number) => Math.max(0, (Math.abs(z) - 1) / 14.8);
const LE = (z: number) => 4.2 - 2.7 * kz(z), TE = (z: number) => -1.6 + 0.9 * kz(z), WY = (z: number) => -0.45 + 1.0 * kz(z), TH = (z: number) => 0.5 - 0.34 * kz(z);
const wsec = (z: number) => { const y = WY(z), t = TH(z); return [V(LE(z), y - t * 0.32, z), V(LE(z), y + t * 0.32, z), V(TE(z), y + t * 0.1, z), V(TE(z), y - t * 0.06, z)]; };
const ENG = [-8.6, -4.3, 4.3, 8.6];
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

const mkBomber = (o: { holes: boolean; gear: boolean }) => {
  const g = new THREE.Group(), b = new Batch(), od = C(OLIVE), odd = C(OLIVE_D), glass = gloss(GLASS, 120), steel = gloss(STEEL, 70, "#eef3f8");
  // hull, nose glazing, canopy, turrets
  b.add(lathe(FUS), od);
  b.add(lathe([[8.6, 0.7], [9.1, 0.52], [9.4, 0.27], [9.5, 0.02]]), glass);
  b.add(new THREE.SphereGeometry(0.8, 20, 12).scale(1.6, 0.6, 0.86), glass, at(5.5, 0.98, 0));
  b.add(new THREE.SphereGeometry(0.5, 18, 12), glass, at(3.3, 1.12, 0));
  b.add(new THREE.SphereGeometry(0.56, 18, 12), steel, at(-2.3, -0.98, 0));
  b.add(new THREE.SphereGeometry(0.3, 14, 10), glass, at(-13.05, 0.3, 0));
  // wings
  b.add(hexa(wsec(-1), wsec(1)), od);
  for (const s of [-1, 1]) b.add(hexa(wsec(s), wsec(s * 15.8)), od);
  // tail: fin, dorsal fillet, stabilisers
  const sec = (x0: number, x1: number, y: number, th: number) => [V(x0, y, -th), V(x0, y, th), V(x1, y, th), V(x1, y, -th)];
  b.add(hexa(sec(-12.9, -9.0, 0.5, 0.15), sec(-13.1, -11.5, 4.3, 0.06)), od);
  b.add(hexa([V(-9, 0.6, -0.12), V(-9, 0.6, 0.12), V(-9, 2.0, 0.1), V(-9, 2.0, -0.1)], [V(-4.8, 0.95, -0.05), V(-4.8, 0.95, 0.05), V(-4.8, 1.1, 0.05), V(-4.8, 1.1, -0.05)]), od);
  for (const s of [-1, 1]) b.add(hexa([V(-12.7, 0.43, s * 0.3), V(-12.7, 0.67, s * 0.3), V(-9.6, 0.67, s * 0.3), V(-9.6, 0.43, s * 0.3)],
    [V(-12.3, 0.65, s * 6.55), V(-12.3, 0.75, s * 6.55), V(-10.9, 0.75, s * 6.55), V(-10.9, 0.65, s * 6.55)]), od);
  b.add(hexa(sec(-13.0, -12.1, 4.3, 0.065), sec(-12.9, -12.2, 4.45, 0.05)), C("#e0262f")); // red fin cap
  // engines
  const props: THREE.Group[] = [];
  const blade = mergeGeometries([0, 1, 2].map((i) => boxGeo(V(-0.03, 0.12, -0.13), V(0.03, 1.75, 0.13), 0, true).rotateX((i * 2 * Math.PI) / 3)), false);
  const tip = mergeGeometries([0, 1, 2].map((i) => boxGeo(V(-0.035, 1.5, -0.135), V(0.035, 1.75, 0.135), 0, true).rotateX((i * 2 * Math.PI) / 3)), false);
  for (const z of ENG) {
    const x0 = LE(z) - 1.3, x1 = LE(z) + 2.2, y = WY(z) - 0.05;
    b.add(xcyl(0.25, 0.72, x0, x0 + 1.3), od, at(0, y, z));
    b.add(xcyl(0.72, 0.72, x0 + 1.3, x1), od, at(0, y, z));
    b.add(xcyl(0.77, 0.77, x1 - 0.5, x1 - 0.05), odd, at(0, y, z));
    b.add(xcyl(0.58, 0.58, x1, x1 + 0.06), C(TYRE), at(0, y, z));
    b.add(xcyl(0.17, 0.12, x1, x1 + 0.6), steel, at(0, y, z));
    const pg = new THREE.Group(); pg.position.set(x1 + 0.42, y, z); pg.rotation.x = z * 0.37;
    const m1 = new THREE.Mesh(blade, gloss(TYRE, 60)), m2 = new THREE.Mesh(tip, C("#ffc21a"));
    m1.castShadow = m2.castShadow = true; pg.add(m1, m2); g.add(pg); props.push(pg);
  }
  // landing gear (tail-dragger)
  if (o.gear) {
    for (const z of [-4.3, 4.3]) {
      b.add(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 10), steel, at(2.3, -1.3, z));
      b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.42, 24).rotateX(Math.PI / 2), C(TYRE), at(2.3, -2.05, z));
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.47, 16).rotateX(Math.PI / 2), steel, at(2.3, -2.05, z));
    }
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), steel, at(-10.5, -0.75, 0));
    b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 18).rotateX(Math.PI / 2), C(TYRE), at(-10.5, -1.05, 0));
  }
  // bullet holes: where the returning planes were hit (hull sides, wings, tail) and NONE on engines, cockpit or nose
  if (o.holes) {
    const dark = C(HOLE), bare = gloss(BARE, 40);
    const hole = (m: THREE.Matrix4, r: number, squash: number, axis: "y" | "z") => {
      const s1 = new THREE.SphereGeometry(r, 12, 8), s2 = new THREE.SphereGeometry(r * 1.38, 12, 8);
      if (axis === "z") { s1.scale(1, 1, squash); s2.scale(1, 1, squash * 0.32); } else { s1.scale(1, squash, 1); s2.scale(1, squash * 0.32, 1); }
      b.add(s1, dark, m); b.add(s2, bare, m);
    };
    for (let i = 0; i < 34; i++) { // hull, both sides
      const x = -10.4 + rnd(i, 1) * 12.4, a = (rnd(i, 2) - 0.45) * 1.5, r = 0.1 + rnd(i, 3) * 0.07, side = i % 4 === 3 ? Math.PI : 0;
      if (x > -4.6 && x < -3.0 && Math.abs(a) < 0.7) continue; // keep the star clear
      const rr = rAt(x) - 0.02, aa = side ? Math.PI - a : a;
      hole(new THREE.Matrix4().makeRotationX(-aa).setPosition(x, rr * Math.sin(aa), rr * Math.cos(aa)), r, 0.4, "z");
    }
    for (let i = 0; i < 40; i++) { // wings (through holes), never over a nacelle
      const z = (i % 2 ? 1 : -1) * (1.7 + rnd(i, 4) * 13.4);
      if (ENG.some((e) => Math.abs(z - e) < 1.15)) continue;
      const x = TE(z) + 0.35 + rnd(i, 5) * (LE(z) - TE(z) - 0.9);
      hole(at(x, WY(z) + 0.01, z), 0.11 + rnd(i, 6) * 0.06, 1.9 * (TH(z) / 0.3), "y");
    }
    for (let i = 0; i < 9; i++) { // fin
      const y = 1.0 + rnd(i, 7) * 2.9, xl = -9.0 - (2.5 * (y - 0.5)) / 3.8 - 0.35, x = xl - rnd(i, 8) * (xl + 12.65);
      hole(at(Math.max(-12.7, x), y, 0), 0.1 + rnd(i, 9) * 0.06, 1.6, "z");
    }
    for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1, z = s * (1.2 + rnd(i, 10) * 4.6); hole(at(-12.1 + rnd(i, 11) * 1.6, 0.56 + 0.022 * Math.abs(z), z), 0.1, 1.6, "y"); }
  }
  b.build(g);
  // insignia (alpha-tested curved patch, not inked)
  if (o.gear) {
    const star = new THREE.Mesh(patch(-4.5, -3.1, -0.64, 0.64), T("w_starM", starTex(), "#ffffff", { alphaTest: 0.5, side: THREE.DoubleSide }));
    star.layers.set(NOINK); star.receiveShadow = true; g.add(star);
  }
  g.rotation.order = "YZX";
  return { g, props };
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
const BASE_IDS = [1, 2, 3, 4, 12];

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
  private plane!: THREE.Group; private fly!: { g: THREE.Group; props: THREE.Group[] };
  private armBad: THREE.Mesh[] = []; private armGood = new THREE.Group();
  private pages: THREE.Mesh[] = [];

  /** a group of static scenery shown only in the given shots (empty ids = always) */
  private part(ids: number[], set: SetName, fn: (s: Bd) => void) {
    const g = new THREE.Group(), b = new Batch(), n = new Batch(), gn = new THREE.Group();
    fn(new Bd(b, n, OX[set]));
    b.build(g); n.build(gn);
    gn.traverse((o) => o.layers.set(NOINK));
    g.add(gn); this.root.add(g);
    if (ids.length) this.vis.push({ o: g, ids });
  }
  private cloud(x: number, y: number, z: number, w: number, k: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(k % 4, LOOK.day.cloud), color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
    m.position.set(x, y, z); m.scale.set(w, w * 0.5, 1); m.layers.set(NOINK); this.root.add(m);
  }

  constructor() {
    const R = this.root;
    // ---- sky + light (as the bridge template) ----
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
    this.buildBase(); this.buildOffice(); this.buildToday();
  }

  // ======================= set 1: the air base (S1-S4, S12) =======================
  private buildBase() {
    // cloudy sky: three layers of painted clouds
    for (let i = 0; i < 14; i++) this.cloud(-190 + i * 29 + rnd(i, 21) * 14, 50 + (i % 4) * 22 + rnd(i, 22) * 10, -330 - (i % 3) * 30, 62 + rnd(i, 23) * 40, i);
    for (let i = 0; i < 8; i++) this.cloud(-150 + i * 42, 165 + (i % 3) * 26, -340 - (i % 2) * 40, 80 + rnd(i, 24) * 30, i + 1);
    this.part([], "base", (s) => {
      // apron, grass, hills, tree line
      s.box(T("w_slabsM", slabs()), -160, 160, -0.5, 0, -74, 60, 8);
      s.box(T("grassHD", grassHD(), "#9db592"), -500, 500, -0.6, -0.05, -700, -74, 9);
      for (let i = 0; i < 16; i++) s.sph(C(i % 2 ? "#6f9f5c" : "#628f52"), -330 + i * 44 + rnd(i, 1) * 16, -34, -430 - rnd(i, 2) * 90, 80 + rnd(i, 3) * 30, 1.6, 0.62, 1);
      for (let i = 0; i < 40; i++) { const x = -200 + i * 10.3 + rnd(i, 4) * 4, r = 4.5 + rnd(i, 5) * 3; s.sph(C(i % 3 ? "#4f8a4c" : "#3f7a44"), x, r * 0.9, -128 - rnd(i, 6) * 14, r, 1, 1.15, 1); }
      // painted taxi lines (flat, not inked)
      const yl = C("#f2b632"), wl = C("#f4f1ea");
      s.geo(boxGeo(V(-160, 0, -0.18), V(160, 0.006, 0.18)), yl, 0, 0, -3.6, 0, true);
      for (let i = 0; i < 40; i++) s.geo(boxGeo(V(-1.6, 0, -0.14), V(1.6, 0.006, 0.14)), wl, -156 + i * 8, 0, -32, 0, true);
      s.geo(boxGeo(V(-0.18, 0, -30), V(0.18, 0.006, 26)), yl, -13.5, 0, -4, 0, true);
      // hangar: 44 m wide, arched corrugated roof, half-open doors
      const corr = T("w_corr", stripes("w_corr", "#a9b6bb", "#8d9ba2", 28)), door = T("w_door", stripes("w_door", "#d9c58f", "#bfa76c", 12));
      s.box(corr, -46, -2, 0, 8.5, -94, -62);
      s.geo(new THREE.CylinderGeometry(22, 22, 32, 28).rotateX(Math.PI / 2).scale(1, 4.5 / 22, 1), corr, -24, 8.5, -78);
      s.box(C("#39404c"), -42, -6, 0, 8.4, -62, -61.9);
      s.box(door, -42, -31.5, 0, 8.4, -61.9, -61.6); s.box(door, -16.5, -6, 0, 8.4, -61.9, -61.6);
      s.box(C("#6d7a82"), -46.4, -1.6, 8.5, 9.0, -62.2, -61.4);
      for (let i = 0; i < 9; i++) s.box(gloss("#ffe9a8", 40), -40 + i * 4.2, -37.6 + i * 4.2, 9.5, 10.6 + (i > 1 && i < 7 ? 0.8 : 0), -61.95, -61.85);
      // a parked nose inside the hangar
      s.geo(new THREE.SphereGeometry(1.15, 18, 12).scale(1, 1, 2.2), C(OLIVE), -24, 3.0, -64); s.sph(gloss(GLASS, 120), -24, 3.0, -61.9, 0.7);
      // control tower: 14 m
      s.box(C("#efe3c4"), 6.5, 13.5, 0, 9.5, -80, -73); s.box(T("w_chk", checker("w_chk", "#e0262f", "#f4f1ea", "#b0222e")), 6.4, 13.6, 7.6, 9.5, -80.1, -72.9, 1.9);
      s.box(C("#59626e"), 5.6, 14.4, 9.5, 9.8, -80.9, -72.1); s.box(gloss("#9fd3ea", 120), 6.6, 13.4, 9.8, 12.4, -79.9, -73.1);
      for (const x of [6.5, 8.8, 11.1, 13.4]) s.box(C("#39404c"), x - 0.1, x + 0.1, 9.8, 12.4, -73.15, -72.95);
      s.box(C("#59626e"), 6.0, 14.0, 12.4, 12.8, -80.5, -72.5); s.cyl(C("#39404c"), 10, 13.9, -76.5, 0.07, 2.2); s.sph(gloss("#e0262f", 80), 10, 15.1, -76.5, 0.22);
      for (let j = 0; j < 3; j++) s.box(gloss("#9fd3ea", 100), 8.6, 11.4, 1.6 + j * 2.1, 2.8 + j * 2.1, -73.05, -72.95);
      // Nissen huts
      for (let i = 0; i < 4; i++) { s.geo(new THREE.CylinderGeometry(3.2, 3.2, 11, 18).rotateX(Math.PI / 2), T("w_hut", stripes("w_hut", "#8a9660", "#74804f", 20)), 24 + i * 9.5, 0, -64); s.box(C("#5f4a34"), 23.4 + i * 9.5, 24.6 + i * 9.5, 0, 2, -58.5, -58.4); }
      // windsock
      s.cyl(C("#f4f1ea"), 12.5, 3.5, -40, 0.09, 7); s.geo(new THREE.CylinderGeometry(0.16, 0.5, 2.6, 14).rotateZ(Math.PI / 2 + 0.25), T("w_sock", stripes("w_sock", "#f47a1f", "#f4f1ea", 6)), 13.9, 6.6, -40);
      // jeep (3.4 m) beyond the tail, fuel bowser behind the hull
      s.jeep(-13.2, -23);
      const bx = 1.5, bz = -26;
      s.cyl(gloss("#f2b632", 70), bx, 1.75, bz, 0.95, 4.4, "x"); s.box(C("#59626e"), bx - 2.3, bx + 4.0, 0.6, 0.85, bz - 0.9, bz + 0.9);
      s.box(C("#6f7a4a"), bx + 2.4, bx + 4.0, 0.85, 2.3, bz - 0.95, bz + 0.95); s.box(gloss(GLASS, 120), bx + 3.2, bx + 4.02, 1.5, 2.15, bz - 0.8, bz + 0.8);
      for (const dx of [-1.7, -0.6, 3.2]) for (const dz of [-0.95, 0.95]) s.cyl(C(TYRE), bx + dx, 0.48, bz + dz, 0.48, 0.3, "z");
      // foreground of the wide shot (S2): a jeep, drums and crates near the lens
      s.jeep(5.6, 26.5); s.drum("#5d7a3a", 9.3, 27.6); s.drum("#c8453f", 9.95, 27.2); s.drum("#2f7fb0", 1.6, 25.2);
      s.box(T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9)), 2.2, 2.9, 0, 0.7, 24.6, 25.3); s.box(T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9)), 2.3, 2.8, 0.7, 1.2, 24.7, 25.2);
      // by the rear hull (S1, S3, S4): work stand, drums, crates, toolbox
      const [lx, , lz] = planePt(-3.3, 0, 1.0), stand = gloss("#f2b632", 60);
      for (let i = 0; i < 5; i++) s.box(stand, lx - 0.9, lx - 0.2, i * 0.3, i * 0.3 + 0.08, lz + 2.0 - i * 0.33, lz + 2.35 - i * 0.33);
      s.box(stand, lx - 0.9, lx - 0.2, 1.5, 1.58, lz + 0.25, lz + 0.72);
      for (const dx of [-0.9, -0.24]) { s.box(stand, lx + dx, lx + dx + 0.04, 0, 1.5, lz + 0.25, lz + 0.29); s.box(stand, lx + dx, lx + dx + 0.04, 0, 2.4, lz + 0.68, lz + 0.72); s.box(stand, lx + dx, lx + dx + 0.04, 2.36, 2.4, lz + 0.25, lz + 0.72); }
      s.drum("#c8453f", -4.75, -10.7); s.drum("#2f7fb0", -4.3, -11.25); s.drum("#5d7a3a", -8.5, -10.6);
      const crate = T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9));
      s.box(crate, -9.3, -8.7, 0, 0.6, -11.6, -11.0); s.box(crate, -4.9, -4.3, 0, 0.6, -9.9, -9.3);
      s.box(gloss("#c8453f", 70), -6.25, -5.8, 0, 0.24, -11.2, -10.98); s.box(gloss("#a8323a", 70), -6.27, -5.78, 0.24, 0.29, -11.22, -10.96); s.cyl(gloss(STEEL, 70), -6.025, 0.33, -11.09, 0.012, 0.3, "x");
      // by the engines (S12): drums, crate, toolbox, wheel chocks
      s.drum("#c8453f", 2.45, 2.3); s.drum("#f2b632", 2.9, 1.7); s.drum("#2f7fb0", -1.85, 2.2); s.box(crate, -2.3, -1.7, 0, 0.6, 0.9, 1.5); s.box(crate, -2.2, -1.75, 0.6, 1.05, 0.95, 1.4);
      for (const lzz of [-4.3, 4.3]) { const [wx, , wz] = planePt(2.3, -2.6, lzz); s.box(C("#f2b632"), wx + 0.55, wx + 0.95, 0, 0.25, wz - 0.3, wz + 0.3); }
    });
    // the bomber, parked for the whole film
    const pl = mkBomber({ holes: true, gear: true });
    this.plane = pl.g;
    pl.g.position.set(OX.base + PLANE.x, PLANE.y, PLANE.z); pl.g.rotation.set(0, PLANE.yaw, PLANE.pitch);
    pl.g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.root.add(pl.g); this.vis.push({ o: pl.g, ids: BASE_IDS });
    // S4: armour riveted over the holed zones (the tempting, wrong answer)
    const pm = gloss("#aab2bc", 80); (pm as THREE.MeshPhongMaterial).map = plateTex();
    for (const [x0, x1] of [[-6.4, -4.9], [-8.1, -6.6], [-9.7, -8.3]]) {
      const m = new THREE.Mesh(patch(x0, x1, -0.72, 0.72, 0.07), pm); m.castShadow = true; m.receiveShadow = true; (m.material as THREE.Material).side = THREE.DoubleSide;
      this.armBad.push(m); pl.g.add(m);
    }
    // S12: armour where there were NO holes: the four engines and the cockpit
    for (const z of ENG) { const m = new THREE.Mesh(xcyl(0.81, 0.81, LE(z) + 0.1, LE(z) + 1.55), pm); m.position.set(0, WY(z) - 0.05, z); m.castShadow = true; this.armGood.add(m); }
    const cp = new THREE.Mesh(patch(4.4, 6.6, -0.5, 0.45, 0.06), pm); cp.castShadow = true; this.armGood.add(cp);
    pl.g.add(this.armGood);
    // S2: another bomber comes home
    this.fly = mkBomber({ holes: true, gear: false });
    this.root.add(this.fly.g); this.vis.push({ o: this.fly.g, ids: [2] });
  }

  // ======================= set 2: the Statistical Research Group office (S5-S10) =======================
  private buildOffice() {
    const Z = -3, ox = OX.office;
    for (let i = 0; i < 5; i++) this.cloud(ox - 14 + i * 8 + (i % 2) * 2, 6 + (i % 3) * 3.2, -60 - (i % 2) * 10, 16, i);
    this.part([], "office", (s) => {
      // outside the window: a few tall buildings
      s.box(C("#8f9a8a"), -40, 40, -0.5, -0.06, -80, Z - 0.3);
      for (let i = 0; i < 7; i++) { const x = -9 + i * 4.2, h = 9 + rnd(i, 31) * 16; s.box(T("w_skyM" + (i % 4), skyline(i % 4)), x, x + 3.4, 0, h, -34 - rnd(i, 32) * 8, -30, 0); }
      // floor, wall, wainscot
      s.box(T("planksHD", planksHD(), "#d8b48a"), -9, 9, -0.05, 0, Z, 7.5, 2.4);
      s.wall(T("w_wpOff", wallpaper("w_wpOff", "#ecdcb4", "#dfcd9f", "stripes")), -9, 9, 1.0, 6.8, Z, [[1.75, 2.75, 1.15, 2.95]], 2);
      s.box(T("w_wain", panels("w_wain", "#9a6844", "#62402a", "#b98258")), -9, 9, 0, 1.0, Z - 0.2, Z + 0.03, 0.9);
      s.box(C("#62402a"), -9, 9, 1.0, 1.07, Z, Z + 0.07);
      s.window(C("#fdf6ec"), 1.75, 2.75, 1.15, 2.95, Z, 2, 3);
      s.box(C("#2f7d5a"), 1.55, 1.73, 1.05, 3.1, Z + 0.06, Z + 0.12); s.box(C("#2f7d5a"), 2.77, 2.95, 1.05, 3.1, Z + 0.06, Z + 0.12);
      // blackboard 3.4 x 1.7 m, tray, chalk, eraser
      s.box(C(WOOD_D), -1.95, 1.45, 1.12, 2.82, Z, Z + 0.05); s.pic(T("w_chalkM", chalk()), -1.87, 1.37, 1.2, 2.74, Z + 0.055);
      s.box(C(WOOD), -1.95, 1.45, 1.06, 1.12, Z, Z + 0.14);
      for (const [x, c] of [[-1.2, "#fdf6ec"], [-1.05, "#ffd166"], [0.4, "#fdf6ec"]] as const) s.cyl(C(c), x, 1.135, Z + 0.09, 0.012, 0.09, "x");
      s.box(C("#5a4a3c"), 0.9, 1.08, 1.12, 1.17, Z + 0.05, Z + 0.12);
      // wall clock, framed chart, bookcase, filing cabinets, coat rack
      s.cyl(C(WOOD_D), -2.55, 3.15, Z + 0.03, 0.25, 0.06, "z", 0.25, 24); s.cyl(C("#fdf6ec"), -2.55, 3.15, Z + 0.065, 0.21, 0.012, "z", 0.21, 24);
      s.box(C(HOLE), -2.56, -2.54, 3.15, 3.3, Z + 0.07, Z + 0.08); s.box(C(HOLE), -2.55, -2.45, 3.14, 3.16, Z + 0.07, Z + 0.08);
      s.box(C(WOOD_D), -0.75, 0.25, 3.0, 3.75, Z, Z + 0.03); s.pic(T("picChart", picture("chart")), -0.71, 0.21, 3.04, 3.71, Z + 0.035);
      for (let j = 0; j < 5; j++) { const y = 0.1 + j * 0.5; s.box(C(WOOD), -4.4, -2.9, y - 0.04, y, Z, Z + 0.36); if (j < 4) s.box(T("w_spM" + j, spines(j)), -4.34, -2.96, y, y + 0.4, Z + 0.06, Z + 0.3); }
      for (const x of [-4.4, -2.94]) s.box(C(WOOD), x, x + 0.04, 0, 2.14, Z, Z + 0.36);
      const cab = gloss("#6f8f7a", 50);
      for (const x of [3.15, 3.8]) { s.box(cab, x, x + 0.6, 0, 1.35, Z + 0.02, Z + 0.62); for (let j = 0; j < 3; j++) { s.box(gloss("#7fa08a", 50), x + 0.04, x + 0.56, 0.08 + j * 0.43, 0.44 + j * 0.43, Z + 0.62, Z + 0.635); s.box(C(BRASS), x + 0.22, x + 0.38, 0.3 + j * 0.43, 0.33 + j * 0.43, Z + 0.635, Z + 0.655); } }
      s.sph(gloss("#2f7fb0", 70), 3.45, 1.55, Z + 0.32, 0.17); s.cyl(C(BRASS), 3.45, 1.37, Z + 0.32, 0.08, 0.04);
      // hanging lamps
      for (const x of [-1.2, 1.0]) { s.cyl(C("#3a2a20"), x, 5.3, -1.3, 0.012, 3.0); s.cyl(gloss("#2f7d5a", 60), x, 3.7, -1.3, 0.32, 0.22, "y", 0.07); }
      // desks: Wald's (stage, left), two colleagues' desks further back
      const top = T("benchTop", boards("benchTop", "#d9a868", "#7a5230", true));
      s.desk(-1.9, -0.62, -0.42, 0.34, top); s.desk(-1.85, -0.55, -1.45, -0.9, top); s.desk(0.2, 1.4, -1.25, -0.7, top);
      s.typewriter(-0.98, -0.1); s.lamp(-1.7, -0.25); s.cyl(gloss("#27407a", 80), -0.75, 0.82, 0.2, 0.035, 0.08);
      s.box(C("#fdf6ec"), -1.62, -1.38, 0.78, 0.8, -0.38, -0.08); s.box(C("#f0d2a0"), -1.25, -0.8, 0.78, 0.79, 0.2, 0.25);
      s.typewriter(-1.5, -1.15); s.box(C("#fdf6ec"), -1.0, -0.75, 0.78, 0.83, -1.35, -1.05); s.lamp(-0.7, -1.1);
      // mechanical calculator on the right desk
      s.box(gloss("#3a3446", 60), 0.9, 1.25, 0.78, 0.9, -1.15, -0.85); s.cyl(gloss(STEEL, 70), 1.29, 0.86, -1.0, 0.012, 0.1, "x"); s.sph(gloss("#e0262f", 80), 1.35, 0.86, -1.0, 0.025);
      for (let i = 0; i < 6; i++) s.box(C("#f4f1ea"), 0.93 + i * 0.05, 0.965 + i * 0.05, 0.9, 0.915, -1.1, -0.9);
      s.box(C("#fdf6ec"), 0.3, 0.6, 0.78, 0.81, -1.15, -0.8); s.lamp(0.35, -0.85);
    });
    // foreground: a long table near the lens with a globe, books, a lamp (soft, out of focus)
    this.part([], "office", (s) => {
      s.box(gloss("#6e4630", 50), -4, 4, 0.72, 0.78, 2.7, 3.5);
      s.sph(gloss("#2f7fb0", 70), -1.75, 1.02, 3.0, 0.2); s.cyl(C(BRASS), -1.75, 0.8, 3.0, 0.09, 0.05);
      s.lamp(1.55, 3.0); s.box(C("#fdf6ec"), 0.75, 1.05, 0.78, 0.82, 2.85, 3.15);
    });
    // the eight memoranda (S7), then they stay on the desk
    for (let i = 0; i < CUE.pages.length; i++) {
      const m = new THREE.Mesh(boxGeo(V(-0.105, 0, -0.148), V(0.105, 0.006, 0.148), 0, true), C(i % 2 ? "#fdf6ec" : "#f6efd9"));
      m.castShadow = true; m.receiveShadow = true; this.pages.push(m); this.root.add(m);
    }
  }

  // ======================= set 3: a bookshop today (S11) =======================
  private buildToday() {
    const Z = -2.4, ox = OX.today;
    this.part([], "today", (s) => {
      s.box(T("w_tiles", checker("w_tiles", "#f4ead8", "#9fd0c4", "#b9a58f")), -6, 10, -0.05, 0, Z, 7.5, 1.0);
      s.wall(T("w_wpShop", wallpaper("w_wpShop", "#ffe2b8", "#ffd49a", "dots")), -6, 10, 0, 6.8, Z, [], 2);
      const wh = C("#fbf3e2");
      for (let x = -3.6; x <= 4.3; x += 1.3) s.box(wh, x - 0.035, x + 0.035, 0, 3.6, Z, Z + 0.42);
      s.box(wh, -3.63, 4.33, 3.6, 3.7, Z, Z + 0.46);
      [0.45, 1.05, 1.65, 2.25, 2.85].forEach((y, j) => {
        s.box(wh, -3.6, 4.3, y - 0.04, y, Z, Z + 0.42);
        for (let bay = 0; bay < 6; bay++) { const x = -3.6 + bay * 1.3 + 0.06, k = (bay * 3 + j) % 5; s.box(T("w_spM" + k, spines(k)), x, x + 1.18, y, y + 0.5, Z + 0.1, Z + 0.34); }
      });
      // posters above the shelves, bunting, pendant lamps
      s.box(C("#1d3557"), -1.25, -0.25, 3.95, 5.2, Z, Z + 0.03); s.pic(T("w_pMedal", poster("medal")), -1.21, -0.29, 3.99, 5.16, Z + 0.035);
      s.box(C("#1d3557"), 0.2, 1.2, 3.95, 5.2, Z, Z + 0.03); s.pic(T("w_pRise", poster("rise")), 0.24, 1.16, 3.99, 5.16, Z + 0.035);
      s.bunting(-3.4, 3.6, 6.2, Z + 0.03, 15);
      for (const x of [-1.5, 0.9]) { s.cyl(C("#3a2a20"), x, 5.0, -1.0, 0.012, 3.4); s.cyl(gloss("#e2453c", 70), x, 3.3, -1.0, 0.3, 0.2, "y", 0.06); }
      // display table (stage): piles of best-sellers, a trophy, a laptop
      s.box(T("tableTop", boards("tableTop", "#edc78f", "#a8744a", true)), -1.28, 0.28, 0.76, 0.8, -0.42, 0.42, 1.1);
      s.box(T("w_skirt", stripes("w_skirt", "#fdf6ec", "#21a08f", 10)), -1.22, 0.22, 0, 0.76, -0.36, 0.36);
      for (let k = 0; k < 4; k++) { const n = [6, 9, 4, 7][k], x = -1.08 + k * 0.3; for (let i = 0; i < n; i++) s.geo(boxGeo(V(-0.11, 0, -0.085), V(0.11, 0.04, 0.085), 0, true), gloss(BOOKS[(k * 3 + i) % BOOKS.length], 50), x, 0.8 + i * 0.04, 0.12 - (k % 2) * 0.2, (rnd(i, k) - 0.5) * 0.3); }
      const gold = gloss("#ffc21a", 110);
      s.cyl(C(WOOD_D), 0.05, 0.83, -0.12, 0.09, 0.06); s.cyl(gold, 0.05, 0.92, -0.12, 0.02, 0.12); s.cyl(gold, 0.05, 1.07, -0.12, 0.045, 0.18, "y", 0.1); s.sph(gold, 0.05, 1.2, -0.12, 0.035);
      // side shelf with a plant and a stack by the reader
      s.box(wh, 1.5, 2.3, 0, 1.0, -1.2, -0.7); s.cyl(gloss("#f47a1f", 60), 1.9, 1.14, -0.95, 0.13, 0.28, "y", 0.17);
      for (const [dx, dy, r] of [[0, 0.5, 0.26], [-0.2, 0.36, 0.2], [0.2, 0.38, 0.2]]) s.sph(C("#35a84f"), 1.9 + dx, 1.14 + dy, -0.95, r);
    });
    for (const x of [-1.5, 0.9]) {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 0.95) }));
      globe.position.set(ox + x, 3.18, -1.0); this.root.add(globe);
    }
    // foreground: a plant near the lens
    this.part([], "today", (s) => {
      s.cyl(T("basket", stripes("basket", "#d9a868", "#a8744a", 12)), -0.9, 0.5, 2.9, 0.26, 1.0, "y", 0.33);
      [[-0.14, 1.2, 0.05, 0.24], [0.14, 1.26, -0.04, 0.26], [0.0, 1.5, 0.02, 0.24], [0.22, 1.1, 0.13, 0.18]].forEach(([dx, y, dz, r], i) => s.sph(C(i % 2 ? "#35a84f" : "#2f8f4a"), -0.9 + dx, y, 2.9 + dz, r));
    });
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS.day, K = LOOK.day, ox = OX[s.set], base = s.set === "base";
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = this.v.set(...c.look).clone(), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light: fixed per set. Base: sun over the viewer's left shoulder (lights the hull side); rooms: right shoulder ----
    const az = ((base ? -143 : 125) * Math.PI) / 180, el = (42 * Math.PI) / 180;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = base ? THREE.MathUtils.clamp(dist * 0.9 + 8, 22, 50) : THREE.MathUtils.clamp(dist * 1.25 + 2.5, 5, 14);
    if (base && id !== 2) focus.y = 2;
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
    // ---- the bomber's armour ----
    this.armBad.forEach((m, i) => {
      const tc = CUE.plates[i], u = (t - (tc - 0.3)) / 0.3;
      m.visible = id === 4 && u > 0;
      const k = 1 - eo(u); m.position.set(0, 0.5 * k, 1.6 * k); m.scale.setScalar(pop(t, tc + 0.03));
    });
    this.armGood.visible = id === 12;
    if (id === 2) {
      const p = flyer(t); this.fly.g.position.set(ox + p[0], p[1], p[2]); this.fly.g.rotation.set(0.1, -0.62, -0.06);
      for (const pg of this.fly.props) pg.rotation.x = t * 23;
    }
    // ---- the memoranda pile up on Wald's desk ----
    this.pages.forEach((m, i) => {
      const tc = CUE.pages[i], u = (t - (tc - 0.28)) / 0.28;
      m.visible = id > 7 && id <= 10 ? true : id === 7 && u > 0;
      const k = id === 7 ? 1 - eo(u) : 0, a = (rnd(i, 41) - 0.5) * 0.5;
      m.position.set(OX.office - 1.42 + 0.44 * k + (rnd(i, 42) - 0.5) * 0.03, 0.8 + i * 0.006 + 0.22 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))), 0.12 - 0.2 * k);
      m.rotation.set(0, a + k * 0.8, 0);
    });
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
