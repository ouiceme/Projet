/**
 * "The Wave That Outran the Horses" — Boston Molasses Flood 1919
 * 2D characters in a 3D painted world. Rendered with Remotion + three.js.
 * 1080x1920 @ 30 fps, 66.78 s (2004 frames).
 *
 * Scene: Commercial Street, Boston North End, 15 Jan 1919.
 *   - A massive steel molasses tank (90 ft wide, 50 ft tall) on the waterfront.
 *   - Elevated railway runs overhead.
 *   - 1919 brick warehouse buildings.
 *   - The molasses wave sweeps the street.
 */
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---- story timing helpers ----------------
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

// Story constants
const BURST_TAU = 15.8;  // tank tears open (s)
const WAVE_END_TAU = 23.0;
const RIVET1_TAU = 12.3;

const waveFront = (tau: number) =>
  tau < BURST_TAU ? 20 : lin([[BURST_TAU, 20], [WAVE_END_TAU, -60]], tau);
const waveH = (tau: number) =>
  tau < BURST_TAU ? 0 : lin([[BURST_TAU, 7.6], [BURST_TAU + 1.5, 7.6], [WAVE_END_TAU, 1.4]], tau);
const tankBurst = (tau: number) =>
  tau < RIVET1_TAU ? 0 :
  tau < BURST_TAU ? lin([[RIVET1_TAU, 0], [12.9, 0.1], [BURST_TAU, 1]], tau) : 1;

// ---- shot / camera ----------------
type V3 = [number, number, number];
type Cam = { pos: V3; look: V3; fov: number };

const camForShot = (tau: number): Cam => {
  if (tau < 4.3) {
    const t = cl(tau / 4.3);
    return { pos: [-3 - t * 0.4, 1.6 - t * 0.1, -18 + t * 2], look: [0, 1.4, 22], fov: 44 };
  } else if (tau < 10.3) {
    const t = cl((tau - 4.3) / 6);
    const y = 28 - t * 6;
    return { pos: [4, y, -15 - t * 5], look: [3, 1.5, 22], fov: 44 };
  } else if (tau < 14.3) {
    const t = cl((tau - 10.3) / 4);
    return { pos: [4 - 13.7 + 1.5, 9 + t * 0.5, 22 - 3], look: [4 - 13.7 + 0.3, 9, 22], fov: 36 };
  } else if (tau < 16.0) {
    const jitter = tau > 15.0 ? Math.sin(tau * 50) * 0.015 : 0;
    return { pos: [4 - 13.7 + 0.8, 5.5, 22 - 1.2 + jitter], look: [4 - 13.7 + 0.1, 5.5, 22], fov: 32 };
  } else if (tau < 20.5) {
    const t = cl((tau - 16.0) / 4.5);
    return { pos: [14 - t * 4, 5 - t, -25 - t * 5], look: [0, 1.8, 0], fov: 50 };
  } else if (tau < 24.0) {
    const shake = tau < 23.0 ? Math.sin(tau * 40) * 0.03 * cl((23 - tau) / 2) : 0;
    return { pos: [3.5 + shake, 1.5, -8], look: [-1, 0.8 + shake, 0], fov: 42 };
  } else if (tau < 27.5) {
    const t = cl((tau - 24.0) / 3.5);
    return { pos: [6, 7 - t * 0.5, -15], look: [0, 5.5, 0], fov: 44 };
  } else if (tau < 31.5) {
    return { pos: [-8, 3.5, -40], look: [0, 0.5, -60], fov: 42 };
  } else if (tau < 44.0) {
    const t = cl((tau - 31.5) / 12.5);
    return { pos: [4, 18 - t * 8, -30], look: [3, 1, 22], fov: 40 };
  } else if (tau < 54.0) {
    const t = cl((tau - 44.0) / 10);
    return { pos: [-4 + t * 0.5, 1.9 - t * 0.1, -14 + t * 2], look: [0, 1.6, -6], fov: 42 };
  } else {
    const t = cl((tau - 54.0) / 12.78);
    return { pos: [5 - t * 4, 2.8 - t, -18 + t * 8], look: [0, 1.5 + t * 0.2, -4], fov: 44 - t * 6 };
  }
};

const Sky: React.FC<{ tau: number }> = ({ tau }) => {
  const isGolden = tau > 31.5 && tau < 54.0;
  const skyCol = isGolden ? "#ffb347" : "#87ceeb";
  const horizCol = isGolden ? "#ff6b35" : "#c8e6f5";
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 8);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const sky = new THREE.Color(skyCol);
    const horiz = new THREE.Color(horizCol);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const c = sky.clone().lerp(horiz, 1 - (y + 0.5));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [skyCol, horizCol]);
  return (
    <mesh position={[0, 60, 150]} rotation={[-0.3, 0, 0]}>
      <primitive object={geo} />
      <meshBasicMaterial vertexColors side={THREE.BackSide} />
    </mesh>
  );
};

const Street: React.FC = () => (
  <>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[80, 100]} />
      <meshLambertMaterial color="#7a7268" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -65]}>
      <planeGeometry args={[80, 60]} />
      <meshLambertMaterial color="#1a4a6e" />
    </mesh>
  </>
);

const Building: React.FC<{ x: number; z: number; w: number; d: number; h: number; color?: string }> = ({ x, z, w, d, h, color = "#8b6b52" }) => {
  const brickColor = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group position={[x, h / 2, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshLambertMaterial color={brickColor} />
      </mesh>
      {Array.from({ length: Math.floor(h / 2.5) }, (_, row) =>
        Array.from({ length: Math.floor(w / 2.5) }, (_, col) => {
          const wx = -w / 2 + 1.2 + col * 2.5;
          const wy = -h / 2 + 1.2 + row * 2.5;
          if (Math.abs(wx) > w / 2 - 0.5 || wy > h / 2 - 0.5) return null;
          return (
            <mesh key={`w-${row}-${col}`} position={[wx, wy, d / 2 + 0.01]}>
              <planeGeometry args={[0.8, 1.1]} />
              <meshBasicMaterial color="#c8d8e8" />
            </mesh>
          );
        })
      )}
    </group>
  );
};

const MolassesTank: React.FC<{ tau: number }> = ({ tau }) => {
  const burst = tankBurst(tau);
  const r = 13.7, h = 15.2;
  const scaleX = 1 - burst * 0.15;
  const scaleZ = 1 + burst * 0.08;
  return (
    <group position={[4, h / 2, 22]}>
      <mesh castShadow scale={[scaleX, 1 - burst * 0.05, scaleZ]}>
        <cylinderGeometry args={[r, r, h, 32]} />
        <meshLambertMaterial color={burst > 0.5 ? "#4a3020" : "#6b7280"} />
      </mesh>
      <mesh position={[0, h / 2, 0]} scale={[scaleX, 1, scaleZ]}>
        <cylinderGeometry args={[r * 0.98, r, 0.3, 32]} />
        <meshLambertMaterial color="#555e6b" />
      </mesh>
      {[0.3, 0.5, 0.7].map((v, i) => (
        <mesh key={i} position={[0, -h / 2 + h * v, 0]} scale={[scaleX, 1, scaleZ]}>
          <torusGeometry args={[r + 0.12, 0.08, 6, 32]} />
          <meshLambertMaterial color="#444" />
        </mesh>
      ))}
      {burst > 0.1 && (
        <mesh position={[-r * scaleX + 0.1, -h * 0.1, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.3, h * 0.4 * burst, 0.3]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      )}
    </group>
  );
};

const MolassesWave: React.FC<{ tau: number }> = ({ tau }) => {
  const front = waveFront(tau);
  const height = waveH(tau);
  if (height < 0.05) return null;
  const depth = 12 + (tau - BURST_TAU) * 4;
  const waveGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, Math.max(1, depth), 20, 20);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const x = pos.getX(i);
      const relZ = (z + depth / 2) / depth;
      const h = height * Math.max(0, Math.min(1, 1 - relZ)) * Math.sqrt(1 - Math.min(1, relZ));
      const bulge = height * 0.3 * Math.exp(-relZ * 3) * (1 - Math.abs(x / 35));
      pos.setY(i, Math.max(0, h + bulge));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [depth, height]);
  return (
    <group position={[0, 0, front + depth / 2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={waveGeo} />
        <meshLambertMaterial color="#8B6914" transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, height * 0.6, -depth / 2 + 0.5]}>
        <boxGeometry args={[70, height * 0.4, 0.4]} />
        <meshBasicMaterial color="#c8a850" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

const ElevatedRailway: React.FC<{ tau: number }> = ({ tau }) => {
  const collapse = cl((tau - 26.5) / 2.5);
  const tilt = collapse * 0.6;
  const drop = collapse * 2;
  return (
    <group rotation={[0, 0, -tilt]} position={[7, 0, 0]}>
      {[-15, -5, 5, 15].map((z, i) => (
        <mesh key={i} position={[0, 2.9 - drop * 0.5, z]}>
          <boxGeometry args={[0.4, 5.8 + drop, 0.4]} />
          <meshLambertMaterial color="#2a2a2a" />
        </mesh>
      ))}
      <mesh position={[0, 5.8 - drop, 0]}>
        <boxGeometry args={[0.6, 0.4, 36]} />
        <meshLambertMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
};

const LampPost: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 2.5, 0]}>
      <cylinderGeometry args={[0.05, 0.08, 5, 6]} />
      <meshLambertMaterial color="#2a2a35" />
    </mesh>
    <mesh position={[0.4, 4.9, 0]}>
      <sphereGeometry args={[0.2, 8, 6]} />
      <meshBasicMaterial color="#fffcdc" />
    </mesh>
  </group>
);

const Figure: React.FC<{ x: number; z: number; tau: number; outfit: "worker" | "woman" | "horse"; fleeing?: boolean; speed?: number }> = ({ x, z, tau, outfit, fleeing, speed = 1 }) => {
  const cv = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 256;
    const g = c.getContext("2d")!;
    if (outfit === "horse") {
      g.fillStyle = "#8b6240";
      g.beginPath(); g.ellipse(64, 160, 50, 28, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(100, 130, 22, 16, 0.5, 0, Math.PI * 2); g.fill();
      g.fillRect(30, 180, 10, 50); g.fillRect(50, 180, 10, 50);
      g.fillRect(75, 180, 10, 50); g.fillRect(95, 180, 10, 50);
      g.fillStyle = "#000"; g.beginPath(); g.arc(108, 125, 4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#1a0d05"; g.lineWidth = 3;
      g.beginPath(); g.ellipse(64, 160, 50, 28, 0, 0, Math.PI * 2); g.stroke();
    } else if (outfit === "worker") {
      g.fillStyle = "#ffe2c2";
      g.beginPath(); g.arc(64, 48, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2a3a4a";
      g.beginPath(); g.ellipse(64, 36, 28, 10, 0, Math.PI, 0); g.fill();
      g.fillRect(36, 36, 56, 12);
      g.fillStyle = "#3a5a4a";
      g.beginPath(); g.roundRect(44, 72, 40, 70, 4); g.fill();
      g.fillRect(24, 72, 20, 55); g.fillRect(84, 72, 20, 55);
      g.fillStyle = "#2a3a2a";
      g.fillRect(44, 140, 16, 65); g.fillRect(68, 140, 16, 65);
      g.strokeStyle = "#1a0d05"; g.lineWidth = 3;
      g.beginPath(); g.arc(64, 48, 24, 0, Math.PI * 2); g.stroke();
    } else {
      g.fillStyle = "#ffe2c2";
      g.beginPath(); g.arc(64, 45, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a1a35";
      g.beginPath(); g.ellipse(64, 32, 26, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8a3a4a";
      g.beginPath(); g.moveTo(44, 68); g.lineTo(84, 68); g.lineTo(96, 200); g.lineTo(32, 200); g.closePath(); g.fill();
      g.strokeStyle = "#1a0d05"; g.lineWidth = 3;
      g.beginPath(); g.arc(64, 45, 22, 0, Math.PI * 2); g.stroke();
    }
    return c;
  }, [outfit]);
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }, [cv]);
  const posZ = fleeing && tau > BURST_TAU ? z - cl((tau - BURST_TAU) / 4) * speed * 8 : z;
  const h = outfit === "horse" ? 1.5 : 2.0;
  return (
    <mesh position={[x, h / 2, posZ]}>
      <planeGeometry args={[h * 0.6, h]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
};

const MolassesPool: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < BURST_TAU + 2) return null;
  const spread = cl((tau - BURST_TAU - 2) / 8);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[60 * spread, 50 * spread, 1, 1]} />
      <meshLambertMaterial color="#5c3a0a" transparent opacity={0.85} />
    </mesh>
  );
};

const WaterBalloon: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < 36 || tau > 50) return null;
  const appear = cl((tau - 36) / 1.5);
  const swell = 1 + cl((tau - 38) / 6) * 0.18;
  const pop = cl((tau - 46) / 1);
  return (
    <group position={[2, 2, -6]} scale={appear}>
      {pop < 0.9 && (
        <mesh scale={[swell, swell, swell]}>
          <sphereGeometry args={[0.6, 16, 12]} />
          <meshLambertMaterial color="#5ba3e8" transparent opacity={0.75} />
        </mesh>
      )}
      {pop > 0.5 && [-1, 0, 1].map((dx, i) => (
        <mesh key={i} position={[dx * 0.8, (i - 1) * 0.5, 0]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshBasicMaterial color="#5ba3e8" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

const SafetySign: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < 44 || tau > 60) return null;
  const appear = cl((tau - 44) / 2);
  const cv = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff8dc"; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "#8b2222"; g.lineWidth = 4; g.strokeRect(2, 2, 252, 124);
    g.fillStyle = "#8b2222"; g.font = "bold 20px serif"; g.textAlign = "center";
    g.fillText("SAFETY INSPECTION", 128, 42); g.fillText("REQUIRED", 128, 72);
    g.font = "16px serif"; g.fillStyle = "#333";
    g.fillText("— Massachusetts 1920 —", 128, 105);
    return c;
  }, []);
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }, [cv]);
  return (
    <mesh position={[-3.5, 4.5, -6.1]} scale={appear}>
      <planeGeometry args={[2.5, 1.2]} />
      <meshBasicMaterial map={tex} transparent opacity={appear} />
    </mesh>
  );
};

const CameraRig: React.FC<{ tau: number }> = ({ tau }) => {
  const { camera } = useThree();
  const cam = camForShot(tau);
  const p = camera as THREE.PerspectiveCamera;
  p.position.set(...cam.pos);
  p.fov = cam.fov;
  p.aspect = 1080 / 1920;
  p.updateProjectionMatrix();
  p.lookAt(...cam.look);
  return null;
};

const MolassesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const tau = frame / FPS;
  const isGolden = tau > 31.5 && tau < 54;
  return (
    <>
      <CameraRig tau={tau} />
      <ambientLight intensity={isGolden ? 0.6 : 0.4} />
      <directionalLight position={[isGolden ? 2 : -1, 10, -5]} intensity={1.2} color={isGolden ? "#ffcc88" : "#fff5e0"} castShadow />
      <Sky tau={tau} />
      <Street />
      <Building x={-18} z={-8} w={8} d={6} h={12} color="#8b6b52" />
      <Building x={-10} z={-5} w={6} d={5} h={16} color="#7a5f48" />
      <Building x={-4}  z={-6} w={5} d={5} h={10} color="#9a7a62" />
      <Building x={4}   z={-5} w={6} d={5} h={8}  color="#8b6b52" />
      <Building x={12}  z={-6} w={7} d={6} h={14} color="#7a5844" />
      <Building x={20}  z={-4} w={6} d={4} h={11} color="#8e6e54" />
      <Building x={-16} z={16} w={8} d={5} h={9}  color="#7a6050" />
      <Building x={-8}  z={18} w={6} d={5} h={12} color="#8b7060" />
      <Building x={-20} z={5}  w={10} d={8} h={7} color="#6b5844" />
      <MolassesTank tau={tau} />
      <ElevatedRailway tau={tau} />
      <LampPost x={-6} z={-10} />
      <LampPost x={-6} z={-3} />
      <LampPost x={6}  z={-10} />
      {tau < 25 && <>
        <Figure x={-3} z={-5} tau={tau} outfit="worker" fleeing={tau > BURST_TAU} speed={1.2} />
        <Figure x={2}  z={-3} tau={tau} outfit="woman"  fleeing={tau > BURST_TAU} speed={0.9} />
        <Figure x={-7} z={2}  tau={tau} outfit="worker" fleeing={tau > BURST_TAU} speed={1.0} />
        <Figure x={5}  z={1}  tau={tau} outfit="worker" fleeing={tau > BURST_TAU} speed={1.3} />
        <Figure x={-2} z={8}  tau={tau} outfit="horse"  fleeing={tau > BURST_TAU} speed={2.0} />
        <Figure x={3}  z={6}  tau={tau} outfit="horse"  fleeing={tau > BURST_TAU} speed={2.5} />
      </>}
      <MolassesWave tau={tau} />
      <MolassesPool tau={tau} />
      <WaterBalloon tau={tau} />
      <SafetySign tau={tau} />
    </>
  );
};

const CAPTIONS = [
  { a: 0,    b: 4.3,  text: "A wave of molasses once rolled through Boston\nat thirty-five miles an hour." },
  { a: 4.3,  b: 10.3, text: "It's January 1919, and a massive steel tank\non Commercial Street holds two and a half\nmillion gallons of syrup." },
  { a: 10.3, b: 14.3, text: "The day is unseasonably warm,\nand the cold molasses inside starts to heat up." },
  { a: 14.3, b: 16.0, text: "Warm liquid expands. The tank does not.\nA rivet pops. Then another." },
  { a: 16.0, b: 20.5, text: "Then the whole side of the tank tears open\nin one enormous groan." },
  { a: 20.5, b: 24.0, text: "A wall of molasses twenty-five feet high\nsweeps down the street, fast enough\nto outrun the horses tied at the kerb." },
  { a: 24.0, b: 27.5, text: "It flattens buildings. It buries an elevated railway.\nIt drowns twenty-one people." },
  { a: 27.5, b: 31.5, text: "Luckily, the harbour was right there to drain it.\nUnluckily, the harbour ran brown for months." },
  { a: 31.5, b: 36.0, text: "You see, liquids push harder on their container\nthe warmer they get." },
  { a: 36.0, b: 44.0, text: "Like a water balloon left in the sun:\nthe water swells, but the skin stays the same size.\nSomething has to give." },
  { a: 44.0, b: 54.0, text: "That tank had never been pressure-tested. Not once.\nAfter the flood, Massachusetts passed the first\nmodern construction safety laws in America." },
  { a: 54.0, b: 66.78, text: "So the next time you smell molasses\non a Boston summer day,\nthat is not your imagination." },
];

const Subtitles: React.FC<{ tau: number }> = ({ tau }) => {
  const cap = CAPTIONS.find(c => tau >= c.a && tau < c.b);
  if (!cap) return null;
  const alpha = Math.min(cl((tau - cap.a) / 0.3), cl((cap.b - tau) / 0.3));
  return (
    <div style={{ position: "absolute", bottom: 160, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: alpha, padding: "0 40px" }}>
      {cap.text.split("\n").map((line, i) => (
        <div key={i} style={{ fontFamily: "'Georgia', serif", fontSize: 42, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.9)", textAlign: "center", lineHeight: 1.35, fontWeight: "bold" }}>
          {line}
        </div>
      ))}
    </div>
  );
};

const TitleCard: React.FC<{ tau: number }> = ({ tau }) => {
  if (tau < 60.0) return null;
  const a = cl((tau - 60.0) / 1.5);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 300, opacity: a, background: a > 0.95 ? "rgba(0,0,0,0.3)" : "transparent" }}>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 56, color: "#fff", textShadow: "0 2px 12px #000", fontWeight: "bold", textAlign: "center", padding: "0 40px" }}>The Great<br />Boston Molasses Flood</div>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 36, color: "#ffd700", textShadow: "0 2px 8px #000", marginTop: 24, textAlign: "center" }}>15 January 1919</div>
      <div style={{ fontFamily: "sans-serif", fontSize: 28, color: "#ccc", textShadow: "0 2px 8px #000", marginTop: 48, textAlign: "center", padding: "0 60px", lineHeight: 1.5 }}>21 killed · 150 injured<br />First construction safety laws in America</div>
    </div>
  );
};

const FilmGrain: React.FC<{ frame: number }> = ({ frame }) => {
  const seed = frame * 1327 + 4919;
  return <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${seed % 99}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.07'/></svg>`)}")`, backgroundSize: "200px 200px", mixBlendMode: "overlay" as const, pointerEvents: "none" }} />;
};

export const MolassesShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tau = frame / fps;
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <MolassesScene />
      </ThreeCanvas>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />
      <FilmGrain frame={frame} />
      <Subtitles tau={tau} />
      <TitleCard tau={tau} />
      <Audio src={staticFile("voice.wav")} />
    </div>
  );
};
