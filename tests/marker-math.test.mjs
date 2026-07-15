import test from "node:test";
import assert from "node:assert/strict";
import { markerScreenDiameter } from "../scripts/marker-math.js";

test("full compensation maintains the nominal screen diameter", () => {
  assert.equal(markerScreenDiameter(0.1, 12, 28, "full"), 20);
  assert.equal(markerScreenDiameter(1, 12, 28, "full"), 20);
  assert.equal(markerScreenDiameter(10, 12, 28, "full"), 20);
});

test("mild compensation applies half the correction and clamps to bounds", () => {
  assert.equal(markerScreenDiameter(0.5, 12, 28, "mild"), 15);
  assert.equal(markerScreenDiameter(1, 12, 28, "mild"), 20);
  assert.equal(markerScreenDiameter(2, 12, 28, "mild"), 28);
  assert.equal(markerScreenDiameter(0.05, 12, 28, "mild"), 12);
});

test("markerScreenDiameter handles inverted bounds", () => {
  assert.equal(markerScreenDiameter(1, 28, 12, "full"), 20);
  assert.equal(markerScreenDiameter(2, 28, 12, "mild"), 28);
});

test("markerScreenDiameter returns a safe finite result for invalid inputs", () => {
  assert.equal(markerScreenDiameter(NaN, 12, 28, "full"), 12);
  assert.equal(markerScreenDiameter(-1, 12, 28, "full"), 12);
  assert.equal(markerScreenDiameter(1, NaN, 28, "full"), 12);
  assert.equal(markerScreenDiameter(1, 12, Infinity, "full"), 12);
  assert.equal(markerScreenDiameter(1, 0, 28, "full"), 12);
  assert.equal(markerScreenDiameter(1, 12, 28, "off"), 12);
});
