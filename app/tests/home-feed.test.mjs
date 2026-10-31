import { test } from "node:test";
import assert from "node:assert/strict";
import { ago, sessionSummaries } from "../src/core/home-feed.ts";

const task = (extra) => ({ id: "agent_codex", name: "Codex", color: "#fff", state: "idle", stepIndex: 0, steps: [], source: "hook", isIntegration: false, ...extra });

test("only tasks with a live session are listed, waiting for you first", () => {
  const list = sessionSummaries([
    task({ id: "sin-sesion" }),
    task({ id: "stripe", isIntegration: true, sessionId: "s0" }),
    task({ id: "a", sessionId: "s1", state: "working", sessionCwd: String.raw`C:\code\tienda` }),
    task({ id: "b", sessionId: "s2", state: "approval", sessionCwd: "/home/ana/neo/" }),
  ]);
  assert.deepEqual(list.map((s) => s.id), ["b", "a"]);
  assert.equal(list[1].project, "tienda");
  assert.equal(list[0].project, "neo");
});

test("time ago reads in minutes, hours and days, and is unknown without a time", () => {
  const now = 1_000_000;
  assert.equal(ago(0, now), null);
  assert.deepEqual(ago(now - 20, now), { unit: "now", n: 0 });
  assert.deepEqual(ago(now + 20, now), { unit: "now", n: 0 });
  assert.deepEqual(ago(now - 300, now), { unit: "min", n: 5 });
  assert.deepEqual(ago(now - 7200, now), { unit: "h", n: 2 });
  assert.deepEqual(ago(now - 172800, now), { unit: "d", n: 2 });
});

test("the line is the last step, or the final message once it stopped", () => {
  const [working] = sessionSummaries([task({ sessionId: "s", steps: ["Lee", "Escribe"], stepIndex: 1 })]);
  assert.equal(working.line, "Escribe");
  const [done] = sessionSummaries([task({ sessionId: "s", steps: ["Lee"], finalLine: "Listo" })]);
  assert.equal(done.line, "Listo");
  const [none] = sessionSummaries([task({ sessionId: "s" })]);
  assert.equal(none.line, "");
  assert.equal(none.project, "");
});
