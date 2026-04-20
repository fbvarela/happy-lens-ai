"use client";

import { useState } from "react";
import { SUBJECT_PRESETS } from "@/data/subjects/presets";
import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";
import { TIME_PRESETS, resolveTimePreset } from "@/lib/time-presets";

export default function CoachPage() {
  const [subjectId, setSubjectId] = useState("portrait");
  const [scene, setScene] = useState({
    lat: "",
    lng: "",
    dateTime: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [locating, setLocating] = useState(false);
  const [timeHint, setTimeHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not available — enter coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setScene((s) => ({
          ...s,
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4),
        }));
        setLocating(false);
      },
      (err) => {
        setError(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const payload = {
      subjectId,
      gearId: "iphone-16-pro",
      scene: {
        lat: scene.lat ? +scene.lat : null,
        lng: scene.lng ? +scene.lng : null,
        dateTime: scene.dateTime ? new Date(scene.dateTime).toISOString() : null,
        notes: scene.notes,
      },
    };
    const storageKey = offlineKey(payload);
    try {
      const res = await fetch("/api/coach/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "scene-incompatible") throw new Error(`Scene: ${data.error}`);
        throw new Error(data?.error || "Request failed.");
      }
      setResult(data);
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
    } catch (err) {
      const offline = readOffline(storageKey);
      if (offline) {
        setResult({ ...offline, source: "offline" });
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Shot coach</h1>
      <p className="page-sub">
        Pick a subject, drop a location and time — get a settings-and-position recipe tuned to your iPhone 16 Pro.
      </p>

      <form onSubmit={submit} className="card coach-card coach-form">
        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">1</span> Subject
          </div>
          <div className="chip-row" role="listbox" aria-label="Subject">
            {SUBJECT_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectId(s.id)}
                className="chip"
                aria-pressed={subjectId === s.id}
              >
                <span aria-hidden>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">2</span> Scene
          </div>
          <div className="scene-grid">
            <label className="scene-field">
              <span className="input-label">Latitude</span>
              <input
                className="input"
                inputMode="decimal"
                autoComplete="off"
                value={scene.lat}
                onChange={(e) => setScene({ ...scene, lat: e.target.value })}
                placeholder="40.4168"
              />
            </label>
            <label className="scene-field">
              <span className="input-label">Longitude</span>
              <input
                className="input"
                inputMode="decimal"
                autoComplete="off"
                value={scene.lng}
                onChange={(e) => setScene({ ...scene, lng: e.target.value })}
                placeholder="-3.7038"
              />
            </label>
            <label className="scene-field full">
              <span className="input-label">Date &amp; time</span>
              <input
                type="datetime-local"
                className="input"
                value={scene.dateTime}
                onChange={(e) => {
                  setScene({ ...scene, dateTime: e.target.value });
                  setTimeHint(null);
                }}
              />
            </label>
            <div className="full time-presets">
              {TIME_PRESETS().map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  onClick={() => {
                    const r = resolveTimePreset(p.id, {
                      lat: scene.lat ? +scene.lat : null,
                      lng: scene.lng ? +scene.lng : null,
                    });
                    if (r.error) {
                      setTimeHint({ kind: "error", text: r.error });
                      return;
                    }
                    setScene((s) => ({ ...s, dateTime: r.dateTime }));
                    setTimeHint({ kind: "ok", text: `Set to ${r.label}.` });
                  }}
                >
                  <span aria-hidden>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            {timeHint && (
              <p className={`full time-hint ${timeHint.kind}`}>{timeHint.text}</p>
            )}
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <span aria-hidden>📍</span>
                <span>{locating ? "Locating…" : "Use my location"}</span>
              </button>
            </div>
            <label className="scene-field full">
              <span className="input-label">Notes (optional)</span>
              <input
                className="input"
                value={scene.notes}
                onChange={(e) => setScene({ ...scene, notes: e.target.value })}
                placeholder="backlit, indoors, moving subject…"
              />
            </label>
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">3</span> Gear
          </div>
          <div className="gear-pill">
            <span className="gear-icon" aria-hidden>📱</span>
            <div className="gear-text">
              <span className="gear-label">{IPHONE_16_PRO.label}</span>
              <span className="gear-meta">
                {IPHONE_16_PRO.lenses.length} lenses · Night · ProRAW · Action
              </span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary coach-submit" disabled={loading}>
          {loading ? "Thinking…" : "Generate recipe"}
        </button>
        {error && !error.startsWith("Scene:") && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      {error?.startsWith("Scene:") && (
        <div className="card scene-block">
          <div className="card-title">That subject won't work here</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{error.replace(/^Scene:\s*/, "")}</p>
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Try a different subject above, or change the date &amp; time.
          </p>
        </div>
      )}

      {result && <Results result={result} subjectId={subjectId} scene={scene} />}
    </>
  );
}

function Results({ result, subjectId, scene }) {
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      {(result.sky || result.weather) && (
        <div className="card">
          <div className="card-title">Sky, light &amp; weather</div>
          <div className="sky-row">
            {result.sky && (
              <>
                <span>☀️ alt {result.sky.sun.altitudeDeg}° · az {result.sky.sun.azimuthDeg}°</span>
                <span>🌙 moon {Math.round(result.sky.moon.fraction * 100)}%</span>
              </>
            )}
            {result.weather && (
              <>
                {result.weather.label && <span>⛅ {result.weather.label}</span>}
                {result.weather.tempC != null && <span>🌡 {Math.round(result.weather.tempC)}°C</span>}
                {result.weather.cloudCoverPct != null && <span>☁️ {result.weather.cloudCoverPct}%</span>}
                {result.weather.windKph != null && <span>💨 {result.weather.windKph} km/h</span>}
                {result.weather.precipMm > 0 && <span>🌧 {result.weather.precipMm} mm</span>}
              </>
            )}
          </div>
        </div>
      )}
      <div className="recipe-grid">
        {result.recipes.map((r, i) => (
          <RecipeCard key={i} recipe={r} subjectId={subjectId} scene={scene} />
        ))}
      </div>
      {result.source && <SourceBadge source={result.source} />}
    </section>
  );
}

function RecipeCard({ recipe: r, subjectId, scene }) {
  const feedbackKey = `hl.coach.fb.${subjectId}.${r.label}`;
  const [vote, setVote] = useState(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(feedbackKey); } catch { return null; }
  });
  const [copied, setCopied] = useState(false);

  const rate = (v) => {
    const next = vote === v ? null : v;
    setVote(next);
    try {
      if (next) localStorage.setItem(feedbackKey, next);
      else localStorage.removeItem(feedbackKey);
    } catch {}
  };

  const copy = async () => {
    const text = [
      `${r.label} — ${r.cameraMode}`,
      `${prettyLens(r.lens)} · f/${r.fNumber} · ${r.shutter} · ISO ${r.iso} · EV ${r.ev > 0 ? "+" : ""}${r.ev}`,
      `Position: ${r.position}`,
      `Focus: ${r.focus}`,
      `Stabilization: ${r.stabilization}`,
      ...r.compositionTips.map((t) => `• ${t}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <article className="card">
      <div className="recipe-head">
        <div className="card-title" style={{ margin: 0 }}>{r.label}</div>
        <span className="badge badge-sun">{r.cameraMode}</span>
      </div>
      <div className="recipe-stats">
        <Stat label="Lens" value={prettyLens(r.lens)} />
        <Stat label="Aperture" value={`f/${r.fNumber}`} />
        <Stat label="Shutter" value={r.shutter} />
        <Stat label="ISO" value={r.iso} />
        <Stat label="EV" value={r.ev > 0 ? `+${r.ev}` : r.ev} />
      </div>
      <p className="recipe-line"><strong>Position.</strong> {r.position}</p>
      <p className="recipe-line"><strong>Focus.</strong> {r.focus}</p>
      <p className="recipe-line"><strong>Stabilization.</strong> {r.stabilization}</p>
      <ul className="recipe-tips">
        {r.compositionTips.map((t, j) => <li key={j}>{t}</li>)}
      </ul>
      {r.warnings?.length > 0 && (
        <div className="recipe-warning">
          {r.warnings.map((w, j) => <div key={j}>⚠️ {w}</div>)}
        </div>
      )}
      <div className="recipe-actions">
        <div className="recipe-vote" role="group" aria-label="Rate this recipe">
          <button
            type="button"
            className={`vote-btn ${vote === "up" ? "vote-on" : ""}`}
            onClick={() => rate("up")}
            aria-pressed={vote === "up"}
            aria-label="Useful"
          >👍</button>
          <button
            type="button"
            className={`vote-btn ${vote === "down" ? "vote-on" : ""}`}
            onClick={() => rate("down")}
            aria-pressed={vote === "down"}
            aria-label="Not useful"
          >👎</button>
        </div>
        <button type="button" className="copy-btn" onClick={copy}>
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="recipe-stat-label">{label}</div>
      <div className="recipe-stat-value">{value}</div>
    </div>
  );
}

function SourceBadge({ source }) {
  const meta = {
    groq:     { icon: "⚡", label: "Fresh from AI coach",  tone: "leaf" },
    cache:    { icon: "⚡", label: "Cached (30 min)",       tone: "leaf" },
    offline:  { icon: "📴", label: "Offline — last saved",  tone: "clay" },
    stub:     { icon: "🧪", label: "Stub — set GROQ_API_KEY", tone: "sun" },
    fallback: { icon: "⚠️", label: "AI unavailable — stub", tone: "clay" },
  }[source] || { icon: "•", label: source, tone: "sun" };
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <span className={`badge badge-${meta.tone}`}>{meta.icon} {meta.label}</span>
    </div>
  );
}

function prettyLens(id) {
  const lens = IPHONE_16_PRO.lenses.find((l) => l.id === id);
  return lens ? lens.label : id;
}

function offlineKey({ subjectId, gearId, scene }) {
  const lat = scene?.lat != null ? Math.round(scene.lat * 100) / 100 : "x";
  const lng = scene?.lng != null ? Math.round(scene.lng * 100) / 100 : "x";
  const hour = scene?.dateTime ? new Date(scene.dateTime).toISOString().slice(0, 13) : "x";
  return `hl.coach.${gearId}.${subjectId}.${lat}.${lng}.${hour}`;
}

function readOffline(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
