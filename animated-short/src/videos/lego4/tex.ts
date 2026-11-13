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
