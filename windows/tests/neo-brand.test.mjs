// Marca NEO: el proyecto no menciona el código del que partió. La única
// excepción es LICENSE en la raíz, que la licencia MIT obliga a conservar.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WINDOWS = fileURLToPath(new URL("..", import.meta.url));
const RAIZ = join(WINDOWS, "..");
const FUERA = new Set(["node_modules", "target", "dist", "gen", ".git", "sounds", "icons"]);
const ESTE = fileURLToPath(import.meta.url);
// Las palabras se arman por partes para que este test no se encuentre a sí mismo.
const VIEJO = new RegExp(["cou" + "cou", "mo" + "chi", "notch" + "buddy", "lou" + "is", "rail" + "l", "\\.swi" + "ft\\b"].join("|"), "i");
const TRANSLITERADOS = new RegExp(["Мо" + "чи", "मो" + "ची", "مو" + "تشي", "মো" + "চি", "كو" + "كو"].join("|"));

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    if (FUERA.has(nombre)) return [];
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const TODOS = [...archivos(WINDOWS), join(RAIZ, "README.md"), join(RAIZ, "CLAUDE.md"), ...archivos(join(RAIZ, ".github"))];

test("ningún nombre de archivo ni carpeta viene del proyecto original", () => {
  const malos = TODOS.map((r) => relative(RAIZ, r)).filter((r) => VIEJO.test(r));
  assert.deepEqual(malos, []);
});

test("ningún texto, nombre interno ni comentario menciona el proyecto original", () => {
  const restos = [];
  for (const ruta of TODOS) {
    if (ruta === ESTE || /\.(png|ico|wav|lock)$/.test(ruta) || ruta.endsWith("package-lock.json")) continue;
    readFileSync(ruta, "utf8").split("\n").forEach((linea, i) => {
      if (VIEJO.test(linea) || TRANSLITERADOS.test(linea)) restos.push(`${relative(RAIZ, ruta)}:${i + 1}`);
    });
  }
  assert.deepEqual(restos.slice(0, 30), [], `${restos.length} líneas todavía lo mencionan`);
});

test("el personaje usa el aspecto de NEO, no el cuerpo blanco ni los ojos negros del original", () => {
  const dibujos = ["src/neo/engine.ts", "src/neo/greeting.ts", "src/neo/outfits.ts", "src/upload/canvas.ts"];
  const BLANCO = /#EDEDEF|#C4C5CA|237,\s*237,\s*239|196,\s*197,\s*202|0\.929, 0\.929, 0\.937|rgb\(26,20,18\)|#16171A|#0E0F12/i;
  for (const ruta of dibujos) {
    const codigo = readFileSync(join(WINDOWS, ruta), "utf8");
    assert.doesNotMatch(codigo, BLANCO, `${ruta} todavía usa los colores originales`);
    assert.match(codigo, /neo-look"/, `${ruta} no usa neo-look`);
  }
});
