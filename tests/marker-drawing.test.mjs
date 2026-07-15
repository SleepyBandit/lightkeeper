import test from "node:test";
import assert from "node:assert/strict";
import { drawOriginMarker } from "../scripts/marker-drawing.js";

class FakeGraphics {
  calls = [];
  tint = 0;

  clear() { this.calls.push(["clear"]); return this; }
  beginFill(color, alpha) { this.calls.push(["beginFill", color, alpha]); return this; }
  lineStyle(width, color, alpha) { this.calls.push(["lineStyle", width, color, alpha]); return this; }
  drawCircle(x, y, radius) { this.calls.push(["drawCircle", x, y, radius]); return this; }
  endFill() { this.calls.push(["endFill"]); return this; }
}

test("native translate handles use Foundry's legacy PIXI Graphics drawing API", () => {
  const handle = new FakeGraphics();
  drawOriginMarker(handle, {color: 0xf6c945, alpha: 0.9, radius: 10, outline: true, outlineWidth: 2});
  assert.deepEqual(handle.calls, [
    ["clear"], ["beginFill", 0xf6c945, 0.9], ["lineStyle", 2, 0x000000, 0.8], ["drawCircle", 0, 0, 10], ["endFill"]
  ]);
  assert.equal(handle.tint, 0xFFFFFF);
});

test("native translate handles retain the contract with a zero-width outline", () => {
  const handle = new FakeGraphics();
  drawOriginMarker(handle, {color: 0x123456, alpha: 0.9, radius: 3, outline: false, outlineWidth: 99});
  assert.deepEqual(handle.calls, [
    ["clear"], ["beginFill", 0x123456, 0.9], ["lineStyle", 0, 0x000000, 0], ["drawCircle", 0, 0, 3], ["endFill"]
  ]);
  assert.equal(handle.tint, 0xFFFFFF);
});
