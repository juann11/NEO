import { test } from "node:test";
import assert from "node:assert/strict";
import { addProject, awaySummary, projectName, removeProject } from "../src/core/projects.ts";

test("a folder you add goes last, once, whatever its case or trailing slash", () => {
  let list = addProject([], String.raw`C:\code\tienda`);
  list = addProject(list, "C:\\code\\neo\\");
  list = addProject(list, "c:\\CODE\\tienda\\");
  assert.deepEqual(list, [String.raw`C:\code\tienda`, String.raw`C:\code\neo`]);
  assert.deepEqual(addProject(list, ""), list);
  assert.deepEqual(addProject(list, null), list);
});

test("a folder you remove leaves the list, whatever its case", () => {
  const list = [String.raw`C:\code\tienda`, String.raw`C:\code\neo`];
  assert.deepEqual(removeProject(list, String.raw`c:\code\TIENDA`), [String.raw`C:\code\neo`]);
  assert.deepEqual(removeProject(list, String.raw`D:\otra`), list);
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
