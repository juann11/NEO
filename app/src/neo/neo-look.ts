// El aspecto de NEO: un robot grafito con visor de cristal oscuro, ojos de luz
// verde y una antena. Lo comparten la isla (engine.ts), el saludo (greeting.ts),
// la caja de subida (upload/canvas.ts) y las miniaturas del armario (outfits.ts).
// Paleta "terminal oscuro + verde" de ui-ux-pro-max.

import { N_ } from "../i18n/i18n";

export type RGB = [number, number, number];

/** Cuerpo: slate-600 → slate-800. El tono de arriba se distingue sobre la isla negra. */
export const NEO_TOP = "#475569";
export const NEO_BOTTOM = "#1E293B";
export const NEO_TOP_RGB: RGB = [0.278, 0.333, 0.412];
export const NEO_BOTTOM_RGB: RGB = [0.118, 0.161, 0.231];
/** Los colores que se pueden elegir para el cuerpo (Aspecto): el de arriba y uno más oscuro abajo. */
export const NEO_SKINS = [
  { id: "graphite", name: N_("Graphite"), top: NEO_TOP, bottom: NEO_BOTTOM },
  { id: "blue", name: N_("Blue"), top: "#3B82F6", bottom: "#1E3A8A" },
  { id: "violet", name: N_("Violet"), top: "#8B5CF6", bottom: "#4C1D95" },
  { id: "pink", name: N_("Pink"), top: "#EC4899", bottom: "#831843" },
  { id: "red", name: N_("Red"), top: "#EF4444", bottom: "#7F1D1D" },
  { id: "orange", name: N_("Orange"), top: "#F97316", bottom: "#7C2D12" },
  { id: "yellow", name: N_("Yellow"), top: "#EAB308", bottom: "#713F12" },
  { id: "green", name: N_("Green"), top: "#22C55E", bottom: "#14532D" },
  { id: "white", name: N_("White"), top: "#E2E8F0", bottom: "#94A3B8" },
  { id: "black", name: N_("Black"), top: "#1F2937", bottom: "#030712" },
];

const rgbOf = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;

/** Los dos tonos del cuerpo para un color guardado; el grafito si no se conoce. */
export function neoSkin(id: string): [RGB, RGB] {
  const skin = NEO_SKINS.find((s) => s.id === id);
  return !skin || skin.id === "graphite" ? [NEO_TOP_RGB, NEO_BOTTOM_RGB] : [rgbOf(skin.top), rgbOf(skin.bottom)];
}

/** Borde claro: sin él el cuerpo oscuro desaparece sobre el negro de la isla. */
export const NEO_RIM = "rgba(148,163,184,0.55)";
/** Cristal del visor. */
export const NEO_VISOR_TOP = "#0B1220";
export const NEO_VISOR_BOTTOM = "#020617";
/** Luz de los ojos y de la antena (green-400). */
export const NEO_EYE = "#4ADE80";
export const NEO_EYE_RGB: RGB = [0.29, 0.871, 0.502];
/** Ojos de los mini-bots, sobre el visor de su color. */
export const NEO_MINI_EYE = "#E2E8F0";

function roundRect(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(l + rr, t);
  x.arcTo(l + w, t, l + w, t + h, rr);
  x.arcTo(l + w, t + h, l, t + h, rr);
  x.arcTo(l, t + h, l, t, rr);
  x.arcTo(l, t, l + w, t, rr);
  x.closePath();
}

/** Cuerpo grafito con su borde. `body` ya es el camino del cuerpo. */
export function fillNeoBody(x: CanvasRenderingContext2D, body: Path2D, rx: number, ry: number, R: number) {
  const g = x.createLinearGradient(rx * 0.7, -ry * 0.85, -rx * 0.8, ry * 0.9);
  g.addColorStop(0, NEO_TOP);
  g.addColorStop(1, NEO_BOTTOM);
  x.fillStyle = g;
  x.fill(body);
  strokeNeoRim(x, body, R);
}

export function strokeNeoRim(x: CanvasRenderingContext2D, body: Path2D, R: number) {
  x.save();
  x.strokeStyle = NEO_RIM;
  x.lineWidth = Math.max(0.6, R * 0.035);
  x.stroke(body);
  x.restore();
}

/**
 * El visor: una banda de cristal oscuro a la altura de los ojos, centrada en
 * (dx, dy) para que siga la mirada. Se dibuja ya recortado al cuerpo.
 */
export function drawNeoVisor(x: CanvasRenderingContext2D, rx: number, ry: number, dx = 0, dy = 0) {
  const w = rx * 1.62;
  const h = ry * 0.74;
  const l = -w / 2 + dx;
  const t = ry * 0.12 - h / 2 + dy;
  const g = x.createLinearGradient(0, t, 0, t + h);
  g.addColorStop(0, NEO_VISOR_TOP);
  g.addColorStop(1, NEO_VISOR_BOTTOM);
  roundRect(x, l, t, w, h, h * 0.42);
  x.fillStyle = g;
  x.fill();
  // Reflejo del cristal arriba.
  x.save();
  x.clip();
  x.strokeStyle = "rgba(255,255,255,0.16)";
  x.lineWidth = Math.max(0.5, h * 0.06);
  x.beginPath();
  x.moveTo(l + w * 0.18, t + h * 0.16);
  x.lineTo(l + w * 0.62, t + h * 0.16);
  x.stroke();
  x.restore();
}

/** Antena con la punta encendida, detrás del cuerpo (se dibuja antes que él). */
export function drawNeoAntenna(x: CanvasRenderingContext2D, ry: number, R: number, color = NEO_EYE) {
  const base = -ry * 0.9;
  const tip = -ry - R * 0.34;
  x.save();
  x.strokeStyle = NEO_TOP;
  x.lineWidth = Math.max(0.8, R * 0.07);
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(0, base);
  x.lineTo(0, tip);
  x.stroke();
  x.shadowColor = color;
  x.shadowBlur = R * 0.3;
  x.fillStyle = color;
  x.beginPath();
  x.arc(0, tip, Math.max(1, R * 0.1), 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/** Brillo de luz para los ojos: se activa antes de rellenarlos. */
export function glow(x: CanvasRenderingContext2D, color: string, R: number) {
  x.shadowColor = color;
  x.shadowBlur = R * 0.22;
}
