// La flecha ↗ de la isla (src/island/targets.ts): abre lo que señala la pestaña enfocada.

import { test } from "node:test";
import assert from "node:assert/strict";
import { sent } from "./tauri.mjs";

const { openTarget } = await import("../src/island/targets.ts");

const claude = (extra = {}) => ({ id: "integration_claude", name: "Claude Code", sessionId: null, sessionCwd: "C:\\work\\proj", ...extra });

test("with no session, Claude Code's arrow opens the Claude app, never an editor", () => {
  const app = sent("open_claude_desktop").length;
  const session = sent("open_session").length;
  openTarget(claude());
  assert.equal(sent("open_claude_desktop").length, app + 1);
  assert.equal(sent("open_session").length, session, "no abre VS Code por el plan B de open_session");
});

test("with a live session, the arrow still brings that session's window forward", () => {
  openTarget(claude({ sessionId: "s1" }));
  assert.deepEqual(sent("open_session").at(-1), { sessionId: "s1", path: "C:\\work\\proj" });
});

test("a service opens its page", () => {
  openTarget({ id: "integration_vercel", name: "Vercel" });
  assert.deepEqual(sent("open_url").at(-1), { url: "https://vercel.com/dashboard" });
});
