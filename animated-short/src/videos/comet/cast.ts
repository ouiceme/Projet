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
const ADULT = 1.7 / (777 * SU);
const MECH: Outfit = { jacket: "#f08a2c", pants: "#4a5a3a", boots: "#3a2a20", hat: "cap", cap: "#5d7a3a", buttons: "#ffe9b8" };
const CAPT: Outfit = { jacket: "#27407a", pants: "#27304a", boots: "#2e2a36", hat: "cap", cap: "#1d2a55", buttons: "#ffd166", moustache: "#5a4a3c", skin: "#f5c9a0", sash: "#ffd166" };
const HOST: Outfit = { jacket: "#4f9bdc", pants: "#27407a", boots: "#2e2a36", hat: "cap", cap: "#27407a", buttons: "#fdf6ec", skin: "#ecd0b6" };
const GENT: Outfit = { jacket: "#8a6a4a", pants: "#4a3f38", boots: "#3a2a20", hat: "hair", hair: "#6a5a4c", buttons: "#f1e3b5", moustache: "#6a5a4c", skin: "#f5c9a0", build: "stout" };
const LADY: Outfit = { jacket: "#c25a7a", pants: "#7a3350", boots: "#4a3426", hat: "hair", hair: "#8a4a2a", buttons: "#ffe3ec" };
const ENG_A: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#2e2a36", hat: "hair", hair: "#3a2a22", buttons: "#59626e", skin: "#f5c9a0" };
const ENG_B: Outfit = { jacket: "#3f9458", pants: "#4a3f38", boots: "#3a2a20", hat: "cap", cap: "#6b5a3a", buttons: "#e8f0d8", moustache: "#b98a55", skin: "#ecd0b6", build: "stout" };
const PAX: Outfit = { jacket: "#21a08f", pants: "#3b4a6a", boots: "#f4f1ea", hat: "hair", hair: "#2e2a36", buttons: "#f4f1ea", skin: "#c99067" };
const NEIGH: Outfit = { jacket: "#8b5fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#b98a55", buttons: "#f4e9ff" };

export type Stage = { places: Place[]; fx: FxPlace[] };
type Act = { expr: Expr; look?: number; facing?: -1 | 0 | 1; wave?: number; prop?: FrontOpts["prop"]; headTilt?: number; tilt?: number; hop?: number };
import type { Expr } from "./toon";
import { CUE, OX, SHOTS, sm } from "./story";

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
/** arm raised to point at something (held), from t0 to t1 */
const point = (t: number, t0: number, t1: number, k = 0.5) => (t >= t0 - LEAD && t < t1 ? k + 0.12 * Math.sin((t - t0) * 2.2) : undefined);

const SIT = -0.45; // a seated passenger is the standing card lowered by 0.45 m (the seat hides the legs)
/** everyone with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo, sun: THREE.Vector3): Stage => {
  const out: Stage = { places: [], fx: [] }, ox = OX[SHOTS[id - 1].set];
  SUN.copy(sun);
  switch (id) {
    case 1: // today: a passenger wonders about the window
      put(out, cam, ox, 8, PAX, "pax", 0, SIT, -0.62, t, { expr: at<Expr>(t, "neutral", [0.56, "whistle"], [1.6, "nervous"]), facing: 1, look: 1, headTilt: t > 1.6 ? 7 : 0 }, [0.56, 1.6]);
      put(out, cam, ox, 9, NEIGH, "nei", -1.0, SIT, -0.62, t, { expr: "smile_closed", facing: 1, headTilt: -6 }, []);
      break;
    case 2: // 1952: passengers and the hostess on the apron, the Comet behind them
      put(out, cam, ox, 4, GENT, "gent", 5.2, 0, 31.2, t, { expr: at<Expr>(t, "smile", [5.5, "whistle"], [6.9, "grin"]), look: -1, facing: -1 }, [5.5, 6.9]);
      put(out, cam, ox, 5, LADY, "lady", 6.7, 0, 31.6, t, { expr: at<Expr>(t, "smile", [5.5, "grin"]), look: -1, wave: cheer(t, CUE.jet, 1.4), hop: hopAt(t, CUE.jet) }, [5.5]);
      put(out, cam, ox, 3, HOST, "host", 8.5, 0, 31.0, t, { expr: at<Expr>(t, "smile", [4.24, "smile_closed"], [5.4, "smile"]), look: -1, facing: -1, wave: point(t, 4.1, 7.6, 0.55) }, [4.24, 5.4]);
      break;
    case 3: // in flight: higher and faster than the propeller airliners
      put(out, cam, ox, 5, LADY, "lady", 0, SIT, -0.62, t, { expr: at<Expr>(t, "smile", [8.95, "whistle"], [9.9, "grin"]), facing: 1, look: 1 }, [8.95, 9.9]);
      put(out, cam, ox, 4, GENT, "gent", 1.0, SIT, -0.62, t, { expr: at<Expr>(t, "smile_closed", [9.31, "smile"]), facing: 1, look: 1 }, [9.31]);
      put(out, cam, ox, 3, HOST, "host", -0.75, 0, 0.0, t, { expr: "smile", facing: 1, look: 1, wave: point(t, 8.6, 9.6, 0.5) }, []);
      break;
    case 4: // 1954: the news of the two accidents. Quiet, heads low; nothing of the accidents is shown
      put(out, cam, ox, 2, CAPT, "capt", 3.2, 0, -4.4, t, { expr: at<Expr>(t, "neutral", [CUE.y1954, "stern"], [CUE.two, "nervous"], [CUE.none, "pained"]), look: 1, facing: 1, headTilt: t > CUE.none ? 8 : 0 }, [CUE.y1954, CUE.two, CUE.none]);
      put(out, cam, ox, 3, HOST, "host", 4.35, 0, -4.0, t, { expr: at<Expr>(t, "neutral", [CUE.two, "shock"], [15.2, "nervous"], [CUE.none, "pained"]), headTilt: t > CUE.none ? -8 : 0 }, [CUE.two, 15.2, CUE.none]);
      put(out, cam, ox, 1, MECH, "mech", 5.5, 0, -4.6, t, { expr: at<Expr>(t, "neutral", [CUE.two, "nervous"], [CUE.none, "pained"]), look: -1, facing: -1, headTilt: t > CUE.none ? 6 : 0 }, [CUE.two, CUE.none]);
      break;
    case 5: // the fleet is grounded
      put(out, cam, ox, 1, MECH, "mech", -5.3, 0, 19.6, t, { expr: at<Expr>(t, "nervous", [CUE.ground, "stern"]), look: 1, facing: 1 }, [CUE.ground]);
      put(out, cam, ox, 2, CAPT, "capt", -3.5, 0, 19.2, t, { expr: at<Expr>(t, "pained", [CUE.ground, "nervous"]), look: -1, facing: -1, headTilt: 6 }, [CUE.ground]);
      break;
    case 6: // Farnborough: the engineers on the gantry above the tank
      put(out, cam, ox, 6, ENG_A, "ea", 9.0, 2.9, 5.0, t, { expr: at<Expr>(t, "neutral", [CUE.plunge, "whistle"], [23.3, "smile"]), look: -1, facing: -1, wave: point(t, 21.4, 24.6, 0.5) }, [CUE.plunge, 23.3]);
      put(out, cam, ox, 7, ENG_B, "eb", 10.5, 2.9, 5.2, t, { expr: at<Expr>(t, "stern", [23.3, "neutral"]), look: -1, facing: -1 }, [23.3]);
      break;
    case 7: { // pressure up, pressure down, again and again
      const up = [0, 2, 4].some((i) => t >= CUE.pump[i] && t < CUE.pump[i + 1]);
      put(out, cam, ox, 6, ENG_A, "ea", 9.0, 2.9, 5.0, t, { expr: up ? "whistle" : "neutral", look: -1, facing: -1, wave: up ? 0.55 : undefined }, CUE.pump);
      put(out, cam, ox, 7, ENG_B, "eb", 10.5, 2.9, 5.2, t, { expr: at<Expr>(t, "neutral", [26.54, "stern"], [27.61, "nervous"]), look: -1, facing: -1, headTilt: t > 27.61 ? 5 : 0 }, [26.54, 27.61]);
      break;
    }
    case 8: // the metal gives way: a crack starts at the corner of an opening
      put(out, cam, ox, 6, ENG_A, "ea", 9.0, 2.9, 5.0, t, { expr: at<Expr>(t, "nervous", [CUE.crack, "shock"], [32.6, "nervous"], [CUE.fatigue, "stern"]), look: -1, facing: -1, hop: hopAt(t, CUE.crack), wave: point(t, 31.0, 33.2, 0.6) }, [CUE.crack, 32.6, CUE.fatigue]);
      put(out, cam, ox, 7, ENG_B, "eb", 10.5, 2.9, 5.2, t, { expr: at<Expr>(t, "stern", [CUE.crack, "shock"], [33.0, "nervous"]), look: -1, facing: -1, hop: hopAt(t, CUE.crack + 0.1) }, [CUE.crack, 33.0]);
      break;
    case 9: // the explanation at the drawing board
      put(out, cam, ox, 6, ENG_A, "ea", 10.25, 0, 7.5, t, { expr: at<Expr>(t, "neutral", [CUE.balloon, "smile"], [CUE.corners, "stern"], [CUE.focus, "nervous"]), look: 1, facing: 1, wave: point(t, 36.0, 42.0, 0.6) }, [CUE.balloon, CUE.corners, CUE.focus]);
      put(out, cam, ox, 7, ENG_B, "eb", 11.5, 0, 7.7, t, { expr: at<Expr>(t, "neutral", [CUE.balloon, "whistle"], [CUE.corners, "nervous"], [CUE.focus, "shock"]), look: -1, facing: -1, headTilt: t > CUE.corners ? -5 : 0 }, [CUE.balloon, CUE.corners, CUE.focus]);
      break;
    case 10: // the honest footnote: the roof opening, not a passenger window
      put(out, cam, ox, 6, ENG_A, "ea", 10.25, 0, 7.5, t, { expr: at<Expr>(t, "stern", [CUE.roof, "neutral"], [CUE.notWin, "smile"]), look: t > CUE.notWin ? 1 : 0, wave: point(t, 45.0, 48.2, 0.62) }, [CUE.roof, CUE.notWin]);
      put(out, cam, ox, 7, ENG_B, "eb", 11.5, 0, 7.7, t, { expr: at<Expr>(t, "neutral", [CUE.wreck, "nervous"], [CUE.roof, "whistle"], [CUE.notWin, "smile"]), look: -1, facing: -1, headTilt: t > CUE.roof && t < CUE.notWin ? -6 : 0 }, [CUE.wreck, CUE.roof, CUE.notWin]);
      break;
    case 11: // the Comet's windows: nearly square, corners already slightly rounded
      put(out, cam, ox, 1, MECH, "mech", 3.6, 0, -8.3, t, { expr: at<Expr>(t, "neutral", [CUE.almost, "whistle"], [CUE.rounded, "smile"]), look: 1, facing: 1, wave: point(t, 50.7, 54.8, 0.62) }, [CUE.almost, CUE.rounded]);
      put(out, cam, ox, 2, CAPT, "capt", 5.3, 0, -8.6, t, { expr: at<Expr>(t, "stern", [CUE.almost, "neutral"], [CUE.rounded, "smile_closed"]), look: -1, facing: -1 }, [CUE.almost, CUE.rounded]);
      break;
    case 12: // the lesson stayed
      put(out, cam, ox, 8, PAX, "pax", 0, SIT, -0.62, t, { expr: at<Expr>(t, "neutral", [CUE.round, "whistle"], [CUE.spread, "smile"], [CUE.conc, "nervous"]), facing: 1, look: 1 }, [CUE.round, CUE.spread, CUE.conc]);
      put(out, cam, ox, 9, NEIGH, "nei", -1.0, SIT, -0.62, t, { expr: "smile_closed", facing: 1, headTilt: -6 }, []);
      break;
    case 13: // today: your window has rounded corners
      put(out, cam, ox, 8, PAX, "pax", 0, SIT, -0.62, t, { expr: at<Expr>(t, "smile", [CUE.today, "grin"], [CUE.allRound, "smile"]), facing: t > 64.3 ? 0 : 1, look: t > 64.3 ? 0 : 1, wave: cheer(t, CUE.allRound, 1.3) }, [CUE.today]);
      put(out, cam, ox, 9, NEIGH, "nei", -1.0, SIT, -0.62, t, { expr: at<Expr>(t, "smile_closed", [CUE.allRound, "smile"]), facing: 1, headTilt: t > CUE.allRound ? 0 : -6 }, [CUE.allRound]);
      break;
  }
  return out;
};
export { sm };
