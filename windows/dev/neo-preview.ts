// Vista de desarrollo: NEO en varios estados, sobre negro (la isla) y sobre
// claro (el escritorio). No forma parte de la app.

import { BotEngine, hexToRGB } from "../src/neo/engine";
import type { BotStateName } from "../src/core/layout";
import type { Outfit } from "../src/neo/wardrobe";
import { SOUND_NAMES } from "../src/core/sound";

type Caso = { state: BotStateName; outfit?: Outfit; mini?: string };
const CASOS: Caso[] = [
  { state: "idle" },
  { state: "working" },
  { state: "approval" },
  { state: "finished" },
  { state: "error" },
  { state: "sleeping" },
  { state: "idle", outfit: "witchHat" },
  { state: "idle", outfit: "sunglasses" },
  { state: "working", mini: "#22C55E" },
  { state: "idle", mini: "#3E86E0" },
];

const motores: { engine: BotEngine; ctx: CanvasRenderingContext2D }[] = [];
for (const id of ["oscura", "clara"]) {
  const fila = document.getElementById(id)!;
  for (const c of CASOS) {
    const fig = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 240;
    const engine = new BotEngine();
    if (c.mini) {
      engine.isMini = true;
      engine.bodyColor = hexToRGB(c.mini);
    }
    engine.setOutfit(c.outfit ?? ("none" as Outfit), false);
    engine.setState(c.state, true);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    motores.push({ engine, ctx });
    fig.append(canvas, `${c.state}${c.outfit ? " + " + c.outfit : ""}${c.mini ? " (mini)" : ""}`);
    fila.append(fig);
  }
}

// Un botón por sonido (los sirve vite.config.ts desde windows/sounds).
const sonidos = document.getElementById("sonidos")!;
for (const nombre of SOUND_NAMES) {
  const b = document.createElement("button");
  b.textContent = `▶ ${nombre}`;
  b.onclick = () => void new Audio(`/sounds/${nombre}.wav`).play();
  sonidos.append(b);
}

let antes = performance.now();
function bucle(ahora: number) {
  const dt = Math.min(0.05, (ahora - antes) / 1000);
  antes = ahora;
  for (const { engine, ctx } of motores) {
    engine.update(dt);
    ctx.clearRect(0, 0, 120, 120);
    engine.draw(ctx, 120, 120);
  }
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
