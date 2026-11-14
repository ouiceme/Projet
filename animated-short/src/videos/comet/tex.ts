// Painted textures of the LEGO v4 sets (Canvas2D, cached through paint.ts ctex): board walls, wallpaper, tiles,
// panelling, stripes, rug, posters, the patent sheet, toy-box fronts. Seams are painted in as dark tints; the 3D ink
// pass adds the outlines. No brand marks anywhere: plain shapes only.
import { ctex, jit } from "./paint";

type G = CanvasRenderingContext2D;
const INK = "#241726";
const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

/** vertical (or horizontal) painted boards with seams, grain and a few knots; one tile = 8 boards */
export const boards = (key: string, base: string, seam: string, horiz = false) => ctex(key, 1024, 1024, (g, r) => {
  if (horiz) { g.translate(1024, 0); g.rotate(Math.PI / 2); }
  for (let i = 0; i < 8; i++) {
    g.fillStyle = jit(r, base, 0.07, 3, 0.1); g.fillRect(i * 128, 0, 128, 1024);
    g.strokeStyle = seam; g.globalAlpha = 0.22; g.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const x = i * 128 + 12 + r() * 104; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= 1024; y += 128) g.lineTo(x + (r() - 0.5) * 10, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (r() < 0.6) { const x = i * 128 + 30 + r() * 68, y = r() * 1024; g.fillStyle = seam; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(x, y, 9, 15, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = seam; g.fillRect(i * 128 - 3, 0, 6, 1024);
    g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(i * 128 + 3, 0, 4, 1024);
  }
});

/** wallpaper: soft base, a sprinkle of motifs, tiled */
export const wallpaper = (key: string, base: string, motif: string, kind: "stars" | "dots" | "plain" | "stripes") => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) { g.fillStyle = jit(r, base, 0.04, 2, 0.05); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 60 + r() * 90, 40 + r() * 60, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = motif;
  if (kind === "stripes") for (let i = 0; i < 8; i++) g.fillRect(i * 128 + 40, 0, 48, 1024);
  if (kind === "stars" || kind === "dots") for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
    const x = i * 170.6 + (j % 2 ? 85 : 0) + 40, y = j * 170.6 + 60, s = kind === "stars" ? 26 : 16;
    g.beginPath();
    if (kind === "dots") g.arc(x, y, s, 0, 7);
    else for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, q = k % 2 ? s * 0.45 : s; g.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); }
    g.closePath(); g.fill();
  }
});

/** two-colour checker tiles with grout (one tile = 2 x 2 squares) */
export const checker = (key: string, a: string, b: string, grout: string) => ctex(key, 512, 512, (g, r) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = jit(r, (i + j) % 2 ? a : b, 0.04, 2, 0.05); g.fillRect(i * 256, j * 256, 256, 256);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(i * 256 + 6, j * 256 + 6, 244, 10);
  }
  g.fillStyle = grout; for (let i = 0; i < 2; i++) { g.fillRect(i * 256 - 4, 0, 8, 512); g.fillRect(0, i * 256 - 4, 512, 8); }
  g.fillRect(508, 0, 4, 512); g.fillRect(0, 508, 512, 4);
});

/** raised-panel joinery (court wainscot, counter fronts): one tile = one panel */
export const panels = (key: string, base: string, dark: string, light: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = dark; g.globalAlpha = 0.25; g.lineWidth = 2;
  for (let k = 0; k < 26; k++) { const x = r() * 512; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 16, 512); g.stroke(); }
  g.globalAlpha = 1;
  g.fillStyle = dark; rr(g, 48, 48, 416, 416, 18); g.fill();
  g.fillStyle = light; rr(g, 60, 60, 392, 392, 12); g.fill();
  g.fillStyle = base; rr(g, 84, 84, 344, 344, 8); g.fill();
  g.fillStyle = dark; g.fillRect(0, 0, 512, 8); g.fillRect(0, 0, 8, 512);
});

export const stripes = (key: string, a: string, b: string, n = 8) => ctex(key, 512, 512, (g) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 512); g.fillStyle = b;
  for (let i = 0; i < n; i++) g.fillRect((i + 0.25) * (512 / n), 0, 0.5 * (512 / n), 512);
});

export const rugTex = () => ctex("rug4", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  for (const [rad, c] of [[250, "#c8453f"], [222, "#f3d9a4"], [196, "#2f7fb0"], [120, "#f3d9a4"], [92, "#c8453f"]] as const) { g.fillStyle = c; g.beginPath(); g.arc(256, 256, rad, 0, 7); g.fill(); }
  g.fillStyle = "#f3d9a4"; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.arc(256 + 158 * Math.cos(a), 256 + 158 * Math.sin(a), 13, 0, 7); g.fill(); }
});

/** single-image pictures (1 image per quad) */
export const picture = (kind: "rocket" | "patent" | "emblem" | "calendar" | "sign" | "chart" | "certificate") => ctex("pic4_" + kind, 512, 640, (g) => {
  const paper = kind === "patent" || kind === "certificate" ? "#f6efd9" : kind === "emblem" ? "#e9d28a" : kind === "sign" ? "#1d3557" : "#fdf6ec";
  g.fillStyle = paper; g.fillRect(0, 0, 512, 640);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 10;
  if (kind === "rocket") {
    g.fillStyle = "#9fd0f0"; g.fillRect(24, 24, 464, 592);
    g.fillStyle = "#fff6c8"; for (const [x, y] of [[90, 110], [400, 170], [120, 420], [420, 470], [300, 80]]) { g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
    g.fillStyle = "#f4f1ea"; g.beginPath(); g.moveTo(256, 110); g.quadraticCurveTo(350, 250, 320, 440); g.lineTo(192, 440); g.quadraticCurveTo(162, 250, 256, 110); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e2453c"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 62, 360); g.lineTo(256 + s * 130, 470); g.lineTo(256 + s * 62, 440); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = "#2f7fb0"; g.beginPath(); g.arc(256, 260, 36, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#ffb703"; g.beginPath(); g.moveTo(210, 446); g.lineTo(256, 560); g.lineTo(302, 446); g.closePath(); g.fill(); g.stroke();
  } else if (kind === "patent") {
    // original stylised line art: a studded brick seen from above-side, and its underside with tubes
    g.strokeStyle = "#13426b"; g.lineWidth = 7; g.fillStyle = "#13426b"; g.font = "700 30px 'DejaVu Sans Mono', monospace";
    g.fillText("FIG. 1", 36, 60); g.fillText("FIG. 2", 36, 360);
    g.strokeRect(96, 150, 320, 120); for (let i = 0; i < 4; i++) { g.strokeRect(116 + i * 76, 118, 52, 32); }
    g.beginPath(); g.moveTo(96, 150); g.lineTo(146, 100); g.lineTo(466, 100); g.lineTo(416, 150); g.moveTo(466, 100); g.lineTo(466, 220); g.lineTo(416, 270); g.stroke();
    g.strokeRect(96, 410, 320, 150); g.strokeRect(118, 432, 276, 106);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(176 + i * 80, 485, 30, 0, 7); g.stroke(); g.beginPath(); g.arc(176 + i * 80, 485, 18, 0, 7); g.stroke(); }
    g.lineWidth = 4; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(256, 280); g.lineTo(256, 400); g.stroke(); g.setLineDash([]);
    g.lineWidth = 6; g.strokeRect(14, 14, 484, 612);
  } else if (kind === "certificate") {
    g.strokeStyle = "#13426b"; g.lineWidth = 8; g.strokeRect(22, 22, 468, 596); g.lineWidth = 3; g.strokeRect(38, 38, 436, 564);
    g.fillStyle = "#13426b"; g.font = "800 58px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("BREVET", 256, 120);
    for (let i = 0; i < 6; i++) g.fillRect(90, 170 + i * 44, 332 - (i % 3) * 50, 12);
    g.strokeRect(176, 440, 160, 60); for (let i = 0; i < 4; i++) g.strokeRect(186 + i * 38, 424, 26, 16);
    g.fillStyle = "#b0222e"; g.beginPath(); g.arc(400, 540, 44, 0, 7); g.fill(); g.fillStyle = "#f6efd9"; g.beginPath(); g.arc(400, 540, 26, 0, 7); g.fill();
  } else if (kind === "emblem") {
    g.clearRect(0, 0, 512, 640);
    g.fillStyle = "#e9d28a"; g.beginPath(); g.arc(256, 320, 240, 0, 7); g.fill(); g.lineWidth = 16; g.stroke();
    g.lineWidth = 14; g.beginPath(); g.moveTo(256, 150); g.lineTo(256, 470); g.moveTo(170, 480); g.lineTo(342, 480); g.moveTo(110, 220); g.lineTo(402, 220); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 146, 220); g.lineTo(256 + s * 196, 340); g.moveTo(256 + s * 146, 220); g.lineTo(256 + s * 96, 340); g.stroke(); g.beginPath(); g.arc(256 + s * 146, 340, 52, 0, Math.PI); g.closePath(); g.fillStyle = "#b98a2e"; g.fill(); g.stroke(); }
  } else if (kind === "calendar") {
    g.fillStyle = "#b0222e"; g.fillRect(0, 0, 512, 170); g.lineWidth = 12; g.strokeRect(6, 6, 500, 628);
    g.fillStyle = "#fff"; g.font = "800 96px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("1978", 256, 126);
    g.fillStyle = "#1d3557"; for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(70 + i * 74, 240 + j * 80, 16, 0, 7); g.fill(); }
  } else if (kind === "sign") {
    g.fillStyle = "#ffb703"; rr(g, 20, 190, 472, 260, 40); g.fill(); g.lineWidth = 14; g.stroke();
    g.fillStyle = "#1d3557"; g.font = "900 120px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("JOUETS", 256, 362);
  } else {
    g.lineWidth = 12; g.strokeRect(6, 6, 500, 628); g.lineWidth = 9;
    g.fillStyle = "#2a9d8f"; g.fillRect(70, 380, 80, 190); g.fillStyle = "#ffb703"; g.fillRect(216, 260, 80, 310); g.fillStyle = "#e63946"; g.fillRect(362, 130, 80, 440);
    g.beginPath(); g.moveTo(40, 572); g.lineTo(480, 572); g.stroke();
  }
});

/** plain toy-box fronts (abstract shapes only: no real sets, no marks) */
export const boxFront = (i: number) => ctex("box4_" + i, 256, 256, (g) => {
  const pal = [["#e63946", "#ffd166"], ["#219ebc", "#fdf6ec"], ["#2a9d8f", "#ffb703"], ["#7b5ac9", "#ffd6e8"], ["#f47a1f", "#fff3c4"], ["#1d3557", "#8ecae6"]][i % 6];
  g.fillStyle = pal[0]; g.fillRect(0, 0, 256, 256);
  g.fillStyle = pal[1]; g.strokeStyle = INK; g.lineWidth = 7; g.lineJoin = "round";
  const k = i % 4;
  g.beginPath();
  if (k === 0) g.arc(128, 132, 62, 0, 7);
  else if (k === 1) { g.moveTo(128, 56); g.lineTo(200, 196); g.lineTo(56, 196); g.closePath(); }
  else if (k === 2) rr(g, 62, 74, 132, 112, 18);
  else for (let q = 0; q < 10; q++) { const a = (q * Math.PI) / 5 - Math.PI / 2, s = q % 2 ? 34 : 76; g.lineTo(128 + s * Math.cos(a), 132 + s * Math.sin(a)); }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)"; rr(g, 22, 18, 96, 22, 10); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 232, 256, 24);
});

/** soft light shaft / halo (alpha gradient), for the window light */
export const shaftTex = () => ctex("shaft4", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,244,214,0.55)"); gr.addColorStop(1, "rgba(255,244,214,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
});

// ======================= textures of the Wald short =======================
/** concrete apron: 2 x 2 slabs per tile, joints, stains, a few cracks */
export const slabs = () => ctex("w_slabs", 1024, 1024, (g, r) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = jit(r, "#c3bdae", 0.05, 4, 0.2); g.fillRect(i * 512, j * 512, 512, 512); }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(90,80,70,0.07)" : "rgba(255,250,235,0.08)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 8 + r() * 46, 4 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(70,60,60,0.5)"; g.lineWidth = 2;
  for (let i = 0; i < 7; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += (r() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = "#7d7568"; g.lineWidth = 9;
  for (const p of [0, 512]) { g.beginPath(); g.moveTo(p + 4, 0); g.lineTo(p + 4, 1024); g.moveTo(0, p + 4); g.lineTo(1024, p + 4); g.stroke(); }
});
/** blackboard of the statisticians: chalk bomber seen from above, tally marks and a few formulas */
export const chalk = () => ctex("w_chalk", 2048, 1024, (g, r) => {
  g.fillStyle = "#2c4a40"; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(235,240,230,${0.02 + r() * 0.035})`; g.beginPath(); g.ellipse(r() * 2048, r() * 1024, 80 + r() * 260, 20 + r() * 60, (r() - 0.5) * 0.6, 0, 7); g.fill(); }
  g.strokeStyle = "#f2efe2"; g.fillStyle = "#f2efe2"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 9;
  // bomber, top view (nose up)
  const cx = 560, cy = 520;
  g.beginPath(); g.moveTo(cx, cy - 400); g.quadraticCurveTo(cx + 46, cy - 330, cx + 44, cy - 120); g.lineTo(cx + 470, cy - 40); g.lineTo(cx + 470, cy + 30); g.lineTo(cx + 44, cy + 60);
  g.lineTo(cx + 26, cy + 300); g.lineTo(cx + 170, cy + 340); g.lineTo(cx + 170, cy + 380); g.lineTo(cx, cy + 400);
  g.lineTo(cx - 170, cy + 380); g.lineTo(cx - 170, cy + 340); g.lineTo(cx - 26, cy + 300); g.lineTo(cx - 44, cy + 60); g.lineTo(cx - 470, cy + 30); g.lineTo(cx - 470, cy - 40); g.lineTo(cx - 44, cy - 120);
  g.quadraticCurveTo(cx - 46, cy - 330, cx, cy - 400); g.stroke();
  for (const s of [-1, 1]) for (const d of [150, 290]) { g.strokeRect(cx + s * d - 26, cy - 150 + (d - 150) * 0.12, 52, 110); }
  g.lineWidth = 7; for (let i = 0; i < 26; i++) { const x = cx + (r() - 0.5) * 860, y = cy + (r() - 0.5) * 120 + 10; if (Math.abs(Math.abs(x - cx) - 220) < 110) continue; g.beginPath(); g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); g.stroke(); }
  // right half: tally + formulas
  g.font = "italic 700 84px 'DejaVu Serif', serif";
  g.fillText("P(retour | touché) = ?", 1130, 190);
  g.font = "italic 700 70px 'DejaVu Serif', serif";
  g.fillText("q₁ · q₂ · q₃ … qₙ", 1180, 330); g.fillText("Σ aᵢ = a", 1180, 450);
  g.lineWidth = 8;
  for (let j = 0; j < 3; j++) for (let k = 0; k < 4 - j; k++) { const x0 = 1180 + k * 190, y0 = 560 + j * 130; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x0 + i * 26, y0); g.lineTo(x0 + i * 26 + 4, y0 + 80); g.stroke(); } g.beginPath(); g.moveTo(x0 - 14, y0 + 62); g.lineTo(x0 + 96, y0 + 14); g.stroke(); }
  g.strokeStyle = "rgba(242,239,226,0.5)"; g.lineWidth = 5; g.strokeRect(1100, 80, 880, 420);
});
/** far office buildings behind the window */
export const skyline = (i: number) => ctex("w_sky" + i, 256, 512, (g, r) => {
  const base = ["#b98a6a", "#a8b4c4", "#cdb38a", "#9a8a9a"][i % 4];
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  for (let y = 14; y < 500; y += 34) for (let x = 14; x < 240; x += 30) { g.fillStyle = r() < 0.25 ? "#ffe9a8" : "#5d6f8a"; g.fillRect(x, y, 17, 22); }
});
/** a shelf bay of book spines (one image per bay) */
export const spines = (i: number) => ctex("w_spines" + i, 512, 256, (g, r) => {
  g.fillStyle = "#3a2a22"; g.fillRect(0, 0, 512, 256);
  const cols = ["#c8453f", "#2f7fb0", "#ffc21a", "#35a84f", "#7b5ac9", "#f47a1f", "#f4f1ea", "#1d3557", "#21a08f", "#b0222e"];
  let x = 4;
  while (x < 500) {
    const w = 22 + r() * 34, h = 170 + r() * 76, c = cols[Math.floor(r() * cols.length)];
    g.fillStyle = c; g.fillRect(x, 256 - h, w, h); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x, 256 - h, w, h + 4);
    g.fillStyle = c === "#f4f1ea" || c === "#ffc21a" ? "#1d3557" : "#fdf6ec"; g.fillRect(x + 5, 256 - h + 18, w - 10, 8); g.fillRect(x + 5, 256 - h + 34, w - 10, 5);
    if (r() < 0.5) { g.beginPath(); g.arc(x + w / 2, 256 - h * 0.45, Math.min(8, w / 3), 0, 7); g.fill(); }
    x += w + 3;
  }
});
/** riveted armour plate */
export const plateTex = () => ctex("w_plate", 256, 256, (g) => {
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.moveTo(30, 256); g.lineTo(120, 0); g.lineTo(165, 0); g.lineTo(75, 256); g.fill();
  g.strokeStyle = "#7d8794"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);
  g.fillStyle = "#59626e"; for (let i = 0; i < 5; i++) for (const [x, y] of [[28 + i * 50, 28], [28 + i * 50, 228], [28, 28 + i * 50], [228, 28 + i * 50]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
});
/** national insignia of the period: white star on a blue disc (drawn turned a quarter: the patch maps u down the hull) */
export const starTex = () => ctex("w_star", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#1d3557"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.fillStyle = "#fdf6ec"; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = Math.PI + (i * Math.PI) / 5, rr2 = i % 2 ? 44 : 112; g.lineTo(128 + rr2 * Math.cos(a), 128 + rr2 * Math.sin(a)); }
  g.closePath(); g.fill();
});
/** bookshop posters: a medal ("N. 1") and a rising chart */
export const poster = (kind: "medal" | "rise") => ctex("w_poster_" + kind, 512, 640, (g) => {
  g.fillStyle = kind === "medal" ? "#1d3557" : "#fdf6ec"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = INK; g.lineWidth = 12; g.lineJoin = "round"; g.strokeRect(6, 6, 500, 628);
  if (kind === "medal") {
    g.fillStyle = "#c8242f"; g.beginPath(); g.moveTo(170, 60); g.lineTo(256, 300); g.lineTo(342, 60); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#ffb703"; g.beginPath(); g.arc(256, 390, 150, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#1d3557"; g.font = "900 190px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("1", 256, 458);
  } else {
    g.lineWidth = 9; g.beginPath(); g.moveTo(50, 560); g.lineTo(470, 560); g.moveTo(50, 560); g.lineTo(50, 80); g.stroke();
    g.strokeStyle = "#15594f"; g.lineWidth = 22; g.beginPath(); g.moveTo(70, 520); g.lineTo(190, 420); g.lineTo(270, 460); g.lineTo(440, 130); g.stroke();
    g.fillStyle = "#15594f"; g.beginPath(); g.moveTo(470, 80); g.lineTo(380, 130); g.lineTo(456, 196); g.closePath(); g.fill();
  }
});

// ======================= Comet short =======================
/** hull paint, wrapped around the lathe (u = angle; top of the hull at u = 0.75): white crown, blue cheat line, bare metal belly */
export const hullTex = () => ctex("c_hull", 1024, 8, (g) => {
  for (let x = 0; x < 1024; x++) { const e = -Math.sin(((x + 0.5) / 1024) * 2 * Math.PI); g.fillStyle = e > 0.14 ? "#fbfaf4" : e > 0.02 ? "#1f4a9e" : "#cfd6dc"; g.fillRect(x, 0, 1, 8); }
});
/** aircraft window seen from outside: metal frame + dark glass; R = corner radius of the pane in px (pane 180 px) */
export const winTex = (key: string, R: number, wide = 1) => ctex("c_win_" + key, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const x0 = 128 - 108 * wide, w = 216 * wide;
  rr(g, x0, 20, w, 216, R + 22); g.fillStyle = "#aab3bd"; g.fill(); g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  const gr = g.createLinearGradient(0, 38, 0, 218); gr.addColorStop(0, "#6f9fd0"); gr.addColorStop(1, "#24406c");
  rr(g, x0 + 20, 40, w - 40, 176, R); g.fillStyle = gr; g.fill(); g.lineWidth = 9; g.stroke();
  g.save(); rr(g, x0 + 20, 40, w - 40, 176, R); g.clip();
  g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(x0 + 40, 216); g.lineTo(x0 + 96, 40); g.lineTo(x0 + 124, 40); g.lineTo(x0 + 68, 216); g.fill(); g.restore();
});
/** cabin-side window bezel: opaque plate with a see-through pane (alpha), pane w x h px inside 256 x 256, corner radius R */
export const bezelTex = (key: string, w: number, h: number, R: number, col: string, lip: string) => ctex("c_bez_" + key, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  rr(g, 6, 6, 244, 244, Math.min(R + 28, 110)); g.fillStyle = col; g.fill(); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  const x = 128 - w / 2, y = 128 - h / 2;
  rr(g, x - 9, y - 9, w + 18, h + 18, R + 9); g.fillStyle = lip; g.fill();
  g.globalCompositeOperation = "destination-out"; rr(g, x, y, w, h, R); g.fill(); g.globalCompositeOperation = "source-over";
  rr(g, x, y, w, h, R); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
});
/** door of the aircraft seen from outside */
export const doorTex = () => ctex("c_door", 256, 512, (g) => {
  g.clearRect(0, 0, 256, 512);
  rr(g, 14, 14, 228, 484, 40); g.fillStyle = "#f1efe6"; g.fill(); g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  rr(g, 84, 90, 88, 92, 16); g.fillStyle = "#3a5f94"; g.fill(); g.lineWidth = 8; g.stroke();
  g.fillStyle = "#8d99ae"; rr(g, 60, 270, 44, 16, 8); g.fill();
});
/** riveted steel plates of the test tank (one tile = one plate) */
export const tankTex = () => ctex("c_tank", 512, 512, (g, r) => {
  g.fillStyle = "#7f9596"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(40,60,60,0.10)" : "rgba(255,255,255,0.10)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 70, 6 + r() * 16, 0, 0, 7); g.fill(); }
  g.fillStyle = "rgba(140,80,40,0.25)"; for (let i = 0; i < 6; i++) g.fillRect(r() * 500, 380 + r() * 60, 6 + r() * 10, 60 + r() * 70);
  g.strokeStyle = "#566b6e"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 500);
  g.fillStyle = "#4b5d60"; for (let i = 0; i < 9; i++) for (const [x, y] of [[32 + i * 56, 30], [32 + i * 56, 482], [30, 32 + i * 56], [482, 32 + i * 56]]) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
});
/** water surface of the tank: see-through turquoise with painted light swirls (alpha) */
export const waterTex = () => ctex("c_water", 1024, 512, (g, r) => {
  g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(40,190,214,0.42)"; g.fillRect(0, 0, 1024, 512);
  g.lineCap = "round";
  for (let i = 0; i < 46; i++) { const x = r() * 1024, y = r() * 512, w = 40 + r() * 150; g.strokeStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`; g.lineWidth = 3 + r() * 6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 10 - r() * 14, x + w, y); g.stroke(); }
});
/** suitcase side: body colour, straps, corner caps */
export const caseTex = (i: number) => ctex("c_case" + i, 256, 256, (g) => {
  const col = ["#b5652f", "#2f6f8f", "#8a3b3b", "#6b7f3a", "#c9a24a"][i % 5];
  g.fillStyle = col; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(60, 0, 22, 256); g.fillRect(174, 0, 22, 256);
  g.fillStyle = "#e9d9b0"; for (const [x, y] of [[0, 0], [216, 0], [0, 216], [216, 216]]) g.fillRect(x, y, 40, 40);
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246);
});
/** drawing pinned on the engineers' board: hull section with an opening */
export const blueprint = () => ctex("c_blue", 512, 384, (g) => {
  g.fillStyle = "#2b5fa5"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1;
  for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 384); g.moveTo(0, i * 32); g.lineTo(512, i * 32); g.stroke(); }
  g.strokeStyle = "#fdf6ec"; g.lineWidth = 5; g.beginPath(); g.moveTo(30, 150); g.quadraticCurveTo(90, 90, 200, 90); g.lineTo(440, 90); g.quadraticCurveTo(490, 120, 490, 150); g.quadraticCurveTo(490, 190, 440, 210); g.lineTo(200, 210); g.quadraticCurveTo(90, 210, 30, 150); g.stroke();
  for (let i = 0; i < 6; i++) g.strokeRect(210 + i * 36, 128, 20, 22);
  g.beginPath(); g.arc(130, 300, 56, 0, 7); g.stroke(); g.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(130 + 62 * Math.cos(a), 300 + 62 * Math.sin(a)); g.lineTo(130 + 84 * Math.cos(a), 300 + 84 * Math.sin(a)); g.stroke(); }
  g.lineWidth = 5; g.strokeRect(300, 262, 80, 76); for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(410, 262 + i * 18); g.lineTo(486, 262 + i * 18); g.stroke(); }
});
