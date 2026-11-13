// DOM teaching cards of LEGO v4 (drawn over the 3D canvas, so no object can ever hide a label). Content and timing
// are v3's; the look is restyled for the inked world: solid pills with a plum ink border and a hard offset shadow,
// text contrast >= 4.5:1 everywhere (dark red / dark teal for text, bright colours for shapes only), manga speed
// lines + halftone dots on the click cues (never a full-screen flash). Labels that belong to 3D things follow them
// through story.project(). No burned subtitles. No wordmark, no logo.
import React from "react";
import * as THREE from "three";
import { S, SNAP, FPS, cl, sm, eo, fade, pop, clutchOff, project, balTilt, BH } from "./story";

const INK = "#241726";
const C = {
  red: "#C8242F", yellow: "#FFB703", teal: "#2A9D8F", tealD: "#15594F", teal2: "#219EBC",
  navy: "#1D3557", cream: "#FDF6EC", grey: "#8D99AE", blue: "#13426B", wood: "#C98A4B", woodDark: "#9A6534",
};
const DISPLAY = `"Poppins","Nunito","Liberation Sans","DejaVu Sans",sans-serif`;
const MONO = `"JetBrains Mono","DejaVu Sans Mono",monospace`;
const HARD = "6px 8px 0 rgba(36,23,38,0.85)";
const pill = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block", background: bg, color, fontFamily: DISPLAY, fontWeight: 800, borderRadius: 26, padding: "16px 36px",
  border: `5px solid ${INK}`, boxShadow: HARD, letterSpacing: 0.5,
});
const subLine: React.CSSProperties = {
  display: "inline-block", fontFamily: DISPLAY, fontWeight: 700, color: C.navy, background: C.cream, borderRadius: 16, padding: "8px 22px",
  border: `4px solid ${INK}`, boxShadow: "4px 5px 0 rgba(36,23,38,0.85)",
};
const card = (border = INK): React.CSSProperties => ({ background: "#fff", border: `5px solid ${border}`, borderRadius: 28, boxShadow: HARD, boxSizing: "border-box" });
const topBand = (top: number): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "0 50px", textAlign: "center",
});
const euro = (v: number) => v.toFixed(2).replace(".", ",");

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
    <div style={{ position: "absolute", top: 150, right: 50, width: 400, opacity, background: "#fff", border: `5px solid ${INK}`, borderRadius: 26, padding: 8, boxShadow: HARD, boxSizing: "border-box" }}>
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
    <div style={{ position: "absolute", top: 272, left: 50, right: 50, opacity, transform: "scale(0.88)", transformOrigin: "50% 0%", background: "#F2F7FB", border: `6px solid ${INK}`, borderRadius: 28, boxShadow: HARD, boxSizing: "border-box", padding: "6px 6px 0" }}>
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


// ---------- manga accents: speed lines + halftone on a cue (around a point, never a full-frame flash) ----------
const Burst: React.FC<{ tau: number; t0: number; at: [number, number]; r?: number; label?: boolean }> = ({ tau, t0, at, r = 250, label = true }) => {
  const d = tau - t0;
  if (d < -0.02 || d > 0.85) return null;
  const u = cl(d / 0.3), o = d < 0.45 ? 1 : cl(1 - (d - 0.45) / 0.4), n = 22;
  return (
    <div style={{ position: "absolute", left: at[0] - r, top: at[1] - r, width: 2 * r, height: 2 * r, opacity: o, pointerEvents: "none" }}>
      <svg width={2 * r} height={2 * r} viewBox="-100 -100 200 200" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`ht${t0}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.7" fill={INK} /></pattern>
          <radialGradient id={`hm${t0}`}><stop offset="0.45" stopColor="#000" /><stop offset="0.62" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
          <mask id={`mk${t0}`}><circle r="100" fill={`url(#hm${t0})`} /></mask>
        </defs>
        <circle r="96" fill={`url(#ht${t0})`} mask={`url(#mk${t0})`} opacity={0.5 * (1 - u * 0.4)} />
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + 0.13, r0 = 44 + 16 * u + (i % 3) * 5, r1 = r0 + 16 + (i % 2) * 14;
          return <path key={i} d={`M${r0 * Math.cos(a - 0.03)} ${r0 * Math.sin(a - 0.03)} L${r1 * Math.cos(a)} ${r1 * Math.sin(a)} L${r0 * Math.cos(a + 0.03)} ${r0 * Math.sin(a + 0.03)} Z`} fill={i % 2 ? C.yellow : INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />;
        })}
      </svg>
      {label && (
        <div style={{ position: "absolute", left: r + 40, top: r - 210, transform: `rotate(-9deg) scale(${0.7 + 0.3 * u + (pop(tau, t0, 0.1) - 1)})`, ...pill(C.yellow, C.navy), fontWeight: 900, fontSize: 50, padding: "8px 26px", whiteSpace: "nowrap" }}>CLIC !</div>
      )}
    </div>
  );
};
/** a pill centred on a projected 3D point */
const Tag: React.FC<{ at: [number, number]; dy?: number; o?: number; bg?: string; fg?: string; size?: number; children: React.ReactNode }> = ({ at, dy = 0, o = 1, bg = "#fff", fg = C.navy, size = 34, children }) => (
  <div style={{ position: "absolute", left: at[0], top: at[1] + dy, transform: "translate(-50%, -50%)", opacity: o }}>
    <div style={{ ...pill(bg, fg), fontSize: size, padding: "6px 20px", borderRadius: 18, borderWidth: 4, boxShadow: "4px 5px 0 rgba(36,23,38,0.85)", whiteSpace: "nowrap" }}>{children}</div>
  </div>
);

export const Overlays: React.FC<{ tau: number }> = ({ tau }) => {
  const f = Math.round(tau * FPS), els: React.ReactNode[] = [];
  // S1 hook: the question, the click, the price tags
  if (tau < S.s2) {
    const o = fade(tau, 0.25, S.s2 - 0.05, 0.35, 0.3), q = fade(tau, 3.9, S.s2 - 0.05, 0.3, 0.3);
    els.push(<div key="s1" style={{ ...topBand(170), opacity: o }}><div style={{ ...pill(C.navy, "#fff"), fontSize: 60 }}>Pourquoi si cher ?</div></div>);
    els.push(<Burst key="s1b" tau={tau} t0={SNAP.hook} at={project(f, [0, 0.45 + BH, 0.1])} />);
    if (q > 0.01) {
      els.push(<Tag key="s1t" at={project(f, [0.02, 0.45 + 2 * BH, 0.1])} dy={-70} o={q} bg={C.yellow} size={40}>€€€</Tag>);
      els.push(<Tag key="s1u" at={project(f, [-0.3, 0.45 + BH, 0.16])} dy={-62} o={q} size={40}>€</Tag>);
      els.push(<div key="s1q" style={{ ...topBand(300), opacity: q }}><div style={{ ...subLine, fontSize: 38 }}>…et des briques compatibles, presque pareilles ?</div></div>);
    }
  }
  // S2 — 1932 · Billund + Europe map
  {
    const o = fade(tau, S.s2 + 0.8, S.s3, 0.7, 0.4);
    if (o > 0.01) {
      els.push(
        <div key="s2l" style={{ position: "absolute", top: 210, left: 50, width: 550, opacity: o, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
          <div style={{ ...pill(C.navy, "#fff"), fontSize: 54, padding: "14px 28px", whiteSpace: "nowrap" }}>1932 · Billund</div>
          <div style={{ ...subLine, fontSize: 36, textAlign: "left" }}>un atelier de jouets<br />en bois, au Danemark</div>
        </div>
      );
      els.push(<EuropeMap key="s2m" opacity={o} tau={tau} />);
    }
  }
  // S3 — « leg godt »: the two Danish words close up; LE + GO are the letters the name keeps (no wordmark shown)
  {
    const o = fade(tau, S.s3 + 0.2, S.s4, 0.4, 0.4);
    if (o > 0.01) {
      const merge = eo(cl((tau - (S.s3 + 1.2)) / 1.4)), hi = sm((tau - (S.s3 + 2.3)) / 0.4);
      const w = (a: string, b: string, col: string) => (
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 104, color: C.navy }}>
          <span style={{ color: col, borderBottom: `${10 * hi}px solid ${C.yellow}` }}>{a}</span><span style={{ opacity: 1 - 0.45 * hi }}>{b}</span>
        </span>
      );
      els.push(
        <div key="s3" style={{ position: "absolute", top: 180, left: 0, right: 0, textAlign: "center", opacity: o }}>
          <div style={{ ...card(), display: "inline-flex", alignItems: "center", gap: 20 + (1 - merge) * 110, padding: "10px 46px 18px", transform: `scale(${pop(tau, S.s3 + 2.3, 0.05, 0.12)})` }}>
            {w("LE", "G", C.red)}{w("GO", "DT", C.tealD)}
          </div>
          <div style={{ marginTop: 26 }}><span style={{ ...subLine, fontSize: 42 }}>« leg godt » = « joue bien »</span></div>
        </div>
      );
    }
  }
  // S4 — ~1949 plastique
  {
    const o = fade(tau, S.s4 + 1.0, S.s5, 0.5, 0.4);
    if (o > 0.01) els.push(<div key="s4" style={{ ...topBand(200), opacity: o }}><div style={{ ...pill(C.tealD, "#fff"), fontSize: 64 }}>~1949</div>
      <div style={{ ...subLine, fontSize: 40 }}>l'atelier passe au plastique</div></div>);
  }
  // S5 — Kiddicraft · Hilary Page
  {
    const o = fade(tau, S.s5 + 0.9, S.s6, 0.6, 0.4);
    if (o > 0.01) {
      const a = project(f, [-1.12, 0.98, 0.08]), b = project(f, [-0.5, 0.98, 0.08]), k = eo(cl((tau - (S.s5 + 2.0)) / 0.9));
      els.push(
        <div key="s5" style={{ opacity: o }}>
          <div style={topBand(180)}>
            <div style={{ ...pill("#fff", C.navy), fontSize: 52 }}>Kiddicraft · Hilary Page</div>
            <div style={{ ...subLine, fontSize: 36 }}>une inspiration — pas une copie</div>
          </div>
          <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
            <path d={`M${a[0]} ${a[1] - 22} Q${(a[0] + b[0]) / 2} ${a[1] - 150} ${a[0] + (b[0] - a[0]) * k} ${a[1] - 22 - 128 * 4 * k * (1 - k) * 0.5}`} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" opacity={k > 0.02 ? 1 : 0} />
            <path d={`M${a[0]} ${a[1] - 22} Q${(a[0] + b[0]) / 2} ${a[1] - 150} ${a[0] + (b[0] - a[0]) * k} ${a[1] - 22 - 128 * 4 * k * (1 - k) * 0.5}`} fill="none" stroke={C.yellow} strokeWidth="6" strokeLinecap="round" opacity={k > 0.02 ? 1 : 0} />
            {k > 0.97 && <path d={`M${b[0] - 26} ${b[1] - 44} L${b[0]} ${b[1] - 20} L${b[0] + 8} ${b[1] - 56} Z`} fill={C.yellow} stroke={INK} strokeWidth="5" strokeLinejoin="round" />}
          </svg>
        </div>
      );
    }
  }
  // S6 — patent: title + the animated cross-section (the hero), 3D bricks do the same thing on the bench below
  {
    const o = fade(tau, S.s6 + 0.6, S.s7, 0.8, 0.5);
    if (o > 0.01) {
      els.push(
        <div key="s6l" style={{ position: "absolute", top: 112, left: 0, right: 0, opacity: o, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ ...pill(C.blue, "#fff"), fontSize: 46, padding: "8px 30px" }}>le brevet tube-et-tenon</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, color: C.blue, background: "#fff", border: `4px solid ${INK}`, borderRadius: 14, padding: "4px 20px", fontSize: 30, letterSpacing: 1 }}>US 3,005,282 · 1958 → 1961</div>
        </div>
      );
      els.push(<CrossSection key="s6c" opacity={o} tau={tau} />);
      els.push(<Burst key="s6b" tau={tau} t0={SNAP.lockIn} at={project(f, [-0.52, 0.96, 0.12])} r={170} label={false} />);
      els.push(<Burst key="s6d" tau={tau} t0={SNAP.lockOut} at={project(f, [-0.52, 0.96, 0.12])} r={150} label={false} />);
    }
  }
  // S7 — BREVET EXPIRÉ stamp + lock + à partir de 1978
  {
    const o = fade(tau, S.s7 + 0.4, S.s8, 0.4, 0.4);
    if (o > 0.01) {
      const slam = Math.min(1, Math.exp(-(((tau - (S.s7 + 0.9)) / 0.18) ** 2)) * 0.4 + 1);
      const stampScale = (tau < S.s7 + 0.9 ? 2.2 - 1.2 * eo(cl((tau - (S.s7 + 0.5)) / 0.4)) : 1) * slam;
      const unlocked = tau > S.s7 + 1.2, lock = fade(tau, S.s7 + 1.0, S.s8, 0.3, 0.4), date = fade(tau, S.s7 + 2.3, S.s8, 0.5, 0.4);
      els.push(
        <div key="s7" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <div style={{ transform: `rotate(-8deg) scale(${stampScale})`, border: `9px solid ${C.red}`, color: C.red, fontFamily: DISPLAY, fontWeight: 900, fontSize: 74, padding: "10px 38px", borderRadius: 16, letterSpacing: 2, background: C.cream, boxShadow: HARD, whiteSpace: "nowrap" }}>BREVET EXPIRÉ</div>
          </div>
          <div style={{ position: "absolute", top: 455, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: lock }}>
            <div style={{ ...card(), borderRadius: 999, padding: "10px 18px 4px" }}>
              <svg width="120" height="130" viewBox="10 0 120 135">
                <path d={unlocked ? "M44 64 V44 a26 26 0 0 1 52 0" : "M44 64 V44 a26 26 0 0 1 52 0 V64"} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" transform={unlocked ? "rotate(-28 44 64)" : ""} />
                <rect x="30" y="64" width="80" height="64" rx="12" fill={unlocked ? C.teal : C.grey} stroke={INK} strokeWidth="5" />
                <circle cx="70" cy="90" r="9" fill={INK} /><rect x="66" y="90" width="8" height="20" rx="4" fill={INK} />
              </svg>
            </div>
          </div>
          <div style={{ ...topBand(680), opacity: date }}><div style={{ ...pill(C.navy, "#fff"), fontSize: 58 }}>à partir de 1978</div>
            <div style={{ ...subLine, fontSize: 34 }}>domaine public, pays par pays, jusqu'aux années 1980</div></div>
        </div>
      );
    }
  }
  // S8 — compatible brands (no brand names)
  {
    const o = fade(tau, S.s8 + 0.3, S.s9, 0.5, 0.35);
    if (o > 0.01) els.push(
      <div key="s8" style={{ ...topBand(210), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 54 }}>des marques compatibles</div>
        <div style={{ ...subLine, fontSize: 36 }}>formes et couleurs variées — mêmes tenons</div>
      </div>
    );
  }
  // S9 — what the courts protected: two panels over the courtroom (scales and gavel are in the 3D set)
  {
    const o = fade(tau, S.s9 + 0.5, S.s10, 0.7, 0.5);
    if (o > 0.01) {
      const panel = (title: string, sub: string, mark: string, ok: boolean, draw: React.ReactNode, tin: number): React.ReactNode => {
        const k = eo(cl((tau - tin) / 0.6));
        return (
          <div style={{ flex: 1, ...card(), padding: "20px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: C.navy, textAlign: "center" }}>{title}</div>
            <div style={{ height: 132, display: "flex", alignItems: "center" }}>{draw}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 31, color: "#fff", background: ok ? C.tealD : C.red, borderRadius: 14, padding: "4px 18px" }}>{mark}</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 27, color: "#3b4556", textAlign: "center" }}>{sub}</div>
          </div>
        );
      };
      const brickDraw = (
        <svg width="150" height="110" viewBox="0 0 150 110">
          <rect x="18" y="40" width="114" height="54" rx="8" fill="#E63946" stroke={INK} strokeWidth="5" />
          {[33, 62, 91, 120].map((x) => <rect key={x} x={x - 11} y="24" width="22" height="18" rx="5" fill="#E63946" stroke={INK} strokeWidth="5" />)}
        </svg>
      );
      const figDraw = ( // a plain toy pawn: generic figure, not the trademarked shape
        <svg width="110" height="130" viewBox="0 0 110 130">
          <path d="M36 122 L48 62 H62 L74 122 Z" fill={C.yellow} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="55" cy="40" r="24" fill={C.yellow} stroke={INK} strokeWidth="5" />
          <text x="92" y="34" fontFamily={DISPLAY} fontWeight="900" fontSize="30" fill={C.tealD}>®</text>
        </svg>
      );
      els.push(
        <div key="s9" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 118, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ ...pill(C.navy, "#fff"), fontSize: 46, padding: "10px 30px" }}>Ce qui est protégé… ou pas</span>
          </div>
          <div style={{ position: "absolute", top: 236, left: 50, right: 50, display: "flex", gap: 30 }}>
            {panel("La forme de la brique", "fonction = libre", "✗  non protégée", false, brickDraw, S.s9 + 5.6)}
            {panel("La figurine", "design = protégé", "✓  marque confirmée", true, figDraw, S.s9 + 10.2)}
          </div>
          <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", opacity: fade(tau, S.s9 + 1.4, S.s10, 0.5, 0.5) }}>
            <span style={{ ...subLine, fontSize: 32 }}>devant les tribunaux européens</span>
          </div>
        </div>
      );
    }
  }
  // S10 — buying tips: range of shapes, the 3D balance (labels follow the pans), price-tag division
  {
    const o = fade(tau, S.s10 + 0.6, S.s11, 0.7, 0.5);
    if (o > 0.01) {
      const t0 = S.s10;
      const shapes: { n: string; el: React.ReactNode }[] = [
        { n: "1×1", el: <IsoBrick cols={1} rows={1} color="#E63946" x={54} y={104} /> },
        { n: "1×2", el: <IsoBrick cols={2} rows={1} color={C.yellow} x={40} y={104} /> },
        { n: "2×2", el: <IsoBrick cols={2} rows={2} color={C.teal} x={33} y={104} /> },
        { n: "2×4", el: <IsoBrick cols={4} rows={2} color={C.navy} x={5} y={104} /> },
        { n: "plaque", el: <IsoBrick cols={4} rows={2} hk={0.4} color={C.teal2} x={5} y={104} /> },
        { n: "pente", el: <IsoBrick cols={2} rows={2} color={C.wood} slope x={33} y={104} /> },
      ];
      const bal = fade(tau, t0 + 3.4, S.s11, 0.6, 0.5), hi = sm((tau - (t0 + 5.6)) / 0.5);
      const a = (balTilt(tau) * Math.PI) / 180, pl = project(f, [4.42 - 0.31 * Math.cos(a), 1.49 + 0.31 * Math.sin(a) - 0.2, -0.05]), pr = project(f, [4.42 + 0.31 * Math.cos(a), 1.49 - 0.31 * Math.sin(a) - 0.2, -0.05]);
      const tg = t0 + 7.4, tagIn = eo(cl((tau - tg) / 0.7));
      const tagScale = 0.5 + 0.5 * tagIn + 0.05 * Math.sin(cl((tau - tg) / 0.9) * Math.PI);
      const pieces = Math.round(600 * sm((tau - (tg + 0.9)) / 1.3));
      const resU = sm((tau - (tg + 2.5)) / 1.1), resShow = cl((tau - (tg + 2.4)) / 0.25), resPop = pop(tau, tg + 3.6, 0.1, 0.12);
      const tipShow = fade(tau, tg + 4.4, S.s11, 0.5, 0.6), chips = fade(tau, t0 + 2.2, S.s11, 0.6, 0.5);
      els.push(
        <div key="s10" style={{ opacity: o }}>
          <div style={{ position: "absolute", top: 108, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ ...pill(C.navy, "#fff"), fontSize: 50, padding: "8px 34px" }}>Bien acheter</span>
          </div>
          <div style={{ position: "absolute", top: 222, left: 50, right: 50, ...card(), padding: "10px 10px 10px", display: "flex", justifyContent: "space-between" }}>
            {shapes.map((sh, i) => {
              const k = eo(cl((tau - (t0 + 1.0 + i * 0.25)) / 0.4));
              return (
                <div key={sh.n} style={{ width: 156, display: "flex", flexDirection: "column", alignItems: "center", opacity: k, transform: `scale(${0.6 + 0.4 * k})` }}>
                  <svg width="156" height="114" viewBox="0 0 156 114">{sh.el}</svg>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, color: C.navy }}>{sh.n}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", top: 428, left: 40, right: 40, display: "flex", gap: 12, justifyContent: "center", opacity: chips }}>
            {["tolérances", "force de serrage", "licences", "prix"].map((t) => (
              <div key={t} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: C.navy, background: "#fff", border: `4px solid ${INK}`, borderRadius: 999, padding: "6px 20px", whiteSpace: "nowrap" }}>{t}</div>
            ))}
          </div>
          <Tag at={pl} dy={58} o={bal} size={30}>prix total</Tag>
          <Tag at={pr} dy={58} o={bal} size={30} bg={hi > 0.5 ? C.tealD : "#fff"} fg={hi > 0.5 ? "#fff" : C.navy}>prix à la pièce</Tag>
          {tau > tg && (
            <div style={{ position: "absolute", top: 512, left: 50, right: 50, height: 400, transform: `scale(${tagScale})`, transformOrigin: "50% 0%", opacity: cl((tau - tg) / 0.25), ...card(), padding: "20px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <svg width="250" height="116" viewBox="0 0 250 116">
                  <path d="M54 6 H236 a10 10 0 0 1 10 10 V100 a10 10 0 0 1 -10 10 H54 L6 58 Z" fill={C.yellow} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
                  <circle cx="44" cy="58" r="10" fill="#fff" stroke={INK} strokeWidth="5" />
                  <text x="150" y="74" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="46" fill={C.navy}>59,99 €</text>
                </svg>
                <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, color: C.red, lineHeight: 1 }}>÷</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 250 }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 70, color: C.navy, lineHeight: 1 }}>{pieces}</div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: C.navy }}>pièces</div>
                </div>
              </div>
              <div style={{ opacity: resShow, transform: `scale(${resPop})`, display: "flex", alignItems: "baseline", gap: 16, background: C.tealD, border: `4px solid ${INK}`, borderRadius: 22, padding: "6px 34px", marginTop: 6 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 60, color: "#fff" }}>=</span>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 80, color: "#fff", lineHeight: 1.1 }}>{euro(0.1 * resU)} €</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: "#fff" }}>/ pièce</span>
              </div>
              <div style={{ opacity: tipShow, fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: C.tealD, marginTop: 8 }}>bon plan : fins de série &amp; promotions</div>
            </div>
          )}
        </div>
      );
    }
  }
  // S11 — the last click + the saying
  if (tau >= S.s11) {
    const o = fade(tau, 81.4, S.end + 1, 1.0, 0.01), fr = sm((tau - 82.6) / 0.8);
    els.push(<Burst key="s11b" tau={tau} t0={SNAP.final} at={project(f, [0, 0.45 + BH, 0.1])} />);
    if (o > 0.01) els.push(
      <div key="end" style={{ opacity: o }}>
        <div style={{ position: "absolute", top: 150, left: 40, right: 40, ...card(), borderRadius: 34, padding: "26px 20px 30px", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, color: "#fff", background: C.tealD, borderRadius: 999, padding: "8px 26px", letterSpacing: 1 }}>UN DICTON SUR LE JEU</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, color: C.navy, lineHeight: 1.15, marginTop: 20, whiteSpace: "nowrap" }}>« Leg er barnets arbejde »</div>
          <div style={{ width: 120, height: 8, borderRadius: 4, background: C.yellow, border: `3px solid ${INK}`, margin: "18px auto 16px" }} />
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: C.red, opacity: fr, transform: `translateY(${(1 - fr) * 14}px)` }}>« Le jeu est le travail de l'enfant. »</div>
        </div>
        <div style={{ ...topBand(568) }}><div style={{ ...subLine, fontSize: 36 }}>De « leg godt » à la brique</div></div>
      </div>
    );
  }
  return <>{els}</>;
};
