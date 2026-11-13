// The four sets of LEGO v4 as one three.js scene (kid's room, carpenter's workshop, toy shop, courtroom), 100 m apart
// on x so they never see each other. Static scenery is merged per material (Batch); bricks, the press platen and the
// two balances are posed every frame from story.ts; the cast are lit toon cards (cast.ts). Same light / ink / lens /
// grade pipeline as the skill's bridge template. update(id, f, camera) is a pure function of the shot and the frame.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, gloss, quad, tri } from "./build";
import { planksHD, grassHD, cloudHD } from "./paint";
import { boards, wallpaper, checker, panels, stripes, rugTex, picture, boxFront } from "./tex";
import { LIGHTS, LOOK } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, OX, S, SNAP, P, BH, STUD_H, STUD_R, RAIN, camAt, hookLift, clutchOff, finalX, finalLift, balTilt, pop, linS, sm, rnd, SetName } from "./story";

// ---------------- palette ----------------
export const BRICK = { red: "#e0262f", yellow: "#ffc21a", blue: "#1f6fd0", teal: "#17a493", green: "#35a84f", orange: "#f47a1f", white: "#f4f1ea", navy: "#27407a" };
const BCOLS = [BRICK.blue, BRICK.green, BRICK.orange, BRICK.yellow, BRICK.teal, BRICK.white];
const C = (c: string) => lam("c" + c, () => ({ color: c }));
const T = (key: string, map: THREE.Texture, color = "#ffffff", extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map, color, ...extra }));
const WOOD = "#c58f58", WOOD_D = "#8a5a34", WOOD_L = "#e3b983", STEEL = "#9aa3ad", BRASS = "#d9a93a";

// ---------------- brick geometry (plain studs, no marks) ----------------
const geoCache = new Map<string, THREE.BufferGeometry>();
const studGeo = (cols: number, rows: number, h: number) => {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
    out.push(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 18).toNonIndexed().translate((i + 0.5 - cols / 2) * P, h + STUD_H / 2, (j + 0.5 - rows / 2) * P));
  return mergeGeometries(out, false);
};
const bodyGeo = (cols: number, rows: number, hk = 1) => boxGeo(V((-cols * P) / 2, 0, (-rows * P) / 2), V((cols * P) / 2, BH * hk, (rows * P) / 2), 0, true);
const brickGeo = (cols: number, rows: number, hk = 1) => {
  const key = `${cols}x${rows}x${hk}`;
  let g = geoCache.get(key);
  if (!g) { g = mergeGeometries([bodyGeo(cols, rows, hk), studGeo(cols, rows, BH * hk)], false); geoCache.set(key, g); }
  return g;
};
const HL = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78, depthWrite: false });
/** a hero brick: glossy two-tone plastic, inked by the world ink pass, plus a painted manga highlight bar */
const mkBrick = (color: string, cols = 4, rows = 2, hk = 1) => {
  const g = new THREE.Group(), w = cols * P, d = rows * P, h = BH * hk;
  const m = new THREE.Mesh(brickGeo(cols, rows, hk), gloss(color));
  m.castShadow = true; m.receiveShadow = true;
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, 0.007), HL), dot = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.07, 0.007), HL);
  bar.position.set(-w * 0.22, h - 0.013, d / 2 + 0.0012); dot.position.set(w * 0.05, h - 0.013, d / 2 + 0.0012);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.3, 0.005), HL);
  top.rotation.x = -Math.PI / 2; top.position.set(-w * 0.27, h + 0.0012, d / 2 - 0.007);
  for (const o of [bar, dot, top]) o.layers.set(NOINK);
  g.add(m, bar, dot, top);
  return g;
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
  /** static brick: `ink` false = far decor (studs on the no-ink layer so they do not clot into black dots) */
  brick(color: string, x: number, y: number, z: number, ry = 0, cols = 4, rows = 2, ink = true, hk = 1) {
    if (ink) this.geo(brickGeo(cols, rows, hk), gloss(color), x, y, z, ry);
    else { this.geo(bodyGeo(cols, rows, hk), gloss(color), x, y, z, ry); this.geo(studGeo(cols, rows, BH * hk), gloss(color), x, y, z, ry, true); }
  }
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
}

type Vis = { o: THREE.Object3D; ids: number[] };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private clouds: THREE.Mesh[] = [];
  private vis: Vis[] = [];
  private sunDir = new THREE.Vector3();
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // dynamic things
  private D: Record<string, THREE.Group> = {};
  private rain: THREE.Group[] = [];
  private platen!: THREE.Mesh;
  private bal!: { beam: THREE.Mesh; pans: THREE.Group[]; at: THREE.Vector3; L: number };
  private jus!: { beam: THREE.Mesh; pans: THREE.Group[]; at: THREE.Vector3; L: number };

  /** a group of static scenery shown only in the given shots (empty ids = always) */
  private part(ids: number[], set: SetName, fn: (s: Bd) => void) {
    const g = new THREE.Group(), b = new Batch(), n = new Batch(), gn = new THREE.Group();
    fn(new Bd(b, n, OX[set]));
    b.build(g); n.build(gn);
    gn.traverse((o) => o.layers.set(NOINK));
    g.add(gn); this.root.add(g);
    if (ids.length) this.vis.push({ o: g, ids });
  }
  private dyn(name: string, o: THREE.Group, ids: number[]) { this.D[name] = o; this.root.add(o); this.vis.push({ o, ids }); return o; }

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
    // clouds close behind every back wall, so the windows show sky AND clouds
    const cl = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (const set of ["room", "work", "court"] as SetName[]) for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cl[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(OX[set] - 16 + i * 8 + (i % 2) * 2, 5 + (i % 3) * 3.2, -34 - (i % 2) * 10); m.scale.set(11, 5.5, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    // ---- outside: meadow and rolling hills behind the windows ----
    this.part([], "room", (s) => {
      s.box(T("grassHD", grassHD(), "#9db592"), -80, 400, -0.5, -0.06, -400, -2.9, 6);
      for (let i = 0; i < 14; i++) s.sph(C(i % 2 ? "#6f9f5c" : "#628f52"), -40 + i * 30 + rnd(i, 1) * 10, -9, -70 - rnd(i, 2) * 40, 22 + rnd(i, 3) * 8, 1.6, 0.6, 1);
    });
    this.buildRoom(); this.buildWork(); this.buildShop(); this.buildCourt();
  }

  // ======================= set 1: the kid's room (S1, S11) =======================
  private buildRoom() {
    const Z = -2.6;
    this.part([], "room", (s) => {
      s.box(T("planksHD", planksHD()), -5, 5, -0.05, 0, Z, 3.5, 2.4);
      const rug = new THREE.CircleGeometry(1.25, 48).rotateX(-Math.PI / 2);
      s.geo(rug, T("rug", rugTex()), 0.1, 0.006, -1.1, 0, true);
      const wp = T("wpRoom", wallpaper("wpRoom", "#bfe0f2", "#ffe9a8", "stars"));
      s.wall(wp, -5, 5, 0, 4.4, Z, [[-1.0, 0.0, 1.25, 2.45]]);
      s.box(C("#f4ead8"), -5, 5, 0, 0.16, Z, Z + 0.04);
      s.window(C("#fdf6ec"), -1.0, 0.0, 1.25, 2.45, Z);
      const cur = T("curtain", stripes("curtain", "#f47a1f", "#ffd166", 5));
      s.box(cur, -1.3, -1.02, 1.05, 2.62, Z + 0.06, Z + 0.12); s.box(cur, 0.02, 0.3, 1.05, 2.62, Z + 0.06, Z + 0.12);
      s.cyl(C(WOOD_D), -0.5, 2.66, Z + 0.1, 0.025, 1.9, "x");
      // shelf with toys
      s.box(C(WOOD_L), 0.38, 1.3, 1.5, 1.545, Z, Z + 0.26);
      for (const x of [0.48, 1.2]) s.box(C(WOOD), x - 0.02, x + 0.02, 1.34, 1.5, Z, Z + 0.2);
      s.sph(gloss("#e2453c", 60), 0.55, 1.655, Z + 0.14, 0.11);
      ["#2f7fb0", "#ffc21a", "#35a84f", "#c8453f", "#7b5ac9"].forEach((c, i) => s.box(C(c), 0.72 + i * 0.062, 0.775 + i * 0.062, 1.545, 1.78 + (i % 2) * 0.04, Z + 0.03, Z + 0.21));
      s.sph(C("#b9814f"), 1.15, 1.64, Z + 0.14, 0.095, 1, 1.05, 0.9); s.sph(C("#b9814f"), 1.15, 1.79, Z + 0.14, 0.07);
      for (const k of [-1, 1]) s.sph(C("#b9814f"), 1.15 + k * 0.055, 1.85, Z + 0.14, 0.028);
      // poster + bunting
      s.box(C(WOOD_D), 0.5, 1.2, 1.98, 2.86, Z, Z + 0.025);
      s.pic(T("picRocket", picture("rocket")), 0.53, 1.17, 2.01, 2.83, Z + 0.03);
      s.bunting(-1.7, 1.9, 3.5, Z + 0.03, 11);
      // dresser under the window with a lamp, toy crate under the shelf (striped, like a market crate)
      s.box(C("#f2b84b"), -1.15, -0.2, 0, 0.92, Z + 0.02, Z + 0.5);
      for (const y of [0.25, 0.62]) { s.box(C("#e0a030"), -1.1, -0.25, y - 0.14, y + 0.14, Z + 0.5, Z + 0.52); s.sph(C("#fdf6ec"), -0.675, y, Z + 0.54, 0.03); }
      s.cyl(C("#2f7fb0"), -0.85, 0.99, Z + 0.26, 0.07, 0.14); s.cyl(gloss("#ffd166", 30), -0.85, 1.15, Z + 0.26, 0.15, 0.2, "y", 0.08);
      s.box(T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9)), 0.42, 1.25, 0, 0.55, Z + 0.1, Z + 0.62);
      s.sph(gloss("#2f7fb0", 60), 0.65, 0.68, Z + 0.36, 0.14); s.brick(BRICK.green, 1.0, 0.55, Z + 0.34, 0.4, 4, 2, false); s.brick(BRICK.yellow, 1.02, 0.61, Z + 0.34, -0.2, 2, 2, false);
      // the play table (stage)
      const tt = T("tableTop", boards("tableTop", "#edc78f", "#a8744a", true));
      s.box(tt, -0.56, 0.56, 0.41, 0.45, -0.24, 0.4, 1.1);
      s.box(C("#d9a868"), -0.5, 0.5, 0.33, 0.41, -0.19, 0.35);
      for (const x of [-0.5, 0.45]) for (const z of [-0.19, 0.3]) s.box(C("#d9a868"), x, x + 0.05, 0, 0.33, z, z + 0.05);
      // loose bricks on the table
      s.brick(BRICK.green, -0.4, 0.45, 0.26, 0.5, 2, 2); s.brick(BRICK.orange, 0.37, 0.45, 0.2, -0.45); s.brick(BRICK.white, 0.42, 0.45, -0.05, 0.2, 2, 2);
      s.brick(BRICK.teal, -0.44, 0.45, -0.08, -0.3, 2, 1);
    });
    this.dyn("r_base", mkBrick(BRICK.red), [1, 11]);
    this.dyn("r_top", mkBrick(BRICK.yellow), [1, 11]);
    this.dyn("r_blue", mkBrick(BRICK.blue), [1, 11]);
  }

  // ======================= set 2: the carpenter's workshop (S2-S6) =======================
  private buildWork() {
    const Z = -3;
    const wallM = T("wallWork", boards("wallWork", "#cfa26c", "#7a5230"));
    this.part([], "work", (s) => {
      s.box(T("planksHD", planksHD()), -9, 9, -0.05, 0, Z, 7.5, 2.4);
      s.wall(wallM, -9, 9, 0, 6.8, Z, [[-1.3, 0.1, 1.15, 2.95]]);
      s.window(C("#6e4630"), -1.3, 0.1, 1.15, 2.95, Z, 2, 2);
      s.box(C("#6e4630"), -9, 9, 3.55, 3.78, Z, Z + 0.14); s.box(C("#6e4630"), -9, 9, 0, 0.2, Z, Z + 0.05);
      for (const x of [-3.35, 2.95]) s.box(C("#7d5234"), x, x + 0.2, 0, 6.8, Z, Z + 0.16);
      // tool board
      s.box(C("#9a6a40"), 0.5, 1.8, 1.3, 2.5, Z, Z + 0.04);
      const st = gloss(STEEL, 50, "#dfe6ee");
      s.box(st, 0.62, 1.2, 2.16, 2.3, Z + 0.04, Z + 0.055); s.box(C(WOOD_D), 1.2, 1.4, 2.12, 2.34, Z + 0.04, Z + 0.07);           // saw
      s.box(C(WOOD_L), 0.72, 0.77, 1.42, 1.9, Z + 0.04, Z + 0.07); s.box(st, 0.64, 0.85, 1.9, 2.0, Z + 0.04, Z + 0.09);                // hammer
      s.box(st, 1.0, 1.04, 1.42, 1.95, Z + 0.04, Z + 0.06); s.box(st, 1.0, 1.36, 1.42, 1.46, Z + 0.04, Z + 0.06);                      // square
      for (const [x, c] of [[1.5, "#c8453f"], [1.63, "#2f7fb0"]] as const) { s.box(C(c), x, x + 0.05, 1.7, 1.95, Z + 0.04, Z + 0.08); s.box(st, x + 0.012, x + 0.038, 1.42, 1.7, Z + 0.04, Z + 0.06); }
      // two shelves on the left
      for (const y of [1.95, 2.6]) { s.box(C(WOOD_L), -3.05, -1.55, y, y + 0.045, Z, Z + 0.3); for (const x of [-2.95, -1.67]) s.box(C(WOOD), x, x + 0.03, y - 0.16, y, Z, Z + 0.22); }
      // hanging lamp
      s.cyl(C("#3a2a20"), -0.6, 5.2, -1.3, 0.012, 3.2); s.cyl(gloss("#2f7d5a", 60), -0.6, 3.5, -1.3, 0.3, 0.22, "y", 0.07);
      // the workbench (stage)
      const bt = T("benchTop", boards("benchTop", "#d9a868", "#7a5230", true));
      s.box(bt, -1.5, -0.1, 0.82, 0.9, -0.42, 0.38, 1.0);
      s.box(C(WOOD), -1.42, -0.18, 0.66, 0.82, -0.36, 0.32);
      for (const x of [-1.42, -0.27]) for (const z of [-0.36, 0.23]) s.box(C(WOOD), x, x + 0.09, 0, 0.66, z, z + 0.09);
      s.box(C(WOOD_L), -1.38, -0.22, 0.2, 0.25, -0.32, 0.28);
      s.box(C(WOOD_D), -0.95, -0.45, 0.68, 0.8, 0.32, 0.335); s.sph(C(BRASS), -0.7, 0.74, 0.345, 0.022);
      s.box(st, -1.56, -1.5, 0.74, 0.94, 0.02, 0.26); s.box(st, -1.66, -1.6, 0.74, 0.94, 0.02, 0.26); s.cyl(st, -1.6, 0.8, 0.14, 0.02, 0.26, "x"); s.cyl(C(WOOD_D), -1.7, 0.8, 0.14, 0.012, 0.2, "z");
      s.box(C("#b98a55"), -1.15, -0.85, 0.2 + 0.05, 0.42, -0.2, 0.15); s.cyl(gloss("#c8453f", 50), -0.5, 0.33, 0.0, 0.07, 0.16); s.cyl(gloss("#2f7fb0", 50), -0.34, 0.33, 0.06, 0.07, 0.16);
    });
    // wooden toys on the shelves (1932) / coloured bricks (after the press arrives)
    this.part([2, 3, 4], "work", (s) => {
      const w = C("#e0a860"), red = C("#c8453f"), blue = C("#3f6f9f"), yel = C("#e6b84a");
      s.box(red, -2.9, -2.55, 2.04, 2.16, Z + 0.08, Z + 0.22); s.box(red, -2.8, -2.62, 2.16, 2.26, Z + 0.08, Z + 0.22);
      for (const x of [-2.84, -2.61]) s.cyl(C("#3a2a20"), x, 2.035, Z + 0.23, 0.04, 0.03, "z");
      s.box(blue, -2.4, -2.26, 1.995, 2.135, Z + 0.08, Z + 0.22); s.box(yel, -2.25, -2.11, 1.995, 2.135, Z + 0.08, Z + 0.22); s.box(red, -2.33, -2.19, 2.135, 2.275, Z + 0.08, Z + 0.22);
      s.cyl(yel, -1.85, 2.08, Z + 0.15, 0.0, 0.17, "y", 0.1); s.cyl(w, -1.85, 2.2, Z + 0.15, 0.015, 0.1);
      s.sph(w, -2.75, 2.75, Z + 0.15, 0.1, 1.25, 0.9, 0.9); s.sph(w, -2.63, 2.87, Z + 0.15, 0.065); s.cyl(yel, -2.55, 2.86, Z + 0.15, 0.03, 0.07, "x", 0.0);
      s.box(blue, -2.3, -1.95, 2.69, 2.8, Z + 0.07, Z + 0.21); s.cyl(C("#3a2a20"), -2.3, 2.76, Z + 0.14, 0.03, 0.14, "y"); s.cyl(w, -2.3, 2.86, Z + 0.14, 0.045, 0.05);
      for (const x of [-2.22, -2.03]) s.cyl(red, x, 2.685, Z + 0.22, 0.04, 0.03, "z");
    });
    this.part([5, 6], "work", (s) => {
      const cols = Object.values(BRICK);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 6; i++) for (let k = 0; k < 1 + ((i + j) % 3); k++)
        s.brick(cols[(i * 3 + j + k) % cols.length], -2.88 + i * 0.235, [1.995, 2.645][j] + k * BH, Z + 0.15, 0, 4, 2, false);
    });
    // 1932 bench props: the wooden duck on wheels, a plane, an offcut
    this.part([2, 3], "work", (s) => {
      const w = C("#e9b163"), x = -0.62, y = 0.9, z = 0.02;
      s.box(C("#c8453f"), x - 0.19, x + 0.19, y + 0.045, y + 0.075, z - 0.075, z + 0.075);
      for (const dx of [-0.12, 0.12]) for (const dz of [-0.09, 0.09]) s.cyl(C("#3a2a20"), x + dx, y + 0.045, z + dz, 0.045, 0.025, "z");
      s.sph(w, x - 0.03, y + 0.2, z, 0.135, 1.25, 0.92, 0.85); s.sph(w, x + 0.13, y + 0.36, z, 0.085);
      s.cyl(C("#f2a23a"), x + 0.235, y + 0.35, z, 0.036, 0.09, "x", 0.004); s.cyl(w, x - 0.2, y + 0.27, z, 0.05, 0.12, "x", 0.004);
      s.sph(C("#241726"), x + 0.16, y + 0.39, z + 0.07, 0.014);
      s.box(C(WOOD_L), -1.3, -1.05, y, y + 0.07, -0.12, 0.0); s.box(C(WOOD_D), -1.24, -1.11, y + 0.07, y + 0.13, -0.09, -0.03);
      s.box(C("#f0d2a0"), -1.02, -0.86, y, y + 0.05, 0.14, 0.26);
    });
    // 1949: the injection press, its tray, and a shelf of bricks behind it
    this.part([4, 5, 6], "work", (s) => {
      const en = gloss("#3f9a72", 45), st = gloss(STEEL, 60, "#eef3f8"), dk = gloss("#59626e", 40);
      s.box(en, 1.3, 2.6, 0.06, 0.8, -0.45, 0.3); s.box(C("#2e3a40"), 1.33, 2.57, 0, 0.06, -0.42, 0.27);
      s.box(gloss("#358662", 45), 1.42, 1.98, 0.16, 0.7, 0.3, 0.315); s.box(gloss("#358662", 45), 2.04, 2.5, 0.16, 0.7, 0.3, 0.315);
      s.box(st, 1.25, 2.65, 0.8, 0.86, -0.5, 0.35);
      for (const x of [1.5, 2.4]) for (const z of [-0.32, 0.17]) s.cyl(st, x, 1.33, z, 0.035, 0.94);
      s.box(en, 1.4, 2.5, 1.8, 1.96, -0.42, 0.27);
      s.cyl(gloss("#ffc21a", 60), 2.2, 2.14, -0.08, 0.06, 0.36, "y", 0.2);
      s.box(dk, 1.62, 2.28, 0.86, 0.99, -0.27, 0.12);
      s.cyl(st, 1.95, 0.45, 0.33, 0.15, 0.03, "z"); s.cyl(dk, 1.95, 0.45, 0.35, 0.04, 0.05, "z");
      s.cyl(st, 2.58, 1.05, 0.0, 0.014, 0.4); s.sph(gloss("#e0262f", 80), 2.58, 1.27, 0.0, 0.045);
      s.cyl(C("#fdf6ec"), 1.62, 1.88, 0.275, 0.06, 0.012, "z"); s.box(gloss("#ffc21a", 40), 2.05, 2.4, 1.84, 1.92, 0.27, 0.278);
      // chute and tray stand
      const ch = new THREE.BoxGeometry(0.46, 0.015, 0.18); ch.rotateZ(0.42);
      s.geo(ch, st, 1.42, 0.895, -0.07);
      s.box(T("crate", stripes("crate", "#f3c98a", "#8a6a4a", 9)), 0.98, 1.3, 0, 0.74, -0.24, 0.12);
      s.box(C(WOOD_L), 0.95, 1.33, 0.74, 0.78, -0.27, 0.15);
      // shelf of bricks on the wall
      for (const y of [2.2, 2.75]) s.box(C(WOOD_L), 1.95, 3.25, y, y + 0.045, Z, Z + 0.3);
      const cols = Object.values(BRICK);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) for (let k = 0; k < 1 + ((i * 2 + j) % 3); k++)
        s.brick(cols[(i * 5 + j * 3 + k) % cols.length], 2.1 + i * 0.25, [2.245, 2.795][j] + k * BH, Z + 0.15, 0, 4, 2, false);
    });
    // S6: drafting board with the patent drawing, ink pot, ruler
    this.part([6], "work", (s) => {
      const bd = new THREE.BoxGeometry(0.56, 0.7, 0.03); bd.translate(0, 0.35, 0); bd.rotateX(-0.3);
      s.geo(bd, C(WOOD_L), -1.12, 0.9, -0.16);
      const sheet = quad(V(-0.25, 0.03, 0.017), V(0.25, 0.03, 0.017), V(0.25, 0.655, 0.017), V(-0.25, 0.655, 0.017)); sheet.rotateX(-0.3);
      s.geo(sheet, T("picPatent", picture("patent")), -1.12, 0.9, -0.16);
      s.box(C(WOOD), -1.4, -0.84, 0.9, 0.93, -0.05, 0.0);
      s.cyl(gloss("#27407a", 80), -1.3, 0.94, 0.2, 0.04, 0.08); s.box(C("#f0d2a0"), -1.2, -0.85, 0.9, 0.908, 0.2, 0.25);
    });
    const plat = new THREE.Mesh(mergeGeometries([boxGeo(V(-0.33, 0, -0.2), V(0.33, 0.14, 0.2), 0, true), new THREE.CylinderGeometry(0.07, 0.07, 0.9, 16).toNonIndexed().translate(0, 0.59, 0)], false), gloss("#59626e", 40));
    plat.castShadow = true; plat.receiveShadow = true;
    const pg = new THREE.Group(); pg.add(plat); this.platen = plat;
    this.dyn("w_platen", pg, [4, 5, 6]);
    this.dyn("w_first", mkBrick(BRICK.red), [4]);
    this.dyn("w_page", mkBrick(BRICK.white), [5]);
    this.dyn("w_red", mkBrick(BRICK.red), [5]);
    this.dyn("w_low", mkBrick(BRICK.teal), [6]);
    this.dyn("w_up", mkBrick(BRICK.red), [6]);
  }

  // ======================= set 3: the toy shop (S7, S8, S10) =======================
  private buildShop() {
    const Z = -2.4;
    this.part([], "shop", (s) => {
      s.box(T("tiles", checker("tiles", "#f4ead8", "#e58f7a", "#b9a58f")), -6, 10, -0.05, 0, Z, 7.5, 1.0);
      s.wall(T("wpShop", wallpaper("wpShop", "#bfe6d8", "#a5d8c6", "stripes")), -6, 10, 0, 6.8, Z, [], 2);
      // shelving unit along the whole wall, filled with boxes, balls, bricks
      const wh = C("#fbf3e2"), cols = Object.values(BRICK);
      for (let x = -3.6; x <= 7.7; x += 1.3) s.box(wh, x - 0.035, x + 0.035, 0, 4.2, Z, Z + 0.42);
      s.box(wh, -3.63, 7.73, 4.2, 4.3, Z, Z + 0.46);
      [0.45, 1.05, 1.65, 2.25, 2.85, 3.45].forEach((y, j) => {
        s.box(wh, -3.6, 7.7, y - 0.04, y, Z, Z + 0.42);
        for (let bay = 0; bay < 9; bay++) {
          let x = -3.6 + bay * 1.3 + 0.1; const x1 = x + 1.1;
          for (let k = 0; x < x1 - 0.2 && k < 6; k++) {
            const r = rnd(bay * 17 + j * 5 + k, 3), q = rnd(bay * 11 + j * 7 + k, 4);
            if (r < 0.5) { const w = 0.24 + q * 0.2, h = 0.26 + rnd(k + bay, 6) * 0.24; s.box(T("boxF" + ((bay + j + k) % 6), boxFront(bay + j + k)), x, x + w, y, y + h, Z + 0.08, Z + 0.36); x += w + 0.035; }
            else if (r < 0.72) { const rr = 0.11 + q * 0.05; s.sph(gloss(cols[(bay + k + j) % cols.length], 60), x + rr, y + rr, Z + 0.24, rr); x += 2 * rr + 0.04; }
            else { const n = 2 + Math.floor(q * 4); for (let u = 0; u < n; u++) s.brick(cols[(bay * 3 + j + k + u) % cols.length], x + 0.11, y + u * BH, Z + 0.26, 0, 4, 2, false); x += 0.26; }
          }
        }
      });
      s.box(C("#1d3557"), -1.0, 0.6, 4.55, 5.75, Z, Z + 0.03); s.pic(T("picSign", picture("sign")), -0.72, 0.32, 4.5, 5.8, Z + 0.035);
      s.bunting(-3.4, 3.2, 6.3, Z + 0.03, 15); s.bunting(3.2, 8.2, 6.3, Z + 0.03, 11);
      // display table (S7 / S8)
      s.box(T("tableTop", boards("tableTop", "#edc78f", "#a8744a", true)), -1.28, 0.28, 0.76, 0.8, -0.42, 0.42, 1.1);
      s.box(T("skirt", stripes("skirt", "#fdf6ec", "#e2453c", 10)), -1.22, 0.22, 0, 0.76, -0.36, 0.36);
      s.box(gloss("#27407a", 70), -1.14, -0.8, 0.8, 0.86, -0.13, 0.13); s.box(gloss(BRASS, 70), -1.04, -0.9, 0.815, 0.845, 0.13, 0.136);
      s.brick(BRICK.red, -0.97, 0.86, 0.0); s.brick(BRICK.red, -0.97, 0.86 + BH, 0.0);
      // counter (S10) with the till
      s.box(T("counter", panels("counter", "#c58f58", "#8a5a34", "#dcae78")), 4.0, 5.5, 0, 0.94, -0.42, 0.3, 0.5);
      s.box(gloss("#7a4f33", 50), 3.94, 5.56, 0.94, 1.0, -0.48, 0.36);
      s.box(gloss("#1e6f82", 60), 4.98, 5.4, 1.0, 1.2, -0.34, 0.06); s.box(gloss("#1e6f82", 60), 5.05, 5.33, 1.2, 1.36, -0.34, -0.14);
      s.box(C("#cfeef0"), 5.09, 5.29, 1.24, 1.33, -0.14, -0.132);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) s.box(C("#fdf6ec"), 5.04 + i * 0.085, 5.1 + i * 0.085, 1.2, 1.218, -0.1 + j * 0.075, -0.045 + j * 0.075);
      // balance base + post
      const br = gloss(BRASS, 90);
      s.cyl(br, 4.42, 1.015, -0.05, 0.13, 0.03); s.cyl(br, 4.42, 1.25, -0.05, 0.018, 0.46); s.sph(br, 4.42, 1.49, -0.05, 0.035);
    });
    this.part([7], "shop", (s) => {
      const f = new THREE.BoxGeometry(0.42, 0.52, 0.025); f.translate(0, 0.26, 0); f.rotateX(-0.22);
      s.geo(f, C(WOOD_D), -0.3, 0.8, -0.06);
      const p = quad(V(-0.18, 0.035, 0.014), V(0.18, 0.035, 0.014), V(0.18, 0.485, 0.014), V(-0.18, 0.485, 0.014)); p.rotateX(-0.22);
      s.geo(p, T("picCert", picture("certificate")), -0.3, 0.8, -0.06);
    });
    // foreground: a basket of balls near the lens (S7, S8) and one by the counter (S10)
    const basket = (s: Bd, x: number, z: number) => {
      s.cyl(T("basket", stripes("basket", "#d9a868", "#a8744a", 12)), x, 0.5, z, 0.26, 1.0, "y", 0.33);
      [[-0.14, 1.06, 0.05, "#e2453c"], [0.12, 1.08, -0.04, "#ffc21a"], [0.0, 1.2, 0.02, "#2f7fb0"], [0.17, 1.02, 0.13, "#35a84f"]].forEach(([dx, y, dz, c]) => s.sph(gloss(c as string, 60), x + (dx as number), y as number, z + (dz as number), 0.13));
    };
    this.part([7, 8], "shop", (s) => basket(s, -0.86, 2.9));
    this.part([10], "shop", (s) => basket(s, 5.02, 2.9));
    RAIN.forEach((r) => { const g = mkBrick(BCOLS[r.col]); this.rain.push(g); this.root.add(g); this.vis.push({ o: g, ids: [8] }); });
    this.bal = this.mkBalance("s_bal", [10], OX.shop + 4.42, 1.49, -0.05, 0.31, 0.2, 0.125, (l, r) => {
      const box = new THREE.Mesh(boxGeo(V(-0.09, 0, -0.045), V(0.09, 0.13, 0.045), 0, true), T("boxF0", boxFront(0))); box.castShadow = true; l.add(box);
      r.add(mkBrick(BRICK.teal, 2, 2));
    });
  }

  /** balance: beam turning about `at`, two pans that stay level; fill(l, r) puts things on the pans */
  private mkBalance(name: string, ids: number[], x: number, y: number, z: number, L: number, hang: number, rp: number, fill: (l: THREE.Group, r: THREE.Group) => void) {
    const br = gloss(BRASS, 90), g = new THREE.Group();
    const beam = new THREE.Mesh(boxGeo(V(-L - 0.02, -0.012, -0.012), V(L + 0.02, 0.012, 0.012), 0, true), br); beam.castShadow = true;
    beam.position.set(x, y, z);
    const pans = [-1, 1].map(() => {
      const p = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(rp, rp * 0.7, 0.02, 24), br); dish.position.y = -hang; dish.castShadow = true;
      for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, Math.hypot(hang, rp * 0.8), 5), br); c.position.set((k * rp * 0.8) / 2, -hang / 2, 0); c.rotation.z = k * Math.atan2(rp * 0.8, hang); p.add(c); }
      const load = new THREE.Group(); load.position.y = -hang + 0.01; p.add(dish, load);
      g.add(p);
      return p;
    });
    fill(pans[0].children[3] as THREE.Group, pans[1].children[3] as THREE.Group);
    g.add(beam);
    this.dyn(name, g, ids);
    return { beam, pans, at: new THREE.Vector3(x, y, z), L };
  }
  private poseBalance(b: { beam: THREE.Mesh; pans: THREE.Group[]; at: THREE.Vector3; L: number }, deg: number) {
    const a = (deg * Math.PI) / 180;
    b.beam.rotation.z = -a;
    b.pans.forEach((p, i) => { const k = i ? 1 : -1; p.position.set(b.at.x + k * b.L * Math.cos(a), b.at.y - k * b.L * Math.sin(a), b.at.z); });
  }

  // ======================= set 4: the courtroom (S9) =======================
  private buildCourt() {
    const Z = -2.6;
    this.part([], "court", (s) => {
      s.box(T("parquet", planksHD(), "#c79a78"), -9, 9, -0.05, 0, Z, 7.5, 2.4);
      s.box(T("wainscot", panels("wainscot", "#9a6844", "#62402a", "#b98258")), -9, 9, 0, 1.7, Z - 0.2, Z, 0.85);
      s.box(C("#62402a"), -9, 9, 1.7, 1.8, Z, Z + 0.07);
      const pl = T("wpCourt", wallpaper("wpCourt", "#f1e4c6", "#e3d2ac", "dots"));
      s.wall(pl, -9, 9, 1.7, 6.8, Z, [[-2.05, -1.25, 2.15, 4.5], [1.25, 2.05, 2.15, 4.5]], 2.2);
      for (const k of [-1, 1]) {
        s.window(C("#62402a"), k * 1.65 - 0.4, k * 1.65 + 0.4, 2.15, 4.5, Z, 2, 3);
        s.box(C("#8c2f3a"), k * 2.3 - 0.16, k * 2.3 + 0.16, 1.85, 4.8, Z + 0.05, Z + 0.12); s.box(C("#8c2f3a"), k * 1.0 - 0.14, k * 1.0 + 0.14, 1.85, 4.8, Z + 0.05, Z + 0.12);
        s.box(C("#e0cfa6"), k * 0.72 - 0.09, k * 0.72 + 0.09, 1.8, 6.8, Z, Z + 0.1);
      }
      s.pic(T("picEmblem", picture("emblem"), "#ffffff", { alphaTest: 0.5 }), -0.5, 0.5, 2.75, 4.0, Z + 0.02);
      // platform, chair, bench
      s.box(T("benchTop", boards("benchTop", "#d9a868", "#7a5230", true), "#b98a6a"), -1.75, 1.75, 0, 0.3, -1.6, -0.12, 1.0);
      s.box(C("#62402a"), -0.5, 0.4, 0.3, 2.3, -1.42, -1.34); s.box(C("#8c2f3a"), -0.42, 0.32, 1.25, 2.2, -1.34, -1.32);
      s.box(T("wainscot", panels("wainscot", "#9a6844", "#62402a", "#b98258")), -1.0, 1.0, 0.3, 1.19, -0.8, -0.4, 0.5);
      s.box(gloss("#6e4630", 50), -1.07, 1.07, 1.19, 1.25, -0.87, -0.33);
      // on the bench: the brick (function, free) and a plain toy pawn (generic figure), the sound block
      s.brick(BRICK.red, -0.76, 1.25, -0.5);
      s.cyl(gloss(BRICK.yellow, 80), -0.46, 1.32, -0.5, 0.05, 0.14, "y", 0.018); s.sph(gloss(BRICK.yellow, 80), -0.46, 1.42, -0.5, 0.04);
      s.cyl(C(WOOD_D), 0.36, 1.265, -0.52, 0.065, 0.03);
      const br = gloss(BRASS, 90);
      s.cyl(br, 0.74, 1.262, -0.5, 0.1, 0.025); s.cyl(br, 0.74, 1.47, -0.5, 0.014, 0.42); s.sph(br, 0.74, 1.69, -0.5, 0.028);
      // lamps on the platform
      for (const k of [-1, 1]) { s.cyl(br, k * 1.45, 0.34, -0.7, 0.11, 0.08); s.cyl(br, k * 1.45, 1.1, -0.7, 0.022, 1.5); }
    });
    for (const k of [-1, 1]) {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 22, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 0.95) }));
      globe.position.set(OX.court + k * 1.45, 1.96, -0.7); this.root.add(globe);
    }
    // foreground: the bar (balustrade) between the public and the court
    this.part([], "court", (s) => {
      const w = gloss("#6e4630", 50);
      s.box(w, -3, 3, 0.94, 1.02, 2.24, 2.36); s.box(w, -3, 3, 0.1, 0.17, 2.26, 2.34);
      for (let x = -2.9; x <= 2.9; x += 0.24) s.cyl(w, x, 0.555, 2.3, 0.03, 0.77);
    });
    this.jus = this.mkBalance("c_bal", [9], OX.court + 0.74, 1.69, -0.5, 0.2, 0.16, 0.075, () => undefined);
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }
  private place(name: string, ox: number, x: number, y: number, z: number, sc = 1, ry = 0) { const o = this.D[name]; o.position.set(ox + x, y, z); o.scale.setScalar(sc); o.rotation.y = ry; return o; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS.day, K = LOOK.day, ox = OX[s.set];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = this.v.set(...c.look).clone(), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light: the sun comes over the viewer's right shoulder (az 125 from the view axis, el 42), fixed per set ----
    const az = (125 * Math.PI) / 180, el = ((s.set === "room" ? 46 : 42) * Math.PI) / 180;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.25 + 2.5, 5, 14);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 60); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 5; sc.far = 130; sc.updateProjectionMatrix();
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
    for (const m of this.clouds) m.position.x += 0; // static clouds (calm)
    // ---- which scenery this shot shows ----
    for (const v of this.vis) v.o.visible = v.ids.includes(id);
    // ---- bricks and machines ----
    if (s.set === "room") {
      const final = id === 11, k = final ? pop(t, SNAP.final) : pop(t, SNAP.hook), lift = final ? finalLift(t) : hookLift(t);
      this.place("r_base", ox, 0.0, 0.45, 0.1, k);
      this.place("r_top", ox, final ? finalX(t) : 0.0, 0.45 + BH * k + lift, 0.1, k);
      const b = this.place("r_blue", ox, -0.3, 0.45 + (final ? 0 : linS([[3.35, 0.7], [4.0, 0]], t)), 0.16, 1, 0.12);
      b.visible = final || t > 3.35;
    }
    if (id === 4) {
      this.place("w_platen", ox, 1.95, linS([[S.s4 + 0.4, 1.42], [S.s4 + 1.0, 0.99], [S.s4 + 1.45, 0.99], [S.s4 + 2.0, 1.42]], t), -0.075);
      const u = sm((t - (S.s4 + 2.1)) / 0.75), b = this.place("w_first", ox, 1.95 + (1.14 - 1.95) * u, 0.99 + (0.78 - 0.99) * u + 0.06 * Math.sin(Math.PI * u), -0.07, pop(t, S.s4 + 2.85, 0.04));
      b.visible = t > S.s4 + 1.45;
    } else if (id === 5 || id === 6) this.place("w_platen", ox, 1.95, 1.42, -0.075);
    if (id === 5) { this.place("w_page", ox, -1.12, 0.9, 0.08, 1, 0.1); this.place("w_red", ox, -0.5, 0.9, 0.08, 1, -0.08); }
    if (id === 6) {
      const k = Math.max(pop(t, SNAP.lockIn), pop(t, SNAP.lockOut));
      this.place("w_low", ox, -0.52, 0.9, 0.12, k);
      this.place("w_up", ox, -0.52, 0.9 + BH * k + (clutchOff(t) / 190) * 0.32, 0.12, k);
    }
    if (id === 8) RAIN.forEach((r, i) => {
      const g = this.rain[i], u = (r.t - t) / 0.5;
      g.visible = u < 1;
      g.position.set(ox + r.x, 0.8 + r.y + (u > 0 ? 1.6 * u * u : 0), 0.0);
      g.scale.set(1, 1 - 0.07 * Math.exp(-(((t - r.t - 0.03) / 0.05) ** 2)), 1);
    });
    if (id === 10) this.poseBalance(this.bal, balTilt(t));
    if (id === 9) this.poseBalance(this.jus, Math.sin((t - S.s9) * 1.3) * 6 * Math.exp(-(t - S.s9 - 1) * 0.12));
    // ---- cast + contact shadows ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right }, this.sunDir);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
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
