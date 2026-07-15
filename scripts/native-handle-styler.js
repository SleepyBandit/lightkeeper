import { drawOriginMarker } from "./marker-drawing.js";
import { markerWorldRadius } from "./marker-math.js";
import { getEffectiveAppearance } from "./settings.js";
import { isLightkeeperUser } from "./access.js";

const DEFAULT_MARKER_COLOR = 0xf6c945;

function stageScale() {
  const scale = Number(canvas?.stage?.scale?.x);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function markerColor(value) {
  const color = Number.parseInt(String(value).replace("#", ""), 16);
  return Number.isFinite(color) ? color : DEFAULT_MARKER_COLOR;
}

/**
 * Version-pinned Foundry 14.364 integration for native AmbientLight translate handles.
 * It redraws the live ShapeControlsHandle in place, preserving core listeners and drag routing.
 */
export class NativeHandleStyler {
  #stageScale = null;

  reset() {
    this.#stageScale = null;
  }

  restyle(light) {
    if (!isLightkeeperUser() || !light?.controls) return false;
    const appearance = getEffectiveAppearance();
    if (!appearance.showMarkers) return this.#restoreCoreControls(light);

    // Core redraws destroy handle objects, so resolve the current native handle every pass.
    const handle = light.controls?.handles?.children?.find((handle) => handle.name === "translate");
    if (!handle) return false;

    const zoom = stageScale();
    const radius = markerWorldRadius(zoom, Number(appearance.minMarkerPx), Number(appearance.maxMarkerPx), appearance.zoomCompensation);
    drawOriginMarker(handle, {
      color: markerColor(appearance.markerColor),
      alpha: 0.9,
      radius,
      outline: appearance.markerOutline,
      outlineWidth: Math.max(1 / zoom, radius * 0.18)
    });
    return true;
  }

  refreshAll() {
    if (!isLightkeeperUser() || !canvas?.ready) return false;
    this.#stageScale = stageScale();
    for (const light of canvas.lighting?.placeables ?? []) this.restyle(light);
    return true;
  }

  refreshForCanvasPan() {
    if (!isLightkeeperUser() || !canvas?.ready) return false;
    const scale = stageScale();
    if (scale === this.#stageScale) return false;
    return this.refreshAll();
  }

  #restoreCoreControls(light) {
    // Do not hide the core controls. A normal controls redraw safely recreates their native drawing.
    void light.controls?.draw?.();
    return true;
  }
}
