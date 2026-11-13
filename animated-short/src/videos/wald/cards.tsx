// DOM teaching cards of the Wald short (drawn over the 3D canvas, so no object can ever hide a label). Solid pills
// with a plum ink border and a hard offset shadow, text contrast >= 4.5:1 everywhere (white on navy / dark teal /
// dark red, navy on white / cream / yellow), manga speed lines + halftone dots on the impact cues (never a
// full-screen flash). The aircraft diagram is OUR schematic ("schema de principe"): it is labelled as such and is
// never presented as a period document or as Wald's data. No burned subtitles.
import React from "react";
import { S, CUE, FPS, cl, sm, eo, fade, pop, project, planePt, rnd } from "./story";

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

// ---------- S3: the tally of hits (illustrative proportions, no invented figures) ----------
const ROWS: [string, number, number][] = [["ailes", 0.92, CUE.tally[0]], ["fuselage", 0.78, CUE.tally[1]], ["queue", 0.62, CUE.tally[2]], ["moteurs", 0.13, CUE.tally[3]]];
const Tally: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => (
  <div style={{ position: "absolute", top: 150, left: 50, right: 50, opacity, ...card(), padding: "20px 30px 22px" }}>
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: C.navy, letterSpacing: 2, textAlign: "center" }}>RELEVÉ DES IMPACTS · avions revenus</div>
    {ROWS.map(([name, v, t0], i) => {
      const u = eo((tau - t0) / 0.5), on = tau >= t0 - 0.05, last = i === 3;
      return (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16, opacity: on ? 1 : 0.28 }}>
          <div style={{ width: 230, fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, color: C.navy, textAlign: "right", transform: `scale(${pop(tau, t0, 0.08)})`, transformOrigin: "100% 50%" }}>{name}</div>
          <div style={{ flex: 1, height: 46, background: "#EEF2F6", border: `4px solid ${INK}`, borderRadius: 14, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v * u * 100}%`, background: last ? C.teal : C.red, borderRight: u > 0.02 ? `4px solid ${INK}` : "none" }} />
          </div>
          <div style={{ width: 150, fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: last ? C.tealD : C.redD, opacity: u }}>{last ? "très peu" : i === 2 ? "souvent" : "beaucoup"}</div>
        </div>
      );
    })}
    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, color: "#4A5568", textAlign: "center", marginTop: 14 }}>proportions illustratives</div>
  </div>
);

// ---------- S8-S10: the animated schematic of the idea ----------
const leY = (x: number) => 255 + (Math.abs(500 - x) - 46) * (80 / 364), teY = (x: number) => 400 - (Math.abs(500 - x) - 44) * (5 / 366);
const ENGX = [200, 330, 670, 800];
const DOTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (const s of [-1, 1]) for (let k = 0; k < 17; k++) { // wings, never over an engine
    const x = 500 + s * (62 + ((k + rnd(k, s > 0 ? 51 : 58)) / 17) * 335);
    if (ENGX.some((e) => Math.abs(x - e) < 48)) continue;
    out.push([x, leY(x) + 18 + rnd(k, s > 0 ? 52 : 59) * (teY(x) - leY(x) - 36)]);
  }
  for (let i = 0; i < 11; i++) out.push([472 + rnd(i, 53) * 56, 275 + rnd(i, 54) * 250]);     // hull
  for (let i = 0; i < 9; i++) out.push([500 + (i % 2 ? 1 : -1) * (34 + rnd(i, 55) * 150), 602 + rnd(i, 56) * 12]); // tail
  return out.map((p, i) => [p, rnd(i, 57)] as const).sort((a, b) => a[1] - b[1]).map((p) => p[0]);
})();
const PLANE_D = "M500 95 C540 110 546 170 546 230 L546 255 L910 335 L910 395 L544 400 L536 560 L700 590 L700 628 L526 628 L520 640 L480 640 L474 628 L300 628 L300 590 L464 560 L456 400 L90 395 L90 335 L454 255 L454 230 C454 170 460 110 500 95 Z";
const MiniPlane: React.FC<{ x: number; y: number; k: number; o: number; rot: number }> = ({ x, y, k, o, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k}) translate(-500 -370)`} opacity={o}>
    <path d={PLANE_D} fill="#F4F6F8" stroke="#4A5568" strokeWidth={5 / k} strokeDasharray={`${14 / k} ${9 / k}`} strokeLinejoin="round" />
    {ENGX.map((e) => <circle key={e} cx={e} cy={leY(e) - 10} r="38" fill={C.red} stroke={INK} strokeWidth={4 / k} />)}
  </g>
);
const Check: React.FC<{ x: number; y: number; tau: number; t0: number; end: number }> = ({ x, y, tau, t0, end }) => {
  const u = cl((tau - t0) / 0.2), o = Math.min(u, cl((end - tau) / 0.3));
  if (o <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${(0.6 + 0.4 * u) * pop(tau, t0 + 0.2, 0.1)})`} opacity={o}>
      <circle r="34" fill={C.tealD} stroke={INK} strokeWidth="5" />
      <path d="M-16 1 L-5 13 L17 -12" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};
const Schema: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const nDots = Math.round(DOTS.length * cl((tau - 34.0) / 3.4));
  const phC = fade(tau, S.s9 + 0.05, CUE.armour[0] + 0.1, 0.3, 0.3), ghost = cl((tau - CUE.ghosts) / 0.4), fall = sm((tau - CUE.ghosts - 0.3) / 2.2);
  const cap = tau < 38.75 ? "On ne relève que les avions REVENUS"
    : tau < S.s9 ? "Touché ici… et rentré quand même"
      : tau < CUE.armour[0] - 0.55 ? "Touchés aux moteurs : jamais revenus"
        : tau < S.s10 ? "Blinder là où il n'y a PAS de trous" : "Illustration moderne, pas un document de 1943";
  const capBg = tau >= CUE.armour[0] - 0.55 && tau < S.s10 ? C.tealD : tau >= S.s9 && tau < S.s10 ? C.redD : C.navy;
  const pulse = 0.5 + 0.5 * Math.sin(tau * 7);
  const stamp = cl((tau - CUE.stamp) / 0.16), st2 = sm((tau - 54.63) / 0.3);
  const zones: [number, number, number, number, number][] = [...ENGX.map((e, i) => [e - 36, leY(e) - 70, 72, 118, CUE.armour[i]] as [number, number, number, number, number]), [466, 140, 68, 78, CUE.armour[4]]];
  return (
    <div style={{ position: "absolute", top: 150, left: 50, right: 50, opacity, background: "#F2F7FB", border: `6px solid ${INK}`, borderRadius: 28, boxShadow: HARD, boxSizing: "border-box", padding: "6px 4px 4px" }}>
      <svg width="960" height="701" viewBox="0 0 1000 730" style={{ display: "block" }}>
        <text x="500" y="46" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="28" fill={C.navy}>SCHÉMA DE PRINCIPE</text>
        {/* the missing planes (S9): hit in the engines, they drop out of the sample */}
        {ghost > 0 && tau < S.s10 && [[120, 172, -14], [880, 172, 16], [285, 150, 8], [715, 150, -9]].map(([x, y, r], i) => (
          <MiniPlane key={i} x={x + (i % 2 ? 1 : -1) * 20 * fall} y={y + 26 * fall} k={0.16} o={ghost * (1 - 0.45 * fall)} rot={r + (i % 2 ? 1 : -1) * 24 * fall} />
        ))}
        {ghost > 0 && tau < S.s10 && (
          <g opacity={sm((tau - 47.02) / 0.3)}>
            <rect x="36" y="64" width="270" height="44" rx="12" fill="#fff" stroke={INK} strokeWidth="4" /><text x="171" y="96" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="27" fill={C.redD}>absents des relevés</text>
          </g>
        )}
        {/* the bomber seen from above */}
        <path d={PLANE_D} fill={C.metal} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
        {ENGX.map((e) => (
          <g key={e}>
            <rect x={e - 26} y={leY(e) - 60} width="52" height="100" rx="14" fill="#C3CCD6" stroke={INK} strokeWidth="6" />
            <line x1={e - 46} y1={leY(e) - 66} x2={e + 46} y2={leY(e) - 66} stroke={INK} strokeWidth="8" strokeLinecap="round" />
          </g>
        ))}
        <rect x="476" y="150" width="48" height="56" rx="14" fill="#BFE6F4" stroke={INK} strokeWidth="6" />
        {/* hits recorded on the planes that came back */}
        {DOTS.slice(0, nDots).map(([x, y], i) => {
          const born = 34.0 + ((i + 1) / DOTS.length) * 3.4;
          return <circle key={i} cx={x} cy={y} r={10 * pop(tau, born + 0.04, 0.5, 0.06)} fill={C.red} stroke={INK} strokeWidth="4" />;
        })}
        <Check x={270} y={352} tau={tau} t0={39.0} end={S.s9} /><Check x={730} y={352} tau={tau} t0={39.2} end={S.s9} />
        <Check x={500} y={420} tau={tau} t0={40.23} end={S.s9} /><Check x={500} y={600} tau={tau} t0={40.98} end={S.s9} />
        {/* the zones without holes */}
        {zones.map(([x, y, w, h, t0], i) => {
          const u = cl((tau - (t0 - 0.12)) / 0.12);
          return (
            <g key={i}>
              {phC > 0 && u < 1 && <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="20" fill="none" stroke={C.red} strokeWidth={6 + 3 * pulse} strokeDasharray="16 10" opacity={phC} />}
              {u > 0 && (
                <g transform={`translate(${x + w / 2} ${y + h / 2}) scale(${(1.5 - 0.5 * u) * pop(tau, t0 + 0.02, 0.08)}) translate(${-w / 2} ${-h / 2})`} opacity={u}>
                  <rect width={w} height={h} rx="12" fill={C.teal} stroke={INK} strokeWidth="6" />
                  {[[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]].map(([a, b], k) => <circle key={k} cx={a} cy={b} r="4.5" fill={INK} />)}
                  <path d={`M${w * 0.2} ${h * 0.75} L${w * 0.55} ${h * 0.2}`} stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
                </g>
              )}
            </g>
          );
        })}
        {tau >= CUE.armour[0] - 0.1 && tau < S.s10 && (
          <g opacity={sm((tau - CUE.armour[4]) / 0.3)}>
            <rect x="694" y="64" width="270" height="44" rx="12" fill="#fff" stroke={INK} strokeWidth="4" /><text x="829" y="96" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="27" fill={C.tealD}>blindage : moteurs</text>
          </g>
        )}
        {/* S10: honest stamp */}
        {stamp > 0 && (
          <g transform={`translate(500 430) rotate(-8) scale(${1.6 - 0.6 * stamp})`} opacity={stamp}>
            <rect x="-372" y="-58" width="744" height="116" rx="18" fill="#fff" stroke={C.redD} strokeWidth="10" />
            <text x="0" y="18" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="50" textLength="670" lengthAdjust="spacingAndGlyphs" fill={C.redD}>ILLUSTRATION MODERNE</text>
          </g>
        )}
        {st2 > 0 && (
          <g opacity={st2} transform={`translate(0 ${(1 - st2) * 12})`}>
            <rect x="270" y="520" width="460" height="60" rx="16" fill={C.navy} stroke={INK} strokeWidth="5" /><text x="500" y="562" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="36" fill="#fff">pas les données de Wald</text>
          </g>
        )}
        {/* caption */}
        <rect x="30" y="656" width="940" height="64" rx="18" fill={capBg} stroke={INK} strokeWidth="5" />
        <text x="500" y="701" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="38" fill="#fff">{cap}</text>
      </svg>
    </div>
  );
};

// ---------- S11: the winners we study, and everybody else ----------
const Person: React.FC<{ x: number; y: number; win: boolean; o: number; k?: number }> = ({ x, y, win, o, k = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`} opacity={o}>
    <circle cy="-30" r="20" fill={win ? C.yellow : "#fff"} stroke={win ? INK : "#4A5568"} strokeWidth="5" strokeDasharray={win ? undefined : "9 7"} />
    <path d="M-24 34 C-24 -4 24 -4 24 34 Z" fill={win ? C.yellow : "#fff"} stroke={win ? INK : "#4A5568"} strokeWidth="5" strokeDasharray={win ? undefined : "9 7"} strokeLinejoin="round" />
    {win && <path d="M0 -76 L7 -62 L22 -60 L11 -50 L14 -35 L0 -43 L-14 -35 L-11 -50 L-22 -60 L-7 -62 Z" transform="translate(0 -8) scale(0.8)" fill={C.red} stroke={INK} strokeWidth="4" strokeLinejoin="round" />}
  </g>
);
const Crowd: React.FC<{ tau: number; opacity: number }> = ({ tau, opacity }) => {
  const others: [number, number][] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 11; i++) if (!(j === 1 && i >= 4 && i <= 6)) others.push([70 + i * 86, 110 + j * 128]);
  return (
    <div style={{ position: "absolute", top: 330, left: 50, right: 50, opacity, ...card(), padding: "8px 6px 14px" }}>
      <svg width="960" height="420" viewBox="0 0 1000 438" style={{ display: "block" }}>
        {others.map(([x, y], i) => <Person key={i} x={x} y={y} win={false} o={cl((tau - CUE.others - i * 0.022) / 0.25) * 0.95} />)}
        {[414, 500, 586].map((x, i) => <Person key={x} x={x} y={238} win o={cl((tau - CUE.winners - i * 0.12) / 0.2)} k={pop(tau, CUE.winners + i * 0.12 + 0.2, 0.12)} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 2 }}>
        <div style={{ ...pill(C.yellow, C.navy), fontSize: 32, padding: "6px 20px", borderWidth: 4, borderRadius: 16, boxShadow: "none", ...enter(tau, CUE.winners) }}>ceux qui ont réussi</div>
        <div style={{ ...pill("#fff", "#3A4556"), fontSize: 32, padding: "6px 20px", borderWidth: 4, borderRadius: 16, boxShadow: "none", borderStyle: "dashed", ...enter(tau, CUE.others) }}>…et tous les autres</div>
      </div>
    </div>
  );
};

export const Overlays: React.FC<{ tau: number }> = ({ tau }) => {
  const f = Math.round(tau * FPS), els: React.ReactNode[] = [];
  // S1 hook: the title, then the period
  if (tau < S.s2) {
    const o = fade(tau, 0.15, S.s2 - 0.05, 0.3, 0.3);
    els.push(
      <div key="s1" style={{ ...topBand(150), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 66, transform: `scale(${pop(tau, 0.5, 0.05, 0.12)})` }}>Les trous sont<br />au <span style={{ color: C.yellow }}>mauvais endroit</span></div>
        <div style={{ ...subLine, fontSize: 40, ...enter(tau, 2.77) }}>Seconde Guerre mondiale</div>
      </div>
    );
  }
  // S2 — coming home
  if (tau >= S.s2 && tau < S.s3) {
    const o = fade(tau, S.s2 + 0.15, S.s3 - 0.05, 0.35, 0.3);
    els.push(
      <div key="s2" style={{ ...topBand(150), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 58 }}>Retour de mission</div>
        <div style={{ ...subLine, fontSize: 38, ...enter(tau, 7.05) }}>des bombardiers criblés d'impacts</div>
      </div>
    );
  }
  // S3 — the tally
  if (tau >= S.s3 && tau < S.s4) els.push(<Tally key="s3" tau={tau} opacity={fade(tau, S.s3 + 0.5, S.s4 - 0.05, 0.4, 0.3)} />);
  // S4 — the tempting conclusion
  if (tau >= S.s4 && tau < S.s5) {
    const o = fade(tau, S.s4 + 0.1, S.s5 - 0.05, 0.3, 0.3);
    els.push(
      <div key="s4" style={{ ...topBand(150), opacity: o }}>
        <div style={{ ...subLine, fontSize: 38 }}>La conclusion paraît évidente…</div>
        <div style={{ ...pill(C.yellow, C.navy), fontSize: 56, ...enter(tau, 17.07) }}>Blinder les zones<br />les plus touchées ?</div>
      </div>
    );
    const P: [number, number][] = [[-5.65, 1.12], [-7.35, 1.02], [-9.0, 0.9]];
    CUE.plates.forEach((tc, i) => els.push(<Burst key={"s4b" + i} tau={tau} t0={tc} at={project(f, planePt(P[i][0], 0, P[i][1]))} r={i ? 170 : 230} label={i ? undefined : "CLANG !"} />));
  }
  // S5 — New York, Columbia, the Statistical Research Group
  if (tau >= S.s5 && tau < S.s6) {
    const o = fade(tau, S.s5 + 0.1, S.s6 - 0.05, 0.3, 0.3);
    els.push(
      <div key="s5" style={{ ...topBand(150), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 50 }}>New York · Université Columbia</div>
        <div style={{ ...subLine, fontSize: 40, ...enter(tau, 21.86) }}>Statistical Research Group</div>
        <div style={{ ...subLine, fontSize: 32, ...enter(tau, 22.3) }}>le Groupe de recherche statistique</div>
      </div>
    );
  }
  // S6 — Abraham Wald
  if (tau >= S.s6 && tau < S.s7) {
    const o = fade(tau, S.s6 + 0.1, S.s7 - 0.05, 0.3, 0.3);
    els.push(
      <div key="s6" style={{ ...topBand(170), opacity: o }}>
        <div style={{ ...subLine, fontSize: 40, ...enter(tau, 26.02) }}>un mathématicien</div>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 76, ...enter(tau, 27.0, 0.2) }}>Abraham <span style={{ color: C.yellow }}>Wald</span></div>
      </div>
    );
  }
  // S7 — 1943, the memoranda
  if (tau >= S.s7 && tau < S.s8) {
    const o = fade(tau, S.s7 + 0.1, S.s8 - 0.05, 0.3, 0.3), n = CUE.pages.filter((p) => tau >= p).length;
    els.push(
      <div key="s7" style={{ ...topBand(150), opacity: o }}>
        <div style={{ ...pill(C.navy, "#fff"), fontSize: 92, fontFamily: MONO, padding: "8px 40px", ...enter(tau, 28.75, 0.2) }}>1943</div>
        <div style={{ ...subLine, fontSize: 38, ...enter(tau, 30.29) }}>une série de notes sur<br />la vulnérabilité des avions</div>
        <div style={{ ...pill(C.yellow, C.navy), fontSize: 40, padding: "8px 26px", opacity: n ? 1 : 0, transform: `scale(${n ? pop(tau, CUE.pages[n - 1] + 0.03, 0.08) : 1})` }}>note n° {Math.max(1, n)} / 8</div>
      </div>
    );
  }
  // S8-S10 — the schematic
  if (tau >= S.s8 && tau < S.s11) els.push(<Schema key="sch" tau={tau} opacity={fade(tau, S.s8 + 0.15, S.s11 - 0.05, 0.4, 0.3)} />);
  // S11 — the survivorship bias today
  if (tau >= S.s11 && tau < S.s12) {
    const o = fade(tau, S.s11 + 0.1, S.s12 - 0.05, 0.3, 0.3);
    els.push(
      <div key="s11" style={{ opacity: o }}>
        <div style={{ ...topBand(150) }}>
          <div style={{ ...pill(C.tealD, "#fff"), fontSize: 64, ...enter(tau, CUE.bias - 0.15, 0.25), }}>Le biais du survivant</div>
        </div>
        <Crowd tau={tau} opacity={fade(tau, CUE.winners - 0.5, S.s12, 0.4, 0.01)} />
      </div>
    );
  }
  // S12 — the question to keep
  if (tau >= S.s12) {
    const o = fade(tau, S.s12 + 0.1, S.end + 1, 0.3, 0.01);
    const G: [number, number, number, number][] = [[250, 640, 0.34, -10], [800, 590, 0.27, 12], [560, 800, 0.22, -4]];
    els.push(
      <div key="s12" style={{ opacity: o }}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          {G.map(([x, y, k, r], i) => {
            const u = sm((tau - CUE.missing - i * 0.22) / 0.5);
            return (
              <g key={i} transform={`translate(${x} ${y + 8 * Math.sin(tau * 1.3 + i)}) rotate(${r}) scale(${k}) translate(-500 -370)`} opacity={0.9 * u}>
                <path d={PLANE_D} fill="rgba(255,255,255,0.55)" stroke="#fff" strokeWidth={7 / k} strokeDasharray={`${16 / k} ${10 / k}`} strokeLinejoin="round" />
                <path d={PLANE_D} fill="none" stroke={C.navy} strokeWidth={2.5 / k} strokeDasharray={`${16 / k} ${10 / k}`} strokeLinejoin="round" />
              </g>
            );
          })}
        </svg>
        <div style={{ ...topBand(150) }}>
          <div style={{ ...subLine, fontSize: 38, ...enter(tau, 63.55) }}>Devant un succès, demandez-vous…</div>
          <div style={{ ...pill(C.navy, "#fff"), fontSize: 60, ...enter(tau, CUE.missing - 0.1, 0.25) }}>Où sont les avions<br />qui <span style={{ color: C.yellow }}>manquent</span> ?</div>
        </div>
      </div>
    );
  }
  return <>{els}</>;
};
