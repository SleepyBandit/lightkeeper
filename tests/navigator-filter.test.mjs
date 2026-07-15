import test from "node:test";
import assert from "node:assert/strict";
import { matchesNavigatorEntry } from "../scripts/navigator-filter.js";

const activePositive = {name: "Hall Lantern", x: 120, y: 240, hidden: false, locked: false, negative: false, active: true};
const hiddenInactiveNegative = {name: "Secret Darkness", x: 12, y: 24, hidden: true, locked: false, negative: true, active: false};

test("navigator matching supports query and ORed state filters", () => {
  assert.equal(matchesNavigatorEntry(activePositive, "lantern", new Set()), true);
  assert.equal(matchesNavigatorEntry(activePositive, "120 240", new Set()), true);
  assert.equal(matchesNavigatorEntry(activePositive, "darkness", new Set()), false);
  assert.equal(matchesNavigatorEntry(activePositive, "", new Set(["positive"])), true);
  assert.equal(matchesNavigatorEntry(activePositive, "", new Set(["inactive"])), false);
  assert.equal(matchesNavigatorEntry(hiddenInactiveNegative, "", new Set(["hidden", "positive"])), true);
  assert.equal(matchesNavigatorEntry(hiddenInactiveNegative, "secret", new Set(["inactive"])), true);
});
