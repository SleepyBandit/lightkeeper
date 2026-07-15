/** Redraw an existing Foundry 14.364 ShapeControlsHandle with the legacy PIXI Graphics API. */
export function drawOriginMarker(handle, {color, alpha, radius, outline, outlineWidth}) {
  handle.clear().beginFill(color, alpha).lineStyle(outline ? outlineWidth : 0, 0x000000, outline ? 0.8 : 0).drawCircle(0, 0, radius).endFill();
  // AmbientLight refresh tints controls; restore this marker's configured fill after that core state pass.
  handle.tint = 0xFFFFFF;
}
