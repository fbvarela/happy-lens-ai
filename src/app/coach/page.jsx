"use client";

import { useState } from "react";
import { SUBJECT_PRESETS } from "@/data/subjects/presets";
import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";

export default function CoachPage() {
  const [subjectId, setSubjectId] = useState("portrait");
  const [scene, setScene] = useState({
    lat: "",
    lng: "",
    dateTime: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [locating, setLocating] = useState(false);
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
    try {
      const res = await fetch("/api/coach/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          gearId: "iphone-16-pro",
          scene: {
            lat: scene.lat ? +scene.lat : null,
            lng: scene.lng ? +scene.lng : null,
            dateTime: scene.dateTime ? new Date(scene.dateTime).toISOString() : null,
            notes: scene.notes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
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
                onChange={(e) => setScene({ ...scene, dateTime: e.target.value })}
              />
            </label>
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
        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      {result && <Results result={result} />}
    </>
  );
}

function Results({ result }) {
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      {result.sky && (
        <div className="card">
          <div className="card-title">Sky &amp; light</div>
          <div className="sky-row">
            <span>☀️ alt {result.sky.sun.altitudeDeg}° · az {result.sky.sun.azimuthDeg}°</span>
            <span>🌙 moon {Math.round(result.sky.moon.fraction * 100)}%</span>
          </div>
        </div>
      )}
      <div className="recipe-grid">
        {result.recipes.map((r, i) => (
          <article key={i} className="card">
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
          </article>
        ))}
      </div>
      {result.source && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>source: {result.source}</p>
      )}
    </section>
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

function prettyLens(id) {
  const lens = IPHONE_16_PRO.lenses.find((l) => l.id === id);
  return lens ? lens.label : id;
}
