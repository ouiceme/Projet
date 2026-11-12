/**
 * "La vraie histoire de la brique" — a calm, educational LEGO-history short (FR VO).
 * 1080x1920 @ 30 fps, 86.688 s (2601 frames). Voice: voice_lego_fr.wav.
 * CLEAN render — NO burned subtitles (an accessible subtitled version is made separately).
 *
 * LEGAL: no LEGO logo/wordmark, no trademarked minifigure, plain cylindrical studs,
 * generic studded bricks, original stylised patent line-art only.
 *
 * Reuses the project patterns: procedural three.js geometry, canvas-texture 2D figures,
 * CameraRig via useThree, Sky/backdrop, vignette + subtle film grain, <Audio>, end card.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---- helpers ----------------
const FPS = 30;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = cl(x); return u * u * (3 - 2 * u); };
const eo = (u: number) => 1 - (1 - cl(u)) ** 3;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
// fade in, hold (linger), fade out
const fade = (tau: number, a: number, b: number, din = 0.6, dout = 0.5) =>
  Math.min(cl((tau - a) / din), cl((b - tau) / dout));

// ---- palette ----------------
const C = {
  red: "#E63946", yellow: "#FFB703", teal: "#2A9D8F", teal2: "#219EBC",
  navy: "#1D3557", cream: "#FDF6EC", grey: "#8D99AE", blue: "#13426B",
  wood: "#C98A4B", woodDark: "#9A6534",
};
const DISPLAY = `"Poppins","Nunito","Liberation Sans","DejaVu Sans",sans-serif`;
const MONO = `"JetBrains Mono","DejaVu Sans Mono",monospace`;

// ---- shot boundaries (s) ----------------
const S = {
  s1: 0.0, s2: 5.6, s3: 12.5, s4: 15.9, s5: 19.8, s6: 25.0,
  s7: 35.7, s8: 46.6, s9: 51.1, s10: 65.8, s11: 80.0, end: 86.688,
};

// ======================= 3D building blocks =======================

const UNIT = 0.9, BH = 0.95, STUD_R = 0.3, STUD_H = 0.22;

const Brick: React.FC<{
  cols?: number; rows?: number; color: string;
  position?: [number, number, number]; rotation?: [number, number, number];
  scaleY?: number; opacity?: number; roughness?: number; studs?: boolean; studScale?: number;
}> = ({ cols = 4, rows = 2, color, position = [0, 0, 0], rotation = [0, 0, 0], scaleY = 1, opacity = 1, roughness = 0.35, studs = true, studScale = 1 }) => {
  const w = cols * UNIT, d = rows * UNIT, h = BH * scaleY;
  const cells: [number, number][] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
    cells.push([-w / 2 + UNIT / 2 + i * UNIT, -d / 2 + UNIT / 2 + j * UNIT]);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={0} transparent={opacity < 0.995} opacity={opacity} />
      </mesh>
      {studs && studScale > 0.01 && cells.map(([x, z], k) => (
        <mesh key={k} position={[x, h + (STUD_H * studScale) / 2, z]}>
          <cylinderGeometry args={[STUD_R, STUD_R, STUD_H * studScale, 20]} />
          <meshStandardMaterial color={color} roughness={roughness} metalness={0} transparent={opacity < 0.995} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
};

// soft fake contact shadow
const Shadow: React.FC<{ position: [number, number, number]; r?: number; opacity?: number }> =
  ({ position, r = 2.4, opacity = 0.22 }) => {
    const tex = useMemo(() => {
      const c = document.createElement("canvas"); c.width = 128; c.height = 128;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
      grd.addColorStop(0, "rgba(40,30,20,0.9)"); grd.addColorStop(1, "rgba(40,30,20,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }, []);
    return (
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[r, r * 0.7]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    );
  };

// studio backdrop (soft radial cream)
const Backdrop: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 456;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 150, 40, 128, 220, 400);
    grd.addColorStop(0, "#FFFDF8"); grd.addColorStop(0.6, C.cream); grd.addColorStop(1, "#F0E6D4");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 456);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[0, 6, -22]}>
      <planeGeometry args={[80, 142]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
};

// wooden pull-duck toy (procedural, matte wood)
const WoodenDuck: React.FC<{ position: [number, number, number]; scale?: number }> =
  ({ position, scale = 1 }) => (
    <group position={position} scale={scale}>
      {/* base board + wheels */}
      <mesh position={[0, 0.12, 0]} castShadow><boxGeometry args={[1.7, 0.18, 0.8]} /><meshStandardMaterial color={C.woodDark} roughness={0.85} /></mesh>
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.05, 0.42]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.1, 16]} /><meshStandardMaterial color="#5a3a1e" roughness={0.8} /></mesh>
      ))}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i + 2} position={[x, 0.05, -0.42]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.1, 16]} /><meshStandardMaterial color="#5a3a1e" roughness={0.8} /></mesh>
      ))}
      {/* body */}
      <mesh position={[-0.1, 0.62, 0]} scale={[1.2, 0.85, 0.9]} castShadow><sphereGeometry args={[0.5, 20, 16]} /><meshStandardMaterial color={C.wood} roughness={0.8} /></mesh>
      {/* tail */}
      <mesh position={[-0.72, 0.78, 0]} rotation={[0, 0, 0.5]}><coneGeometry args={[0.18, 0.4, 12]} /><meshStandardMaterial color={C.wood} roughness={0.8} /></mesh>
      {/* head */}
      <mesh position={[0.5, 0.95, 0]} castShadow><sphereGeometry args={[0.3, 18, 14]} /><meshStandardMaterial color={C.wood} roughness={0.8} /></mesh>
      {/* beak */}
      <mesh position={[0.82, 0.92, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.12, 0.28, 12]} /><meshStandardMaterial color={C.yellow} roughness={0.7} /></mesh>
      {/* eye */}
      <mesh position={[0.62, 1.06, 0.2]}><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial color="#201008" /></mesh>
    </group>
  );

const Bench: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 1.3, 0]} castShadow receiveShadow><boxGeometry args={[6, 0.25, 2.6]} /><meshStandardMaterial color={C.woodDark} roughness={0.85} /></mesh>
    {[[-2.6, -1], [2.6, -1], [-2.6, 1], [2.6, 1]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.6, z]}><boxGeometry args={[0.28, 1.3, 0.28]} /><meshStandardMaterial color="#6a451f" roughness={0.9} /></mesh>
    ))}
  </group>
);

// rounded NON-minifig figure as a canvas card (friendly carpenter)
const Figure: React.FC<{ position: [number, number, number]; scale?: number; opacity?: number; apron?: boolean }> =
  ({ position, scale = 1, opacity = 1, apron = true }) => {
    const tex = useMemo(() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 340;
      const g = c.getContext("2d")!;
      const cx = 128;
      // body — soft rounded (not a trapezoid minifig)
      g.fillStyle = C.teal;
      g.beginPath(); g.moveTo(cx - 62, 180);
      g.quadraticCurveTo(cx - 78, 300, cx - 50, 318);
      g.lineTo(cx + 50, 318);
      g.quadraticCurveTo(cx + 78, 300, cx + 62, 180);
      g.quadraticCurveTo(cx, 150, cx - 62, 180); g.closePath(); g.fill();
      // apron
      if (apron) {
        g.fillStyle = "#b5793f";
        g.beginPath(); g.moveTo(cx - 36, 200); g.lineTo(cx + 36, 200);
        g.quadraticCurveTo(cx + 44, 300, cx + 30, 312); g.lineTo(cx - 30, 312);
        g.quadraticCurveTo(cx - 44, 300, cx - 36, 200); g.closePath(); g.fill();
      }
      // arms
      g.strokeStyle = C.teal; g.lineWidth = 30; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx - 52, 205); g.lineTo(cx - 70, 278); g.stroke();
      g.beginPath(); g.moveTo(cx + 52, 205); g.lineTo(cx + 70, 278); g.stroke();
      // hands
      g.fillStyle = "#f3c9a0";
      g.beginPath(); g.arc(cx - 72, 288, 16, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 72, 288, 16, 0, Math.PI * 2); g.fill();
      // head — round
      g.fillStyle = "#f3c9a0";
      g.beginPath(); g.arc(cx, 110, 62, 0, Math.PI * 2); g.fill();
      // simple cap
      g.fillStyle = C.navy;
      g.beginPath(); g.ellipse(cx, 70, 66, 34, 0, Math.PI, 0); g.fill();
      g.fillRect(cx - 66, 66, 132, 14);
      // face
      g.fillStyle = "#3a2416";
      g.beginPath(); g.arc(cx - 22, 112, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 22, 112, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#a0522d"; g.lineWidth = 7;
      g.beginPath(); g.arc(cx, 128, 20, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      // rosy cheeks
      g.fillStyle = "rgba(230,120,90,0.25)";
      g.beginPath(); g.arc(cx - 40, 128, 14, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 40, 128, 14, 0, Math.PI * 2); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }, [apron]);
    const h = 3.4 * scale;
    return (
      <mesh position={position}>
        <planeGeometry args={[h * 256 / 340, h]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} alphaTest={0.05} side={THREE.DoubleSide} />
      </mesh>
    );
  };

// ======================= snap timing (SFX cues, seconds) =======================
// The parent mixes click sounds at exactly these times — keep the visuals locked to them.
const SNAP = { hook: 2.6, lockIn: 31.0, lockOut: 33.0, final: 84.6 };
// smooth-per-segment keyframes
const linS = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + (y1 - y0) * sm((x - x0) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
};
// tiny "click" pop 1 -> 1.06 -> 1 peaking exactly at t0
const pop = (tau: number, t0: number, amt = 0.06, w = 0.075) => 1 + amt * Math.exp(-Math.pow((tau - t0) / w, 2));
// accelerating final push that lands exactly at t1 (from `from` down to 0)
const push = (tau: number, t0: number, t1: number, from: number) => {
  const u = cl((tau - t0) / (t1 - t0)); return from * (1 - u * u);
};
const rnd = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

// S6 clutch offset: 190 = fully apart, 50 = studs at the mouth, 0 = locked
const clutchOff = (tau: number) => {
  if (tau < 30.8) return linS([[27.0, 190], [29.3, 58], [29.8, 50], [30.8, 10]], tau);
  if (tau < SNAP.lockIn) return push(tau, 30.8, SNAP.lockIn, 10);
  if (tau < 32.5) return 0;
  if (tau < SNAP.lockOut) return 4 * sm((tau - 32.5) / 0.5);          // strain before release
  if (tau < 33.15) return 4 + 66 * eo((tau - SNAP.lockOut) / 0.15);   // pops free at 33.0
  return linS([[33.15, 70], [34.2, 190]], tau);
};

// ======================= per-shot 3D scenes =======================

// S1 — a brick lands, a second one drops and truly couples onto its studs (snap at 2.6 s),
// then a short celebratory shower of little bricks.
const S1Brick: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, 0, S.s2 + 0.4, 0.01, 0.5);
  if (a <= 0.01) return null;
  const y = lin([[0, 9], [0.6, 0], [0.8, 0.7], [1.0, 0], [1.12, 0.2], [1.24, 0]], tau);
  const sq = (tc: number) => Math.exp(-Math.pow((tau - tc) / 0.07, 2));
  const squash = sq(0.6) * 0.28 + sq(1.0) * 0.14;
  // top brick: lift above its seated position (seated = studs fully inside the brick)
  const lift = tau < 2.5
    ? linS([[1.1, 7.5], [2.0, 0.62], [2.3, 0.46], [2.5, STUD_H]], tau)
    : push(tau, 2.5, SNAP.hook, STUD_H);
  const p = pop(tau, SNAP.hook);
  const rain: React.ReactNode[] = [];
  for (let i = 0; i < 30; i++) {
    const t0 = SNAP.hook + 0.1 + rnd(i, 1) * 0.6, dur = 0.85 + rnd(i, 2) * 0.2;
    const u = (tau - t0) / dur;
    if (u <= 0 || u >= 1) continue;
    const side = rnd(i, 3) < 0.5 ? -1 : 1;
    const z = -6 + rnd(i, 4) * 4.6;
    const x = side * (0.5 + rnd(i, 5) * (2.2 + -z * 0.25));
    const yy = 9.5 - u * u * 6 - u * 10;
    const kind = i % 3;
    rain.push(
      <group key={i} position={[x, yy, z]} rotation={[tau * (2 + rnd(i, 6) * 3), rnd(i, 7) * 6, tau * (1.5 + rnd(i, 8) * 2)]} scale={0.5}>
        <Brick cols={kind === 0 ? 1 : 2} rows={kind === 2 ? 2 : 1} color={[C.red, C.teal, C.yellow, C.teal2, C.navy][i % 5]} />
      </group>
    );
  }
  return (
    <group>
      <Shadow position={[0, 0.02, 0]} r={3.6} opacity={0.2 * cl((tau - 0.5) / 0.3) * a} />
      <group scale={[p, p, p]}>
        <group scale={[1 + squash * 0.5, 1 - squash, 1 + squash * 0.5]} position={[0, y, 0]}>
          <Brick cols={4} rows={2} color={C.red} opacity={a} />
        </group>
        {tau > 1.05 && (
          <group position={[0, BH + lift, 0]}>
            <Brick cols={4} rows={2} color={C.yellow} opacity={a} />
          </group>
        )}
      </group>
      {rain}
    </group>
  );
};

const S2Scene: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s2 - 0.2, S.s3 + 0.3, 0.6, 0.5);
  if (a <= 0.01) return null;
  return (
    <group position={[0, -0.75, 0]} scale={0.9}>
      <Shadow position={[0, 0.02, 0.2]} r={7} opacity={0.18 * a} />
      <Bench position={[0, 0, 0]} />
      <WoodenDuck position={[-0.4, 1.42, 0.1]} scale={1.15} />
      <mesh position={[2.0, 1.62, 0.3]} rotation={[0, 0.3, 0]}><boxGeometry args={[0.5, 0.3, 0.5]} /><meshStandardMaterial color={C.wood} roughness={0.85} /></mesh>
      <mesh position={[2.5, 1.6, -0.2]} rotation={[0, -0.2, 0]}><boxGeometry args={[0.4, 0.25, 0.4]} /><meshStandardMaterial color={C.woodDark} roughness={0.85} /></mesh>
    </group>
  );
};

const S3Scene: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s3 - 0.2, S.s4 + 0.3, 0.6, 0.5);
  if (a <= 0.01) return null;
  return (
    <group>
      <Shadow position={[0, -1.02, 0]} r={3.2} opacity={0.18 * a} />
      <Figure position={[0, 0.6, 0]} scale={0.95} opacity={a} />
    </group>
  );
};

const MorphBrick: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s4 - 0.2, S.s5 + 0.3, 0.6, 0.5);
  if (a <= 0.01) return null;
  const p = cl((tau - (S.s4 + 0.3)) / 3.0);
  const colA = new THREE.Color(C.wood), colB = new THREE.Color(C.grey), colC = new THREE.Color(C.red);
  const col = p < 0.45 ? colA.clone().lerp(colB, p / 0.45) : colB.clone().lerp(colC, (p - 0.45) / 0.55);
  const rough = lin([[0, 0.9], [1, 0.3]], p);
  const studScale = cl((p - 0.3) / 0.45);
  return (
    <group>
      <Shadow position={[0, 0.02, 0]} r={3.4} opacity={0.2 * a} />
      <group rotation={[0, lin([[0, -0.4], [1, 0.25]], p), 0]}>
        <Brick cols={4} rows={2} color={`#${col.getHexString()}`} roughness={rough} studScale={studScale} opacity={a} />
      </group>
    </group>
  );
};

// S5 — vertical layout (older brick above, new brick below) so nothing is cropped and
// the label band at the top stays clear.
const S5Scene: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s5 - 0.2, S.s6 + 0.3, 0.6, 0.5);
  if (a <= 0.01) return null;
  const slide = eo(cl((tau - S.s5) / 1.2));
  return (
    <group>
      <Shadow position={[0, -0.88, 0]} r={2.6} opacity={0.2 * a} />
      <group position={[0, -0.9, 0]} rotation={[0, -0.3, 0]} scale={0.7}>
        <Brick cols={4} rows={2} color={C.red} opacity={a} />
      </group>
      <group position={[-(1 - slide) * 4.5, 1.45, 0]} rotation={[0, 0.3, 0]} scale={0.7}>
        <Brick cols={4} rows={2} color={C.grey} opacity={a * slide} roughness={0.5} />
      </group>
    </group>
  );
};

// S6 — 3D companion of the animated cross-section: same motion, real coupling.
const PatentInterlock: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s6 + 0.4, S.s7 + 0.4, 0.7, 0.5);
  if (a <= 0.01) return null;
  const off = clutchOff(tau);
  const lift = (off / 190) * 1.2;
  const p = Math.max(pop(tau, SNAP.lockIn), pop(tau, SNAP.lockOut));
  return (
    <group position={[0, -2.0, 0]} scale={0.6 * p} rotation={[0, -0.45, 0]}>
      <Shadow position={[0, 0.02, 0]} r={5} opacity={0.18 * a} />
      <Brick cols={4} rows={2} color={C.teal} opacity={a} />
      <group position={[0, BH + lift, 0]}>
        <Brick cols={4} rows={2} color={C.red} opacity={a} />
      </group>
    </group>
  );
};

const S7Brick: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s7 + 0.3, S.s8 + 0.2, 0.8, 0.5);
  if (a <= 0.01) return null;
  return (
    <group>
      <Shadow position={[0, 0.02, 0]} r={3.2} opacity={0.18 * a} />
      <group rotation={[0, -0.25, 0]}>
        <Brick cols={4} rows={2} color={C.red} opacity={a} />
      </group>
    </group>
  );
};

// generic slope piece (2 wide: one studded column + a sloped column)
const SlopeBrick: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 1 }) => {
  const geo = useMemo(() => {
    const w = 2 * UNIT, d = 2 * UNIT;
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, BH * 0.28); sh.lineTo(0, BH); sh.lineTo(-w / 2, BH); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.35} transparent={opacity < 0.995} opacity={opacity} /></mesh>
      {[-UNIT / 2, UNIT / 2].map((z, i) => (
        <mesh key={i} position={[-UNIT / 2, BH + STUD_H / 2, z]}>
          <cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 20]} />
          <meshStandardMaterial color={color} roughness={0.35} transparent={opacity < 0.995} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
};
const RoundBrick: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 1 }) => (
  <group>
    <mesh position={[0, BH / 2, 0]}><cylinderGeometry args={[0.42, 0.42, BH, 24]} /><meshStandardMaterial color={color} roughness={0.35} transparent={opacity < 0.995} opacity={opacity} /></mesh>
    <mesh position={[0, BH + STUD_H / 2, 0]}><cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 20]} /><meshStandardMaterial color={color} roughness={0.35} transparent={opacity < 0.995} opacity={opacity} /></mesh>
  </group>
);

// S8 — several distinct generic "compatible" pieces click onto the same studs.
const BrickWall: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s8 - 0.1, S.s9 + 0.4, 0.5, 0.5);
  if (a <= 0.01) return null;
  const PH = BH * 0.35; // plate height
  const pieces: { t: number; pos: [number, number, number]; node: (o: number) => React.ReactNode }[] = [
    { t: 47.2, pos: [-1.8, PH, 0], node: (o) => <Brick cols={2} rows={2} color={C.teal} opacity={o} /> },
    { t: 47.7, pos: [-0.45, PH, 0], node: (o) => <Brick cols={1} rows={2} color={C.navy} opacity={o} /> },
    { t: 48.2, pos: [0.9, PH, 0], node: (o) => <SlopeBrick color={C.yellow} opacity={o} /> },
    { t: 48.7, pos: [2.25, PH, 0.45], node: (o) => <RoundBrick color={C.teal2} opacity={o} /> },
    { t: 49.0, pos: [2.25, PH, -0.45], node: (o) => <RoundBrick color={C.wood} opacity={o} /> },
    { t: 49.6, pos: [-1.35, PH + BH, 0], node: (o) => <Brick cols={3} rows={2} scaleY={0.35} color={C.grey} opacity={o} /> },
  ];
  return (
    <group position={[0, 1.1, 0]} scale={0.85} rotation={[0, -0.35, 0]}>
      <Shadow position={[0, 0.02, 0]} r={8} opacity={0.2 * a} />
      {/* shared base plate */}
      <Brick cols={6} rows={2} scaleY={0.35} color={C.red} opacity={a} />
      {pieces.map((pc, i) => {
        const u = tau - (pc.t - 0.75);
        if (u <= 0) return null;
        const lift = tau < pc.t - 0.12 ? linS([[pc.t - 0.75, 2.3], [pc.t - 0.12, STUD_H]], tau) : push(tau, pc.t - 0.12, pc.t, STUD_H);
        const p = pop(tau, pc.t, 0.08);
        return (
          <group key={i} position={[pc.pos[0], pc.pos[1] + lift, pc.pos[2]]} scale={[p, p, p]}>
            {pc.node(a * cl(u / 0.2))}
          </group>
        );
      })}
    </group>
  );
};

// S11 — final two bricks truly lock (snap at 84.6 s)
const S11Click: React.FC<{ tau: number }> = ({ tau }) => {
  const a = fade(tau, S.s11 - 0.2, S.end, 0.6, 0.01);
  if (a <= 0.01) return null;
  const topX = linS([[S.s11 + 0.3, -4.8], [83.0, 0]], tau);
  const lift = tau < 84.45
    ? linS([[S.s11 + 0.3, 0.75], [83.0, 0.6], [84.0, 0.4], [84.45, STUD_H]], tau)
    : push(tau, 84.45, SNAP.final, STUD_H);
  const p = pop(tau, SNAP.final);
  return (
    <group position={[0, -0.3, 0]} scale={0.85 * p}>
      <Shadow position={[0, 0.02, 0]} r={4} opacity={0.2 * a} />
      <Brick cols={4} rows={2} color={C.red} opacity={a} />
      <group position={[topX, BH + lift, 0]}>
        <Brick cols={4} rows={2} color={C.yellow} opacity={a} />
      </group>
    </group>
  );
};

// ======================= camera =======================
type V3 = [number, number, number];
const camForShot = (tau: number) => {
  const z = lin([[0, 12], [S.s2, 11.6], [S.s3, 11], [S.s4, 10.6], [S.s6, 10.6], [S.s6 + 3, 9.6], [S.s7, 11.5], [S.s8, 13.8], [S.s9 - 0.5, 13.8], [S.s9, 12], [S.s10, 11.6], [S.s11, 10.8], [S.end, 10.4]], tau);
  const py = lin([[0, 2.0], [S.s8 - 0.3, 2.1], [S.s8 + 1.2, 3.3], [S.s9 - 0.5, 3.3], [S.s9, 2.1], [S.end, 2.0]], tau);
  const ly = lin([[0, 1.0], [S.s8 - 0.3, 1.1], [S.s8 + 1.2, 2.0], [S.s9 - 0.5, 2.0], [S.s9, 1.1], [S.end, 1.0]], tau);
  const px = Math.sin(tau * 0.12) * 0.15; // tiny breathing drift
  return { pos: [px, py, z] as V3, look: [0, ly, 0] as V3, fov: 40 };
};

const CameraRig: React.FC<{ tau: number }> = ({ tau }) => {
  const { camera } = useThree();
  const cam = camForShot(tau);
  const p = camera as THREE.PerspectiveCamera;
  p.position.set(...cam.pos);
  p.fov = cam.fov; p.aspect = 1080 / 1920; p.near = 0.1; p.far = 200;
  p.updateProjectionMatrix();
  p.lookAt(...cam.look);
  return null;
};

const Scene3D: React.FC = () => {
  const frame = useCurrentFrame();
  const tau = frame / FPS;
  return (
    <>
      <CameraRig tau={tau} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={["#ffffff", "#d8c9b0", 0.55]} />
      <directionalLight position={[5, 11, 8]} intensity={1.15} color="#fffaf0" castShadow />
      <directionalLight position={[-6, 5, 4]} intensity={0.4} color="#dceaf2" />
      <Backdrop />
      <S1Brick tau={tau} />
      <S2Scene tau={tau} />
      <S3Scene tau={tau} />
      <MorphBrick tau={tau} />
      <S5Scene tau={tau} />
      {tau >= S.s6 - 0.3 && tau < S.s7 + 0.8 && <PatentInterlock tau={tau} />}
      <S7Brick tau={tau} />
      <BrickWall tau={tau} />
      <S11Click tau={tau} />
    </>
  );
};

// ======================= DOM overlay helpers =======================

const pill = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block", background: bg, color, fontFamily: DISPLAY, fontWeight: 800,
  borderRadius: 26, padding: "18px 38px", boxShadow: "0 10px 30px rgba(29,53,87,0.18)",
  letterSpacing: 0.5,
});
const center = (bottom: number): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, bottom, display: "flex",
  flexDirection: "column", alignItems: "center", gap: 18, padding: "0 60px", textAlign: "center",
});

// ---------- Europe map (stylised vector, lon/lat projected) with Denmark highlighted ----------
const MAP_W = 376, MAP_K = MAP_W / (43 * 0.62), MAP_H = 36 * MAP_K;
const prj = (lon: number, lat: number): [number, number] => [(lon + 11) * 0.62 * MAP_K, (71.5 - lat) * MAP_K];
const poly = (pts: number[][]) => pts.map(([lo, la], i) => { const [x, y] = prj(lo, la); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ") + " Z";
const EU_MAIN: number[][] = [
  [-9, 37], [-9.5, 38.7], [-8.8, 41.2], [-9.3, 43], [-8, 43.7], [-3.8, 43.5], [-1.6, 43.4], [-1.2, 45.5], [-1.2, 46.2], [-2.5, 47.3], [-4.7, 48.4], [-2, 48.6], [-1.6, 49.7], [0.1, 49.5], [1.8, 50.9],
  [4, 52], [4.7, 53], [7, 53.5], [8.7, 53.9], [8.6, 54.9], [8.3, 55.5], [8.1, 56.7], [10.6, 57.7], [10.3, 56.2], [9.6, 55.3], [9.8, 54.8], [10.2, 54.4], [10.9, 54], [12.1, 54.2], [13.6, 54.6], [14.3, 53.9],
  [16.2, 54.3], [18.6, 54.4], [20, 54.9], [21.1, 55.7], [21, 56.5], [21.6, 57.4], [22.6, 57.75], [24.1, 57], [24.5, 58.4], [23.5, 59], [24.8, 59.5], [28, 59.5], [30.2, 59.9], [28.7, 60.7], [25, 60.2], [23, 59.8],
  [22, 60.4], [21.5, 61.5], [21.5, 63.1], [25.4, 65], [24.5, 65.8], [22.2, 65.6], [20.3, 63.8], [17.4, 62.4], [17.2, 60.7], [18.5, 59.3], [16.8, 58.6], [16.4, 56.7], [15.6, 56.1], [13.8, 55.4], [13, 55.6],
  [12.7, 56], [11.9, 57.7], [11.2, 58.9], [10.7, 59.9], [10, 59], [8, 58.1], [7, 58], [5.6, 58.9], [5, 60.4], [5.1, 62.2], [7.7, 63.1], [9.5, 63.9], [11, 64.9], [14, 67.3], [18.5, 69.7], [25.8, 71.1], [31, 70.4],
  [32, 69.5], [32, 46.3], [30.7, 46.5], [29.6, 45.2], [28.6, 44.2], [27.9, 43.2], [27.5, 42.5], [29, 41.2], [27.5, 40.9], [26.2, 40.3], [25.9, 40.8], [24.4, 40.9], [22.9, 40.6], [22.9, 39.3], [23.7, 38],
  [23.2, 36.4], [22.1, 36.9], [21.7, 36.8], [21.3, 38.2], [20.7, 39], [19.4, 40.4], [19.4, 41.3], [18.1, 42.6], [16.4, 43.5], [15.2, 44.1], [14.4, 45.3], [13.8, 44.9], [13.7, 45.7], [12.3, 45.4], [12.6, 44.1],
  [13.5, 43.6], [14.2, 42.5], [16.2, 41.9], [16.9, 41.1], [18.5, 40.1], [18.4, 39.8], [17.2, 40.5], [17.1, 39.1], [15.7, 37.9], [16, 39.4], [14.2, 40.8], [12.2, 41.8], [10.5, 42.9], [9.8, 44.1], [8.9, 44.4],
  [7.3, 43.7], [5.9, 43.1], [5.3, 43.3], [4.2, 43.4], [3.5, 43.3], [3.1, 42.5], [3.3, 42.3], [2.2, 41.4], [1, 41], [-0.3, 39.5], [0.2, 38.7], [-0.5, 38.3], [-0.9, 37.6], [-2.1, 36.7], [-4.4, 36.7], [-5.4, 36.1],
  [-6.3, 36.5], [-7, 37.2], [-8, 37],
];
const EU_ISLES: number[][][] = [
  // Great Britain
  [[-5.7, 50.1], [-3.5, 50.3], [-1, 50.7], [1.4, 51.2], [0.8, 51.5], [1.7, 52.6], [0.3, 53], [-0.1, 53.7], [-1.5, 55], [-2, 55.9], [-3.2, 56], [-2.1, 57.7], [-4, 57.6], [-3.1, 58.6], [-5, 58.6], [-5.8, 57.5],
    [-5.6, 56.3], [-5, 54.7], [-3.4, 54.9], [-3, 53.9], [-3.1, 53.4], [-4.5, 53.3], [-4.1, 52.8], [-5.2, 51.8], [-3.2, 51.5], [-3, 51.2], [-4.2, 51.2]],
  // Ireland
  [[-6, 52.2], [-8.5, 51.5], [-10.2, 51.8], [-9.5, 53], [-10, 54.2], [-8.3, 55.2], [-6.1, 55.2], [-5.5, 54.4], [-6.2, 53.3]],
  // Sardinia, Corsica, Sicily, Gotland, Mallorca
  [[8.2, 40.9], [9.2, 41.2], [9.7, 40], [9.5, 39.1], [8.6, 38.9], [8.4, 40]],
  [[9.4, 43], [9.5, 42], [9.2, 41.4], [8.6, 42], [8.7, 42.6]],
  [[12.5, 38], [15.6, 38.3], [15.1, 36.7], [12.5, 37.6]],
  [[18.2, 57.9], [19, 57.6], [18.4, 57], [18.1, 57.3]],
  [[2.4, 39.6], [3.2, 39.9], [3.3, 39.4], [2.7, 39.3]],
];
const DK: number[][][] = [
  [[8.6, 54.9], [8.3, 55.5], [8.1, 56.7], [10.6, 57.7], [10.3, 56.2], [9.6, 55.3], [9.8, 54.8]],
  [[9.8, 55.5], [10.7, 55.6], [10.8, 55.1], [10.1, 55]],
  [[11, 55.7], [12, 56.1], [12.6, 55.9], [12.4, 55.3], [11.8, 55], [11.2, 55.2]],
];
const EU_D = [poly(EU_MAIN), ...EU_ISLES.map(poly)].join(" ");
const DK_D = DK.map(poly).join(" ");

const EuropeMap: React.FC<{ opacity: number; tau: number }> = ({ opacity, tau }) => {
  const [bx, by] = prj(9.1, 55.7); // Billund
  const ph = (tau * 0.9) % 1;
  return (
    <div style={{ position: "absolute", top: 150, right: 50, width: 400, opacity, background: "#fff", border: `4px solid ${C.navy}`, borderRadius: 26, padding: 8, boxShadow: "0 12px 34px rgba(29,53,87,0.18)", boxSizing: "border-box" }}>
      <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ display: "block", borderRadius: 18, background: "#DCEEF5" }}>
        <path d={EU_D} fill="#F4EBD9" stroke={C.navy} strokeWidth="1.6" strokeLinejoin="round" />
        <path d={DK_D} fill={C.red} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="62" y1="84" x2={bx - 6} y2={by - 8} stroke={C.red} strokeWidth="3" strokeLinecap="round" />
        <text x="8" y="72" fontFamily={DISPLAY} fontWeight="800" fontSize="27" fill={C.red} stroke="#DCEEF5" strokeWidth="5" paintOrder="stroke">Danemark</text>
        <circle cx={bx} cy={by} r={9 + ph * 22} fill="none" stroke={C.yellow} strokeWidth="4" opacity={1 - ph} />
        <circle cx={bx} cy={by} r="7.5" fill={C.yellow} stroke={C.navy} strokeWidth="3" />
      </svg>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, color: C.navy, fontSize: 27, textAlign: "center", padding: "8px 0 4px" }}>
        <span style={{ color: C.yellow, WebkitTextStroke: `2px ${C.navy}` }}>●</span> Billund · Europe du Nord
      </div>
    </div>
  );
};

// ---------- animated cross-section of the stud-and-tube clutch (the key educational moment) ----------
const CrossSection: React.FC<{ opacity: number; tau: number }> = ({ opacity, tau }) => {
  const off = clutchOff(tau);
  const p = Math.max(pop(tau, SNAP.lockIn), pop(tau, SNAP.lockOut));
  const studs = [275, 425, 575, 725], tubes = [350, 500, 650];
  const ins = cl((50 - off) / 50) * 50; // inserted stud length (px)
  const redD = "#B0222E";
  const step = tau < 29.3 ? "1 · le tube creux descend"
    : tau < SNAP.lockIn ? "2 · les tenons entrent entre tubes et parois"
      : tau < 32.5 ? "3 · CLIC — la friction tient l'ensemble"
        : tau < SNAP.lockOut ? "on tire…" : "4 · …et ça se détache, sans colle";
  const clic = fade(tau, SNAP.lockIn - 0.03, 32.4, 0.04, 0.3);
  const down = fade(tau, 26.6, 30.9, 0.4, 0.2), up = fade(tau, 32.5, 34.2, 0.2, 0.4);
  return (
    <div style={{ position: "absolute", top: 380, left: 50, right: 50, opacity, background: "#F2F7FB", border: `4px solid ${C.blue}`, borderRadius: 28, boxShadow: "0 12px 34px rgba(29,53,87,0.18)", boxSizing: "border-box", padding: "6px 6px 0" }}>
      <svg width="960" height="740" viewBox="0 0 1000 770" style={{ display: "block" }}>
        <text x="500" y="52" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="28" fill={C.blue} opacity="0.75">VUE EN COUPE</text>
        {/* lower brick (studs up) */}
        <rect x="200" y="470" width="600" height="180" rx="10" fill={C.teal} stroke="#15594F" strokeWidth="5" />
        {studs.map((c) => <rect key={c} x={c - 45} y="420" width="90" height="56" rx="8" fill={C.teal} stroke="#15594F" strokeWidth="5" />)}
        <rect x="205" y="472" width="590" height="10" fill={C.teal} />
        {/* upper brick: hollow shell + hollow tubes, cut open */}
        <g transform={`translate(0 ${-off}) translate(500 470) scale(${p}) translate(-500 -470)`}>
          <path d="M200 280 H800 V470 H770 V322 H230 V470 H200 Z" fill={C.red} stroke={redD} strokeWidth="5" strokeLinejoin="round" />
          <rect x="230" y="322" width="540" height="148" fill="#fff" opacity="0.55" />
          {tubes.map((c) => (
            <g key={c}>
              <rect x={c - 30} y="320" width="60" height="150" fill="#FBD9DC" />
              <rect x={c - 30} y="320" width="15" height="150" fill={C.red} stroke={redD} strokeWidth="3" />
              <rect x={c + 15} y="320" width="15" height="150" fill={C.red} stroke={redD} strokeWidth="3" />
            </g>
          ))}
          {/* tube label travels with the upper brick */}
          <line x1="672" y1="388" x2="836" y2="388" stroke={C.navy} strokeWidth="4" />
          <circle cx="672" cy="388" r="8" fill={C.navy} />
          <text x="915" y="382" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="34" fill={C.navy}>tube</text>
          <text x="915" y="420" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="34" fill={C.navy}>creux</text>
        </g>
        {/* studs drawn again over the cavity so we SEE them inside the upper brick */}
        {ins > 0.5 && studs.map((c) => (
          <g key={`i${c}`}>
            <rect x={c - 45} y="420" width="90" height={ins + 4} rx="8" fill={C.teal} stroke="#15594F" strokeWidth="5" />
            {/* grip contact glow on both flanks */}
            <rect x={c - 51} y={470 - ins} width="10" height={ins} rx="4" fill={C.yellow} />
            <rect x={c + 41} y={470 - ins} width="10" height={ins} rx="4" fill={C.yellow} />
          </g>
        ))}
        {/* stud label (fixed) */}
        <line x1="150" y1="446" x2="232" y2="446" stroke={C.navy} strokeWidth="4" />
        <circle cx="236" cy="446" r="8" fill={C.navy} />
        <text x="82" y="458" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="34" fill={C.navy}>tenons</text>
        {/* direction arrows */}
        <g opacity={down} stroke={C.blue} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M90 150 V250 M62 222 L90 252 L118 222" />
        </g>
        <g opacity={up} stroke={C.red} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M90 252 V152 M62 180 L90 150 L118 180" />
        </g>
        {/* CLIC badge */}
        {clic > 0.01 && (
          <g opacity={clic} transform={`translate(905 210) rotate(-10) scale(${0.8 + 0.2 * clic + (p - 1) * 3})`}>
            <rect x="-88" y="-40" width="176" height="80" rx="18" fill={C.yellow} stroke={C.navy} strokeWidth="5" />
            <text x="0" y="16" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="46" fill={C.navy}>CLIC !</text>
          </g>
        )}
        {/* step caption */}
        <rect x="110" y="682" width="780" height="68" rx="34" fill={C.blue} />
        <text x="500" y="728" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="34" fill="#fff">{step}</text>
      </svg>
    </div>
  );
};

// ---------- small oblique-projection brick drawer for 2D panels ----------
const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(k > 0 ? "#ffffff" : "#000000"), Math.abs(k));
  return `#${c.getHexString()}`;
};
const IsoBrick: React.FC<{ cols: number; rows: number; hk?: number; color: string; u?: number; x?: number; y?: number; slope?: boolean }> =
  ({ cols, rows, hk = 1.2, color, u = 28, x = 0, y = 0, slope = false }) => {
    const w = cols * u, d = rows * u, hh = hk * u, dx = d * 0.5, dy = -d * 0.36;
    const top = shade(color, 0.28), side = shade(color, -0.22), sl = shade(color, 0.12);
    const lo = hh * 0.3;
    const P = (pts: number[][]) => pts.map((q) => q.join(",")).join(" ");
    const studs: React.ReactNode[] = [];
    for (let j = rows - 1; j >= 0; j--) for (let i = 0; i < (slope ? 1 : cols); i++) {
      const cx = (i + 0.5) * u + (j + 0.5) * u * 0.5, cy = -hh - (j + 0.5) * u * 0.36;
      const rx = u * 0.3, ry = u * 0.13, sh = u * 0.2;
      studs.push(
        <g key={`${i}-${j}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} />
          <rect x={cx - rx} y={cy - sh} width={rx * 2} height={sh} fill={color} />
          <ellipse cx={cx} cy={cy - sh} rx={rx} ry={ry} fill={shade(color, 0.4)} />
        </g>
      );
    }
    return (
      <g transform={`translate(${x} ${y})`}>
        {slope ? (
          <>
            <polygon points={P([[0, 0], [w, 0], [w, -lo], [u, -hh], [0, -hh]])} fill={color} />
            <polygon points={P([[0, -hh], [u, -hh], [u + dx, -hh + dy], [dx, -hh + dy]])} fill={top} />
            <polygon points={P([[u, -hh], [w, -lo], [w + dx, -lo + dy], [u + dx, -hh + dy]])} fill={sl} />
            <polygon points={P([[w, 0], [w, -lo], [w + dx, -lo + dy], [w + dx, dy]])} fill={side} />
          </>
        ) : (
          <>
            <rect x={0} y={-hh} width={w} height={hh} fill={color} />
            <polygon points={P([[0, -hh], [w, -hh], [w + dx, -hh + dy], [dx, -hh + dy]])} fill={top} />
            <polygon points={P([[w, 0], [w, -hh], [w + dx, -hh + dy], [w + dx, dy]])} fill={side} />
          </>
        )}
        {studs}
      </g>
    );
  };

// ---------- scales of justice / weighing balance ----------
const Scales: React.FC<{ width: number; theta: number; color?: string; left?: React.ReactNode; right?: React.ReactNode; labels?: [string, string]; hi?: number }> =
  ({ width, theta, color = C.navy, left, right, labels, hi = 0 }) => {
    const cx = 340, cy = 62, R = 205, hang = 128;
    const a = (theta * Math.PI) / 180;
    const ex = R * Math.cos(a), ey = R * Math.sin(a);
    const pan = (px: number, py: number, node: React.ReactNode, k: string) => (
      <g key={k}>
        <path d={`M${px} ${py} L${px - 78} ${py + hang} M${px} ${py} L${px + 78} ${py + hang}`} stroke={color} strokeWidth="4" fill="none" />
        <path d={`M${px - 88} ${py + hang} H${px + 88} Q${px + 70} ${py + hang + 34} ${px} ${py + hang + 34} Q${px - 70} ${py + hang + 34} ${px - 88} ${py + hang} Z`} fill={C.yellow} stroke={color} strokeWidth="4" strokeLinejoin="round" />
        <g transform={`translate(${px} ${py + hang - 3})`}>{node}</g>
        <circle cx={px} cy={py} r="7" fill={color} />
      </g>
    );
    const H = labels ? 372 : 316;
    return (
      <svg width={width} height={(width * H) / 680} viewBox={`0 0 680 ${H}`} style={{ display: "block" }}>
        <rect x={cx - 7} y={cy} width="14" height={236} fill={color} />
        <path d={`M${cx - 86} 312 Q${cx - 80} 290 ${cx} 290 Q${cx + 80} 290 ${cx + 86} 312 Z`} fill={color} />
        <line x1={cx - ex} y1={cy - ey} x2={cx + ex} y2={cy + ey} stroke={color} strokeWidth="11" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="15" fill={C.yellow} stroke={color} strokeWidth="5" />
        {pan(cx - ex, cy - ey, left, "l")}
        {pan(cx + ex, cy + ey, right, "r")}
        {labels && (
          <>
            <text x={cx - R} y="358" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="31" fill={C.grey}>{labels[0]}</text>
            <rect x={cx + R - 132} y="322" width="264" height="48" rx="24" fill={C.teal} opacity={hi} />
            <text x={cx + R} y="357" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="31" fill={hi > 0.5 ? "#fff" : C.navy}>{labels[1]}</text>
          </>
        )}
      </svg>
    );
  };

const Gavel: React.FC<{ tau: number; strikes: number[] }> = ({ tau, strikes }) => {
  let k = 0;
  for (const ts of strikes) {
    const d = tau - ts;
    const v = d < -0.3 ? 0 : d < 0 ? Math.pow((d + 0.3) / 0.3, 2) : d < 0.2 ? 1 : d < 0.9 ? 1 - sm((d - 0.2) / 0.7) : 0;
    k = Math.max(k, v);
  }
  const ang = -46 + 38 * k;
  return (
    <svg width="210" height="190" viewBox="0 0 210 190" style={{ display: "block" }}>
      <rect x="104" y="160" width="98" height="20" rx="8" fill={C.navy} />
      <rect x="116" y="150" width="74" height="12" rx="5" fill={C.woodDark} />
      <g transform={`translate(22 128) rotate(${ang})`}>
        <rect x="0" y="-7" width="128" height="14" rx="7" fill={C.wood} />
        <rect x="104" y="-44" width="48" height="88" rx="10" fill={C.woodDark} />
        <rect x="104" y="-30" width="48" height="9" fill={C.yellow} />
        <rect x="104" y="21" width="48" height="9" fill={C.yellow} />
      </g>
    </svg>
  );
};

const subLine: React.CSSProperties = {
  fontFamily: DISPLAY, fontWeight: 700, color: C.navy, background: "rgba(253,246,236,0.96)",
  borderRadius: 16, padding: "8px 22px", boxShadow: "0 4px 14px rgba(29,53,87,0.10)",
};
const topBand = (top: number): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column",
  alignItems: "center", gap: 16, padding: "0 50px", textAlign: "center",
});
const euro = (v: number) => v.toFixed(2).replace(".", ",");

const Overlays: React.FC<{ tau: number }> = ({ tau }) => {
  const els: React.ReactNode[] = [];

  // S2 — 1932 · Billund (left column) + Europe map (right) — 3D bench sits below, clear of both
  {
    const o = fade(tau, S.s2 + 0.8, S.s3, 0.7, 0.5);
    if (o > 0.01) {
      els.push(
        <div key="s2l" style={{ position: "absolute", top: 210, left: 50, width: 550, opacity: o, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
          <div style={{ ...pill(C.navy, "#fff"), fontSize: 54, padding: "16px 30px", whiteSpace: "nowrap" }}>1932 · Billund</div>
          <div style={{ ...subLine, fontSize: 36, textAlign: "left" }}>un atelier de jouets<br />en bois, au Danemark</div>
        </div>
      );
      els.push(<EuropeMap key="s2m" opacity={o} tau={tau} />);
    }
  }
  // S3 — LEG GODT -> LEGO (text in the clear top band, figure below)
  {
    const o = fade(tau, S.s3 + 0.2, S.s4, 0.5, 0.5);
    if (o > 0.01) {
      const merge = eo(cl((tau - (S.s3 + 1.2)) / 1.4));
      const gap = (1 - merge) * 120;
      const showCombined = tau > S.s3 + 2.3;
      els.push(
        <div key="s3" style={{ position: "absolute", top: 190, left: 0, right: 0, textAlign: "center", opacity: o }}>
          <div style={{ height: 170, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {!showCombined ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: C.red }}>LEG</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: C.teal }}>GODT</span>
              </div>
            ) : (
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 132, color: C.navy, letterSpacing: 2, transform: `scale(${1 + Math.exp(-Math.pow((tau - (S.s3 + 2.3)) / 0.12, 2)) * 0.12})` }}>LEGO</div>
            )}
          </div>
          <div style={{ display: "inline-block", ...subLine, fontSize: 40, marginTop: 14 }}>« leg godt » — bien jouer</div>
        </div>
      );
    }
  }
  // S4 — ~1949 plastique
  {
    const o = fade(tau, S.s4 + 1.0, S.s5, 0.6, 0.5);
    if (o > 0.01) els.push(<div key="s4" style={{ ...center(430), opacity: o }}><div style={{ ...pill(C.teal, "#fff"), fontSize: 60 }}>~1949</div>
      <div style={{ ...subLine, fontSize: 38 }}>la brique en plastique</div></div>);
  }
  // S5 — Kiddicraft · Hilary Page (labels in top band; bricks stacked vertically below)
  {
    const o = fade(tau, S.s5 + 0.9, S.s6, 0.6, 0.5);
    if (o > 0.01) els.push(
      <div key="s5" style={{ opacity: o }}>
        <div style={topBand(180)}>
          <div style={{ ...pill("#fff", C.navy), fontSize: 52, border: `3px solid ${C.navy}` }}>Kiddicraft · Hilary Page</div>
          <div style={{ ...subLine, fontSize: 34 }}>une inspiration — pas une copie</div>
        </div>
        <div style={{ position: "absolute", top: 905, left: 0, right: 0, textAlign: "center", fontSize: 110, lineHeight: 1, color: C.teal, fontWeight: 900, fontFamily: DISPLAY }}>↓</div>
      </div>
    );
  }
  // S6 — patent: title band + animated cross-section (3D companion sits below the card)
  {
    const o = fade(tau, S.s6 + 0.6, S.s7, 0.8, 0.6);
    if (o > 0.01) {
      els.push(
        <div key="s6l" style={{ ...topBand(150), opacity: o }}>
          <div style={{ ...pill(C.blue, "#fff"), fontSize: 50 }}>le brevet tube-et-tenon</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, color: C.blue, background: "#fff", border: `3px solid ${C.blue}`, borderRadius: 14, padding: "8px 24px", fontSize: 36, letterSpacing: 1 }}>US 3,005,282 · 1958 → 1961</div>
        </div>
      );
      els.push(<CrossSection key="s6c" opacity={o} tau={tau} />);
    }
  }
  // S7 — BREVET EXPIRÉ stamp + lock + à partir de 1978
  {
    const o = fade(tau, S.s7 + 0.4, S.s8, 0.4, 0.5);
    if (o > 0.01) {
      const slam = Math.min(1, Math.exp(-Math.pow((tau - (S.s7 + 0.9)) / 0.18, 2)) * 0.4 + 1);
      const stampScale = (tau < S.s7 + 0.9 ? 2.4 - 1.4 * eo(cl((tau - (S.s7 + 0.5)) / 0.4)) : 1) * slam;
      const unlocked = tau > S.s7 + 1.2;
      els.push(
        <div key="s7" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <div style={{ transform: `rotate(-10deg) scale(${stampScale})`, border: `8px solid ${C.red}`, color: C.red, fontFamily: DISPLAY, fontWeight: 900, fontSize: 72, padding: "14px 40px", borderRadius: 16, letterSpacing: 2, background: "rgba(253,246,236,0.92)", whiteSpace: "nowrap" }}>BREVET EXPIRÉ</div>
          </div>
          <div style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <svg width="140" height="150" viewBox="0 0 140 150">
              <path d={unlocked ? "M44 64 V44 a26 26 0 0 1 52 0" : "M44 64 V44 a26 26 0 0 1 52 0 V64"} fill="none" stroke={C.navy} strokeWidth="12" strokeLinecap="round" transform={unlocked ? "rotate(-28 44 64)" : ""} />
              <rect x="30" y="64" width="80" height="64" rx="12" fill={unlocked ? C.teal : C.grey} />
              <circle cx="70" cy="92" r="9" fill="#fff" /><rect x="66" y="92" width="8" height="20" rx="4" fill="#fff" />
            </svg>
          </div>
          <div style={center(360)}><div style={{ ...pill(C.navy, "#fff"), fontSize: 56 }}>à partir de 1978</div>
            <div style={{ ...subLine, fontSize: 34 }}>le brevet tombe dans le domaine public</div></div>
        </div>
      );
    }
  }
  // S8 — compatible brands (neutral label, no brand names)
  {
    const o = fade(tau, S.s8 + 0.3, S.s9, 0.5, 0.4);
    if (o > 0.01) els.push(
      <div key="s8" style={{ ...topBand(190), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 54 }}>des marques compatibles</div>
        <div style={{ ...subLine, fontSize: 34 }}>formes et couleurs variées — mêmes tenons</div>
      </div>
    );
  }
  // S9 — justice symbol + two-panel protection comparison
  {
    const o = fade(tau, S.s9 + 0.5, S.s10, 0.8, 0.6);
    if (o > 0.01) {
      const panel = (title: string, sub: string, mark: string, ok: boolean, draw: React.ReactNode): React.ReactNode => (
        <div style={{ flex: 1, background: "#fff", border: `4px solid ${ok ? C.teal : C.grey}`, borderRadius: 28, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxShadow: "0 12px 34px rgba(29,53,87,0.15)" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: C.navy, textAlign: "center" }}>{title}</div>
          <div style={{ height: 150, display: "flex", alignItems: "center" }}>{draw}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: ok ? C.teal : C.red }}>{mark}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: "#4A5568", textAlign: "center" }}>{sub}</div>
        </div>
      );
      const brickDraw = (
        <svg width="150" height="110" viewBox="0 0 150 110">
          <rect x="18" y="40" width="114" height="54" rx="8" fill={C.red} />
          {[33, 62, 91, 120].map((x) => <rect key={x} x={x - 11} y="24" width="22" height="20" rx="6" fill={C.red} />)}
        </svg>
      );
      const figDraw = (
        <svg width="110" height="130" viewBox="0 0 110 130">
          <circle cx="55" cy="36" r="26" fill="#f3c9a0" />
          <path d="M30 30 a25 18 0 0 1 50 0" fill={C.navy} />
          <circle cx="47" cy="38" r="4" fill="#3a2416" /><circle cx="63" cy="38" r="4" fill="#3a2416" />
          <path d="M46 48 a9 7 0 0 0 18 0" fill="none" stroke="#a0522d" strokeWidth="3" />
          <path d="M30 70 q25 -16 50 0 l6 48 q-31 12 -62 0 Z" fill={C.teal} />
        </svg>
      );
      const jin = eo(cl((tau - (S.s9 + 0.9)) / 0.6));
      const th = Math.sin((tau - S.s9) * 1.3) * 6 * Math.exp(-(tau - S.s9 - 1) * 0.12);
      els.push(
        <div key="s9" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ ...pill(C.navy, "#fff"), fontSize: 46 }}>Ce qui est protégé… ou pas</span>
          </div>
          <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 40, transform: `scale(${0.7 + 0.3 * jin})`, opacity: jin }}>
            <Scales width={400} theta={th} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Gavel tau={tau} strikes={[S.s9 + 2.2, S.s9 + 6.5, S.s9 + 11]} />
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, color: C.navy }}>devant les tribunaux</div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 700, left: 50, right: 50, display: "flex", gap: 30 }}>
            {panel("La forme de la brique", "fonction = libre", "✗  non protégée", false, brickDraw)}
            {panel("La figurine", "design = protégé", "✓  ® marque", true, figDraw)}
          </div>
        </div>
      );
    }
  }
  // S10 — buying tips: range of shapes, balance, price-tag division
  {
    const o = fade(tau, S.s10 + 0.6, S.s11, 0.8, 0.6);
    if (o > 0.01) {
      const t0 = S.s10;
      const shapes: { n: string; el: React.ReactNode }[] = [
        { n: "1×1", el: <IsoBrick cols={1} rows={1} color={C.red} x={54} y={104} /> },
        { n: "1×2", el: <IsoBrick cols={2} rows={1} color={C.yellow} x={40} y={104} /> },
        { n: "2×2", el: <IsoBrick cols={2} rows={2} color={C.teal} x={33} y={104} /> },
        { n: "2×4", el: <IsoBrick cols={4} rows={2} color={C.navy} x={5} y={104} /> },
        { n: "plaque", el: <IsoBrick cols={4} rows={2} hk={0.4} color={C.teal2} x={5} y={104} /> },
        { n: "pente", el: <IsoBrick cols={2} rows={2} color={C.wood} slope x={33} y={104} /> },
      ];
      // balance
      const bal = fade(tau, t0 + 3.4, S.s11, 0.6, 0.6);
      const tilt = 10 * sm((tau - (t0 + 4.8)) / 1.2) + Math.sin((tau - t0) * 1.6) * 1.2;
      const hi = sm((tau - (t0 + 5.6)) / 0.5);
      const boxNode = (
        <g>
          <rect x="-58" y="-78" width="116" height="78" rx="8" fill={C.red} stroke={C.navy} strokeWidth="4" />
          <rect x="-58" y="-78" width="116" height="20" fill={C.navy} />
          <text x="0" y="-22" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="34" fill="#fff">€€€</text>
        </g>
      );
      const oneNode = (
        <g>
          <IsoBrick cols={2} rows={2} color={C.teal} u={30} x={-44} y={0} />
          <text x="58" y="-18" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="38" fill={C.navy}>€</text>
        </g>
      );
      // price tag
      const tg = t0 + 7.4;
      const tagIn = eo(cl((tau - tg) / 0.7));
      const tagScale = 0.45 + 0.55 * tagIn + 0.06 * Math.sin(cl((tau - tg) / 0.9) * Math.PI);
      const pieces = Math.round(600 * sm((tau - (tg + 0.9)) / 1.3));
      const resU = sm((tau - (tg + 2.5)) / 1.1);
      const resShow = cl((tau - (tg + 2.4)) / 0.25);
      const resPop = pop(tau, tg + 3.6, 0.1, 0.12);
      const tipShow = fade(tau, tg + 4.4, S.s11, 0.5, 0.6);
      const chips = fade(tau, t0 + 2.2, S.s11, 0.6, 0.6);
      els.push(
        <div key="s10" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ ...pill(C.navy, "#fff"), fontSize: 50 }}>Bien acheter</span>
          </div>
          {/* (a) range of shapes */}
          <div style={{ position: "absolute", top: 275, left: 50, right: 50, background: "#fff", border: `4px solid ${C.grey}`, borderRadius: 26, padding: "14px 10px 12px", display: "flex", justifyContent: "space-between", boxShadow: "0 10px 28px rgba(29,53,87,0.13)", boxSizing: "border-box" }}>
            {shapes.map((sh, i) => {
              const k = eo(cl((tau - (t0 + 1.0 + i * 0.25)) / 0.4));
              return (
                <div key={sh.n} style={{ width: 156, display: "flex", flexDirection: "column", alignItems: "center", opacity: k, transform: `scale(${0.6 + 0.4 * k})` }}>
                  <svg width="156" height="114" viewBox="0 0 156 114">{sh.el}</svg>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, color: C.navy }}>{sh.n}</div>
                </div>
              );
            })}
          </div>
          {/* (b) balance: total price vs price per piece */}
          <div style={{ position: "absolute", top: 480, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: bal }}>
            <Scales width={800} theta={tilt} left={boxNode} right={oneNode} labels={["prix total", "prix à la pièce"]} hi={hi} />
          </div>
          {/* (c) zoom on the price tag: total ÷ pieces = price per brick */}
          {tau > tg && (
            <div style={{ position: "absolute", top: 955, left: 50, right: 50, height: 400, transform: `scale(${tagScale})`, transformOrigin: "30% 0%", opacity: cl((tau - tg) / 0.25), background: "#fff", border: `5px solid ${C.teal}`, borderRadius: 30, boxShadow: "0 14px 38px rgba(29,53,87,0.2)", boxSizing: "border-box", padding: "22px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <svg width="250" height="116" viewBox="0 0 250 116">
                  <path d="M54 6 H236 a10 10 0 0 1 10 10 V100 a10 10 0 0 1 -10 10 H54 L6 58 Z" fill={C.yellow} stroke={C.navy} strokeWidth="5" strokeLinejoin="round" />
                  <circle cx="44" cy="58" r="10" fill="#fff" stroke={C.navy} strokeWidth="4" />
                  <text x="150" y="74" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="46" fill={C.navy}>59,99 €</text>
                </svg>
                <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, color: C.red, lineHeight: 1 }}>÷</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 250 }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 70, color: C.navy, lineHeight: 1 }}>{pieces}</div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: C.navy }}>pièces</div>
                </div>
              </div>
              <div style={{ opacity: resShow, transform: `scale(${resPop})`, display: "flex", alignItems: "baseline", gap: 16, background: C.teal, borderRadius: 22, padding: "8px 34px", marginTop: 6 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 60, color: "#fff" }}>=</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 82, color: "#fff", lineHeight: 1.1 }}>{euro(0.1 * resU)} €</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: "#fff" }}>/ pièce</span>
              </div>
              <div style={{ opacity: tipShow, fontFamily: DISPLAY, fontWeight: 800, fontSize: 31, color: "#15594F", marginTop: 8 }}>bon plan : fins de série &amp; soldes</div>
            </div>
          )}
          <div style={{ position: "absolute", top: 1385, left: 50, right: 50, display: "flex", gap: 14, justifyContent: "center", opacity: chips }}>
            {["tolérances", "force de serrage", "licences"].map((t) => (
              <div key={t} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: C.navy, background: "#fff", border: `2px solid ${C.grey}`, borderRadius: 999, padding: "10px 24px", whiteSpace: "nowrap" }}>{t}</div>
            ))}
          </div>
        </div>
      );
    }
  }
  return <>{els}</>;
};

// end card — a saying about play (Danish + French), bricks lock below it
const EndCard: React.FC<{ tau: number }> = ({ tau }) => {
  const o = fade(tau, 81.4, S.end, 1.0, 0.01);
  if (o <= 0.01) return null;
  const fr = sm((tau - 82.6) / 0.8);
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: "absolute", top: 160, left: 40, right: 40, background: "rgba(255,255,255,0.94)", border: `4px solid ${C.yellow}`, borderRadius: 34, padding: "30px 20px 34px", textAlign: "center", boxShadow: "0 14px 38px rgba(29,53,87,0.16)", boxSizing: "border-box" }}>
        <div style={{ display: "inline-block", fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, color: "#fff", background: C.teal, borderRadius: 999, padding: "8px 26px", letterSpacing: 1 }}>UN DICTON SUR LE JEU</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, color: C.navy, lineHeight: 1.15, marginTop: 22, whiteSpace: "nowrap" }}>« Leg er barnets arbejde »</div>
        <div style={{ width: 120, height: 6, borderRadius: 3, background: C.red, margin: "20px auto 18px" }} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: C.red, opacity: fr, transform: `translateY(${(1 - fr) * 14}px)` }}>« Le jeu est le travail de l'enfant. »</div>
      </div>
      <div style={{ ...center(410) }}>
        <div style={{ ...subLine, fontSize: 36 }}>De « leg godt » à la brique</div>
      </div>
    </div>
  );
};

const Vignette: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 42%, transparent 62%, rgba(29,53,87,0.14) 100%)" }} />
);
const Grain: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{
    position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='${(frame * 7) % 90}'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.03'/></svg>`)}")`,
    mixBlendMode: "multiply",
  }} />
);

// ======================= composition =======================
export const LegoShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tau = frame / fps;
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", background: C.cream }}>
      <ThreeCanvas width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Scene3D />
      </ThreeCanvas>
      <Overlays tau={tau} />
      <EndCard tau={tau} />
      <Vignette />
      <Grain frame={frame} />
      <Audio src={staticFile("voice_lego_fr.wav")} />
    </div>
  );
};
