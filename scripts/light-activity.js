/**
 * Whether a drawn AmbientLight currently has an active light or darkness source.
 *
 * An undrawn placeable has no initialized canvas sources, so it is conservatively
 * inactive. This deliberately uses AmbientLight#lightSource/#darknessSource and
 * their documented active status; documents and legacy generic `source` objects
 * do not provide an activity flag.
 */
export function hasActiveLightOrDarknessSource(placeable) {
  return Boolean(placeable?.lightSource?.active === true || placeable?.darknessSource?.active === true);
}
