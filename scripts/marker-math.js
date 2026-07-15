const SAFE_DIAMETER_PX = 12;

/**
 * Return a finite marker diameter in screen pixels.
 *
 * The midpoint of the configured bounds is the nominal diameter. "full"
 * compensation keeps that nominal screen diameter stable at every zoom;
 * "mild" applies half of the correction, retaining some zoom response.
 */
export function markerScreenDiameter(zoom, minPx, maxPx, zoomCompensation) {
  if (![zoom, minPx, maxPx].every(Number.isFinite) || zoom <= 0) return SAFE_DIAMETER_PX;
  const low = Math.min(minPx, maxPx);
  const high = Math.max(minPx, maxPx);
  if (low <= 0 || high <= 0) return SAFE_DIAMETER_PX;

  const nominal = (low + high) / 2;
  const uncompensated = nominal * zoom;
  let diameter;
  if (zoomCompensation === "full") diameter = nominal;
  else if (zoomCompensation === "mild") diameter = (uncompensated + nominal) / 2;
  else return SAFE_DIAMETER_PX;
  return Math.min(high, Math.max(low, diameter));
}

export function markerWorldRadius(zoom, minPx, maxPx, zoomCompensation) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return markerScreenDiameter(zoom, minPx, maxPx, zoomCompensation) / safeZoom / 2;
}
