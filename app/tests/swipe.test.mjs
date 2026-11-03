import { test } from "node:test";
import assert from "node:assert/strict";
import { dismissToast, isDismissed, swipeOutcome } from "../src/core/swipe.ts";

test("a long enough drag to the right opens, to the left deletes; a short one goes back", () => {
  assert.equal(swipeOutcome(120, 260), "open");
  assert.equal(swipeOutcome(-120, 260), "delete");
  assert.equal(swipeOutcome(40, 260), null);
  assert.equal(swipeOutcome(-40, 260), null);
  assert.equal(swipeOutcome(0, 0), null);
});

test("a deleted notification is remembered once, and only the newest 200 are kept", () => {
  let list = dismissToast([], 5);
  list = dismissToast(list, 5);
  assert.deepEqual(list, [5]);
  for (let id = 100; id < 400; id++) list = dismissToast(list, id);
  assert.equal(list.length, 200);
  assert.equal(list[0], 399);
  assert.ok(isDismissed(list, 399));
  assert.ok(!isDismissed(list, 5));
});
