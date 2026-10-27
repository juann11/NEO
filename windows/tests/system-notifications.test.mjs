// Notificaciones de Windows en la isla (src/island/system-notifications.ts, src/views/notification.ts):
// cada toast que Rust manda abre la isla con su tarjeta, salvo en pausa o con un permiso esperando.

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { emit } from "./tauri.mjs";
import { installFakeDom } from "./fakedom.mjs";

installFakeDom();

const { SystemNotifications, registerSystemNotifications } = await import("../src/island/system-notifications.ts");
const { buildNotification } = await import("../src/views/notification.ts");
const { State } = await import("../src/core/state.ts");

const host = { alerts: [], emotes: [], alert(view) { this.alerts.push(view); }, emote(name) { this.emotes.push(name); } };
registerSystemNotifications(host);

const toast = { id: 900, appId: "5319275A.WhatsAppDesktop_x!App", app: "WhatsApp", title: "Ana", body: "¿Vienes hoy?" };

beforeEach(() => {
  host.alerts = [];
  host.emotes = [];
  State.paused = false;
  State.pendingApproval = null;
  SystemNotifications.current = null;
});

test("a Windows notification opens the island on its card", () => {
  emit("system-notification", toast);
  assert.deepEqual(host.alerts, ["notification"]);
  assert.deepEqual(SystemNotifications.current, toast);
});

test("paused, NEO keeps quiet", () => {
  State.paused = true;
  emit("system-notification", toast);
  assert.deepEqual(host.alerts, []);
  assert.equal(SystemNotifications.current, null);
});

test("a permission waiting for an answer keeps the island", () => {
  State.pendingApproval = { id: "x" };
  emit("system-notification", toast);
  assert.deepEqual(host.alerts, []);
});

test("the card shows the app, the title and the text", () => {
  SystemNotifications.current = toast;
  const view = buildNotification(() => {});
  view.sync();
  const text = view.el.textContent;
  for (const part of ["WhatsApp", "Ana", "¿Vienes hoy?"]) assert.ok(text.includes(part), part);
});
