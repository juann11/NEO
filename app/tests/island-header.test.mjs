// La cabecera de la isla (src/views/views.ts): el engranaje abre la ventana principal de NEO.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFakeDom } from "./fakedom.mjs";

installFakeDom();

const { buildHeader } = await import("../src/views/views.ts");

test("the island's gear opens NEO's window", () => {
  let opened = 0;
  const actions = new Proxy({}, { get: (_, name) => (name === "openMainWindow" ? () => opened++ : () => {}) });
  const header = buildHeader(actions);
  const all = (node) => [node, ...node.children.flatMap(all)];
  const button = all(header.el).find((n) => n.getAttribute?.("title") === "Settings");
  assert.ok(button, "no hay engranaje en la cabecera");
  button.fire("click");
  assert.equal(opened, 1);
  assert.ok(!all(header.el).some((n) => n.getAttribute?.("title") === "Open NEO"), "un solo botón para lo mismo");
});

test("NEO's window opens on the island's settings, with voice as a second group", () => {
  const shell = readFileSync(new URL("../src/hub/shell.ts", import.meta.url), "utf8");
  assert.match(shell, /let current: PageId = "general"/);
  assert.ok(shell.indexOf('text: t("Notch")') < shell.indexOf('text: t("Voice")'));
  assert.match(shell, /id: "dictation"/, "las funciones de voz siguen ahí");
});

test("the voice group folds: open when dictation is on, and whenever one of its pages opens", () => {
  const shell = readFileSync(new URL("../src/hub/shell.ts", import.meta.url), "utf8");
  assert.match(shell, /foldVoice\(status\.prefs\.enabled\)/);
  assert.match(shell, /if \(FLOW_PAGES\.includes\(def\)\) foldVoice\(true\)/);
  assert.match(shell, /aria-expanded/);
});
