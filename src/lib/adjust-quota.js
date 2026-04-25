const QUOTA_KEY = "lens.adjust.quota.v1";

const FREE_DAILY = {
  uploads: 5,
  previews: 3,
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function read() {
  if (typeof window === "undefined") return { day: today(), uploads: 0, previews: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(QUOTA_KEY) || "null");
    if (!raw || raw.day !== today()) return { day: today(), uploads: 0, previews: 0 };
    return raw;
  } catch { return { day: today(), uploads: 0, previews: 0 }; }
}

function write(v) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(QUOTA_KEY, JSON.stringify(v)); } catch {}
}

export function getQuota() {
  const q = read();
  return {
    day: q.day,
    uploads: { used: q.uploads, max: FREE_DAILY.uploads, remaining: Math.max(0, FREE_DAILY.uploads - q.uploads) },
    previews: { used: q.previews, max: FREE_DAILY.previews, remaining: Math.max(0, FREE_DAILY.previews - q.previews) },
  };
}

export function consumeUpload() {
  const q = read();
  if (q.uploads >= FREE_DAILY.uploads) return false;
  q.uploads += 1;
  write(q);
  return true;
}

export function consumePreview() {
  const q = read();
  if (q.previews >= FREE_DAILY.previews) return false;
  q.previews += 1;
  write(q);
  return true;
}
