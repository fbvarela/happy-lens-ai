const TTL_MS = 1000 * 60 * 30;
const MAX_ENTRIES = 200;

const store = globalThis.__coachCache ?? (globalThis.__coachCache = new Map());

export function cacheKey({ subjectId, gearId, scene }) {
  const lat = scene?.lat != null ? Math.round(scene.lat * 100) / 100 : "nolat";
  const lng = scene?.lng != null ? Math.round(scene.lng * 100) / 100 : "nolng";
  const hourBucket = scene?.dateTime ? new Date(scene.dateTime).toISOString().slice(0, 13) : "notime";
  const notesHash = (scene?.notes || "").trim().toLowerCase().slice(0, 40);
  return `${gearId}|${subjectId}|${lat}|${lng}|${hourBucket}|${notesHash}`;
}

export function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.t > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.v;
}

export function setCached(key, value) {
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { t: Date.now(), v: value });
}
