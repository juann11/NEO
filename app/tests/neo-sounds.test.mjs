// Sonidos de NEO, generados por scripts/gen-sounds.py.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const RAIZ = new URL("..", import.meta.url);
const leer = (ruta) => readFileSync(new URL(ruta, RAIZ));

const NOMBRES = [...leer("src/core/sound.ts").toString().match(/SOUND_NAMES = \[([\s\S]*?)\]/)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);

test("vite sirve los sonidos de app/sounds", () => {
  const config = leer("vite.config.ts").toString();
  assert.match(config, /SOUNDS_DIR = resolve\(__dirname, "sounds"\)/);
  assert.doesNotMatch(config, /resolve\(__dirname, "\.\.\//);
});

test("cada sonido que pide la app existe y es un WAV válido", () => {
  assert.equal(NOMBRES.length, 29);
  for (const nombre of NOMBRES) {
    const ruta = new URL(`sounds/${nombre}.wav`, RAIZ);
    assert.ok(existsSync(ruta), `falta sounds/${nombre}.wav`);
    const wav = readFileSync(ruta);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF", nombre);
    assert.equal(wav.toString("ascii", 8, 12), "WAVE", nombre);
    assert.ok(wav.length > 44 + 1000, `${nombre} está vacío`);
  }
});
