const HISTORY_KEY = "lens.adjust.history.v1";
const SUBJECTS_KEY = "lens.adjust.subjects.v1";
const SAVED_KEY = "lens.adjust.saved.v1";
const HISTORY_MAX = 10;

function read(key) {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function write(key, value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function listHistory() {
  return read(HISTORY_KEY) || [];
}

export function pushHistory(entry) {
  const list = listHistory();
  const next = [entry, ...list].slice(0, HISTORY_MAX);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  write(HISTORY_KEY, []);
}

const NUMERIC_GROUPS = ["light", "color", "detail"];

export function listSubjects() {
  return read(SUBJECTS_KEY) || {};
}

export function getSubjectBaseline(slug) {
  if (!slug) return null;
  return listSubjects()[slug] || null;
}

export function updateSubjectBaseline(slug, displayName, recipe) {
  if (!slug) return null;
  const all = listSubjects();
  const prev = all[slug];
  const sampleCount = (prev?.sampleCount || 0) + 1;
  const baseline = prev?.baseline ? structuredClone(prev.baseline) : structuredClone(recipe);

  for (const group of NUMERIC_GROUPS) {
    for (const k of Object.keys(recipe[group] || {})) {
      const prevV = prev?.baseline?.[group]?.[k] ?? recipe[group][k];
      const newV = recipe[group][k] ?? 0;
      baseline[group][k] = Math.round((prevV * (sampleCount - 1) + newV) / sampleCount);
    }
  }
  baseline.title = recipe.title;
  baseline.diagnosis = recipe.diagnosis;
  baseline.photographicStyle = recipe.photographicStyle;
  baseline.depth = recipe.depth;
  baseline.reasons = recipe.reasons;
  baseline.warnings = recipe.warnings;

  all[slug] = { displayName: displayName || slug, sampleCount, baseline, updatedAt: Date.now() };
  write(SUBJECTS_KEY, all);
  return all[slug];
}

export function deleteSubjectBaseline(slug) {
  const all = listSubjects();
  delete all[slug];
  write(SUBJECTS_KEY, all);
}

export function renameSubjectBaseline(slug, newDisplayName) {
  const all = listSubjects();
  if (!all[slug]) return;
  all[slug].displayName = newDisplayName;
  write(SUBJECTS_KEY, all);
}

export function saveRecipe(recipe, thumbnail, subject) {
  if (typeof window === "undefined") return null;
  const id = "r_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const all = read(SAVED_KEY) || {};
  all[id] = { id, at: Date.now(), recipe, thumbnail, subject: subject || null };
  write(SAVED_KEY, all);
  return id;
}

export function getSavedRecipe(id) {
  const all = read(SAVED_KEY) || {};
  return all[id] || null;
}

export function slugify(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
