import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOME_CARDS, HOME_CARD_IDS, addCard, cleanCards, missingCards, moveCard, removeCard, toggleWide } from "../src/core/home-cards.ts";

const ids = (cards) => cards.map((c) => c.id);

test("cards the app no longer knows, and repeated ones, are dropped", () => {
  const saved = [{ id: "agents", wide: false }, { id: "viejo", wide: true }, { id: "agents", wide: true }, { id: "status", wide: true }];
  assert.deepEqual(cleanCards(saved), [{ id: "agents", wide: false }, { id: "status", wide: true }]);
  assert.deepEqual(cleanCards([]), [], "quitarlas todas es una elección válida");
});

test("adding puts the card last and never twice", () => {
  const one = addCard([{ id: "agents", wide: false }], "services");
  assert.deepEqual(ids(one), ["agents", "services"]);
  assert.deepEqual(ids(addCard(one, "services")), ["agents", "services"]);
  assert.deepEqual(ids(addCard(one, "viejo")), ["agents", "services"]);
});

test("removing gives the card back to the list of what can be added", () => {
  const rest = removeCard(DEFAULT_HOME_CARDS, "sessions");
  assert.ok(!ids(rest).includes("sessions"));
  assert.ok(missingCards(rest).includes("sessions"));
  assert.equal(missingCards(HOME_CARD_IDS.map((id) => ({ id, wide: false }))).length, 0);
});

test("a card moves to the place asked for, clamped to the list", () => {
  const cards = ["agents", "status", "services"].map((id) => ({ id, wide: false }));
  assert.deepEqual(ids(moveCard(cards, "services", 0)), ["services", "agents", "status"]);
  assert.deepEqual(ids(moveCard(cards, "agents", 2)), ["status", "services", "agents"]);
  assert.deepEqual(ids(moveCard(cards, "agents", 99)), ["status", "services", "agents"]);
  assert.deepEqual(ids(moveCard(cards, "status", -5)), ["status", "agents", "services"]);
  assert.deepEqual(moveCard(cards, "viejo", 0), cards);
});

test("the width changes on one card only, and the list passed in stays as it was", () => {
  const cards = [{ id: "agents", wide: false }, { id: "status", wide: false }];
  assert.deepEqual(toggleWide(cards, "status"), [{ id: "agents", wide: false }, { id: "status", wide: true }]);
  assert.equal(cards[1].wide, false);
});
