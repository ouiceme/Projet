// DOM teaching cards of the Comet short (drawn over the 3D canvas, so no object can ever hide a label). Solid pills
// with a plum ink border and a hard offset shadow, text contrast >= 4.5:1 everywhere (white on navy / dark teal /
// dark red, navy on white / cream / yellow), manga speed lines + halftone dots on the impact cue (never a
// full-screen flash). The diagrams are OUR schematics ("schema de principe"), labelled as such. Stress is never
// shown by colour alone: line crowding, hatching, icons (! / check) and words carry it. No burned subtitles.
import React from "react";
import { S, CUE, FPS, cl, sm, eo, fade, pop, project, planePt, skin, breath, OX, TANK } from "./story";

const INK = "#241726";
const C = { red: "#C8242F", redD: "#A81E28", yellow: "#FFB703", teal: "#2A9D8F", tealD: "#15594F", navy: "#1D3557", cream: "#FDF6EC", grey: "#8D99AE", metal: "#E9EEF2" };
const DISPLAY = `"Poppins","Nunito","Liberation Sans","DejaVu Sans",sans-serif`;
const MONO = `"JetBrains Mono","DejaVu Sans Mono",monospace`;
const HARD = "6px 8px 0 rgba(36,23,38,0.85)";
const pill = (bg: string, color: string): React.CSSProperties => ({
  display: "inline-block", background: bg, color, fontFamily: DISPLAY, fontWeight: 800, borderRadius: 26, padding: "16px 36px",
  border: `5px solid ${INK}`, boxShadow: HARD, letterSpacing: 0.5, lineHeight: 1.15,
});
const subLine: React.CSSProperties = {
  display: "inline-block", fontFamily: DISPLAY, fontWeight: 700, color: C.navy, background: C.cream, borderRadius: 16, padding: "8px 22px",
  border: `4px solid ${INK}`, boxShadow: "4px 5px 0 rgba(36,23,38,0.85)", lineHeight: 1.2,
};
const card = (border = INK): React.CSSProperties => ({ background: "#fff", border: `5px solid ${border}`, borderRadius: 28, boxShadow: HARD, boxSizing: "border-box" });
const topBand = (top: number): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "0 50px", textAlign: "center",
});
/** fade + small rise for a line that enters at t0 */
const enter = (tau: number, t0: number, d = 0.3): React.CSSProperties => { const u = sm((tau - t0) / d); return { opacity: u, transform: `translateY(${(1 - u) * 16}px)` }; };

// ---------- manga burst (speed lines + halftone ring) on an impact cue ----------
const Burst: React.FC<{ tau: number; t0: number; at: [number, number]; r?: number; label?: string }> = ({ tau, t0, at, r = 230, label }) => {
  const d = tau - t0;
  if (d < -0.02 || d > 0.85) return null;
  const u = cl(d / 0.3), o = d < 0.45 ? 1 : cl(1 - (d - 0.45) / 0.4), n = 22, id = Math.round(t0 * 100);
  return (
    <div style={{ position: "absolute", left: at[0] - r, top: at[1] - r, width: 2 * r, height: 2 * r, opacity: o, pointerEvents: "none" }}>
      <svg width={2 * r} height={2 * r} viewBox="-100 -100 200 200" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`ht${id}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.7" fill={INK} /></pattern>
          <radialGradient id={`hm${id}`}><stop offset="0.45" stopColor="#000" /><stop offset="0.62" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
          <mask id={`mk${id}`}><circle r="100" fill={`url(#hm${id})`} /></mask>
        </defs>
        <circle r="96" fill={`url(#ht${id})`} mask={`url(#mk${id})`} opacity={0.5 * (1 - u * 0.4)} />
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + 0.13, r0 = 44 + 16 * u + (i % 3) * 5, r1 = r0 + 16 + (i % 2) * 14;
          return <path key={i} d={`M${r0 * Math.cos(a - 0.03)} ${r0 * Math.sin(a - 0.03)} L${r1 * Math.cos(a)} ${r1 * Math.sin(a)} L${r0 * Math.cos(a + 0.03)} ${r0 * Math.sin(a + 0.03)} Z`} fill={i % 2 ? C.yellow : INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />;
        })}
      </svg>
      {label && (
        <div style={{ position: "absolute", left: at[0] > 640 ? r - 330 : r + 30, top: r - 200, transform: `rotate(-9deg) scale(${0.7 + 0.3 * u + (pop(tau, t0, 0.1) - 1)})`, ...pill(C.yellow, C.navy), fontWeight: 900, fontSize: 50, padding: "8px 26px", whiteSpace: "nowrap" }}>{label}</div>
      )}
    </div>
  );
};


// ---------- small icons (shape carries the meaning, not colour alone) ----------
const Warn: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <path d="M0 -34 L34 26 L-34 26 Z" fill={C.yellow} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M0 -12 L0 8" stroke={INK} strokeWidth="8" strokeLinecap="round" /><circle cx="0" cy="18" r="4.5" fill={INK} />
  </g>
);
const Tick: React.FC<{ x: number; y: number; k?: number }> = ({ x, y, k = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <circle r="30" fill={C.tealD} stroke={INK} strokeWidth="5" />
    <path d="M-14 1 L-4 12 L15 -11" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
const hdr: React.CSSProperties = { fontFamily: MONO, fontWeight: 700, fontSize: 28, color: C.navy, letterSpacing: 2, textAlign: "center" };
const foot: React.CSSProperties = { fontFamily: DISPLAY, fontWeight: 700, fontSize: 25, color: "#3D4756", textAlign: "center" };

// ---------- S7: the pressure cycles of the tank test ----------
const Gauge: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const p = cl((breath(tau) - 1) / 0.02), up = [0, 2, 4].some((i) => tau >= CUE.pump[i] - 0.05 && tau < CUE.pump[i + 1] - 0.05), n = CUE.pump.filter((_, i) => i % 2 === 1 && tau >= CUE.pump[i]).length;
  const a = (-120 + 240 * p) * (Math.PI / 180);
  return (
    <div style={{ position: "absolute", top: 140, left: 50, right: 50, opacity, ...card(), padding: "18px 26px 20px", display: "flex", alignItems: "center", gap: 26 }}>
      <svg width="300" height="250" viewBox="-150 -140 300 250">
        <circle r="128" fill="#F4F6F8" stroke={INK} strokeWidth="8" />
        {Array.from({ length: 9 }, (_, i) => { const b = (-120 + i * 30) * (Math.PI / 180); return <path key={i} d={`M${96 * Math.sin(b)} ${-96 * Math.cos(b)} L${116 * Math.sin(b)} ${-116 * Math.cos(b)}`} stroke={INK} strokeWidth={i % 4 === 0 ? 8 : 4} strokeLinecap="round" />; })}
        <path d={`M0 0 L${92 * Math.sin(a)} ${-92 * Math.cos(a)}`} stroke={C.red} strokeWidth="10" strokeLinecap="round" /><circle r="14" fill={INK} />
        <text x="0" y="70" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="26" fill={C.navy}>PRESSION</text>
      </svg>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ ...pill(up ? C.yellow : C.navy, up ? C.navy : "#fff"), fontSize: 50, padding: "10px 28px", transform: `scale(${1 + 0.04 * p})` }}>{up ? "▲ on gonfle" : "▼ on dégonfle"}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 22 }}>
          {[0, 1, 2].map((i) => (
            <svg key={i} width="92" height="60" viewBox="0 0 92 60" style={{ opacity: i < n ? 1 : 0.25, transform: `scale(${i < n ? pop(tau, CUE.pump[i * 2 + 1] + 0.05, 0.12) : 1})` }}>
              <path d="M6 34 C6 26 20 24 34 24 L62 24 C76 24 86 28 86 34 C86 40 76 44 62 44 L34 44 C20 44 6 42 6 34 Z M14 26 L8 8 L20 8 L32 24 Z M40 40 L56 40 L44 56 L34 56 Z" fill={C.metal} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
            </svg>
          ))}
        </div>
        <div style={{ ...foot, marginTop: 10, fontSize: 30, color: C.navy }}>1 cycle = 1 vol simulé</div>
      </div>
    </div>
  );
};

// ---------- S9a: the cabin swells like a balloon on every flight ----------
const Balloon: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const u = cl((tau - 35.7) / (S.s10 - 35.7)), ph = (tau - 35.75) / 1.65, p = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), r = 118 * (1 + 0.1 * p);
  const fx = 560 + 330 * ((ph % 1 + 1) % 1), fy = 300 - 150 * Math.sin(Math.PI * ((ph % 1 + 1) % 1)) ** 0.6;
  return (
    <div style={{ position: "absolute", top: 140, left: 50, right: 50, opacity, ...card(), padding: "16px 20px 14px" }}>
      <div style={hdr}>SCHÉMA DE PRINCIPE · coupe de la cabine</div>
      <svg width="940" height="400" viewBox="0 0 940 400">
        <circle cx="250" cy="205" r="118" fill="none" stroke="#4A5568" strokeWidth="4" strokeDasharray="12 9" />
        <circle cx="250" cy="205" r={r} fill="#DCEBF5" stroke={INK} strokeWidth="9" />
        <path d={`M${250 - r * 0.86} 262 L${250 + r * 0.86} 262`} stroke={INK} strokeWidth="6" />
        {[-52, 0, 52].map((x) => <rect key={x} x={250 + x - 17} y="214" width="34" height="46" rx="8" fill={C.navy} stroke={INK} strokeWidth="4" />)}
        {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.39, r0 = 40 + 8 * p, r1 = r0 + 26 + 30 * p, c = Math.cos(a), s = Math.sin(a) * 0.9;
          return <g key={i} opacity={0.35 + 0.65 * p}><path d={`M${250 + r0 * c} ${180 + r0 * s} L${250 + r1 * c} ${180 + r1 * s}`} stroke={C.red} strokeWidth="9" strokeLinecap="round" />
            <path d={`M${250 + (r1 + 14) * c} ${180 + (r1 + 14) * s} L${250 + (r1 - 6) * c - 12 * s} ${180 + (r1 - 6) * s + 12 * c} L${250 + (r1 - 6) * c + 12 * s} ${180 + (r1 - 6) * s - 12 * c} Z`} fill={C.red} stroke={INK} strokeWidth="3" strokeLinejoin="round" /></g>; })}
        <text x="250" y="386" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="34" fill={C.navy}>la pression pousse la paroi</text>
        <path d="M560 300 C 640 110 810 110 890 300" fill="none" stroke={INK} strokeWidth="6" strokeDasharray="4 12" strokeLinecap="round" />
        <path d="M540 304 L910 304" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <g transform={`translate(${fx} ${fy})`}><circle r="20" fill={C.yellow} stroke={INK} strokeWidth="5" /><path d="M-10 0 L10 0 M2 -8 L10 0 L2 8" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
        <text x="725" y="96" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="32" fill={C.navy}>en altitude : gonflée</text>
        <text x="725" y="350" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="32" fill={C.navy}>au sol : dégonflée</text>
        <text x="725" y="390" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="27" fill="#3D4756">chaque vol = un cycle</text>
      </svg>
      <div style={{ height: 0, opacity: u }} />
    </div>
  );
};

// ---------- S9b / S12: how the effort flows around a sharp corner and around a rounded one ----------
const YS = [-171, -133, -95, -57, -19, 19, 57, 95, 133, 171];
const flowPath = (sharp: boolean, y0: number) => {
  const R = 200, h = 78, w = 78, pts: string[] = [];
  for (let x = -215; x <= 215; x += 5) {
    const ax = Math.abs(x), E = sharp ? h * sm((w + 30 - ax) / 30) : h * Math.sqrt(Math.max(0, 1 - (ax / (w * 2.3)) ** 2)) ** 1.5;
    const y = Math.sign(y0) * (E + (Math.abs(y0) * (R - E)) / R);
    pts.push(`${pts.length ? "L" : "M"}${x} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
};
const PATHS = { sharp: YS.map((y) => flowPath(true, y)), round: YS.map((y) => flowPath(false, y)) };
const Flow: React.FC<{ sharp: boolean; tau: number; x: number; y: number; k: number; hot: number; id: string; crackT?: number }> = ({ sharp, tau, x, y, k, hot, id, crackT }) => {
  const cr = crackT === undefined ? 0 : cl((tau - crackT) / 0.5);
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <defs>
        <pattern id={`hat${id}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4.5" height="9" fill={C.red} /></pattern>
        <clipPath id={`cp${id}`}><rect x="-215" y="-215" width="430" height="430" rx="26" /></clipPath>
      </defs>
      <rect x="-215" y="-215" width="430" height="430" rx="26" fill={C.metal} stroke={INK} strokeWidth="7" />
      <g clipPath={`url(#cp${id})`}>
        {(sharp ? PATHS.sharp : PATHS.round).map((d, i) => <path key={i} d={d} fill="none" stroke={C.navy} strokeWidth="6" strokeDasharray="22 10" strokeDashoffset={-tau * 46} strokeLinecap="round" />)}
        {sharp && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
          <circle key={i} cx={sx * 80} cy={sy * 80} r={(28 + 9 * Math.sin(tau * 7 + i)) * hot} fill={`url(#hat${id})`} stroke={INK} strokeWidth="4" opacity={0.92} />
        ))}
      </g>
      <rect x="-78" y="-78" width="156" height="156" rx={sharp ? 3 : 58} fill="#7FB6DD" stroke={INK} strokeWidth="9" />
      <path d="M-56 40 L-20 -56 L2 -56 L-34 40 Z" fill="rgba(255,255,255,0.55)" />
      {sharp && cr > 0 && <path d="M80 -80 L104 -100 L112 -122 L136 -138 L142 -164 L166 -184" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="160" strokeDashoffset={160 * (1 - cr)} />}
      {[-1, 1].map((s) => <path key={s} d={`M${s * 232} 0 L${s * 268} 0 M${s * 256} -12 L${s * 270} 0 L${s * 256} 12`} stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
      {sharp ? hot > 0.5 && <Warn x={-150} y={-150} k={0.95} /> : hot > 0.5 && <Tick x={-150} y={-150} />}
    </g>
  );
};
const Corner: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => (
  <div style={{ position: "absolute", top: 140, left: 50, right: 50, opacity, ...card(), padding: "16px 20px 16px" }}>
    <div style={hdr}>SCHÉMA DE PRINCIPE · l'effort dans la tôle</div>
    <svg width="940" height="500" viewBox="0 0 940 500">
      <Flow sharp tau={tau} x={262} y={252} k={0.98} hot={sm((tau - CUE.corners + 0.1) / 0.35)} id="a" crackT={CUE.focus + 0.25} />
      <text x="752" y="150" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="44" fill={C.navy}>coin vif</text>
      <g opacity={sm((tau - CUE.corners) / 0.3)}><text x="752" y="226" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="30" fill="#3D4756">les lignes d'effort se</text>
        <text x="752" y="266" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="30" fill="#3D4756">serrent dans les coins</text></g>
      <g opacity={sm((tau - 40.5) / 0.3)} transform={`translate(752 370) scale(${pop(tau, CUE.focus, 0.08)})`}>
        <rect x="-175" y="-44" width="350" height="88" rx="22" fill={C.redD} stroke={INK} strokeWidth="6" />
        <text x="0" y="14" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="38" fill="#fff">effort concentré</text>
      </g>
    </svg>
  </div>
);
const Compare: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const r = sm((tau - CUE.round + 0.15) / 0.35), lab = (x: number, bg: string, txt: string, o: number, t0: number) => (
    <g opacity={o} transform={`translate(${x} 478) scale(${pop(tau, t0, 0.08)})`}><rect x="-200" y="-36" width="400" height="72" rx="20" fill={bg} stroke={INK} strokeWidth="6" /><text x="0" y="12" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="33" fill="#fff">{txt}</text></g>
  );
  return (
    <div style={{ position: "absolute", top: 300, left: 40, right: 40, opacity, ...card(), padding: "14px 10px 12px" }}>
      <div style={hdr}>SCHÉMA DE PRINCIPE · l'effort dans la tôle</div>
      <svg width="980" height="520" viewBox="0 0 980 520">
        <g opacity={0.45 + 0.55 * (1 - r) + 0.55 * sm((tau - CUE.conc + 0.2) / 0.3)}><Flow sharp tau={tau} x={245} y={222} k={0.86} hot={1} id="c" crackT={0} /></g>
        <g opacity={0.3 + 0.7 * r}><Flow sharp={false} tau={tau} x={735} y={222} k={0.86} hot={r} id="d" /></g>
        {lab(245, C.redD, "coin vif : concentré", 1, CUE.conc)}{lab(735, C.tealD, "coin arrondi : réparti", r, CUE.spread)}
      </svg>
    </div>
  );
};

// ---------- S10: the honest footnote — where the inquiry placed the origin on the recovered wreck ----------
const Roof: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const a = sm((tau - CUE.roof + 0.3) / 0.35), b = sm((tau - CUE.aerial + 0.1) / 0.3), n = sm((tau - CUE.notWin + 0.1) / 0.3), w = sm((tau - CUE.wreck + 0.1) / 0.4);
  return (
    <div style={{ position: "absolute", top: 140, left: 40, right: 40, opacity, ...card(), padding: "16px 10px 14px" }}>
      <div style={{ textAlign: "center" }}><span style={{ ...pill(C.yellow, C.navy), fontSize: 40, padding: "6px 26px" }}>Précision importante</span></div>
      <svg width="980" height="470" viewBox="0 0 980 470">
        <g opacity={0.35 + 0.65 * w}>
          <path d="M96 196 L128 64 L196 64 L270 200 Z" fill="#F4F6F8" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
          <path d="M60 236 C100 204 160 196 240 196 L800 196 C864 196 906 212 924 236 C906 262 864 278 800 278 L240 278 C160 278 100 268 60 236 Z" fill="#F4F6F8" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
          <path d="M60 236 C100 204 160 196 240 196 L800 196 C864 196 906 212 924 236 Z" fill="#fff" />
          <path d="M70 238 L916 238" stroke={C.navy} strokeWidth="9" />
          <path d="M60 236 C100 204 160 196 240 196 L800 196 C864 196 906 212 924 236 C906 262 864 278 800 278 L240 278 C160 278 100 268 60 236 Z" fill="none" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
          <path d="M400 262 L600 262 L470 330 L392 330 Z" fill={C.metal} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
          <path d="M852 214 L884 214 L900 228 L852 228 Z" fill={C.navy} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={318 + i * 50} y="208" width="24" height="24" rx="4" fill={C.navy} stroke={INK} strokeWidth="4" />)}
          {[690, 742].map((x) => <rect key={x} x={x} y="188" width="30" height="13" rx="2" fill={C.navy} stroke={INK} strokeWidth="4" />)}
        </g>
        <g opacity={a}>
          <ellipse cx="731" cy="194" rx={62 + 5 * Math.sin(tau * 6)} ry={30 + 3 * Math.sin(tau * 6)} fill="none" stroke={C.red} strokeWidth="8" strokeDasharray="14 8" />
          <path d="M772 190 L790 170 L786 152 L806 138" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M731 162 L731 112" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <g transform={`translate(700 78) scale(${pop(tau, CUE.roof, 0.07)})`}><rect x="-262" y="-36" width="524" height="72" rx="20" fill={C.redD} stroke={INK} strokeWidth="6" />
            <text x="0" y="12" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="35" fill="#fff">origine : ouverture du toit</text></g>
          <text x="748" y="146" textAnchor="start" fontFamily={DISPLAY} fontWeight="700" fontSize="27" fill="#3D4756" opacity={b}>(antennes)</text>
        </g>
        <g opacity={n}>
          <path d="M310 246 L310 258 L748 258 L748 246" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 0)" />
          <path d="M360 258 L320 352" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <g transform={`translate(296 392) scale(${pop(tau, CUE.notWin + 0.3, 0.07)})`}><rect x="-250" y="-36" width="500" height="72" rx="20" fill={C.navy} stroke={INK} strokeWidth="6" />
            <g transform="translate(-212 0)"><circle r="22" fill="#fff" stroke={INK} strokeWidth="4" /><path d="M-10 -10 L10 10 M10 -10 L-10 10" stroke={C.redD} strokeWidth="7" strokeLinecap="round" /></g>
            <text x="24" y="11" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="30" fill="#fff">pas un hublot de passager</text></g>
        </g>
        <text x="778" y="440" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="25" fill="#3D4756">épave repêchée · enquête de 1954</text>
        <text x="778" y="466" textAnchor="middle" fontFamily={DISPLAY} fontWeight="700" fontSize="23" fill="#3D4756">schéma de principe</text>
      </svg>
    </div>
  );
};

// ---------- S11: magnifier on a Comet cabin window ----------
const Loupe: React.FC<{ tau: number; opacity: number; from: [number, number] }> = ({ tau, opacity, from }) => {
  const r = sm((tau - CUE.rounded + 0.45) / 0.4), X = 810, Y = 900;
  return (
    <div style={{ opacity }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path d={`M${from[0]} ${from[1]} L${X - 90} ${Y - 150}`} stroke={INK} strokeWidth="7" strokeDasharray="6 14" strokeLinecap="round" />
        <circle cx={from[0]} cy={from[1]} r="88" fill="none" stroke={INK} strokeWidth="9" /><circle cx={from[0]} cy={from[1]} r="88" fill="none" stroke={C.yellow} strokeWidth="4" />
        <g transform={`translate(${X} ${Y}) scale(0.82) translate(${-X} ${-Y})`}>
        <circle cx={X} cy={Y} r="236" fill="#fff" stroke={INK} strokeWidth="10" />
        <rect x={X - 128} y={Y - 136} width="256" height="268" rx="40" fill="#7FB6DD" stroke={INK} strokeWidth="12" />
        <path d={`M${X - 86} ${Y + 96} L${X - 30} ${Y - 104} L${X + 6} ${Y - 104} L${X - 50} ${Y + 96} Z`} fill="rgba(255,255,255,0.55)" />
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
          <g key={i} opacity={r} transform={`translate(${X + sx * 128} ${Y - 2 + sy * 134})`}>
            <path d={`M${-sx * 46} 0 A 46 46 0 0 ${sx * sy > 0 ? 1 : 0} 0 ${-sy * 46}`} fill="none" stroke={INK} strokeWidth="17" strokeLinecap="round" transform={`translate(${-sx * 0} ${-sy * 0})`} />
            <path d={`M${-sx * 46} 0 A 46 46 0 0 ${sx * sy > 0 ? 1 : 0} 0 ${-sy * 46}`} fill="none" stroke={C.yellow} strokeWidth="8" strokeLinecap="round" />
          </g>
        ))}
        <path d={`M${X - 128} ${Y + 172} L${X + 128} ${Y + 172} M${X - 128} ${Y + 160} L${X - 128} ${Y + 184} M${X + 128} ${Y + 160} L${X + 128} ${Y + 184}`} stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <text x={X} y={Y + 212} textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="30" fill={C.navy}>environ 40 cm</text>
        </g>
      </svg>
    </div>
  );
};

export const Overlays: React.FC<{ tau: number }> = ({ tau }) => {
  const f = Math.round(tau * FPS), els: React.ReactNode[] = [];
  const band = (key: string, a: number, b: number, top: number, kids: React.ReactNode) => els.push(<div key={key} style={{ ...topBand(top), opacity: fade(tau, a + 0.1, b - 0.05, 0.3, 0.3) }}>{kids}</div>);
  const Y = <span style={{ color: C.yellow }} />;
  void Y; void eo; void OX; void TANK;
  if (tau < S.s2) band("s1", 0.05, S.s2, 150, <>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 66, transform: `scale(${pop(tau, 0.5, 0.05, 0.12)})` }}>Pourquoi les hublots<br />sont <span style={{ color: C.yellow }}>ronds</span> ?</div>
  </>);
  if (tau >= S.s2 && tau < S.s3) band("s2", S.s2, S.s3, 150, <>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 92, fontFamily: MONO, padding: "8px 40px" }}>1952</div>
    <div style={{ ...subLine, fontSize: 44, ...enter(tau, 4.2) }}>le de Havilland <b>Comet</b></div>
    <div style={{ ...pill(C.yellow, C.navy), fontSize: 42, padding: "10px 28px", ...enter(tau, CUE.jet - 0.1) }}>1er avion de ligne à réaction<br />en service</div>
  </>);
  if (tau >= S.s3 && tau < S.s4) band("s3", S.s3, S.s4, 150, <>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 60 }}>Plus <span style={{ color: C.yellow }}>haut</span>, plus <span style={{ color: C.yellow }}>vite</span></div>
    <div style={{ ...subLine, fontSize: 38, ...enter(tau, 9.5) }}>que les avions à hélices de l'époque</div>
  </>);
  if (tau >= S.s4 && tau < S.s5) band("s4", S.s4, S.s5, 150, <>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 92, fontFamily: MONO, padding: "8px 40px", ...enter(tau, CUE.y1954 - 0.15, 0.2) }}>1954</div>
    <div style={{ ...subLine, fontSize: 40, ...enter(tau, CUE.two - 0.1) }}>deux Comet se disloquent en plein vol</div>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 44, padding: "10px 30px", ...enter(tau, CUE.none - 0.25) }}>aucun survivant</div>
  </>);
  if (tau >= S.s5 && tau < S.s6) band("s5", S.s5, S.s6, 150, <>
    <div style={{ ...pill(C.redD, "#fff"), fontSize: 60 }}>Toute la flotte<br />clouée au sol</div>
  </>);
  if (tau >= S.s6 && tau < S.s7) band("s6", S.s6, S.s7, 150, <>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 64 }}>Farnborough</div>
    <div style={{ ...subLine, fontSize: 38, ...enter(tau, 21.4) }}>les enquêteurs cherchent la cause</div>
    <div style={{ ...pill(C.tealD, "#fff"), fontSize: 42, padding: "10px 28px", ...enter(tau, CUE.plunge) }}>un fuselage entier<br />dans un bassin d'eau</div>
  </>);
  if (tau >= S.s7 && tau < S.s8) els.push(<Gauge key="s7" tau={tau} opacity={fade(tau, S.s7 + 0.1, S.s8 - 0.05, 0.3, 0.3)} />);
  if (tau >= S.s8 && tau < S.s9) {
    band("s8", S.s8, S.s9, 150, <>
      <div style={{ ...pill(C.navy, "#fff"), fontSize: 56, ...enter(tau, 29.5) }}>Le métal finit par céder</div>
      <div style={{ ...subLine, fontSize: 38, ...enter(tau, 31.0) }}>une fissure part du <b>coin</b> d'une ouverture</div>
      <div style={{ ...pill(C.yellow, C.navy), fontSize: 62, ...enter(tau, CUE.fatigue - 0.2, 0.2), transform: `scale(${pop(tau, CUE.fatigue + 0.1, 0.06)})` }}>la fatigue du métal</div>
    </>);
    const [hx, hy, hz] = skin(7.1, 1.1, 0.05);
    els.push(<Burst key="s8b" tau={tau} t0={CUE.crack} at={project(f, [hx, TANK.y + hy, hz])} r={210} label="CRAC !" />);
  }
  if (tau >= S.s9 && tau < CUE.corners - 0.45) els.push(<Balloon key="s9a" tau={tau} opacity={fade(tau, S.s9 + 0.1, CUE.corners - 0.45, 0.3, 0.25)} />);
  if (tau >= CUE.corners - 0.45 && tau < S.s10) els.push(<Corner key="s9b" tau={tau} opacity={fade(tau, CUE.corners - 0.45, S.s10 - 0.05, 0.25, 0.3)} />);
  if (tau >= S.s10 && tau < S.s11) els.push(<Roof key="s10" tau={tau} opacity={fade(tau, S.s10 + 0.1, S.s11 - 0.05, 0.3, 0.3)} />);
  if (tau >= S.s11 && tau < S.s12) {
    band("s11", S.s11, S.s12, 130, <>
      <div style={{ ...pill(C.navy, "#fff"), fontSize: 50 }}>Les hublots du Comet</div>
      <div style={{ ...subLine, fontSize: 40, ...enter(tau, CUE.almost - 0.1) }}>presque carrés…</div>
      <div style={{ ...pill(C.yellow, C.navy), fontSize: 40, padding: "8px 26px", ...enter(tau, 53.2) }}>coins déjà légèrement arrondis</div>
    </>);
    els.push(<Loupe key="s11l" tau={tau} opacity={fade(tau, S.s11 + 0.5, S.s12 - 0.05, 0.35, 0.3)} from={project(f, planePt(...skin(6.2, Math.asin(0.3), 0.03)))} />);
  }
  if (tau >= S.s12 && tau < S.s13) {
    band("s12", S.s12, S.s13, 140, <div style={{ ...pill(C.navy, "#fff"), fontSize: 58 }}>La leçon est restée</div>);
    els.push(<Compare key="s12c" tau={tau} opacity={fade(tau, 56.9, S.s13 - 0.05, 0.35, 0.3)} />);
  }
  if (tau >= S.s13) band("s13", S.s13, S.end + 2, 150, <>
    <div style={{ ...subLine, fontSize: 40, ...enter(tau, S.s13 + 0.1) }}>Voilà pourquoi, aujourd'hui…</div>
    <div style={{ ...pill(C.navy, "#fff"), fontSize: 60, ...enter(tau, CUE.yours - 0.15, 0.25) }}>votre hublot a des<br />angles <span style={{ color: C.yellow }}>tout ronds</span></div>
  </>);
  return <>{els}</>;
};
