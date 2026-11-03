import { test } from "node:test";
import assert from "node:assert/strict";
import { awaySummary, projectName, rememberProject } from "../src/core/projects.ts";

const HOME = String.raw`C:\Users\ana`;

test("a project folder goes first, once, whatever its case or trailing slash", () => {
  let list = rememberProject([], String.raw`C:\code\tienda`, HOME);
  list = rememberProject(list, "C:\\code\\neo\\", HOME);
  list = rememberProject(list, String.raw`c:\CODE\tienda`, HOME);
  assert.deepEqual(list, [String.raw`c:\CODE\tienda`, String.raw`C:\code\neo`]);
});

test("the home folder, a drive and nothing at all are not projects", () => {
  assert.deepEqual(rememberProject([], HOME, HOME), []);
  assert.deepEqual(rememberProject([], "C:\\", HOME), []);
  assert.deepEqual(rememberProject([], "/", HOME), []);
  assert.deepEqual(rememberProject([], "", HOME), []);
  assert.deepEqual(rememberProject([], null, HOME), []);
});

test("only the 8 newest are kept", () => {
  let list = [];
  for (let i = 0; i < 10; i++) list = rememberProject(list, `/home/ana/p${i}`, "/home/ana");
  assert.equal(list.length, 8);
  assert.equal(list[0], "/home/ana/p9");
});

test("a project is shown by its folder's name", () => {
  assert.equal(projectName(String.raw`C:\code\tienda`), "tienda");
  assert.equal(projectName("/home/ana/neo/"), "neo");
});

test("the summary on coming back counts the notifications per app and what the agents did", () => {
  const since = 1000;
  const toasts = [
    { appId: "w", app: "WhatsApp", arrival: 1500 },
    { appId: "w", app: "WhatsApp", arrival: 1200 },
    { appId: "o", app: "OneDrive", arrival: 1100 },
    { appId: "w", app: "WhatsApp", arrival: 900 },
  ];
  const tasks = [
    { id: "a", name: "Claude Code", state: "approval", isIntegration: false, sessionId: "s1" },
    { id: "b", name: "Codex", state: "finished", isIntegration: false, sessionId: "s2" },
    { id: "c", name: "Cursor", state: "idle", isIntegration: false, sessionId: "s3" },
    { id: "g", name: "GitHub", state: "error", isIntegration: true, sessionId: null },
  ];
  assert.deepEqual(awaySummary(toasts, tasks, since), {
    notifications: 3,
    apps: [{ app: "WhatsApp", count: 2 }, { app: "OneDrive", count: 1 }],
    waiting: ["Claude Code"],
    finished: ["Codex"],
    failed: [],
  });
});

test("nothing happened while away: no summary", () => {
  assert.equal(awaySummary([], [], 1000), null);
});
