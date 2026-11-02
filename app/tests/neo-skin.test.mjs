import { test } from "node:test";
import assert from "node:assert/strict";
import { NEO_SKINS, NEO_TOP_RGB, NEO_BOTTOM_RGB, neoSkin } from "../src/neo/neo-look.ts";

test("graphite is NEO's own colour, and anything unknown falls back to it", () => {
  assert.deepEqual(neoSkin("graphite"), [NEO_TOP_RGB, NEO_BOTTOM_RGB]);
  assert.deepEqual(neoSkin("rainbow"), [NEO_TOP_RGB, NEO_BOTTOM_RGB]);
  assert.deepEqual(neoSkin(""), [NEO_TOP_RGB, NEO_BOTTOM_RGB]);
});

test("every colour is a top and a darker bottom tone", () => {
  assert.ok(NEO_SKINS.length >= 8);
  const light = (rgb) => rgb[0] + rgb[1] + rgb[2];
  for (const skin of NEO_SKINS) {
    const [top, bottom] = neoSkin(skin.id);
    assert.ok(light(top) > light(bottom), skin.id);
    for (const c of [...top, ...bottom]) assert.ok(c >= 0 && c <= 1, skin.id);
  }
});
