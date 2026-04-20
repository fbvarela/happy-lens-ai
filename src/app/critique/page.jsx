"use client";

import { useRef, useState } from "react";
import exifr from "exifr";

const MAX_PREVIEW_PX = 1600;

async function fileToDownscaledDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_PREVIEW_PX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function CritiquePage() {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exif, setExif] = useState(null);
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Pick a JPEG or HEIC image.");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    try {
      const [dataUrl, meta] = await Promise.all([
        fileToDownscaledDataUrl(f),
        exifr.parse(f, { gps: true, tiff: true, exif: true, ifd0: true }).catch(() => null),
      ]);
      setPreviewUrl(dataUrl);
      setExif(meta || null);
    } catch (err) {
      setError(err.message || "Couldn't read that image.");
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!previewUrl) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/coach/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: previewUrl, exif, intent: intent.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Critique failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreviewUrl(null); setExif(null);
    setIntent(""); setResult(null); setError(null);
  };

  return (
    <>
      <h1 className="page-title">Critique a photo</h1>
      <p className="page-sub">
        Drop a JPEG — we read the EXIF, look at the image, and tell you what to try next time.
      </p>

      <div className="card coach-card" style={{ display: "grid", gap: 16 }}>
        {!previewUrl && (
          <div
            className={`dropzone ${dragging ? "dropzone-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontSize: "2rem" }}>📷</div>
            <div style={{ fontWeight: 600, color: "var(--bark)" }}>Tap to pick — or drop a photo here</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>JPEG / HEIC · max ~10 MB</div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/heic,image/png,image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </div>
        )}

        {previewUrl && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="preview-wrap">
              <img src={previewUrl} alt={file?.name || "Photo preview"} className="preview-img" />
            </div>
            {exif && <ExifSummary exif={exif} />}
            <label className="scene-field">
              <span className="input-label">What were you trying to shoot? (optional)</span>
              <input
                className="input"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="e.g. backlit portrait at golden hour"
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? "Reading the photo…" : "Get critique"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>Use a different photo</button>
            </div>
          </div>
        )}

        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </div>

      {result && <CritiqueResult result={result} />}
    </>
  );
}

function ExifSummary({ exif }) {
  const items = [
    exif.Make && exif.Model ? { label: "Camera", value: `${exif.Make} ${exif.Model}` } : null,
    exif.LensModel ? { label: "Lens", value: exif.LensModel } : null,
    exif.FocalLength != null ? { label: "Focal", value: `${exif.FocalLength} mm${exif.FocalLengthIn35mmFormat ? ` (${exif.FocalLengthIn35mmFormat} eq)` : ""}` } : null,
    exif.FNumber != null ? { label: "Aperture", value: `f/${exif.FNumber}` } : null,
    exif.ExposureTime != null ? { label: "Shutter", value: exif.ExposureTime >= 1 ? `${exif.ExposureTime}s` : `1/${Math.round(1 / exif.ExposureTime)}s` } : null,
    exif.ISO != null ? { label: "ISO", value: exif.ISO } : null,
    exif.ExposureCompensation != null ? { label: "EV", value: exif.ExposureCompensation } : null,
    exif.DateTimeOriginal ? { label: "Taken", value: new Date(exif.DateTimeOriginal).toLocaleString() } : null,
  ].filter(Boolean);
  if (!items.length) return <div className="recipe-warning">No EXIF on this image — critique will rely on what it sees.</div>;
  return (
    <div className="recipe-stats">
      {items.map((it) => (
        <div key={it.label}>
          <div className="recipe-stat-label">{it.label}</div>
          <div className="recipe-stat-value">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function CritiqueResult({ result }) {
  const score = result.verdict?.score ?? 0;
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      <div className="card">
        <div className="recipe-head">
          <div className="card-title" style={{ margin: 0 }}>{result.verdict.headline}</div>
          <span className={`badge ${score >= 4 ? "badge-leaf" : score >= 3 ? "badge-sun" : "badge-clay"}`}>
            {"★".repeat(score)}{"☆".repeat(5 - score)}
          </span>
        </div>
        {result.strengths?.length > 0 && (
          <>
            <div className="recipe-stat-label" style={{ marginTop: 6 }}>What worked</div>
            <ul className="recipe-tips">
              {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}
        {result.issues?.length > 0 && (
          <>
            <div className="recipe-stat-label" style={{ marginTop: 14 }}>What to watch</div>
            <ul className="recipe-tips">
              {result.issues.map((it, i) => (
                <li key={i}><strong style={{ textTransform: "capitalize" }}>{it.area}.</strong> {it.observation}</li>
              ))}
            </ul>
          </>
        )}
        {result.tryNext?.length > 0 && (
          <>
            <div className="recipe-stat-label" style={{ marginTop: 14 }}>Try next time</div>
            <ul className="recipe-tips">
              {result.tryNext.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </>
        )}
        {result.recipeTweaks && hasAnyTweak(result.recipeTweaks) && (
          <div style={{ marginTop: 14 }}>
            <div className="recipe-stat-label">Recipe tweaks</div>
            <div className="recipe-stats" style={{ marginTop: 4 }}>
              {result.recipeTweaks.lens && <Stat label="Lens" value={result.recipeTweaks.lens} />}
              {result.recipeTweaks.fNumber != null && <Stat label="Aperture" value={`f/${result.recipeTweaks.fNumber}`} />}
              {result.recipeTweaks.shutter && <Stat label="Shutter" value={result.recipeTweaks.shutter} />}
              {result.recipeTweaks.iso != null && <Stat label="ISO" value={result.recipeTweaks.iso} />}
              {result.recipeTweaks.ev != null && <Stat label="EV" value={result.recipeTweaks.ev > 0 ? `+${result.recipeTweaks.ev}` : result.recipeTweaks.ev} />}
            </div>
            {result.recipeTweaks.note && <p className="recipe-line" style={{ marginTop: 8 }}>{result.recipeTweaks.note}</p>}
          </div>
        )}
      </div>
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

function hasAnyTweak(t) {
  return t.lens || t.fNumber != null || t.shutter || t.iso != null || t.ev != null || t.note;
}
