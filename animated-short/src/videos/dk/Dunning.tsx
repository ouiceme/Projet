/**
 * "Le Mont Stupide" — L'effet Dunning-Kruger (FRENCH, CALM cut)
 * 2D cartoon characters in a 3D painted world. Remotion + three.js.
 * 1080x1920 @ 30 fps, 83.928 s (2518 frames). Voice: voice_dk_fr_calm.wav.
 *
 * Act 1 (0-20.5s): the lemon-juice bank robber cold open, inside a bank interior.
 *   Medium framing only — no extreme close-ups on the 2D figures.
 * Act 2 (20.5-83.9s): the Dunning-Kruger curve as a 3D landscape — Mont Stupide
 *   -> Vallée du Désespoir -> Pente de l'Illumination.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---- timing helpers ----------------
const FPS = 30;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = cl(x); return u * u * (3 - 2 * u); };
const eo = (u: number) => 1 - (1 - cl(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
const lerpC = (a: number[], b: number[], t: number) =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const toHex = (c: number[]) => {
  const h = (v: number) => Math.round(cl(v) * 255).toString(16).padStart(2, "0");
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
};

// ---- the Dunning-Kruger curve, as terrain height y(x) ----------------
// X = knowledge/experience (left -> right). Y = confidence.
// Tall sharp peak near the left (Mount Stupid), plunge to a ravine
// (Valley of Despair), long gentle rise to the right (Slope of Enlightenment).
const PEAK_X = -25;
const VALLEY_X = -8;
const curveY = (x: number) => {
  const peak = 17 * Math.exp(-Math.pow((x - PEAK_X) / 6, 2));
  const slope = 9 / (1 + Math.exp(-(x - 5) / 9));
  return 1.2 + peak + slope;
};

// ---- act timing anchors (s) — FRENCH calm cut ----------------
const ACT2_TAU = 20.5;   // "Cet homme a inspiré…" — transition to the curve
const FLASH_TAU = 20.5;
const REVEAL_TAU = 14.5; // "Ce ne fut pas le cas" — CCTV reveal

// ---- mood / lighting by story time ----------------
type Mood = {
  skyTop: string; skyHoriz: string;
  amb: number; dirColor: string; dirInt: number;
  sun: [number, number, number];
};
const moodAt = (tau: number): Mood => {
  const wGolden = sm((tau - 63) / 3.2);
  let wValley = sm((tau - 52) / 1.6) - sm((tau - 62) / 1.7);
  wValley = cl(wValley) * (1 - wGolden);
  const wDay = Math.max(0, 1 - wValley - wGolden);
  const dayTop = [0.47, 0.72, 0.91], dayHor = [0.81, 0.92, 1.0];
  const valTop = [0.14, 0.16, 0.26], valHor = [0.22, 0.25, 0.36];
  const golTop = [1.0, 0.64, 0.34], golHor = [1.0, 0.86, 0.62];
  const mix = (d: number[], v: number[], g: number[]) => [
    d[0] * wDay + v[0] * wValley + g[0] * wGolden,
    d[1] * wDay + v[1] * wValley + g[1] * wGolden,
    d[2] * wDay + v[2] * wValley + g[2] * wGolden,
  ];
  const dirCol = mix([1, 0.96, 0.88], [0.45, 0.5, 0.66], [1, 0.78, 0.46]);
  return {
    skyTop: toHex(mix(dayTop, valTop, golTop)),
    skyHoriz: toHex(mix(dayHor, valHor, golHor)),
    amb: 0.55 * wDay + 0.24 * wValley + 0.5 * wGolden,
    dirColor: toHex(dirCol),
    dirInt: 1.15 * wDay + 0.4 * wValley + 1.25 * wGolden,
    sun: [-2 * wDay + 0 * wValley + 9 * wGolden, 12 * wDay + 9 * wValley + 3 * wGolden, 7],
  };
};

// ---- character state along the journey ----------------
type Char = { visible: boolean; x: number; y: number; mood: string; rot: number; scale: number };
const charState = (tau: number): Char => {
  const on = (x: number) => curveY(x) + 1.0;
  if (tau < 38) return { visible: false, x: 0, y: 0, mood: "confident", rot: 0, scale: 1 };
  if (tau < 48.904) { const x = PEAK_X; return { visible: true, x, y: on(x), mood: "confident", rot: 0, scale: 1 }; }
  if (tau < 53.380) {
    // the ground vanishes — steps off the peak and falls into the ravine
    const u = cl((tau - 49.2) / 3.9);
    const x = PEAK_X + u * (VALLEY_X - PEAK_X);
    const peakY = on(PEAK_X), valY = on(VALLEY_X);
    const yFall = peakY - (peakY - valY) * eo(u);
    return { visible: true, x, y: Math.max(valY, yFall), mood: "shocked", rot: -u * Math.PI * 1.5, scale: 1 };
  }
  if (tau < 63.464) { const x = VALLEY_X; return { visible: true, x, y: on(x), mood: "sad", rot: 0, scale: 1 }; }
  if (tau < 68.5) {
    const u = cl((tau - 63.464) / 5.0);
    const x = VALLEY_X + u * 32;
    return { visible: true, x, y: on(x), mood: "trudge", rot: 0, scale: 1 };
  }
  const x = 26; return { visible: true, x, y: on(x), mood: "trudge", rot: 0, scale: 1 };
};

// ---- shot / camera ----------------
type V3 = [number, number, number];
type Cam = { pos: V3; look: V3; fov: number };
const camForShot = (tau: number): Cam => {
  // ======= ACT 1: bank robber (0-20.5) — medium framing, never a face CU =======
  if (tau < 5.0) {
    // establishing: robber at the teller counter, bank interior with depth
    const t = cl(tau / 5.0);
    return { pos: [-2.0 + t * 1.4, 3.4 - t * 0.2, -11.5 + t * 2.3], look: [0, 2.7, 4], fov: 46 };
  } else if (tau < 7.845) {
    // he smears lemon juice on his face — medium, whole figure in frame
    const t = cl((tau - 5.0) / 2.845);
    return { pos: [0.6, 3.2 - t * 0.1, -8.6 + t * 0.3], look: [0.1, 2.9, 4], fov: 42 };
  } else if (tau < REVEAL_TAU) {
    // smug & certain — slow drift, still medium
    const t = cl((tau - 7.845) / 6.6);
    return { pos: [1.3 - t * 0.6, 3.0, -8.4 + t * 0.3], look: [-0.3, 2.8, 4], fov: 42 };
  } else if (tau < 16.285) {
    // CCTV reveal — frame the monitor
    return { pos: [0, 4.0, -5.8], look: [0, 4.0, 4], fov: 42 };
  } else if (tau < ACT2_TAU) {
    // footage hold, slow push
    const t = cl((tau - 16.285) / 4.2);
    return { pos: [0, 4.0, -5.8 + t * 0.6], look: [0, 4.0, 4], fov: 42 - t * 1.5 };
  }
  // ======= ACT 2: the curve landscape (20.5-83.9) — slow, calm moves =======
  const ch = charState(tau);
  if (tau < 25.559) {
    // wide reveal of the whole curve (transition)
    const t = cl((tau - ACT2_TAU) / 5.0);
    return { pos: [-8, 17 - t * 0.6, 74 - t * 4], look: [-10, 8, 8], fov: 54 };
  } else if (tau < 33.0) {
    // slow drift toward Mont Stupide (researchers + the question)
    const t = cl((tau - 25.559) / 7.44);
    return { pos: [-8 - t * 15, 16.4 - t * 3.9, 70 - t * 21], look: [-10 - t * 15, 8 + t * 3, 9], fov: 54 - t * 7 };
  } else if (tau < 38.0) {
    // establishing Mont Stupide (tested on logic/grammar/humour)
    const t = cl((tau - 33.0) / 5.0);
    return { pos: [-23, 12.6 - t * 0.2, 50 - t * 1], look: [-25, 11, 10], fov: 47 };
  } else if (tau < 44.785) {
    // the overconfident crowd on Mont Stupide
    const t = cl((tau - 38.0) / 6.785);
    return { pos: [-23, 12.4, 49 - t * 1], look: [-25, 11, 10], fov: 47 };
  } else if (tau < 48.904) {
    // hero atop the huge peak, tiny and proud
    const t = cl((tau - 44.785) / 4.119);
    return { pos: [-19 + t * 0.5, 12.5, 53 - t * 2], look: [-24, 14.5 + t, 10], fov: 46 };
  } else if (tau < 53.380) {
    // follow the fall down into the ravine
    return { pos: [ch.x + 5, ch.y + 6, 41], look: [ch.x, ch.y, 11], fov: 44 };
  } else if (tau < 63.464) {
    // valley of despair — dark, small at the bottom (+ cruel joke) — long hold
    const t = cl((tau - 53.380) / 10.0);
    return { pos: [-6, 7 - t * 0.5, 35 - t * 1.5], look: [-8, 3.2, 11], fov: 46 };
  } else if (tau < 68.5) {
    // trudge up the slope of enlightenment
    return { pos: [ch.x + 3, ch.y + 6, 41], look: [ch.x - 1, ch.y + 1, 11], fov: 44 };
  } else if (tau < 72.940) {
    // near the top — hero and the quiet experts, hopeful sunrise
    return { pos: [25, 12.5, 43], look: [28, 9.3, 11], fov: 44 };
  } else if (tau < 79.178) {
    // reflective pull-back — you've left Mont Stupide
    const t = cl((tau - 72.940) / 6.238);
    return { pos: [25 - t * 2, 12.5 + t * 2, 43 + t * 9], look: [25, 9 + t, 10], fov: 44 + t * 4 };
  } else {
    // callback — the lemon
    const t = cl((tau - 79.178) / 2.5);
    return { pos: [26, 11 - t * 0.3, 31 - t * 2], look: [26, 8.3, 11], fov: 40 };
  }
};

// ---- sky ----------------
const Sky: React.FC<{ top: string; horiz: string }> = ({ top, horiz }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(520, 340, 1, 10);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const sky = new THREE.Color(top);
    const hor = new THREE.Color(horiz);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + 170) / 340; // 0 bottom -> 1 top
      const c = hor.clone().lerp(sky, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [top, horiz]);
  return (
    <mesh position={[0, 55, -95]}>
      <primitive object={geo} />
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} fog={false} />
    </mesh>
  );
};

// ======================= ACT 1: bank scene =======================

const drawRobber = (g: CanvasRenderingContext2D, W: number, H: number) => {
  // tall cartoon robber, bare face (no mask), shiny with lemon juice, smug.
  g.clearRect(0, 0, W, H);
  const cx = W / 2;
  // legs
  g.fillStyle = "#2c2c38";
  g.fillRect(cx - 26, H * 0.72, 22, H * 0.24);
  g.fillRect(cx + 4, H * 0.72, 22, H * 0.24);
  g.fillStyle = "#17171d";
  g.fillRect(cx - 30, H * 0.94, 30, 18);
  g.fillRect(cx + 0, H * 0.94, 30, 18);
  // striped burglar shirt (the cliche) — dark/white hoops
  const bodyTop = H * 0.4, bodyH = H * 0.33, bodyW = 96;
  g.fillStyle = "#3a3f4a";
  g.beginPath(); g.roundRect(cx - bodyW / 2, bodyTop, bodyW, bodyH, 12); g.fill();
  g.save();
  g.beginPath(); g.roundRect(cx - bodyW / 2, bodyTop, bodyW, bodyH, 12); g.clip();
  g.fillStyle = "#cfd6e0";
  for (let i = 0; i < 7; i++) g.fillRect(cx - bodyW / 2, bodyTop + 6 + i * 20, bodyW, 9);
  g.restore();
  // arm raised, finger pointing up at the camera (smug "they'll never see me")
  g.strokeStyle = "#3a3f4a"; g.lineWidth = 20; g.lineCap = "round";
  g.beginPath(); g.moveTo(cx + 34, bodyTop + 24); g.lineTo(cx + 70, bodyTop - 34); g.stroke();
  g.fillStyle = "#f6cda0";
  g.beginPath(); g.arc(cx + 74, bodyTop - 42, 10, 0, Math.PI * 2); g.fill();
  // other arm holding a money bag
  g.strokeStyle = "#3a3f4a"; g.lineWidth = 20;
  g.beginPath(); g.moveTo(cx - 34, bodyTop + 24); g.lineTo(cx - 60, bodyTop + 70); g.stroke();
  g.fillStyle = "#d8c88a";
  g.beginPath(); g.ellipse(cx - 70, bodyTop + 96, 26, 30, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#7a6a30"; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#4a3f18"; g.font = "bold 30px Georgia"; g.textAlign = "center";
  g.fillText("$", cx - 70, bodyTop + 108);
  g.strokeStyle = "#8a7a40"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(cx - 84, bodyTop + 72); g.lineTo(cx - 56, bodyTop + 72); g.stroke();
  // HEAD
  const hx = cx, hy = H * 0.25, hr = 62;
  g.fillStyle = "#f6cda0";
  g.beginPath(); g.ellipse(hx, hy, hr * 0.82, hr, 0, 0, Math.PI * 2); g.fill();
  // ears
  g.beginPath(); g.arc(hx - hr * 0.78, hy, 11, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(hx + hr * 0.78, hy, 11, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = "#3a2a1a";
  g.beginPath(); g.ellipse(hx, hy - hr * 0.72, hr * 0.78, hr * 0.42, 0, Math.PI, 0); g.fill();
  // smug eyes (half-lidded) + raised brow
  g.strokeStyle = "#2a1a0d"; g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(hx - 34, hy - 22); g.lineTo(hx - 10, hy - 28); g.stroke(); // brow up
  g.beginPath(); g.moveTo(hx + 12, hy - 20); g.lineTo(hx + 34, hy - 18); g.stroke();
  g.fillStyle = "#2a1a0d";
  g.beginPath(); g.arc(hx - 22, hy - 6, 6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(hx + 22, hy - 6, 6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#2a1a0d"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(hx - 34, hy - 8); g.lineTo(hx - 12, hy - 10); g.stroke(); // lid
  g.beginPath(); g.moveTo(hx + 12, hy - 10); g.lineTo(hx + 34, hy - 8); g.stroke();
  // smug smirk
  g.strokeStyle = "#8a3a2a"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(hx - 24, hy + 30); g.quadraticCurveTo(hx + 4, hy + 42, hx + 30, hy + 24); g.stroke();
  // stubble
  g.fillStyle = "rgba(40,30,20,0.28)";
  g.beginPath(); g.ellipse(hx, hy + 30, hr * 0.62, hr * 0.42, 0, 0, Math.PI); g.fill();
  // LEMON-JUICE SHEEN — glossy highlights + droplets
  g.fillStyle = "rgba(255,245,150,0.55)";
  g.beginPath(); g.ellipse(hx - 24, hy + 6, 14, 22, -0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(hx + 28, hy + 2, 11, 18, 0.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath(); g.arc(hx - 28, hy - 2, 5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(hx + 24, hy + 8, 4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(hx - 6, hy + 40, 4, 0, Math.PI * 2); g.fill();
  // ink outline on head
  g.strokeStyle = "#2a1a0d"; g.lineWidth = 5;
  g.beginPath(); g.ellipse(hx, hy, hr * 0.82, hr, 0, 0, Math.PI * 2); g.stroke();
};

const RobberCard: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    // high-res so medium shots stay crisp (no upscaling blur)
    c.width = 512; c.height = 1024;
    drawRobber(c.getContext("2d")!, 512, 1024);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  return (
    <group>
      {/* soft contact shadow on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2.1]}>
        <planeGeometry args={[2.6, 1.3]} />
        <meshBasicMaterial color="#000" transparent opacity={0.16} />
      </mesh>
      <mesh position={[0, 2.35, 2]}>
        <planeGeometry args={[2.4, 4.8]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const BankScene: React.FC<{ tau: number }> = ({ tau }) => (
  <group>
    {/* marble floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[70, 60]} />
      <meshLambertMaterial color="#cdbf9f" />
    </mesh>
    {/* back wall */}
    <mesh position={[0, 9, 12]}>
      <boxGeometry args={[52, 22, 1]} />
      <meshLambertMaterial color="#e7d8b4" />
    </mesh>
    {/* wall wainscot band */}
    <mesh position={[0, 2.2, 11.45]}>
      <boxGeometry args={[52, 4.4, 0.2]} />
      <meshLambertMaterial color="#b89a6e" />
    </mesh>
    {/* flanking columns */}
    {[-11.5, 11.5].map((x, i) => (
      <group key={i} position={[x, 0, 9]}>
        <mesh position={[0, 7, 0]}><cylinderGeometry args={[0.9, 1.0, 14, 20]} /><meshLambertMaterial color="#efe8d6" /></mesh>
        <mesh position={[0, 14.1, 0]}><boxGeometry args={[2.4, 0.6, 2.4]} /><meshLambertMaterial color="#e2d8c2" /></mesh>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[2.4, 0.8, 2.4]} /><meshLambertMaterial color="#e2d8c2" /></mesh>
      </group>
    ))}
    {/* teller counter */}
    <group position={[0, 0, 6]}>
      <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[28, 3, 2.2]} /><meshLambertMaterial color="#8a5a30" /></mesh>
      <mesh position={[0, 3.15, 0.15]}><boxGeometry args={[28.6, 0.3, 2.7]} /><meshLambertMaterial color="#4a3119" /></mesh>
      {/* teller window grille */}
      {[-9, -3, 3, 9].map((x, i) => (
        <mesh key={i} position={[x, 4.4, 0]}><boxGeometry args={[0.16, 2.6, 0.16]} /><meshLambertMaterial color="#8a6a40" /></mesh>
      ))}
      <mesh position={[0, 5.7, 0]}><boxGeometry args={[18.2, 0.16, 0.16]} /><meshLambertMaterial color="#8a6a40" /></mesh>
    </group>
    {/* BANQUE sign + wall clock */}
    <BankSign />
    <group position={[10, 14, 11.4]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.15, 1.15, 0.18, 28]} /><meshLambertMaterial color="#f4efe2" /></mesh>
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.22, 1.22, 0.12, 28]} /><meshLambertMaterial color="#3f2a16" /></mesh>
      <mesh position={[0, 0.35, 0.16]}><boxGeometry args={[0.08, 0.7, 0.05]} /><meshBasicMaterial color="#2a1a0d" /></mesh>
      <mesh position={[0.28, -0.1, 0.16]} rotation={[0, 0, -1.0]}><boxGeometry args={[0.07, 0.55, 0.05]} /><meshBasicMaterial color="#2a1a0d" /></mesh>
    </group>
    {/* security camera on the wall, pointing down at the robber */}
    <group position={[-10.5, 13.2, 11.2]} rotation={[0, 0, -0.5]}>
      <mesh><boxGeometry args={[0.9, 0.5, 0.6]} /><meshLambertMaterial color="#3a3a42" /></mesh>
      <mesh position={[-0.55, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 12]} /><meshLambertMaterial color="#17171c" />
      </mesh>
      <mesh position={[-0.55, -0.35, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color="#ff3b30" />
      </mesh>
    </group>
    {tau < REVEAL_TAU && <RobberCard />}
  </group>
);

const BankSign: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 768; c.height = 192;
    const g = c.getContext("2d")!;
    g.fillStyle = "#1f2a33"; g.fillRect(0, 0, 768, 192);
    g.fillStyle = "#f3d27a"; g.font = "bold 108px Georgia"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("★ BANQUE ★", 384, 100);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={[0, 8.6, 11.4]}>
      <planeGeometry args={[16, 4] } />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
};

const FootageCard: React.FC<{ tau: number }> = ({ tau }) => {
  const rec = Math.floor(tau * 2) % 2 === 0;
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 1024;
    const g = c.getContext("2d")!;
    g.scale(2, 2); // author in 512-space at 2x resolution
    // pre-mirror so the card reads correctly when viewed from the -z (camera) side
    g.translate(512, 0); g.scale(-1, 1);
    // monitor bezel
    g.fillStyle = "#101014"; g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#0a1a10"; g.fillRect(24, 24, 464, 464);
    // greenish CCTV frame
    g.fillStyle = "#13341f"; g.fillRect(28, 28, 456, 456);
    // robber clearly visible, centered (high-res sub-canvas)
    g.save(); g.translate(256 - 128, 78);
    const sub = document.createElement("canvas"); sub.width = 512; sub.height = 800;
    drawRobber(sub.getContext("2d")!, 512, 800);
    g.drawImage(sub, 0, 0, 256, 400); g.restore();
    // scanlines
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 28; y < 484; y += 4) g.fillRect(28, y, 456, 2);
    // crosshair box on face
    g.strokeStyle = "#7dff9e"; g.lineWidth = 3;
    g.strokeRect(188, 126, 132, 132);
    // labels
    g.fillStyle = "#cfe8d4"; g.font = "bold 24px monospace"; g.textAlign = "left";
    g.fillText("CAM 03   1995", 44, 62);
    g.textAlign = "right"; g.fillText("REC", 468, 62);
    g.textAlign = "center"; g.font = "bold 28px monospace";
    g.fillText("FILMÉ PAR LA CAMÉRA", 256, 464);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  if (tau < REVEAL_TAU - 0.1) return null;
  const appear = sm((tau - REVEAL_TAU) / 0.25);
  return (
    <group position={[0, 4.0, 3.2]} scale={appear}>
      <mesh><planeGeometry args={[6.2, 6.2]} /><meshBasicMaterial map={tex} side={THREE.DoubleSide} /></mesh>
      {rec && (
        <mesh position={[2.5, 2.35, 0.02]}><circleGeometry args={[0.16, 16]} /><meshBasicMaterial color="#ff2d20" /></mesh>
      )}
    </group>
  );
};

// ======================= ACT 2: curve landscape =======================

const DEPTH_F = 11; // front z
const DEPTH_B = -8; // back z
const Terrain: React.FC = () => {
  const { geo, line } = useMemo(() => {
    const Nx = 220, x0 = -48, x1 = 48;
    const nz = 5;
    const col = (y: number) => {
      const t = cl(y / 19);
      const lowC = [0.30, 0.55, 0.42], midC = [0.78, 0.70, 0.40], hiC = [0.93, 0.89, 0.70];
      return t < 0.5 ? lerpC(lowC, midC, t / 0.5) : lerpC(midC, hiC, (t - 0.5) / 0.5);
    };
    const positions: number[] = [], colors: number[] = [], idx: number[] = [];
    // top surface grid
    for (let i = 0; i <= Nx; i++) {
      const x = x0 + (x1 - x0) * (i / Nx);
      const y = curveY(x);
      const c = col(y);
      for (let j = 0; j < nz; j++) {
        const z = DEPTH_F + (DEPTH_B - DEPTH_F) * (j / (nz - 1));
        positions.push(x, y, z);
        const shade = 0.78 + 0.22 * (1 - j / (nz - 1));
        colors.push(c[0] * shade, c[1] * shade, c[2] * shade);
      }
    }
    for (let i = 0; i < Nx; i++)
      for (let j = 0; j < nz - 1; j++) {
        const a = i * nz + j, b = (i + 1) * nz + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    // front cliff face (z = DEPTH_F down to base)
    const base = -8, off = positions.length / 3;
    for (let i = 0; i <= Nx; i++) {
      const x = x0 + (x1 - x0) * (i / Nx);
      const y = curveY(x);
      positions.push(x, y, DEPTH_F, x, base, DEPTH_F);
      const c = lerpC(col(y), [0.32, 0.25, 0.18], 0.55);
      colors.push(c[0], c[1], c[2], c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
    }
    for (let i = 0; i < Nx; i++) {
      const a = off + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // ink outline along the profile (front top edge)
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = x0 + (x1 - x0) * (i / 120);
      pts.push(new THREE.Vector3(x, curveY(x) + 0.05, DEPTH_F + 0.12));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.14, 6, false);
    return { geo: g, line: tube };
  }, []);
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={line}><meshBasicMaterial color="#1a1410" /></mesh>
    </group>
  );
};

// cartoon protagonist drawn on a canvas, by mood
const Figure: React.FC<{ x: number; y: number; z?: number; mood: string; rot?: number; scale?: number; color?: string }> =
  ({ x, y, z = DEPTH_F + 0.4, mood, rot = 0, scale = 1, color = "#e8822e" }) => {
    const tex = useMemo(() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 400;
      const g = c.getContext("2d")!;
      g.scale(2, 2); // author in 128-space at 2x resolution for crisp medium shots
      const cx = 64;
      // legs
      g.strokeStyle = "#324"; g.lineWidth = 9; g.lineCap = "round";
      if (mood === "trudge") {
        g.beginPath(); g.moveTo(cx - 6, 150); g.lineTo(cx - 20, 186); g.stroke();
        g.beginPath(); g.moveTo(cx + 6, 150); g.lineTo(cx + 22, 180); g.stroke();
      } else if (mood === "sad") {
        g.beginPath(); g.moveTo(cx - 8, 150); g.lineTo(cx - 10, 188); g.stroke();
        g.beginPath(); g.moveTo(cx + 8, 150); g.lineTo(cx + 10, 188); g.stroke();
      } else {
        g.beginPath(); g.moveTo(cx - 8, 150); g.lineTo(cx - 14, 188); g.stroke();
        g.beginPath(); g.moveTo(cx + 8, 150); g.lineTo(cx + 14, 188); g.stroke();
      }
      // body
      g.fillStyle = color;
      const bodyY = mood === "sad" ? 86 : (mood === "trudge" ? 80 : 74);
      g.beginPath(); g.roundRect(cx - 26, bodyY, 52, 74, 16); g.fill();
      // arms
      g.strokeStyle = color; g.lineWidth = 14;
      if (mood === "confident") {
        g.beginPath(); g.moveTo(cx - 20, bodyY + 12); g.lineTo(cx - 44, bodyY - 14); g.stroke();
        g.beginPath(); g.moveTo(cx + 20, bodyY + 12); g.lineTo(cx + 44, bodyY - 14); g.stroke();
      } else if (mood === "shocked") {
        g.beginPath(); g.moveTo(cx - 20, bodyY + 10); g.lineTo(cx - 40, bodyY - 24); g.stroke();
        g.beginPath(); g.moveTo(cx + 20, bodyY + 10); g.lineTo(cx + 40, bodyY - 24); g.stroke();
      } else if (mood === "trudge") {
        g.beginPath(); g.moveTo(cx - 18, bodyY + 10); g.lineTo(cx - 40, bodyY - 10); g.stroke();
        g.beginPath(); g.moveTo(cx + 18, bodyY + 14); g.lineTo(cx + 34, bodyY + 40); g.stroke();
      } else { // sad
        g.beginPath(); g.moveTo(cx - 18, bodyY + 12); g.lineTo(cx - 24, bodyY + 54); g.stroke();
        g.beginPath(); g.moveTo(cx + 18, bodyY + 12); g.lineTo(cx + 24, bodyY + 54); g.stroke();
      }
      // head
      const hy = mood === "sad" ? 54 : (mood === "trudge" ? 46 : 42);
      g.fillStyle = "#f6cda0";
      g.beginPath(); g.arc(cx, hy, 26, 0, Math.PI * 2); g.fill();
      // face
      g.fillStyle = "#2a1a0d";
      if (mood === "shocked") {
        g.beginPath(); g.arc(cx - 9, hy - 3, 5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(cx + 9, hy - 3, 5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx, hy + 12, 7, 9, 0, 0, Math.PI * 2); g.fill();
      } else if (mood === "sad") {
        g.beginPath(); g.arc(cx - 9, hy - 2, 3.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(cx + 9, hy - 2, 3.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#2a1a0d"; g.lineWidth = 4;
        g.beginPath(); g.moveTo(cx - 10, hy + 14); g.quadraticCurveTo(cx, hy + 6, cx + 10, hy + 14); g.stroke();
      } else if (mood === "confident") {
        g.beginPath(); g.arc(cx - 9, hy - 2, 4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(cx + 9, hy - 2, 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#8a3a2a"; g.lineWidth = 5;
        g.beginPath(); g.moveTo(cx - 11, hy + 8); g.quadraticCurveTo(cx, hy + 18, cx + 11, hy + 8); g.stroke();
      } else { // trudge
        g.beginPath(); g.arc(cx - 9, hy - 2, 3.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(cx + 9, hy - 2, 3.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#2a1a0d"; g.lineWidth = 4;
        g.beginPath(); g.moveTo(cx - 8, hy + 12); g.lineTo(cx + 8, hy + 12); g.stroke();
      }
      g.strokeStyle = "#2a1a0d"; g.lineWidth = 4;
      g.beginPath(); g.arc(cx, hy, 26, 0, Math.PI * 2); g.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    }, [mood, color]);
    const h = 2.6 * scale;
    return (
      <mesh position={[x, y, z]} rotation={[0, 0, rot]}>
        <planeGeometry args={[h * 0.64, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>
    );
  };

// floating zone label
const ZoneLabel: React.FC<{ text: string; x: number; y: number; a: number; color: string; w?: number }> =
  ({ text, x, y, a, color, w = 7 }) => {
    const CW = 900, CH = 110;
    const tex = useMemo(() => {
      const c = document.createElement("canvas"); c.width = CW; c.height = CH;
      const g = c.getContext("2d")!;
      // auto-fit the font so long labels never clip
      let fs = 56; g.font = `bold ${fs}px Georgia`;
      while (g.measureText(text).width > CW - 40 && fs > 24) { fs -= 2; g.font = `bold ${fs}px Georgia`; }
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      // strong dark outline so the golden label reads >= 3:1 against any sky
      g.lineWidth = 14; g.strokeStyle = "rgba(0,0,0,0.95)"; g.strokeText(text, CW / 2, CH / 2);
      g.lineWidth = 7; g.strokeStyle = "#000"; g.strokeText(text, CW / 2, CH / 2);
      g.fillStyle = color; g.fillText(text, CW / 2, CH / 2);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }, [text, color]);
    if (a <= 0.01) return null;
    return (
      <mesh position={[x, y, DEPTH_F + 0.6]}>
        <planeGeometry args={[w, w * CH / CW]} />
        <meshBasicMaterial map={tex} transparent opacity={a} depthTest={false} />
      </mesh>
    );
  };

// little triumphant flag on the peak
const PeakFlag: React.FC<{ a: number }> = ({ a }) => {
  if (a <= 0.01) return null;
  const y = curveY(PEAK_X);
  return (
    <group position={[PEAK_X + 0.9, y + 1.6, DEPTH_F + 0.3]} scale={a}>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 2.4, 6]} /><meshBasicMaterial color="#3a2a1a" /></mesh>
      <mesh position={[0.6, 0.8, 0]}><planeGeometry args={[1.1, 0.7]} /><meshBasicMaterial color="#e23b3b" side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

// a big lemon for the callback
const LemonProp: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < 79.178) return null;
  const drop = sm((tau - 79.178) / 0.6);
  const y = curveY(26) + 2.0 + (1 - drop) * 9;
  return (
    <group position={[28.6, y, DEPTH_F + 0.6]} scale={0.85}>
      <mesh scale={[1.25, 1, 1]}><sphereGeometry args={[1.0, 20, 16]} /><meshLambertMaterial color="#f5d417" /></mesh>
      <mesh position={[1.25, 0, 0]}><sphereGeometry args={[0.18, 8, 8]} /><meshLambertMaterial color="#cba90d" /></mesh>
      <mesh position={[-1.25, 0, 0]}><sphereGeometry args={[0.18, 8, 8]} /><meshLambertMaterial color="#cba90d" /></mesh>
      <mesh position={[-0.4, 0.4, 0.95]}><circleGeometry args={[0.3, 12]} /><meshBasicMaterial color="#fff6b0" transparent opacity={0.7} /></mesh>
    </group>
  );
};

const CurveScene: React.FC<{ tau: number }> = ({ tau }) => {
  const ch = charState(tau);
  const crowdA = sm((tau - 37.5) / 1.5) - sm((tau - 48) / 1.2);
  // the slope label tracks the camera (which pans right as we climb) so it stays centered
  const look = camForShot(tau).look;
  return (
    <group>
      <Terrain />
      {/* the overconfident crowd clustered on Mount Stupid (before the hero is named) */}
      {crowdA > 0.02 && [[-28, "#d14f8f"], [-23.5, "#4fa3d1"], [-26.5, "#6fb84f"], [-21.5, "#d1a24f"]].map((c, i) => {
        const x = c[0] as number;
        return <Figure key={i} x={x} y={curveY(x) + 0.9} mood="confident" scale={0.72} color={c[1] as string} />;
      })}
      {/* hero */}
      {ch.visible && <Figure x={ch.x} y={ch.y} mood={ch.mood} rot={ch.rot} scale={ch.scale} />}
      {/* the quiet experts near the top */}
      {tau > 66 && tau < 80 && (
        <>
          <Figure x={30} y={curveY(30) + 0.85} mood="trudge" scale={0.7} color="#5a7fb0" />
          <Figure x={34} y={curveY(34) + 0.85} mood="trudge" scale={0.7} color="#7a6aa0" />
          {/* magnifying glass */}
          <group position={[31.4, curveY(30) + 1.4, DEPTH_F + 0.5]}>
            <mesh><ringGeometry args={[0.28, 0.4, 16]} /><meshBasicMaterial color="#2a1a0d" /></mesh>
            <mesh position={[0.4, -0.4, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshBasicMaterial color="#2a1a0d" /></mesh>
          </group>
        </>
      )}
      <PeakFlag a={sm((tau - 44.3) / 0.7) - sm((tau - 48.8) / 0.5)} />
      <LemonProp tau={tau} />
      <ZoneLabel text="MONT STUPIDE" x={PEAK_X} y={curveY(PEAK_X) + 3} color="#ffe8a0" w={6.5}
        a={sm((tau - 37) / 1) - sm((tau - 48.9) / 1)} />
      <ZoneLabel text="VALLÉE DU DÉSESPOIR" x={VALLEY_X} y={curveY(VALLEY_X) + 5} color="#aeb8d8" w={7.5}
        a={sm((tau - 53.3) / 1) - sm((tau - 63) / 1.2)} />
      <ZoneLabel text="PENTE DE L'ILLUMINATION" x={look[0]} y={look[1] + 4.6} color="#ffd9a0" w={8.5}
        a={sm((tau - 63.4) / 1) - sm((tau - 73) / 1.2)} />
    </group>
  );
};

// ---- camera rig ----------------
const CameraRig: React.FC<{ tau: number }> = ({ tau }) => {
  const { camera } = useThree();
  const cam = camForShot(tau);
  const p = camera as THREE.PerspectiveCamera;
  p.position.set(...cam.pos);
  p.fov = cam.fov;
  p.aspect = 1080 / 1920;
  p.near = 0.1; p.far = 500;
  p.updateProjectionMatrix();
  p.lookAt(...cam.look);
  return null;
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const tau = frame / FPS;
  const m = moodAt(tau);
  return (
    <>
      <CameraRig tau={tau} />
      <ambientLight intensity={m.amb} />
      <directionalLight position={m.sun} intensity={m.dirInt} color={m.dirColor} />
      {/* front fill light for the bank cold-open (facade faces the camera) */}
      {tau < ACT2_TAU + 1 && <directionalLight position={[0, 7, -16]} intensity={0.95} color="#fff6e8" />}
      <Sky top={m.skyTop} horiz={m.skyHoriz} />
      {tau < ACT2_TAU + 0.8 && <BankScene tau={tau} />}
      {tau < ACT2_TAU + 0.8 && <FootageCard tau={tau} />}
      {tau >= ACT2_TAU - 0.05 && <CurveScene tau={tau} />}
    </>
  );
};

// ---- subtitles ----------------
const CAPTIONS: { a: number; b: number; text: string }[] = [
  { a: 0.1, b: 5.0, text: "En 1995, un homme a braqué deux banques\nen plein jour, sans masque." },
  { a: 5.0, b: 7.845, text: "Il s'était enduit le visage de jus de citron." },
  { a: 7.845, b: 11.011, text: "Il avait lu que le jus de citron\nsert d'encre invisible." },
  { a: 11.011, b: 14.476, text: "Il était donc certain que ça le rendrait\ninvisible aux caméras." },
  { a: 14.476, b: 16.285, text: "Ce ne fut pas le cas." },
  { a: 16.285, b: 20.523, text: "Quand la police lui a montré les images,\nil était sincèrement stupéfait." },
  { a: 20.523, b: 25.559, text: "Cet homme a, sans le vouloir, inspiré l'une\ndes idées les plus célèbres de la psychologie." },
  { a: 25.559, b: 28.761, text: "Deux chercheurs se sont posé\nune question toute simple." },
  { a: 28.761, b: 33.011, text: "Et si être mauvais à quelque chose nous rendait\nincapables de nous en rendre compte ?" },
  { a: 33.011, b: 36.821, text: "Ils ont testé des gens sur la logique,\nla grammaire et l'humour." },
  { a: 36.821, b: 39.285, text: "Les plus mauvais n'ont pas seulement échoué." },
  { a: 39.285, b: 41.964, text: "Ils étaient convaincus d'avoir tout réussi." },
  { a: 41.964, b: 44.785, text: "Ceux qui en savaient le moins\nétaient les plus sûrs d'eux." },
  { a: 44.785, b: 48.904, text: "Bienvenue au Mont Stupide, où un petit\nsavoir en paraît un immense." },
  { a: 48.904, b: 53.380, text: "Mais montez un peu plus haut, apprenez-en\nun peu plus, et le sol se dérobe." },
  { a: 53.380, b: 57.904, text: "Voici la Vallée du Désespoir, où l'on\ndécouvre enfin tout ce qu'on ignore." },
  { a: 57.904, b: 59.964, text: "Et voilà la cruelle ironie." },
  { a: 59.964, b: 63.464, text: "Se sentir plus bête,\nc'est en réalité progresser." },
  { a: 63.464, b: 65.452, text: "La remontée est lente." },
  { a: 65.452, b: 67.880, text: "On l'appelle la Pente de l'Illumination." },
  { a: 67.880, b: 69.666, text: "Les vrais experts ?" },
  { a: 69.666, b: 72.940, text: "Ils doutent en silence,\net vérifient tout deux fois." },
  { a: 72.940, b: 76.857, text: "Alors si vous vous êtes déjà senti imposteur,\nbonne nouvelle." },
  { a: 76.857, b: 79.178, text: "Vous avez quitté le Mont Stupide." },
  { a: 79.178, b: 81.785, text: "Et si vous êtes certain\nd'être brillant en tout ?" },
  { a: 81.785, b: 83.9, text: "Passez-moi le jus de citron." },
];

const Subtitles: React.FC<{ tau: number }> = ({ tau }) => {
  const cap = CAPTIONS.find((c) => tau >= c.a && tau < c.b);
  if (!cap) return null;
  const alpha = Math.min(cl((tau - cap.a) / 0.25), cl((cap.b - tau) / 0.25));
  return (
    <div style={{
      position: "absolute", bottom: 210, left: 0, right: 0,
      display: "flex", justifyContent: "center",
      opacity: alpha, padding: "0 46px",
    }}>
      {/* semi-opaque dark plate so white text keeps >= 4.5:1 on ANY background, incl. the white flash */}
      <div style={{
        background: "rgba(0,0,0,0.62)", borderRadius: 12, padding: "10px 18px",
        display: "inline-block", maxWidth: "100%",
      }}>
        {cap.text.split("\n").map((line, i) => (
          <div key={i} style={{
            fontFamily: "'Georgia', serif", fontSize: 44, color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,0.85)",
            textAlign: "center", lineHeight: 1.32, fontWeight: "bold",
          }}>{line}</div>
        ))}
      </div>
    </div>
  );
};

// axis labels (only while the curve is on screen)
const AxisLabels: React.FC<{ tau: number }> = ({ tau }) => {
  const a = cl((tau - 23) / 1.5) * cl((80 - tau) / 1.5);
  if (a <= 0.01) return null;
  // dark navy on a light plate so the decorative axis labels read >= 4.5:1 on light OR dark sky
  const base: React.CSSProperties = {
    position: "absolute", fontFamily: "'Georgia', serif", fontWeight: "bold",
    color: "#1D3557", letterSpacing: 4, opacity: a, fontSize: 24,
    background: "rgba(253,246,236,0.82)", padding: "5px 12px", borderRadius: 8,
  };
  return (
    <>
      <div style={{ ...base, left: 44, top: "50%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "left center" }}>CONFIANCE ↑</div>
      <div style={{ ...base, bottom: 150, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>SAVOIR →</div>
    </>
  );
};

// end title card
const TitleCard: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < 77.5) return null;
  const a = sm((tau - 77.5) / 1.2);
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", opacity: a, padding: "0 40px" }}>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 58, color: "#fff", fontWeight: "bold", textShadow: "0 3px 14px #000", lineHeight: 1.1 }}>
        L'effet<br />Dunning-Kruger
      </div>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 30, color: "#ffd97a", marginTop: 18, textShadow: "0 2px 8px #000" }}>
        Moins on en sait, plus on est sûr de soi.
      </div>
    </div>
  );
};

const Flash: React.FC<{ tau: number }> = ({ tau }) => {
  // gentle, capped flash on the CCTV reveal and the act transition — softened cross-dissolve,
  // never a full-white blow-out (peaks at ~#CCCCCC) so subtitles stay readable.
  const f1 = Math.max(0, sm((tau - REVEAL_TAU) / 0.12) - sm((tau - REVEAL_TAU - 0.12) / 0.35));
  const f2 = Math.max(0, sm((tau - (FLASH_TAU - 0.35)) / 0.45) - sm((tau - FLASH_TAU - 0.4) / 0.7));
  const a = Math.min(0.8, Math.max(f1 * 0.72, f2 * 0.8));
  if (a <= 0.01) return null;
  return <div style={{ position: "absolute", inset: 0, background: "#cccccc", opacity: a, pointerEvents: "none" }} />;
};

const FilmGrain: React.FC<{ frame: number }> = ({ frame }) => {
  const seed = frame * 1327 + 4919;
  return <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${seed % 99}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.06'/></svg>`)}")`,
    backgroundSize: "200px 200px", mixBlendMode: "overlay", pointerEvents: "none",
  }} />;
};

// ---- Composition ----------------
export const DunningShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tau = frame / fps;
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Scene />
      </ThreeCanvas>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 54%, rgba(0,0,0,0.68) 100%)",
        pointerEvents: "none",
      }} />
      <FilmGrain frame={frame} />
      {/* flash sits BELOW the text overlays so subtitles/labels stay readable through it */}
      <Flash tau={tau} />
      <AxisLabels tau={tau} />
      <Subtitles tau={tau} />
      <TitleCard tau={tau} />
      <Audio src={staticFile("voice_dk_fr_calm.wav")} />
    </div>
  );
};
