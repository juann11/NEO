// La cabecera de la isla (src/views/views.ts): un botón abre la ventana principal de NEO.

import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeDom } from "./fakedom.mjs";

installFakeDom();

const { buildHeader } = await import("../src/views/views.ts");

test("the island header has a button that opens NEO's window", () => {
  let opened = 0;
  const actions = new Proxy({}, { get: (_, name) => (name === "openMainWindow" ? () => opened++ : () => {}) });
  const header = buildHeader(actions);
  const all = (node) => [node, ...node.children.flatMap(all)];
  const button = all(header.el).find((n) => n.getAttribute?.("title") === "Open NEO");
  assert.ok(button, "no hay botón Open NEO en la cabecera");
  button.fire("click");
  assert.equal(opened, 1);
});
