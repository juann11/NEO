import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REACTION, isQuiet, reactionFor } from "../src/core/reactions.ts";

test("an app without its own reaction gets NEO's usual one", () => {
  assert.deepEqual(reactionFor("WhatsApp", {}), DEFAULT_REACTION);
  assert.deepEqual(DEFAULT_REACTION, { sound: "pop", emote: "surprised", outfit: "" });
});

test("an app's reaction is found whatever the case of its id, and empty parts keep the usual ones", () => {
  const map = { "whatsapp!app": { sound: "love", emote: "", outfit: "partyHat" } };
  assert.deepEqual(reactionFor("WhatsApp!App", map), { sound: "love", emote: "surprised", outfit: "partyHat" });
});

test("silence and no gesture are choices; unknown values fall back to the usual ones", () => {
  assert.deepEqual(reactionFor("a", { a: { sound: "none", emote: "none", outfit: "none" } }), { sound: "none", emote: "none", outfit: "none" });
  assert.deepEqual(reactionFor("a", { a: { sound: "trumpet", emote: "dance", outfit: "auto" } }), DEFAULT_REACTION);
});

test("quiet hours work inside one day and across midnight, and only when on", () => {
  const at = (h, m = 0) => new Date(2026, 10, 2, h, m);
  const night = { enabled: true, from: "22:00", to: "08:00" };
  assert.equal(isQuiet(at(23), night), true);
  assert.equal(isQuiet(at(7, 59), night), true);
  assert.equal(isQuiet(at(8), night), false);
  assert.equal(isQuiet(at(12), night), false);
  const lunch = { enabled: true, from: "13:00", to: "14:30" };
  assert.equal(isQuiet(at(14, 15), lunch), true);
  assert.equal(isQuiet(at(15), lunch), false);
  assert.equal(isQuiet(at(23), { ...night, enabled: false }), false);
  assert.equal(isQuiet(at(23), { enabled: true, from: "09:00", to: "09:00" }), false);
  assert.equal(isQuiet(at(23), { enabled: true, from: "nope", to: "08:00" }), false);
});
