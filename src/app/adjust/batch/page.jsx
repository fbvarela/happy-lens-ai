"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fileToDownscaledDataUrl } from "@/lib/image-decode";

const MAX_PHOTOS = 12;

const LABELS = {
  exposure: "Exposure", brilliance: "Brilliance", highlights: "Highlights", shadows: "Shadows",
  contrast: "Contrast", brightness: "Brightness", blackPoint: "Black Point",
  saturation: "Saturation", vibrance: "Vibrance", warmth: "Warmth", tint: "Tint",
  sharpness: "Sharpness", definition: "Definition", noiseReduction: "Noise Reduction", vignette: "Vignette",
};
const signed = (v) => v > 0 ? `+${v}` : `${v}`;

const fileToDataUrl = (file) => fileToDownscaledDataUrl(file, 1200, 0.78);

export default function BatchPage() {
  const { locale } = useLocale();
  const fileInput = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onFiles = async (files) => {
    setError(null);
    const arr = Array.from(files || []).slice(0, MAX_PHOTOS - photos.length);
    if (!arr.length) return;
    try {
      const next = await Promise.all(arr.map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) })));
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    } catch (err) { setError(err.message || "Could not read image."); }
  };

  const removeAt = (i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (photos.length < 2) { setError("Pick at least 2 photos."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/adjust/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos.map((p) => p.dataUrl), locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Batch failed.");
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const reset = () => { setPhotos([]); setResult(null); setError(null); };

  const shared = result?.shared;

  return (
    <>
      <h1 className="page-title">Batch adjust</h1>
      <p className="page-sub">Upload up to {MAX_PHOTOS} photos from one shoot — get one shared recipe plus a per-photo delta.</p>

      <div className="card coach-card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()}>Add photos</button>
          <span className="recipe-stat-label">{photos.length} / {MAX_PHOTOS}</span>
          {photos.length > 0 && <button type="button" className="btn btn-ghost" onClick={reset}>Clear</button>}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
            style={{ display: "none" }}
          />
        </div>

        {photos.length > 0 && (
          <div className="card-grid">
            {photos.map((p, i) => (
              <div key={i} className="card" style={{ padding: 8 }}>
                <div className="preview-wrap" style={{ marginBottom: 6 }}>
                  <img src={p.dataUrl} alt={p.name} className="preview-img" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span className="recipe-stat-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => removeAt(i)} style={{ padding: "4px 8px" }} aria-label="Remove photo"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={loading || photos.length < 2}>
            {loading ? "Analyzing…" : "Get shared recipe"}
          </button>
        </div>
        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </div>

      {shared && (
        <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <div className="card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>{shared.title}</div>
              <span className="badge badge-leaf">Shared</span>
            </div>
            <p className="recipe-line" style={{ marginTop: 6 }}>{shared.diagnosis}</p>
            <div className="recipe-stat-label" style={{ marginTop: 8 }}>
              Style: <strong>{shared.photographicStyle.preset}</strong>
              {shared.photographicStyle.tone != null && <> · Tone <strong>{shared.photographicStyle.tone.toFixed(1)}</strong></>}
            </div>
          </div>

          <SliderGroup title="Light" obj={shared.light} />
          <SliderGroup title="Color" obj={shared.color} />
          <SliderGroup title="Detail" obj={shared.detail} />

          <div className="card">
            <div className="recipe-stat-label" style={{ marginBottom: 8 }}>Per-photo deltas</div>
            <div className="card-grid">
              {result.perPhoto.map((d, i) => {
                const rows = [
                  ...Object.entries(d.light || {}),
                  ...Object.entries(d.color || {}),
                ].filter(([, v]) => v !== 0 && v != null);
                return (
                  <div key={i} className="card" style={{ padding: 8 }}>
                    <div className="preview-wrap" style={{ marginBottom: 6 }}>
                      <img src={photos[i]?.dataUrl} alt="" className="preview-img" />
                    </div>
                    {rows.length === 0 && <div className="recipe-stat-label">No delta — use shared recipe.</div>}
                    {rows.length > 0 && (
                      <div className="recipe-stats" style={{ marginTop: 4 }}>
                        {rows.map(([k, v]) => (
                          <div key={k} style={{ minWidth: 0 }}>
                            <div className="recipe-stat-label">{LABELS[k] || k}</div>
                            <div className="recipe-stat-value">{signed(v)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {d.why && <p className="recipe-line" style={{ marginTop: 6, fontSize: "0.85rem" }}>{d.why}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SliderGroup({ title, obj }) {
  const rows = Object.entries(obj).filter(([, v]) => v !== 0 && v != null);
  if (!rows.length) return null;
  return (
    <div className="card">
      <div className="recipe-stat-label">{title}</div>
      <div className="recipe-stats" style={{ marginTop: 4 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ minWidth: 0 }}>
            <div className="recipe-stat-label">{LABELS[k] || k}</div>
            <div className="recipe-stat-value">{signed(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
