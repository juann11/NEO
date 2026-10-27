// El aspecto de NEO: un robot grafito con visor de cristal oscuro, ojos de luz
// verde y una antena. Lo comparten la isla (engine.ts), el saludo (greeting.ts),
// la caja de subida (upload/canvas.ts) y las miniaturas del armario (outfits.ts).
// Paleta "terminal oscuro + verde" de ui-ux-pro-max.

export type RGB = [number, number, number];

/** Cuerpo: slate-600 → slate-800. El tono de arriba se distingue sobre la isla negra. */
export const NEO_TOP = "#475569";
export const NEO_BOTTOM = "#1E293B";
export const NEO_TOP_RGB: RGB = [0.278, 0.333, 0.412];
export const NEO_BOTTOM_RGB: RGB = [0.118, 0.161, 0.231];
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
