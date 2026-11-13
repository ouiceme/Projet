// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, Outfit, FrontOpts, SideOpts } from "./toon";
import { FPS, clamp01 } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };


const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]. Sized so a card is never
 *  magnified at 1080 x 1920: >= 1.4 texels per output pixel at every framing of this film (never blurry). */
const tier = (d: number): [number, number, number] => (d < 4.2 ? [1800, 3000, 3.0] : d < 9 ? [1320, 2200, 2.2] : [720, 1200, 1.2]);

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, 0.4).normalize();
const tmp = new THREE.Vector3();
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- life: blinks ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
/** eyelid 0 open .. 1 shut: a 4-frame blink every 0.5-2.3 s, plus one across every expression swap */
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- the cast: ONE character system for the whole series (toon.ts), one outfit colour each ----------------
const ADULT = 1.7 / (777 * SU), KIDS = 0.9;
const KIDO: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid", buttons: "#ffe9b8" };
const FOUNDER: Outfit = { jacket: "#3a6fc0", pants: "#4a3f38", boots: "#4a3426", hat: "cap", cap: "#7a5230", buttons: "#f1e3b5" };
const PAGE: Outfit = { jacket: "#3f9458", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#2f5f6a", buttons: "#e8f0d8", moustache: "#5a4a3c", skin: "#f5c9a0" };
const KEEPER: Outfit = { jacket: "#21a08f", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#1d3557", buttons: "#f4f1ea", skin: "#ecd0b6" };
const CUSTOMER: Outfit = { jacket: "#8b5fd0", pants: "#3b3f52", boots: "#5a3b2a", hat: "cap", cap: "#f2c230", buttons: "#f4e9ff", skin: "#c99067" };
const JUDGE: Outfit = { jacket: "#3a3446", pants: "#2e2a36", boots: "#1d1b22", hat: "hair", hair: "#f1ece0", buttons: "#e8c45a", sash: "#b0222e", build: "stout", moustache: "#cfc8ba" };

export type Stage = { places: Place[]; fx: FxPlace[] };
type Act = { expr: Expr; look?: number; facing?: -1 | 0 | 1; wave?: number; prop?: FrontOpts["prop"]; headTilt?: number; tilt?: number; hop?: number };
import type { Expr } from "./toon";
import { S, SNAP, STRIKES, hammerK, OX, SHOTS, sm, RAIN } from "./story";

const CONTACT = "#8c8fb4";
/** one character, front view, feet at (x, y, z) set-local; `swaps` = times where the expression changes (blink hides it) */
const put = (out: Stage, cam: CamInfo, ox: number, i: number, o: Outfit, okey: string, x: number, y: number, z: number, t: number, a: Act, swaps: number[], scale = ADULT, mirror = false) => {
  const d = cam.pos.distanceTo(tmp.set(x + ox, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const light = light2D(cam, mirror), seed = ((i * 5 + 3) % 7) + 1;
  const fo: FrontOpts = { mode: "stand", expr: a.expr, look: a.look ?? 0, facing: a.facing ?? 0, wave: a.wave === undefined ? undefined : q(a.wave, 30), prop: a.prop ?? null,
    headTilt: a.headTilt ?? 0, tilt: a.tilt ?? 0, blink: a.expr === "laugh" || a.expr === "grin" ? 0 : lidAt(t, i, swaps), light, seed };
  out.places.push({ key: `F|${okey}|${fkey(fo)}`, x: x + ox, y: y + (a.hop ?? 0), z, scale, mirror, size: [w, h, k], draw: (p) => bodyFront(p, o, fo) });
  out.fx.push({ key: `blob|contact|${CONTACT}`, cw: 128, ch: 128, draw: (p) => fxContact(p, CONTACT), x: x + ox, y: y + 0.012, z: z + 0.02, w: 0.62 * scale, h: 0.42 * scale, flat: true });
};
/** switch helper: value of the last cue whose time has passed (cues land 2 frames before their word / action) */
const at = <T,>(t: number, first: T, ...cues: [number, T][]) => { let v = first; for (const [tc, x] of cues) if (t >= tc - LEAD) v = x; return v; };
const cheer = (t: number, t0: number, dur = 1.6) => (t >= t0 - LEAD && t < t0 + dur ? Math.sin((t - t0) * 11) : undefined);
const hopAt = (t: number, t0: number) => { const u = (t - t0) / 0.42; return u > 0 && u < 1 ? 0.07 * 4 * u * (1 - u) : 0; };

/** everyone with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo, sun: THREE.Vector3): Stage => {
  const out: Stage = { places: [], fx: [] }, ox = OX[SHOTS[id - 1].set];
  SUN.copy(sun);
  switch (id) {
    case 1: { // the kid watches the brick come down, jumps at the click, then wonders about the cheaper look-alike
      const e = at<Expr>(t, "smile", [1.4, "whistle"], [SNAP.hook, "shock"], [3.15, "grin"], [4.1, "nervous"]);
      put(out, cam, ox, 1, KIDO, "kid", 0.12, 0, -0.45, t, { expr: e, look: t > 4.1 ? -1 : 0, facing: t > 4.1 ? -1 : 0, wave: cheer(t, 3.15, 0.9), hop: hopAt(t, SNAP.hook), headTilt: t > 4.1 ? -5 : 0 },
        [1.4, SNAP.hook, 3.15, 4.1], KIDS);
      break;
    }
    case 2: { // the founder at his bench, two soft taps on the wooden duck
      const k = hammerK(t, [8.4, 9.1, 11.2]);
      put(out, cam, ox, 2, FOUNDER, "ole", 0.45, 0, 0.0, t, { expr: at<Expr>(t, "smile", [9.4, "smile_closed"], [11.4, "smile"]), facing: 1, prop: ["hammer", q(k, 30)] }, [9.4, 11.4], ADULT, true);
      break;
    }
    case 3:
      put(out, cam, ox, 2, FOUNDER, "ole", 0.45, 0, 0.0, t, { expr: at<Expr>(t, "smile", [14.2, "grin"]), facing: 1, wave: cheer(t, 14.8, 1.0) }, [14.2], ADULT, true);
      break;
    case 4: // the press closes, opens, and the first plastic brick slides out
      put(out, cam, ox, 2, FOUNDER, "ole", 0.45, 0, 0.0, t, { expr: at<Expr>(t, "neutral", [16.6, "nervous"], [17.9, "shock"], [18.7, "grin"]), facing: 1, look: 1, wave: cheer(t, 18.7, 1.0) }, [16.6, 17.9, 18.7]);
      break;
    case 5: // Hilary Page shows his self-locking brick; the founder studies it
      put(out, cam, ox, 3, PAGE, "page", -1.9, 0, 0.0, t, { expr: at<Expr>(t, "smile", [21.6, "grin"], [23.6, "smile_closed"]), facing: 1, look: 1 }, [21.6, 23.6]);
      put(out, cam, ox, 2, FOUNDER, "ole", 0.15, 0, 0.0, t, { expr: at<Expr>(t, "neutral", [21.0, "whistle"], [22.6, "smile"]), facing: -1, look: -1, headTilt: t > 21 && t < 22.6 ? -6 : 0 }, [21.0, 22.6]);
      break;
    case 6: // the founder follows the demonstration: anticipation, click, surprise when it comes apart again
      put(out, cam, ox, 2, FOUNDER, "ole", 0.2, 0, 0.0, t, { expr: at<Expr>(t, "smile", [29.3, "whistle"], [SNAP.lockIn, "grin"], [32.5, "nervous"], [SNAP.lockOut, "shock"], [33.8, "smile_closed"]),
        facing: -1, look: -1, wave: cheer(t, SNAP.lockIn, 1.1), hop: hopAt(t, SNAP.lockIn) }, [29.3, SNAP.lockIn, 32.5, SNAP.lockOut, 33.8]);
      break;
    case 7: // the shopkeeper sees the patent expire
      put(out, cam, ox, 4, KEEPER, "keep", 0.66, 0, 0.0, t, { expr: at<Expr>(t, "neutral", [S.s7 + 0.9, "shock"], [38.4, "nervous"], [42.5, "smile"]), facing: -1, look: -1 }, [S.s7 + 0.9, 38.4, 42.5]);
      break;
    case 8: { // compatible bricks rain onto the table
      const last = RAIN[RAIN.length - 1].t;
      put(out, cam, ox, 4, KEEPER, "keep", 0.66, 0, 0.0, t, { expr: at<Expr>(t, "shock", [47.6, "grin"], [last, "laugh"]), facing: -1, look: -1, wave: cheer(t, last, 0.8) }, [47.6]);
      break;
    }
    case 9: { // the judge rules: three gavel strikes
      const k = hammerK(t, STRIKES);
      put(out, cam, ox, 5, JUDGE, "judge", -0.05, 0.62, -1.0, t, { expr: at<Expr>(t, "stern", [S.s9 + 6.5, "neutral"], [S.s9 + 11, "smile"]), prop: ["hammer", q(k, 30)], look: t > S.s9 + 6.5 ? -1 : 0 }, [S.s9 + 6.5, S.s9 + 11]);
      break;
    }
    case 10: { // customer at the counter: worried by the total, relieved by the price per piece
      const t0 = S.s10, tg = t0 + 7.4;
      put(out, cam, ox, 6, CUSTOMER, "cust", 3.62, 0, 0.05, t, { expr: at<Expr>(t, "neutral", [t0 + 3.4, "nervous"], [t0 + 5.6, "whistle"], [tg + 3.6, "grin"], [tg + 5.2, "smile_closed"]), facing: 1, look: 1,
        wave: cheer(t, tg + 3.6, 1.2), hop: hopAt(t, tg + 3.6), headTilt: t > t0 + 3.4 && t < t0 + 5.6 ? 5 : 0 }, [t0 + 3.4, t0 + 5.6, tg + 3.6, tg + 5.2]);
      put(out, cam, ox, 4, KEEPER, "keep", 5.2, 0, -0.8, t, { expr: at<Expr>(t, "smile", [tg + 3.6, "grin"]), facing: -1, look: -1 }, [tg + 3.6]);
      break;
    }
    case 11: { // the kid again: the last click
      put(out, cam, ox, 1, KIDO, "kid", 0.12, 0, -0.45, t, { expr: at<Expr>(t, "smile", [83.0, "whistle"], [SNAP.final, "laugh"]), look: t < 83 ? -1 : 0, wave: cheer(t, SNAP.final, 2.2), hop: hopAt(t, SNAP.final) },
        [83.0, SNAP.final], KIDS);
      break;
    }
  }
  return out;
};
export { sm };
