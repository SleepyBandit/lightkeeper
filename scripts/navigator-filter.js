function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

/** Pure matching logic shared by Navigator context and in-place DOM filtering. */
export function matchesNavigatorEntry(entry, query, filters) {
  const needle = normalize(query);
  if (needle && !normalize(`${entry.name} ${entry.x} ${entry.y}`).includes(needle)) return false;
  if (!filters?.size) return true;
  return (filters.has("hidden") && entry.hidden) || (filters.has("locked") && entry.locked) ||
    (filters.has("positive") && !entry.negative) || (filters.has("negative") && entry.negative) ||
    (filters.has("inactive") && !entry.active);
}
